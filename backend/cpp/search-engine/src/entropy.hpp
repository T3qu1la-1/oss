#pragma once
#include <string>
#include <cmath>
#include <array>

namespace search_engine {

struct EntropyReport {
    double shannon_entropy;    // bits per byte (0.0 - 8.0)
    double normalized;         // 0.0 - 1.0
    std::string classification; // "low"|"normal"|"high"|"very_high"
    bool likely_encrypted;
    bool likely_compressed;
    bool likely_base64;
    int total_bytes;
};

class Entropy {
public:
    static EntropyReport calculate(const std::string& data) {
        EntropyReport report;
        report.total_bytes = static_cast<int>(data.size());

        if (data.empty()) {
            report.shannon_entropy = 0.0;
            report.normalized = 0.0;
            report.classification = "low";
            report.likely_encrypted = false;
            report.likely_compressed = false;
            report.likely_base64 = false;
            return report;
        }

        // Frequency table
        std::array<int, 256> freq{};
        for (unsigned char c : data) {
            freq[c]++;
        }

        // Shannon entropy
        double entropy = 0.0;
        double len = static_cast<double>(data.size());
        for (int f : freq) {
            if (f > 0) {
                double p = static_cast<double>(f) / len;
                entropy -= p * std::log2(p);
            }
        }

        report.shannon_entropy = entropy;
        report.normalized = entropy / 8.0;

        // Classification
        if (entropy < 3.0) {
            report.classification = "low";
        } else if (entropy < 5.5) {
            report.classification = "normal";
        } else if (entropy < 7.0) {
            report.classification = "high";
        } else {
            report.classification = "very_high";
        }

        // Heuristics
        report.likely_encrypted = entropy > 7.5;
        report.likely_compressed = entropy > 7.0 && entropy <= 7.9;

        // Base64 heuristic: check if most chars are base64-safe
        int b64_chars = 0;
        for (unsigned char c : data) {
            if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
                (c >= '0' && c <= '9') || c == '+' || c == '/' || c == '=') {
                b64_chars++;
            }
        }
        double b64_ratio = static_cast<double>(b64_chars) / len;
        report.likely_base64 = b64_ratio > 0.95 && data.size() > 32 && 
                                entropy > 4.0 && entropy < 6.5;

        return report;
    }
};

} // namespace search_engine
