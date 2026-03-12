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
    #[error("payload nesting too deep (max {0} levels)")]
    TooDeep(usize),
    #[error("too many keys (max {0})")]
    TooManyKeys(usize),
    #[error("string value too long (max {0} bytes)")]
    StringTooLong(usize),
}

impl ValidationError {
    pub fn code(&self) -> &'static str {
        match self {
            ValidationError::TooLarge => "too_large",
            ValidationError::ForbiddenChars => "forbidden_chars",
            ValidationError::InvalidStructure => "invalid_structure",
            ValidationError::TooDeep(_) => "too_deep",
            ValidationError::TooManyKeys(_) => "too_many_keys",
            ValidationError::StringTooLong(_) => "string_too_long",
        }
    }
}

const MAX_PAYLOAD_SIZE: usize = 64 * 1024; // 64 KB
const MAX_DEPTH: usize = 15;
const MAX_KEYS: usize = 200;
const MAX_STRING_LEN: usize = 16 * 1024; // 16 KB per string

pub fn verify_payload(payload: &Value) -> Result<(), ValidationError> {
    // Size check
    let serialized = serde_json::to_string(payload).unwrap_or_default();
    if serialized.len() > MAX_PAYLOAD_SIZE {
        return Err(ValidationError::TooLarge);
    }

    // Forbidden control characters
    let forbidden = [
        '\u{0000}', '\u{0001}', '\u{0002}', '\u{0003}', '\u{0004}', '\u{0005}',
        '\u{0006}', '\u{0007}', '\u{0008}', '\u{000B}', '\u{000C}', '\u{000E}',
        '\u{000F}', '\u{007F}',
    ];
    if serialized.chars().any(|c| forbidden.contains(&c)) {
        return Err(ValidationError::ForbiddenChars);
    }

    // Recursive structure validation
    let mut key_count = 0usize;
    validate_recursive(payload, 0, &mut key_count)?;

    Ok(())
}

fn validate_recursive(
    value: &Value,
    depth: usize,
    key_count: &mut usize,
) -> Result<(), ValidationError> {
    if depth > MAX_DEPTH {
        return Err(ValidationError::TooDeep(MAX_DEPTH));
    }

    match value {
        Value::String(s) => {
            if s.len() > MAX_STRING_LEN {
                return Err(ValidationError::StringTooLong(MAX_STRING_LEN));
            }
        }
        Value::Object(map) => {
            *key_count += map.len();
            if *key_count > MAX_KEYS {
                return Err(ValidationError::TooManyKeys(MAX_KEYS));
            }
            for v in map.values() {
                validate_recursive(v, depth + 1, key_count)?;
            }
        }
        Value::Array(arr) => {
            for v in arr {
                validate_recursive(v, depth + 1, key_count)?;
            }
        }
        _ => {}
    }

    Ok(())
}
