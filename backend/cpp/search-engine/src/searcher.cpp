#include "searcher.hpp"
#include <algorithm>
#include <chrono>
#include <cmath>
#include <sstream>

namespace search_engine {

// ═══════════════════════════════════════════════════════════════
// BOYER-MOORE-HORSPOOL — Fast Literal Text Search
// ═══════════════════════════════════════════════════════════════

std::vector<int> Searcher::build_shift_table(const std::string& pattern) {
    std::vector<int> table(256, static_cast<int>(pattern.size()));
    for (int i = 0; i < static_cast<int>(pattern.size()) - 1; ++i) {
        table[static_cast<unsigned char>(pattern[i])] =
            static_cast<int>(pattern.size()) - 1 - i;
    }
    return table;
}

std::string Searcher::to_lower(const std::string& s) {
    std::string result = s;
    std::transform(result.begin(), result.end(), result.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    return result;
}

std::string Searcher::extract_context(const std::string& text, size_t pos, 
                                       size_t match_len, int ctx) {
    size_t start = (pos >= static_cast<size_t>(ctx)) ? pos - ctx : 0;
    size_t end = std::min(text.size(), pos + match_len + ctx);
    std::string context = text.substr(start, end - start);
    // Replace newlines for clean JSON output
    std::replace(context.begin(), context.end(), '\n', ' ');
    std::replace(context.begin(), context.end(), '\r', ' ');
    return context;
}

SearchReport Searcher::search_text(
    const std::vector<std::string>& pages,
    const std::string& query,
    bool case_insensitive,
    int max_results
) {
    auto t0 = std::chrono::high_resolution_clock::now();

    SearchReport report;
    report.total_matches = 0;
    report.pages_scanned = static_cast<int>(pages.size());

    if (query.empty()) {
        auto t1 = std::chrono::high_resolution_clock::now();
        report.search_time_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
        return report;
    }

    std::string pattern = case_insensitive ? to_lower(query) : query;
    auto shift_table = build_shift_table(pattern);
    int plen = static_cast<int>(pattern.size());

    for (int page = 0; page < static_cast<int>(pages.size()); ++page) {
        std::string text = case_insensitive ? to_lower(pages[page]) : pages[page];
        int tlen = static_cast<int>(text.size());

        int i = plen - 1; // Start at end of first window
        while (i < tlen) {
            int j = plen - 1;
            int k = i;
            while (j >= 0 && text[k] == pattern[j]) {
                --j;
                --k;
            }
            if (j < 0) {
                // Match found at position k+1
                size_t match_pos = static_cast<size_t>(k + 1);
                
                // Calculate line number
                int line = 1;
                for (size_t p = 0; p < match_pos && p < text.size(); ++p) {
                    if (pages[page][p] == '\n') ++line;
                }

                SearchResult sr;
                sr.page = page;
                sr.line = line;
                sr.position = static_cast<int>(match_pos);
                sr.matched = pages[page].substr(match_pos, plen);
                sr.context = extract_context(pages[page], match_pos, plen);
                report.results.push_back(sr);
                report.total_matches++;

                if (report.total_matches >= max_results) goto done;

                i += plen; // Move past the match
            } else {
                i += shift_table[static_cast<unsigned char>(text[i])];
            }
        }
    }

done:
    auto t1 = std::chrono::high_resolution_clock::now();
    report.search_time_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    return report;
}

// ═══════════════════════════════════════════════════════════════
// REGEX SEARCH
// ═══════════════════════════════════════════════════════════════

SearchReport Searcher::search_regex(
    const std::vector<std::string>& pages,
    const std::string& pattern,
    bool case_insensitive,
    int max_results
) {
    auto t0 = std::chrono::high_resolution_clock::now();

    SearchReport report;
    report.total_matches = 0;
    report.pages_scanned = static_cast<int>(pages.size());

    auto flags = std::regex_constants::ECMAScript | std::regex_constants::optimize;
    if (case_insensitive) flags |= std::regex_constants::icase;

    std::regex re;
    try {
        re = std::regex(pattern, flags);
    } catch (const std::regex_error&) {
        auto t1 = std::chrono::high_resolution_clock::now();
        report.search_time_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
        return report;
    }

    for (int page = 0; page < static_cast<int>(pages.size()); ++page) {
        const auto& text = pages[page];
        auto begin = std::sregex_iterator(text.begin(), text.end(), re);
        auto end = std::sregex_iterator();

        for (auto it = begin; it != end; ++it) {
            size_t match_pos = static_cast<size_t>(it->position());
            
            int line = 1;
            for (size_t p = 0; p < match_pos && p < text.size(); ++p) {
                if (text[p] == '\n') ++line;
            }

            SearchResult sr;
            sr.page = page;
            sr.line = line;
            sr.position = static_cast<int>(match_pos);
            sr.matched = it->str();
            sr.context = extract_context(text, match_pos, it->length());
            report.results.push_back(sr);
            report.total_matches++;

            if (report.total_matches >= max_results) goto regex_done;
        }
    }

regex_done:
    auto t1 = std::chrono::high_resolution_clock::now();
    report.search_time_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    return report;
}

// ═══════════════════════════════════════════════════════════════
// MULTI-THREADED BATCH SEARCH
// ═══════════════════════════════════════════════════════════════

std::vector<BatchResult> Searcher::batch_search(
    const std::vector<std::string>& blocks,
    const std::string& query,
    bool is_regex,
    bool case_insensitive,
    int max_threads
) {
    if (max_threads <= 0) {
        max_threads = std::max(1u, std::thread::hardware_concurrency());
    }
    max_threads = std::min(max_threads, static_cast<int>(blocks.size()));

    std::vector<BatchResult> results(blocks.size());
    std::mutex results_mutex;
    std::vector<std::thread> threads;

    auto worker = [&](int start, int end) {
        for (int i = start; i < end; ++i) {
            std::vector<std::string> single_block = {blocks[i]};
            SearchReport sr;
            
            if (is_regex) {
                sr = search_regex(single_block, query, case_insensitive, 100);
            } else {
                sr = search_text(single_block, query, case_insensitive, 100);
            }

            std::lock_guard<std::mutex> lock(results_mutex);
            results[i] = {i, sr};
        }
    };

    int blocks_per_thread = static_cast<int>(blocks.size()) / max_threads;
    int remainder = static_cast<int>(blocks.size()) % max_threads;
    int start = 0;

    for (int t = 0; t < max_threads; ++t) {
        int count = blocks_per_thread + (t < remainder ? 1 : 0);
        if (count > 0) {
            threads.emplace_back(worker, start, start + count);
            start += count;
        }
    }

    for (auto& thread : threads) {
        thread.join();
    }

    return results;
}

// ═══════════════════════════════════════════════════════════════
// ENTITY EXTRACTION
// ═══════════════════════════════════════════════════════════════

EntityReport Searcher::extract_entities(const std::vector<std::string>& pages) {
    auto t0 = std::chrono::high_resolution_clock::now();

    EntityReport report;
    report.total_entities = 0;

    // Pre-compiled entity patterns
    struct EntityPattern {
        std::string type;
        std::regex regex;
    };

    std::vector<EntityPattern> patterns;

    try {
        patterns.push_back({
            "email",
            std::regex(R"([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})",
                       std::regex_constants::optimize)
        });

        patterns.push_back({
            "ipv4",
            std::regex(R"(\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b)",
                       std::regex_constants::optimize)
        });

        patterns.push_back({
            "url",
            std::regex(R"(https?://[^\s<>\"\'\)\]]+)",
                       std::regex_constants::optimize | std::regex_constants::icase)
        });

        patterns.push_back({
            "phone",
            std::regex(R"((?:\+?(?:55|1|44|33|49|34|39|81|82|86|91)\s?)?(?:\(?\d{2,3}\)?[\s\-]?)?\d{4,5}[\s\-]?\d{4}\b)",
                       std::regex_constants::optimize)
        });

        patterns.push_back({
            "credit_card",
            std::regex(R"(\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b)",
                       std::regex_constants::optimize)
        });

        patterns.push_back({
            "cpf",
            std::regex(R"(\b\d{3}\.\d{3}\.\d{3}-\d{2}\b)",
                       std::regex_constants::optimize)
        });

        patterns.push_back({
            "cnpj",
            std::regex(R"(\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b)",
                       std::regex_constants::optimize)
        });

        patterns.push_back({
            "mac_address",
            std::regex(R"(\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b)",
                       std::regex_constants::optimize)
        });

        patterns.push_back({
            "hash_md5",
            std::regex(R"(\b[a-fA-F0-9]{32}\b)",
                       std::regex_constants::optimize)
        });

        patterns.push_back({
            "hash_sha256",
            std::regex(R"(\b[a-fA-F0-9]{64}\b)",
                       std::regex_constants::optimize)
        });
    } catch (...) {
        // If regex compilation fails, return empty
        auto t1 = std::chrono::high_resolution_clock::now();
        report.scan_time_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
        return report;
    }

    for (int page = 0; page < static_cast<int>(pages.size()); ++page) {
        const auto& text = pages[page];
        for (const auto& pat : patterns) {
            auto begin = std::sregex_iterator(text.begin(), text.end(), pat.regex);
            auto end = std::sregex_iterator();
            for (auto it = begin; it != end; ++it) {
                EntityResult er;
                er.type = pat.type;
                er.value = it->str();
                er.page = page;
                er.position = static_cast<int>(it->position());
                report.entities.push_back(er);
                report.total_entities++;
            }
        }
    }

    auto t1 = std::chrono::high_resolution_clock::now();
    report.scan_time_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    return report;
}

} // namespace search_engine
