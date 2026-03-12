use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::HashMap;

#[derive(Debug, Serialize)]
pub struct PasswordReport {
    pub score: u8,           // 0-100
    pub strength: String,    // "very_weak"|"weak"|"fair"|"strong"|"very_strong"
    pub entropy_bits: f64,
    pub length: usize,
    pub issues: Vec<String>,
    pub suggestions: Vec<String>,
    pub has_uppercase: bool,
    pub has_lowercase: bool,
    pub has_digits: bool,
    pub has_symbols: bool,
    pub is_common: bool,
    pub has_patterns: bool,
    pub sha256_prefix: String, // First 5 chars of SHA256 for k-anonymity breach check
}

/// Top 100 most common passwords for quick check
const COMMON_PASSWORDS: &[&str] = &[
    "123456", "password", "12345678", "qwerty", "123456789", "12345", "1234",
    "111111", "1234567", "dragon", "123123", "baseball", "abc123", "football",
    "monkey", "letmein", "shadow", "master", "666666", "qwertyuiop", "123321",
    "mustang", "1234567890", "michael", "654321", "superman", "1qaz2wsx",
    "7777777", "121212", "000000", "qazwsx", "123qwe", "killer", "trustno1",
    "jordan", "jennifer", "zxcvbnm", "asdfgh", "hunter", "buster", "soccer",
    "harley", "batman", "andrew", "tigger", "sunshine", "iloveyou", "2000",
    "charlie", "robert", "thomas", "hockey", "ranger", "daniel", "starwars",
    "klaster", "112233", "george", "computer", "michelle", "jessica", "pepper",
    "1111", "zxcvbn", "555555", "11111111", "131313", "freedom", "777777",
    "pass", "maggie", "159753", "aaaaaa", "ginger", "princess", "joshua",
    "cheese", "amanda", "summer", "love", "ashley", "nicole", "chelsea",
    "biteme", "matthew", "access", "yankees", "987654321", "dallas", "austin",
    "thunder", "taylor", "matrix", "admin", "password1", "letmein1",
    "welcome", "monkey1", "passw0rd", "p@ssw0rd", "admin123", "root",
];

pub fn check_password(payload: &Value) -> Result<PasswordReport, String> {
    let password = payload
        .as_str()
        .or_else(|| payload.get("password").and_then(|v| v.as_str()))
        .ok_or("expected string password or object with 'password' field")?;

    let len = password.len();
    let mut issues = Vec::new();
    let mut suggestions = Vec::new();

    // Character class analysis
    let has_upper = password.chars().any(|c| c.is_ascii_uppercase());
    let has_lower = password.chars().any(|c| c.is_ascii_lowercase());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());
    let has_symbol = password.chars().any(|c| !c.is_alphanumeric() && c.is_ascii());

    // Length checks
    if len < 8 {
        issues.push("Password is too short (minimum 8 characters)".into());
        suggestions.push("Use at least 12 characters".into());
    }
    if len < 12 {
        suggestions.push("Consider using 16+ characters for strong security".into());
    }

    // Class checks
    if !has_upper {
        issues.push("No uppercase letters".into());
        suggestions.push("Add uppercase letters (A-Z)".into());
    }
    if !has_lower {
        issues.push("No lowercase letters".into());
        suggestions.push("Add lowercase letters (a-z)".into());
    }
    if !has_digit {
        issues.push("No digits".into());
        suggestions.push("Add numbers (0-9)".into());
    }
    if !has_symbol {
        issues.push("No special characters".into());
        suggestions.push("Add symbols (!@#$%^&*)".into());
    }

    // Common password check
    let pwd_lower = password.to_lowercase();
    let is_common = COMMON_PASSWORDS.iter().any(|p| pwd_lower == *p);
    if is_common {
        issues.push("Password is in the top 100 most common passwords".into());
        suggestions.push("Choose a unique password not found in common lists".into());
    }

    // Pattern detection
    let mut has_patterns = false;

    // Repeated characters
    if has_repeated_chars(password, 3) {
        has_patterns = true;
        issues.push("Contains repeated characters (e.g., 'aaa')".into());
    }

    // Sequential numbers
    if has_sequential(password) {
        has_patterns = true;
        issues.push("Contains sequential characters (e.g., '123', 'abc')".into());
    }

    // Keyboard walks
    if has_keyboard_walk(password) {
        has_patterns = true;
        issues.push("Contains keyboard walk pattern (e.g., 'qwerty')".into());
    }

    // Entropy calculation
    let entropy = calculate_entropy(password);

    // Score calculation
    let mut score: u8 = 0;
    // Length contribution (up to 30 points)
    score += std::cmp::min(30, (len as u8).saturating_mul(2));
    // Class contribution (up to 20 points, 5 per class)
    if has_upper { score += 5; }
    if has_lower { score += 5; }
    if has_digit { score += 5; }
    if has_symbol { score += 5; }
    // Entropy contribution (up to 30 points)
    score += std::cmp::min(30, (entropy / 2.0) as u8);
    // Penalties
    if is_common { score = score.saturating_sub(40); }
    if has_patterns { score = score.saturating_sub(15); }
    if len < 8 { score = score.saturating_sub(20); }

    score = std::cmp::min(100, score);

    let strength = if score >= 80 {
        "very_strong"
    } else if score >= 60 {
        "strong"
    } else if score >= 40 {
        "fair"
    } else if score >= 20 {
        "weak"
    } else {
        "very_weak"
    };

    // SHA256 prefix for k-anonymity breach checking
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let hash = hasher.finalize();
    let sha_prefix: String = hex::encode(&hash[..3]).to_uppercase();

    Ok(PasswordReport {
        score,
        strength: strength.into(),
        entropy_bits: entropy,
        length: len,
        issues,
        suggestions,
        has_uppercase: has_upper,
        has_lowercase: has_lower,
        has_digits: has_digit,
        has_symbols: has_symbol,
        is_common,
        has_patterns,
        sha256_prefix: sha_prefix,
    })
}

fn calculate_entropy(password: &str) -> f64 {
    let mut freq: HashMap<char, usize> = HashMap::new();
    for c in password.chars() {
        *freq.entry(c).or_insert(0) += 1;
    }
    let len = password.len() as f64;
    let mut entropy = 0.0;
    for count in freq.values() {
        let p = *count as f64 / len;
        if p > 0.0 {
            entropy -= p * p.log2();
        }
    }
    entropy * len
}

fn has_repeated_chars(s: &str, min_repeat: usize) -> bool {
    let chars: Vec<char> = s.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let mut count = 1;
        while i + count < chars.len() && chars[i + count] == chars[i] {
            count += 1;
        }
        if count >= min_repeat {
            return true;
        }
        i += count;
    }
    false
}

fn has_sequential(s: &str) -> bool {
    let chars: Vec<u32> = s.chars().map(|c| c as u32).collect();
    if chars.len() < 3 {
        return false;
    }
    for window in chars.windows(3) {
        if window[1] == window[0] + 1 && window[2] == window[1] + 1 {
            return true;
        }
        if window[1] + 1 == window[0] && window[2] + 1 == window[1] {
            return true;
        }
    }
    false
}

fn has_keyboard_walk(s: &str) -> bool {
    let walks = ["qwert", "werty", "ertyu", "rtyui", "tyuio", "yuiop",
                 "asdfg", "sdfgh", "dfghj", "fghjk", "ghjkl",
                 "zxcvb", "xcvbn", "cvbnm",
                 "qazwsx", "wsxedc"];
    let lower = s.to_lowercase();
    walks.iter().any(|w| lower.contains(w))
}
