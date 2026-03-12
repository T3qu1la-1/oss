use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum IntegrityError {
    #[error("invalid integrity payload")]
    InvalidPayload,
}

impl IntegrityError {
    pub fn code(&self) -> &'static str {
        match self {
            IntegrityError::InvalidPayload => "invalid_integrity_payload",
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IntegrityReport {
    pub ok: bool,
    pub issues: Vec<String>,
}

pub fn validate_integrity(payload: &Value) -> Result<IntegrityReport, IntegrityError> {
    if !payload.is_object() {
        return Err(IntegrityError::InvalidPayload);
    }

    let mut issues = Vec::new();

    if let Some(obj) = payload.as_object() {
        if obj.get("ip").is_none() {
            issues.push("missing_ip".to_string());
        }
        if obj.get("user_agent").is_none() {
            issues.push("missing_user_agent".to_string());
        }
    }

    Ok(IntegrityReport {
        ok: issues.is_empty(),
        issues,
    })
}

