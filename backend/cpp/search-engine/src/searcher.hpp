#pragma once
#include <string>
#include <vector>
#include <regex>
#include <thread>
#include <mutex>
#include <functional>

namespace search_engine {

struct SearchResult {
    int page;                // Page number (0-indexed)
    int line;                // Line number within page
    int position;            // Character position within line
    std::string context;     // Surrounding text snippet
    std::string matched;     // The matched text
};

struct EntityResult {
    std::string type;        // "email"|"ip"|"url"|"phone"|"credit_card"|"ssn"
    std::string value;       // The extracted value
    int page;
    int position;
};

struct SearchReport {
    std::vector<SearchResult> results;
    int total_matches;
    double search_time_ms;
    int pages_scanned;
};

struct EntityReport {
    std::vector<EntityResult> entities;
    int total_entities;
    double scan_time_ms;
};

struct BatchResult {
    int block_index;
    SearchReport report;
};

class Searcher {
public:
    // Boyer-Moore-Horspool literal text search — O(n/m) average
    static SearchReport search_text(
        const std::vector<std::string>& pages,
        const std::string& query,
        bool case_insensitive = false,
        int max_results = 500
    );

    // Regex-based pattern search
    static SearchReport search_regex(
        const std::vector<std::string>& pages,
        const std::string& pattern,
        bool case_insensitive = false,
        int max_results = 500
    );

    // Multi-threaded batch search across multiple text blocks
    static std::vector<BatchResult> batch_search(
        const std::vector<std::string>& blocks,
        const std::string& query,
        bool is_regex = false,
        bool case_insensitive = false,
        int max_threads = 0  // 0 = auto-detect
    );

    // Entity extraction (emails, IPs, URLs, phones, credit cards)
    static EntityReport extract_entities(
        const std::vector<std::string>& pages
    );

private:
    // BMH bad character shift table
    static std::vector<int> build_shift_table(const std::string& pattern);
    
    // Extract context around a match
    static std::string extract_context(
        const std::string& text,
        size_t pos,
        size_t match_len,
        int context_chars = 60
    );

    // Convert string to lowercase
    static std::string to_lower(const std::string& s);
};

} // namespace search_engine
