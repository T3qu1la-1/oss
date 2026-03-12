/**
 * Olho de Cristo - C++ High-Performance Search Engine
 * Protocolo JSON via stdin/stdout (mesmo padrão do Rust security-core)
 * 
 * Actions:
 *   search_text    — Busca literal com Boyer-Moore-Horspool
 *   search_regex   — Busca por regex
 *   batch_search   — Busca multi-threaded em blocos
 *   extract_entities — Extração de entidades (emails, IPs, URLs, etc)
 *   calc_entropy   — Cálculo de entropia Shannon
 */

#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <stdexcept>
#include "searcher.hpp"
#include "entropy.hpp"

// ═══════════════════════════════════════════════════════════════
// Minimal JSON parser/writer (zero dependencies)
// ═══════════════════════════════════════════════════════════════

// Forward declarations
static std::string read_stdin();
static std::string json_escape(const std::string& s);

// Simple JSON value representation
enum JsonType { J_NULL, J_BOOL, J_INT, J_DOUBLE, J_STRING, J_ARRAY, J_OBJECT };

struct JsonVal {
    JsonType type = J_NULL;
    std::string str_val;
    int64_t int_val = 0;
    double dbl_val = 0;
    bool bool_val = false;
    std::vector<JsonVal> arr;
    std::vector<std::pair<std::string, JsonVal>> obj;

    std::string get_str(const std::string& key, const std::string& def = "") const {
        for (auto& p : obj) if (p.first == key && p.second.type == J_STRING) return p.second.str_val;
        return def;
    }
    bool get_bool(const std::string& key, bool def = false) const {
        for (auto& p : obj) if (p.first == key && p.second.type == J_BOOL) return p.second.bool_val;
        return def;
    }
    int64_t get_int(const std::string& key, int64_t def = 0) const {
        for (auto& p : obj) if (p.first == key) {
            if (p.second.type == J_INT) return p.second.int_val;
            if (p.second.type == J_DOUBLE) return static_cast<int64_t>(p.second.dbl_val);
        }
        return def;
    }
    JsonVal get_obj(const std::string& key) const {
        for (auto& p : obj) if (p.first == key) return p.second;
        return {};
    }
    std::vector<std::string> get_string_array(const std::string& key) const {
        std::vector<std::string> result;
        for (auto& p : obj) if (p.first == key && p.second.type == J_ARRAY) {
            for (auto& item : p.second.arr) {
                if (item.type == J_STRING) result.push_back(item.str_val);
            }
        }
        return result;
    }
};

// Minimal JSON parser
class JsonParser {
    const std::string& input;
    size_t pos = 0;

    void skip_ws() { while (pos < input.size() && (input[pos]==' '||input[pos]=='\t'||input[pos]=='\n'||input[pos]=='\r')) pos++; }
    
    char peek() { skip_ws(); return pos < input.size() ? input[pos] : 0; }
    char next() { skip_ws(); return pos < input.size() ? input[pos++] : 0; }

    std::string parse_string_val() {
        pos++; // skip "
        std::string s;
        while (pos < input.size() && input[pos] != '"') {
            if (input[pos] == '\\' && pos + 1 < input.size()) {
                pos++;
                switch (input[pos]) {
                    case '"': s += '"'; break;
                    case '\\': s += '\\'; break;
                    case '/': s += '/'; break;
                    case 'n': s += '\n'; break;
                    case 'r': s += '\r'; break;
                    case 't': s += '\t'; break;
                    default: s += input[pos]; break;
                }
            } else {
                s += input[pos];
            }
            pos++;
        }
        if (pos < input.size()) pos++; // skip closing "
        return s;
    }

public:
    JsonParser(const std::string& s) : input(s) {}

