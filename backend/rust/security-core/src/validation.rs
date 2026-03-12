use serde_json::Value;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ValidationError {
    #[error("payload too large")]
    TooLarge,
    #[error("payload contains forbidden characters")]
    ForbiddenChars,
    #[error("payload structure invalid")]
    InvalidStructure,
}

impl ValidationError {
    pub fn code(&self) -> &'static str {
        match self {
            ValidationError::TooLarge => "too_large",
            ValidationError::ForbiddenChars => "forbidden_chars",
            ValidationError::InvalidStructure => "invalid_structure",
        }
    }
}

pub fn verify_payload(payload: &Value) -> Result<(), ValidationError> {
    let serialized = serde_json::to_string(payload).unwrap_or_default();

    if serialized.len() > 32 * 1024 {
        return Err(ValidationError::TooLarge);
    }

    let forbidden = ['\u{0000}', '\u{0001}', '\u{0002}', '\u{0003}', '\u{0004}', '\u{0005}'];
    if serialized.chars().any(|c| forbidden.contains(&c)) {
        return Err(ValidationError::ForbiddenChars);
    }

    Ok(())
}

