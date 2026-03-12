use hmac::{Hmac, Mac};
use serde::Serialize;
use serde_json::Value;
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Serialize)]
pub struct JwtReport {
    pub valid: bool,
    pub issues: Vec<String>,
    pub header: Option<Value>,
    pub claims: Option<Value>,
    pub expired: bool,
    pub risk_level: String,
}

pub fn validate_jwt(payload: &Value) -> Result<JwtReport, String> {
    let obj = payload
        .as_object()
        .ok_or("expected object with 'token' field")?;

    let token = obj
        .get("token")
        .and_then(|v| v.as_str())
        .ok_or("missing 'token' field")?;

    let secret = obj.get("secret").and_then(|v| v.as_str());

    let mut issues = Vec::new();
    let mut risk_level = "none";

    // Split token
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Ok(JwtReport {
            valid: false,
            issues: vec!["JWT must have exactly 3 parts (header.payload.signature)".into()],
            header: None,
            claims: None,
            expired: false,
            risk_level: "critical".into(),
        });
    }

    // Decode header
    let header_json = base64_url_decode(parts[0]).map_err(|e| format!("invalid header base64: {}", e))?;
    let header: Value = serde_json::from_slice(&header_json)
        .map_err(|e| format!("invalid header JSON: {}", e))?;

    // Check alg:none attack
    if let Some(alg) = header.get("alg").and_then(|v| v.as_str()) {
        let alg_lower = alg.to_lowercase();
        if alg_lower == "none" || alg_lower == "" {
            issues.push("CRITICAL: Algorithm 'none' detected - authentication bypass possible".into());
            risk_level = "critical";
        }
        if alg_lower == "hs256" && header.get("typ").and_then(|v| v.as_str()) == Some("JWT") {
            // Normal case
        }
        // Algorithm confusion check
        if alg_lower.starts_with("rs") || alg_lower.starts_with("es") || alg_lower.starts_with("ps") {
            if secret.is_some() {
                issues.push("WARNING: Asymmetric algorithm but HMAC secret provided - possible algorithm confusion attack".into());
                if risk_level != "critical" {
                    risk_level = "high";
                }
            }
        }
    } else {
        issues.push("CRITICAL: No algorithm specified in header".into());
        risk_level = "critical";
    }

    // Decode claims
    let claims_json = base64_url_decode(parts[1]).map_err(|e| format!("invalid claims base64: {}", e))?;
    let claims: Value = serde_json::from_slice(&claims_json)
        .map_err(|e| format!("invalid claims JSON: {}", e))?;

    // Check expiration
    let mut expired = false;
    if let Some(exp) = claims.get("exp").and_then(|v| v.as_i64()) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;
        if now > exp {
            expired = true;
            issues.push("Token is expired".into());
            if risk_level == "none" {
                risk_level = "low";
            }
        }
    } else {
        issues.push("No expiration claim (exp) - token never expires".into());
        if risk_level == "none" {
            risk_level = "medium";
        }
    }

    // Check empty signature
    if parts[2].is_empty() {
        issues.push("CRITICAL: Empty signature - token is unsigned".into());
        risk_level = "critical";
    }

    // Check sensitive claims
    if claims.get("role").and_then(|v| v.as_str()) == Some("admin") {
        issues.push("Token contains admin role claim".into());
    }
    if claims.get("sub").and_then(|v| v.as_str()) == Some("admin") {
        issues.push("Token subject is 'admin'".into());
    }

    // Verify signature if secret provided
    if let Some(sec) = secret {
        if !sec.is_empty() && !parts[2].is_empty() {
            let signing_input = format!("{}.{}", parts[0], parts[1]);
            let mut mac = HmacSha256::new_from_slice(sec.as_bytes())
                .map_err(|e| format!("HMAC error: {}", e))?;
            mac.update(signing_input.as_bytes());
            let expected = mac.finalize().into_bytes();

            let sig_bytes = base64_url_decode(parts[2]).unwrap_or_default();
            if sig_bytes != expected.as_slice() {
                issues.push("Signature verification FAILED - token may be tampered".into());
                if risk_level == "none" || risk_level == "low" || risk_level == "medium" {
                    risk_level = "high";
                }
            }
        }
    }

    // Check weak secrets by length
    if let Some(sec) = secret {
        if sec.len() < 32 {
            issues.push("WARNING: Secret is less than 32 bytes - vulnerable to brute-force".into());
            if risk_level == "none" {
                risk_level = "medium";
            }
        }
    }

    let valid = issues.is_empty();

    Ok(JwtReport {
        valid,
        issues,
        header: Some(header),
        claims: Some(claims),
        expired,
        risk_level: risk_level.into(),
    })
}

fn base64_url_decode(input: &str) -> Result<Vec<u8>, String> {
    // Add padding if needed
    let padded = match input.len() % 4 {
        2 => format!("{}==", input),
        3 => format!("{}=", input),
        _ => input.to_string(),
    };

    // Replace URL-safe chars
    let standard = padded.replace('-', "+").replace('_', "/");

    base64::decode(&standard).map_err(|e| format!("base64 decode error: {}", e))
}