    JsonVal parse() {
        skip_ws();
        if (pos >= input.size()) return {};
        char c = input[pos];

        if (c == '"') {
            JsonVal v; v.type = J_STRING; v.str_val = parse_string_val(); return v;
        }
        if (c == '{') {
            pos++; // skip {
            JsonVal v; v.type = J_OBJECT;
            if (peek() == '}') { pos++; return v; }
            while (true) {
                skip_ws();
                std::string key = parse_string_val();
                skip_ws();
                pos++; // skip :
                JsonVal val = parse();
                v.obj.push_back({key, val});
                skip_ws();
                if (pos < input.size() && input[pos] == ',') { pos++; continue; }
                if (pos < input.size() && input[pos] == '}') { pos++; break; }
                break;
            }
            return v;
        }
        if (c == '[') {
            pos++; // skip [
            JsonVal v; v.type = J_ARRAY;
            if (peek() == ']') { pos++; return v; }
            while (true) {
                v.arr.push_back(parse());
                skip_ws();
                if (pos < input.size() && input[pos] == ',') { pos++; continue; }
                if (pos < input.size() && input[pos] == ']') { pos++; break; }
                break;
            }
            return v;
        }
        if (c == 't') { pos += 4; JsonVal v; v.type = J_BOOL; v.bool_val = true; return v; }
        if (c == 'f') { pos += 5; JsonVal v; v.type = J_BOOL; v.bool_val = false; return v; }
        if (c == 'n') { pos += 4; return {}; }
        // Number
        std::string num;
        bool is_float = false;
        while (pos < input.size() && (isdigit(input[pos])||input[pos]=='-'||input[pos]=='+'||input[pos]=='.'||input[pos]=='e'||input[pos]=='E')) {
            if (input[pos] == '.' || input[pos] == 'e' || input[pos] == 'E') is_float = true;
            num += input[pos++];
        }
        JsonVal v;
        if (is_float) { v.type = J_DOUBLE; v.dbl_val = std::stod(num); }
        else { v.type = J_INT; v.int_val = std::stoll(num); }
        return v;
    }
};

// ═══════════════════════════════════════════════════════════════
// JSON OUTPUT HELPERS
// ═══════════════════════════════════════════════════════════════

static std::string json_escape(const std::string& s) {
    std::string out;
    out.reserve(s.size() + 16);
    for (char c : s) {
        switch (c) {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default:
                if (static_cast<unsigned char>(c) < 0x20) {
                    char buf[8];
                    snprintf(buf, sizeof(buf), "\\u%04x", static_cast<unsigned char>(c));
                    out += buf;
                } else {
                    out += c;
                }
        }
    }
    return out;
}

static void write_ok(const std::string& result_json) {
    std::cout << "{\"status\":\"ok\",\"result\":" << result_json << "}" << std::flush;
}

static void write_error(const std::string& code, const std::string& msg) {
    std::cout << "{\"status\":\"error\",\"code\":\"" << json_escape(code)
              << "\",\"message\":\"" << json_escape(msg) << "\"}" << std::flush;
}

static std::string read_stdin() {
    std::string input;
    std::ostringstream ss;
    ss << std::cin.rdbuf();
    return ss.str();
}

// ═══════════════════════════════════════════════════════════════
// MAIN — Route actions
// ═══════════════════════════════════════════════════════════════

