use std::env;
use std::io::{self, Read};

mod crypto;
mod validation;
mod integrity;

use crypto::{compute_hash, sign_message, verify_signature};
use integrity::validate_integrity;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use validation::verify_payload;

#[derive(Debug, Deserialize)]
struct Request {
    action: String,
    #[serde(default)]
    payload: Value,
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "lowercase")]
enum Response {
    Ok { result: Value },
    Error { code: String, message: String },
}

fn main() {
    let mut input = String::new();
    if let Err(e) = io::stdin().read_to_string(&mut input) {
        write_error("io_error", &format!("failed to read stdin: {e}"));
        std::process::exit(1);
    }

    let req: Request = match serde_json::from_str(&input) {
        Ok(v) => v,
        Err(e) => {
            write_error("invalid_json", &format!("invalid JSON: {e}"));
            std::process::exit(1);
        }
    };

    let resp = match req.action.as_str() {
        "verify_payload" => match verify_payload(&req.payload) {
            Ok(()) => Response::Ok {
                result: json!({ "valid": true }),
            },
            Err(e) => Response::Error {
                code: e.code().to_string(),
                message: e.to_string(),
            },
        },
        "compute_hash" => {
            let s = match req.payload.as_str() {
                Some(s) => s,
                None => {
                    write_error("invalid_payload", "compute_hash expects string payload");
                    std::process::exit(1);
                }
            };
            let hash = compute_hash(s);
            Response::Ok {
                result: json!({ "hash_sha256": hash }),
            }
        }
        "sign_message" => {
            let s = match req.payload.as_str() {
                Some(s) => s,
                None => {
                    write_error("invalid_payload", "sign_message expects string payload");
                    std::process::exit(1);
                }
            };
            let secret = match env::var("SECURITY_CORE_SECRET") {
                Ok(v) if !v.is_empty() => v,
                _ => {
                    write_error(
                        "missing_secret",
                        "SECURITY_CORE_SECRET not set; refusing to sign",
                    );
                    std::process::exit(1);
                }
            };
            let sig = sign_message(s, &secret);
            Response::Ok {
                result: json!({ "signature": sig }),
            }
        }
        "verify_signature" => {
            let obj = match req.payload.as_object() {
                Some(o) => o,
                None => {
                    write_error(
                        "invalid_payload",
                        "verify_signature expects object {message, signature}",
                    );
                    std::process::exit(1);
                }
            };
            let message = match obj.get("message").and_then(|v| v.as_str()) {
                Some(s) => s,
                None => {
                    write_error("invalid_payload", "field 'message' must be string");
                    std::process::exit(1);
                }
            };
            let signature = match obj.get("signature").and_then(|v| v.as_str()) {
                Some(s) => s,
                None => {
                    write_error("invalid_payload", "field 'signature' must be string");
                    std::process::exit(1);
                }
            };
            let secret = match env::var("SECURITY_CORE_SECRET") {
                Ok(v) if !v.is_empty() => v,
                _ => {
                    write_error(
                        "missing_secret",
                        "SECURITY_CORE_SECRET not set; refusing to verify",
                    );
                    std::process::exit(1);
                }
            };
            let valid = verify_signature(message, signature, &secret);
            Response::Ok {
                result: json!({ "valid": valid }),
            }
        }
        "validate_integrity" => match validate_integrity(&req.payload) {
            Ok(report) => Response::Ok {
                result: serde_json::to_value(report).unwrap_or_else(|_| json!({ "ok": false })),
            },
            Err(e) => Response::Error {
                code: e.code().to_string(),
                message: e.to_string(),
            },
        },
        _ => Response::Error {
            code: "unknown_action".to_string(),
            message: format!("unsupported action: {}", req.action),
        },
    };

    if let Err(e) = serde_json::to_writer(io::stdout(), &resp) {
        eprintln!(r#"{{"status":"error","code":"io_error","message":"failed to write stdout: {e}"}}"#);
        std::process::exit(1);
    }
}

fn write_error(code: &str, message: &str) {
    let resp = Response::Error {
        code: code.to_string(),
        message: message.to_string(),
    };
    if let Err(e) = serde_json::to_writer(io::stdout(), &resp) {
        eprintln!(r#"{{"status":"error","code":"io_error","message":"failed to write error: {e}"}}"#);
    }
}

