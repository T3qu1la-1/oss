use serde::Serialize;
use serde_json::Value;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

#[derive(Debug, Serialize)]
pub struct IpReport {
    pub ip: String,
    pub valid: bool,
    pub version: String,
    pub is_private: bool,
    pub is_loopback: bool,
    pub is_reserved: bool,
    pub is_link_local: bool,
    pub risk_level: String,
    pub risk_reasons: Vec<String>,
}

pub fn check_ip(payload: &Value) -> Result<IpReport, String> {
    let ip_str = payload
        .as_str()
        .or_else(|| payload.get("ip").and_then(|v| v.as_str()))
        .ok_or_else(|| "expected string IP or object with 'ip' field".to_string())?;

    let ip_str = ip_str.trim();

    let addr: IpAddr = ip_str
        .parse()
        .map_err(|e| format!("invalid IP address '{}': {}", ip_str, e))?;

    let mut reasons = Vec::new();

    let (is_private, is_loopback, is_reserved, is_link_local, version) = match addr {
        IpAddr::V4(v4) => {
            let private = v4.is_private();
            let loopback = v4.is_loopback();
            let link_local = v4.is_link_local();
            let reserved = is_v4_reserved(v4);

            if private {
                reasons.push("RFC1918 private IP range".to_string());
            }
            if loopback {
                reasons.push("loopback address".to_string());
            }
            if link_local {
                reasons.push("link-local address (169.254.x.x)".to_string());
            }
            if reserved {
                reasons.push("reserved/special-purpose address".to_string());
            }

            // Cloud metadata detection
            if v4.octets()[0] == 169 && v4.octets()[1] == 254 && v4.octets()[2] == 169 && v4.octets()[3] == 254 {
                reasons.push("AWS/cloud metadata endpoint".to_string());
            }

            (private, loopback, reserved, link_local, "IPv4".to_string())
        }
        IpAddr::V6(v6) => {
            let loopback = v6.is_loopback();
            let link_local = is_v6_link_local(v6);
            let private = is_v6_private(v6);

            if loopback {
                reasons.push("IPv6 loopback (::1)".to_string());
            }
            if link_local {
                reasons.push("IPv6 link-local (fe80::)".to_string());
            }
            if private {
                reasons.push("IPv6 unique-local (fc00::/7)".to_string());
            }

            (private, loopback, false, link_local, "IPv6".to_string())
        }
    };

    let risk_level = if is_loopback || reasons.iter().any(|r| r.contains("metadata")) {
        "critical"
    } else if is_private || is_link_local {
        "high"
    } else if is_reserved {
        "medium"
    } else if !reasons.is_empty() {
        "low"
    } else {
        "none"
    };

    Ok(IpReport {
        ip: ip_str.to_string(),
        valid: true,
        version,
        is_private,
        is_loopback,
        is_reserved,
        is_link_local,
        risk_level: risk_level.to_string(),
        risk_reasons: reasons,
    })
}

fn is_v4_reserved(ip: Ipv4Addr) -> bool {
    let o = ip.octets();
    // 0.0.0.0/8 | 100.64.0.0/10 (CGN) | 192.0.0.0/24 | 198.18.0.0/15 (benchmark)
    // 198.51.100.0/24 | 203.0.113.0/24 (doc) | 224.0.0.0/4 (multicast) | 240.0.0.0/4
    o[0] == 0
        || (o[0] == 100 && (o[1] & 0xC0) == 64)
        || (o[0] == 192 && o[1] == 0 && o[2] == 0)
        || (o[0] == 198 && (o[1] == 18 || o[1] == 19))
        || (o[0] == 198 && o[1] == 51 && o[2] == 100)
        || (o[0] == 203 && o[1] == 0 && o[2] == 113)
        || o[0] >= 224
}

fn is_v6_link_local(ip: Ipv6Addr) -> bool {
    let segments = ip.segments();
    (segments[0] & 0xFFC0) == 0xFE80
}

fn is_v6_private(ip: Ipv6Addr) -> bool {
    let segments = ip.segments();
    (segments[0] & 0xFE00) == 0xFC00
}