int main() {
    std::string input = read_stdin();
    if (input.empty()) {
        write_error("io_error", "empty stdin");
        return 1;
    }

    JsonParser parser(input);
    JsonVal req = parser.parse();

    std::string action = req.get_str("action");
    JsonVal payload = req.get_obj("payload");

    if (action == "search_text" || action == "search_regex") {
        auto pages = payload.get_string_array("pages");
        std::string query = payload.get_str("query");
        bool case_insensitive = payload.get_bool("case_insensitive", false);
        int max_results = static_cast<int>(payload.get_int("max_results", 500));

        if (pages.empty()) {
            write_error("invalid_payload", "pages array is required");
            return 1;
        }
        if (query.empty()) {
            write_error("invalid_payload", "query is required");
            return 1;
        }

        search_engine::SearchReport report;
        if (action == "search_regex") {
            report = search_engine::Searcher::search_regex(pages, query, case_insensitive, max_results);
        } else {
            report = search_engine::Searcher::search_text(pages, query, case_insensitive, max_results);
        }

        // Build JSON response
        std::ostringstream json;
        json << "{\"total_matches\":" << report.total_matches
             << ",\"search_time_ms\":" << report.search_time_ms
             << ",\"pages_scanned\":" << report.pages_scanned
             << ",\"results\":[";
        for (size_t i = 0; i < report.results.size(); ++i) {
            if (i > 0) json << ",";
            auto& r = report.results[i];
            json << "{\"page\":" << r.page
                 << ",\"line\":" << r.line
                 << ",\"position\":" << r.position
                 << ",\"matched\":\"" << json_escape(r.matched) << "\""
                 << ",\"context\":\"" << json_escape(r.context) << "\"}";
        }
        json << "]}";
        write_ok(json.str());
    }
    else if (action == "batch_search") {
        auto blocks = payload.get_string_array("blocks");
        std::string query = payload.get_str("query");
        bool is_regex = payload.get_bool("is_regex", false);
        bool case_insensitive = payload.get_bool("case_insensitive", false);
        int max_threads = static_cast<int>(payload.get_int("max_threads", 0));

        if (blocks.empty() || query.empty()) {
            write_error("invalid_payload", "blocks and query are required");
            return 1;
        }

        auto results = search_engine::Searcher::batch_search(blocks, query, is_regex, case_insensitive, max_threads);

        std::ostringstream json;
        json << "{\"blocks_searched\":" << blocks.size() << ",\"results\":[";
        for (size_t i = 0; i < results.size(); ++i) {
            if (i > 0) json << ",";
            auto& br = results[i];
            json << "{\"block_index\":" << br.block_index
                 << ",\"total_matches\":" << br.report.total_matches
                 << ",\"search_time_ms\":" << br.report.search_time_ms << "}";
        }
        json << "]}";
        write_ok(json.str());
    }
    else if (action == "extract_entities") {
        auto pages = payload.get_string_array("pages");
        if (pages.empty()) {
            write_error("invalid_payload", "pages array is required");
            return 1;
        }

        auto report = search_engine::Searcher::extract_entities(pages);

        std::ostringstream json;
        json << "{\"total_entities\":" << report.total_entities
             << ",\"scan_time_ms\":" << report.scan_time_ms
             << ",\"entities\":[";
        for (size_t i = 0; i < report.entities.size(); ++i) {
            if (i > 0) json << ",";
            auto& e = report.entities[i];
            json << "{\"type\":\"" << json_escape(e.type) << "\""
                 << ",\"value\":\"" << json_escape(e.value) << "\""
                 << ",\"page\":" << e.page
                 << ",\"position\":" << e.position << "}";
        }
        json << "]}";
        write_ok(json.str());
    }
    else if (action == "calc_entropy") {
        std::string data = payload.get_str("data");
        if (data.empty()) {
            write_error("invalid_payload", "data string is required");
            return 1;
        }

        auto report = search_engine::Entropy::calculate(data);

        std::ostringstream json;
        json << "{\"shannon_entropy\":" << report.shannon_entropy
             << ",\"normalized\":" << report.normalized
             << ",\"classification\":\"" << report.classification << "\""
             << ",\"likely_encrypted\":" << (report.likely_encrypted ? "true" : "false")
             << ",\"likely_compressed\":" << (report.likely_compressed ? "true" : "false")
             << ",\"likely_base64\":" << (report.likely_base64 ? "true" : "false")
             << ",\"total_bytes\":" << report.total_bytes << "}";
        write_ok(json.str());
    }
    else {
        write_error("unknown_action", "unsupported action: " + action);
        return 1;
    }

    return 0;
}
