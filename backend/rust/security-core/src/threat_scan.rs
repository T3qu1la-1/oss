use once_cell::sync::Lazy;
use regex::Regex;
use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Serialize)]
pub struct ThreatReport {
    pub threat_level: String,
    pub threats: Vec<ThreatMatch>,
    pub total_scanned: usize,
    pub scan_time_us: u64,
}

#[derive(Debug, Serialize)]
pub struct ThreatMatch {
    pub category: String,
    pub pattern_name: String,
    pub matched: String,
    pub severity: String,
    pub field: String,
}

struct ThreatPattern {
    category: &'static str,
    name: &'static str,
    regex: Lazy<Regex>,
    severity: &'static str,
}

macro_rules! threat {
    ($cat:expr, $name:expr, $pat:expr, $sev:expr) => {
        ThreatPattern {
            category: $cat,
            name: $name,
            regex: Lazy::new(|| Regex::new($pat).unwrap()),
            severity: $sev,
        }
    };
}

static PATTERNS: Lazy<Vec<ThreatPattern>> = Lazy::new(|| {
    vec![
        // ── SQL Injection ──────────────────────────────────────────
        threat!("sqli", "union_select", r"(?i)\bunion\b[\s/\*]+\bselect\b", "critical"),
        threat!("sqli", "select_from", r"(?i)\bselect\b[\s\S]+?\bfrom\b[\s\S]+?\bwhere\b", "critical"),
        threat!("sqli", "drop_table", r"(?i)\bdrop\b[\s]+\b(table|database)\b", "critical"),
        threat!("sqli", "insert_into", r"(?i)\binsert\b[\s]+\binto\b", "high"),
        threat!("sqli", "delete_from", r"(?i)\bdelete\b[\s]+\bfrom\b", "high"),
        threat!("sqli", "update_set", r"(?i)\bupdate\b[\s]+\S+[\s]+\bset\b", "high"),
        threat!("sqli", "or_equals", r"(?i)\b(or|and)\b\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+", "high"),
        threat!("sqli", "comment_bypass", r"(--|#|/\*|\*/)", "medium"),
        threat!("sqli", "sleep_waitfor", r"(?i)(sleep\s*\(|waitfor\s+delay|pg_sleep|benchmark\s*\()", "critical"),
        threat!("sqli", "info_schema", r"(?i)information_schema\.(tables|columns|schemata)", "critical"),
        threat!("sqli", "stacked_query", r";\s*(select|insert|update|delete|drop|alter|create)\b", "critical"),
        threat!("sqli", "extractvalue", r"(?i)extractvalue\s*\(", "critical"),
        threat!("sqli", "hex_encode", r"(?i)0x[0-9a-f]{6,}", "medium"),

        // ── XSS ────────────────────────────────────────────────────
        threat!("xss", "script_tag", r"(?i)<\s*script[^>]*>", "critical"),
        threat!("xss", "event_handler", r"(?i)\bon\w+\s*=", "high"),
        threat!("xss", "javascript_uri", r"(?i)javascript\s*:", "high"),
        threat!("xss", "iframe_tag", r"(?i)<\s*iframe", "high"),
        threat!("xss", "object_embed", r"(?i)<\s*(object|embed|applet)", "high"),
        threat!("xss", "svg_payload", r"(?i)<\s*svg[^>]*\bon\w+", "high"),
        threat!("xss", "img_onerror", r"(?i)<\s*img[^>]+onerror", "high"),
        threat!("xss", "eval_call", r"(?i)(eval|setTimeout|setInterval|Function)\s*\(", "high"),
        threat!("xss", "document_access", r"(?i)document\.(cookie|domain|write|location)", "high"),
        threat!("xss", "encoded_script", r"(?i)(%3c|&lt;)\s*script", "medium"),
        threat!("xss", "data_uri", r"(?i)data\s*:\s*(text|application)/", "medium"),
        threat!("xss", "expression_css", r"(?i)expression\s*\(", "medium"),

        // ── Command Injection ──────────────────────────────────────
        threat!("cmdi", "pipe_command", r"[|;`]\s*(cat|ls|rm|wget|curl|nc|bash|sh|python|perl|php|whoami|id|uname)\b", "critical"),
        threat!("cmdi", "chain_operators", r"(\&\&|\|\|)\s*\w+", "high"),
        threat!("cmdi", "backtick_exec", r"`[^`]+`", "high"),
        threat!("cmdi", "subshell", r"\$\([^)]+\)", "high"),
        threat!("cmdi", "reverse_shell", r"(?i)(\/dev\/tcp|mkfifo|nc\s+-[elp])", "critical"),

        // ── Path Traversal ────────────────────────────────────────
        threat!("path_traversal", "dot_dot_slash", r"\.\.[/\\]", "high"),
        threat!("path_traversal", "encoded_traversal", r"(?i)(\.\.%2f|%2e%2e/|\.\.%5c|%2e%2e\\)", "high"),
        threat!("path_traversal", "sensitive_files", r"(?i)(/etc/passwd|/etc/shadow|\.ssh/|web\.config|wp-config)", "critical"),
        threat!("path_traversal", "null_byte", r"%00", "high"),

        // ── NoSQL Injection ────────────────────────────────────────
        threat!("nosqli", "mongo_operator", r"(?i)\$\s*(ne|gt|lt|gte|lte|regex|where|exists|nin|in|or|and)\b", "high"),
        threat!("nosqli", "mongo_json", r#"\{\s*"\$\w+"#, "high"),

        // ── SSTI ──────────────────────────────────────────────────
        threat!("ssti", "template_double", r"\{\{.*\}\}", "high"),
        threat!("ssti", "template_dollar", r"\$\{[^}]+\}", "medium"),
        threat!("ssti", "template_erb", r"<%[=\-]?\s*.*%>", "high"),
        threat!("ssti", "jinja_config", r"(?i)\{\{[\s]*config", "critical"),

        // ── XXE ───────────────────────────────────────────────────
        threat!("xxe", "doctype_entity", r"(?i)<!\s*(DOCTYPE|ENTITY)", "critical"),
        threat!("xxe", "system_entity", r"(?i)SYSTEM\s+[\"']", "critical"),

        // ── LDAP Injection ─────────────────────────────────────────
        threat!("ldap", "ldap_wildcard", r"\*\)\(|\)\(.*\*", "high"),

        // ── SSRF indicators ────────────────────────────────────────
        threat!("ssrf", "internal_ip", r"(?i)(127\.0\.0\.1|localhost|0\.0\.0\.0|169\.254\.169\.254|metadata\.google)", "high"),
        threat!("ssrf", "gopher_dict", r"(?i)(gopher|dict|file)://", "critical"),

        // ── Log Injection ──────────────────────────────────────────
        threat!("log_injection", "crlf", r"(%0[dDaA]|\\r|\\n)", "medium"),
    ]
});

pub fn scan_threats(payload: &Value) -> ThreatReport {
    let start = std::time::Instant::now();
    let mut threats = Vec::new();
    let mut scanned = 0usize;

    collect_threats(payload, "", &mut threats, &mut scanned);

    let elapsed = start.elapsed().as_micros() as u64;

    let threat_level = if threats.iter().any(|t| t.severity == "critical") {
        "critical"
    } else if threats.iter().any(|t| t.severity == "high") {
        "high"
    } else if threats.iter().any(|t| t.severity == "medium") {
        "medium"
    } else if !threats.is_empty() {
        "low"
    } else {
        "none"
    };

    ThreatReport {
        threat_level: threat_level.to_string(),
        threats,
        total_scanned: scanned,
        scan_time_us: elapsed,
    }
}

fn collect_threats(
    value: &Value,
    field: &str,
    threats: &mut Vec<ThreatMatch>,
    scanned: &mut usize,
) {
    match value {
        Value::String(s) => {
            *scanned += 1;
            for pat in PATTERNS.iter() {
                if let Some(m) = pat.regex.find(s) {
                    threats.push(ThreatMatch {
                        category: pat.category.to_string(),
                        pattern_name: pat.name.to_string(),
                        matched: m.as_str().chars().take(80).collect(),
                        severity: pat.severity.to_string(),
                        field: field.to_string(),
                    });
                }
            }
        }
        Value::Object(map) => {
            for (k, v) in map {
                let path = if field.is_empty() {
                    k.clone()
                } else {
                    format!("{}.{}", field, k)
                };
                collect_threats(v, &path, threats, scanned);
            }
        }
        Value::Array(arr) => {
            for (i, v) in arr.iter().enumerate() {
                let path = format!("{}[{}]", field, i);
                collect_threats(v, &path, threats, scanned);
            }
        }
        _ => {}
    }
}
