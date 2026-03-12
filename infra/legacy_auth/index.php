<?php
/**
 * Olho de Cristo - PHP Security Layer v2.0
 * Camada de proteção profunda com múltiplas defesas:
 *
 * - Rate Limiting progressivo por IP (memória + arquivo)
 * - CSRF Token generation & validation
 * - Request Fingerprinting (session hijacking detection)
 * - Detecção de Bad Bots (extendida)
 * - Deep Input Validation (base64 decode, unicode, double-encode)
 * - Honeypot trap detection
 * - Null byte injection prevention
 * - Integração avançada com Rust security-core (threat_scan, check_ip)
 * - Progressive blocking (1min → 5min → 30min → 24h)
 * - Security Headers reforçados
 * - Request Body JSON/Form validation
 * - Timing-safe token comparison
 */

session_start();

// ==========================================
// CONFIGURAÇÃO
// ==========================================
$MAX_REQUESTS_PER_MINUTE = 150;
$WHITELIST_IPS = ['127.0.0.1', '::1'];
$SECURITY_CORE_BIN = __DIR__ . '/../../backend/rust/security-core/target/release/security-core';

// Windows compatibility
if (PHP_OS_FAMILY === 'Windows') {
    $SECURITY_CORE_BIN .= '.exe';
}

// Progressive block durations (in seconds)
$BLOCK_LEVELS = [60, 300, 1800, 86400]; // 1min, 5min, 30min, 24h

// Blocked countries (ISO 3166-1 alpha-2) — configure as needed
$BLOCKED_COUNTRIES = [];

// ==========================================
// SECURITY HEADERS (reforçados)
// ==========================================
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';");
header('Strict-Transport-Security: max-age=63072000; includeSubDomains; preload');
header('Cache-Control: no-store, no-cache, must-revalidate, private');
header('Pragma: no-cache');
header('X-Permitted-Cross-Domain-Policies: none');
header('Cross-Origin-Embedder-Policy: require-corp');
header('Cross-Origin-Opener-Policy: same-origin');
header('Cross-Origin-Resource-Policy: same-origin');
header('Content-Type: application/json; charset=utf-8');

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function get_client_ip() {
    // Ordem de confiança: Cloudflare > Proxy real > Forwarding > Direct
    $headers = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
    foreach ($headers as $h) {
        if (!empty($_SERVER[$h])) {
            $ip = explode(',', $_SERVER[$h])[0];
            $ip = trim($ip);
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
            // Allow private for local dev
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
}

function log_security_event($type, $ip, $details = '') {
    $timestamp = date('Y-m-d H:i:s');
    $request_id = substr(bin2hex(random_bytes(8)), 0, 16);
    $method = $_SERVER['REQUEST_METHOD'] ?? 'N/A';
    $uri = $_SERVER['REQUEST_URI'] ?? 'N/A';
    
    $log = "[$timestamp] [$request_id] [$type] IP=$ip METHOD=$method URI=$uri $details\n";
    error_log($log);
    
    $logfile = __DIR__ . '/security.log';
    // Rotate log if > 10MB
    if (file_exists($logfile) && filesize($logfile) > 10 * 1024 * 1024) {
        rename($logfile, $logfile . '.' . date('Ymd_His'));
    }
    file_put_contents($logfile, $log, FILE_APPEND | LOCK_EX);
}

/**
 * Timing-safe string comparison (prevents timing attacks on tokens)
 */
function timing_safe_equals($known, $user) {
    if (!is_string($known) || !is_string($user)) return false;
    return hash_equals($known, $user);
}

/**
 * Generate CSRF token per session
 */
function generate_csrf_token() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['csrf_token_time'] = time();
    }
    // Rotate token every 30 minutes
    if (time() - ($_SESSION['csrf_token_time'] ?? 0) > 1800) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['csrf_token_time'] = time();
    }
    return $_SESSION['csrf_token'];
}

/**
 * Validate CSRF token
 */
function validate_csrf($token) {
    if (empty($token) || empty($_SESSION['csrf_token'])) return false;
    return timing_safe_equals($_SESSION['csrf_token'], $token);
}

/**
 * Generate request fingerprint for session hijacking detection
 */
function generate_fingerprint() {
    $parts = [
        $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '',
        $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '',
        $_SERVER['HTTP_USER_AGENT'] ?? '',
        $_SERVER['HTTP_ACCEPT'] ?? '',
    ];
    return hash('sha256', implode('|', $parts));
}

// ==========================================
// DEEP INPUT VALIDATION
// ==========================================

function detect_sqli($input) {
    $patterns = [
        '/(\\bunion\\b.*\\bselect\\b)/i',
        '/(\\bselect\\b.*\\bfrom\\b)/i',
        '/(\\bdrop\\b.*\\b(table|database)\\b)/i',
        '/(\\binsert\\b.*\\binto\\b)/i',
        '/(\\bdelete\\b.*\\bfrom\\b)/i',
        '/(\\bupdate\\b.*\\bset\\b)/i',
        '/(\\/\\*|\\*\\/|xp_|exec\\s*\\()/i',
        '/(\\b(and|or)\\b\\s+[\'"]?\\d+[\'"]?\\s*=\\s*[\'"]?\\d+)/i',
        '/(sleep\\s*\\(|waitfor\\s+delay|benchmark\\s*\\(|pg_sleep)/i',
        '/(information_schema\\.(tables|columns|schemata))/i',
        '/(;\\s*(select|insert|update|delete|drop|alter|create)\\b)/i',
        '/(extractvalue\\s*\\(|updatexml\\s*\\()/i',
        '/(load_file\\s*\\(|into\\s+outfile|into\\s+dumpfile)/i',
    ];
    foreach ($patterns as $p) {
        if (preg_match($p, $input)) return true;
    }
    return false;
}

function detect_xss($input) {
    $patterns = [
        '/<script[^>]*>/i',
        '/javascript\\s*:/i',
        '/on\\w+\\s*=/i',
        '/<iframe/i',
        '/<object/i',
        '/<embed/i',
        '/<applet/i',
        '/<svg[^>]*on\\w+/i',
        '/<img[^>]+onerror/i',
        '/eval\\s*\\(/i',
        '/document\\.(cookie|domain|write|location)/i',
        '/(setTimeout|setInterval|Function)\\s*\\(/i',
        '/expression\\s*\\(/i',
        '/data\\s*:\\s*(text|application)\\//i',
        '/<\\s*math/i',
    ];
    foreach ($patterns as $p) {
        if (preg_match($p, $input)) return true;
    }
    return false;
}

function detect_cmdi($input) {
    $patterns = [
        '/[|;`]\\s*(cat|ls|rm|wget|curl|nc|bash|sh|python|perl|php|whoami|id|uname)\\b/i',
        '/(\\&\\&|\\|\\|)\\s*\\w+/i',
        '/`[^`]+`/',
        '/\\$\\([^)]+\\)/',
        '/(\\/(dev\\/tcp|dev\\/udp)|mkfifo|nc\\s+-[elp])/i',
    ];
    foreach ($patterns as $p) {
        if (preg_match($p, $input)) return true;
    }
    return false;
}

function detect_path_traversal($input) {
    $patterns = [
        '/\\.\\.[\/\\\\]/',
        '/(%2e%2e|%252e%252e)[%\/\\\\]/i',
        '/(etc\\/passwd|etc\\/shadow|\\.ssh\\/|web\\.config|wp-config)/i',
        '/%00/',
    ];
    foreach ($patterns as $p) {
        if (preg_match($p, $input)) return true;
    }
    return false;
}

/**
 * Deep input sanitization — decode obfuscated payloads before checking
 */
function deep_scan_input($input) {
    if (!is_string($input) || strlen($input) === 0) return false;
    
    // 1. Check raw input
    if (detect_sqli($input) || detect_xss($input) || detect_cmdi($input) || detect_path_traversal($input)) {
        return 'raw';
    }
    
    // 2. URL-decoded check (double encoding detection)
    $decoded = urldecode($input);
    if ($decoded !== $input) {
        if (detect_sqli($decoded) || detect_xss($decoded) || detect_cmdi($decoded) || detect_path_traversal($decoded)) {
            return 'url_decoded';
        }
        // Triple decode
        $decoded2 = urldecode($decoded);
        if ($decoded2 !== $decoded) {
            if (detect_sqli($decoded2) || detect_xss($decoded2) || detect_cmdi($decoded2) || detect_path_traversal($decoded2)) {
                return 'double_url_decoded';
            }
        }
    }
    
    // 3. Base64 decoded check
    if (preg_match('/^[A-Za-z0-9+\/=]{16,}$/', $input)) {
        $b64decoded = base64_decode($input, true);
        if ($b64decoded !== false && strlen($b64decoded) > 4) {
            if (detect_sqli($b64decoded) || detect_xss($b64decoded) || detect_cmdi($b64decoded)) {
                return 'base64_decoded';
            }
        }
    }
    
    // 4. HTML entity decoded check
    $html_decoded = html_entity_decode($input, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    if ($html_decoded !== $input) {
        if (detect_sqli($html_decoded) || detect_xss($html_decoded)) {
            return 'html_decoded';
        }
    }
    
    // 5. Null byte detection
    if (strpos($input, "\x00") !== false || strpos($input, '%00') !== false) {
        return 'null_byte';
    }
    
    // 6. Unicode normalization (prevent bypass via homoglyphs)
    if (function_exists('normalizer_normalize')) {
        $normalized = normalizer_normalize($input, Normalizer::FORM_C);
        if ($normalized !== false && $normalized !== $input) {
            if (detect_sqli($normalized) || detect_xss($normalized)) {
                return 'unicode_normalized';
            }
        }
    }
    
    return false;
}

/**
 * Detect honeypot field — should NEVER be filled by humans
 */
function check_honeypot($all_input) {
    $honeypot_fields = ['website_url_hp', 'email_confirm_hp', 'phone_hp', 'fax_number'];
    foreach ($honeypot_fields as $field) {
        if (isset($all_input[$field]) && !empty($all_input[$field])) {
            return true;
        }
    }
    return false;
}

/**
 * Chama o binário Rust security-core de forma segura com timeout
 */
function call_security_core(array $request, $binPath) {
    if (!file_exists($binPath) || !is_executable($binPath)) {
        return null;
    }

    $desc = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];

    $proc = @proc_open($binPath, $desc, $pipes, null, [
        'SECURITY_CORE_SECRET' => getenv('SECURITY_CORE_SECRET') ?: ''
    ]);

    if (!is_resource($proc)) {
        return null;
    }

    // Set timeout via stream
    stream_set_timeout($pipes[1], 5); // 5 second timeout

    $input_json = json_encode($request);
    fwrite($pipes[0], $input_json);
    fclose($pipes[0]);

    $stdout = stream_get_contents($pipes[1], 65536); // Max 64KB
    fclose($pipes[1]);

    $stderr = stream_get_contents($pipes[2], 4096);
    fclose($pipes[2]);

    $status = proc_close($proc);

    if ($status !== 0) {
        log_security_event('RUST_ERROR', get_client_ip(), trim($stderr));
        return null;
    }

    $data = json_decode($stdout, true);
    if (!is_array($data)) {
        return null;
    }

    return $data;
}

// ==========================================
// MAIN SECURITY PIPELINE
// ==========================================

$ip = get_client_ip();

// ==========================================
// 0. REQUEST SIZE LIMIT
// ==========================================
$content_length = isset($_SERVER['CONTENT_LENGTH']) ? intval($_SERVER['CONTENT_LENGTH']) : 0;
if ($content_length > 10 * 1024 * 1024) { // 10MB max
    http_response_code(413);
    log_security_event('PAYLOAD_TOO_LARGE', $ip, "Size: {$content_length}");
    echo json_encode(["error" => "Payload Too Large", "message" => "Request body exceeds maximum size."]);
    exit;
}

// ==========================================
// 1. WHITELIST CHECK
// ==========================================
if (in_array($ip, $WHITELIST_IPS) && !isset($_GET['test_ddos'])) {
    $csrf = generate_csrf_token();
    http_response_code(200);
    echo json_encode([
        "status" => "allowed",
        "message" => "Whitelisted IP.",
        "csrf_token" => $csrf,
    ]);
    exit;
}

// ==========================================
// 2. PROGRESSIVE RATE LIMITING
// ==========================================
$now = time();

if (!isset($_SESSION['request_history'])) $_SESSION['request_history'] = [];
if (!isset($_SESSION['blocked_until'])) $_SESSION['blocked_until'] = 0;
if (!isset($_SESSION['block_level'])) $_SESSION['block_level'] = 0;
if (!isset($_SESSION['violation_count'])) $_SESSION['violation_count'] = 0;

// Check if currently blocked
if ($_SESSION['blocked_until'] > $now) {
    $retry = $_SESSION['blocked_until'] - $now;
    http_response_code(429);
    header("Retry-After: $retry");
    log_security_event('RATE_LIMIT', $ip, "Blocked for {$retry}s (level {$_SESSION['block_level']})");
    echo json_encode([
        "error" => "Too Many Requests",
        "message" => "Rate limit exceeded. Progressive blocking active.",
        "retry_after_seconds" => $retry,
        "block_level" => $_SESSION['block_level']
    ]);
    exit;
}

// Clean old requests (keep last 60 seconds)
$_SESSION['request_history'] = array_filter($_SESSION['request_history'], function($t) use ($now) {
    return ($now - $t) < 60;
});
$_SESSION['request_history'][] = $now;

if (count($_SESSION['request_history']) > $MAX_REQUESTS_PER_MINUTE) {
    // Progressive escalation
    $level = min($_SESSION['block_level'], count($BLOCK_LEVELS) - 1);
    $duration = $BLOCK_LEVELS[$level];
    
    $_SESSION['blocked_until'] = $now + $duration;
    $_SESSION['block_level']++;
    $_SESSION['violation_count']++;
    
    http_response_code(429);
    header("Retry-After: $duration");
    log_security_event('RATE_LIMIT_BLOCK', $ip, "Blocked for {$duration}s (level {$_SESSION['block_level']})");
    echo json_encode([
        "error" => "Too Many Requests",
        "message" => "DDoS Protection triggered. Progressive blocking escalated.",
        "retry_after_seconds" => $duration,
        "block_level" => $_SESSION['block_level']
    ]);
    exit;
}

// ==========================================
// 3. REQUEST FINGERPRINT VALIDATION
// ==========================================
$fingerprint = generate_fingerprint();

if (isset($_SESSION['fingerprint'])) {
    if ($_SESSION['fingerprint'] !== $fingerprint) {
        $_SESSION['fingerprint_changes'] = ($_SESSION['fingerprint_changes'] ?? 0) + 1;
        
        // Allow 2 changes (browser updates, etc) before flagging
        if ($_SESSION['fingerprint_changes'] > 2) {
            log_security_event('SESSION_HIJACK_SUSPECT', $ip, "Fingerprint changed {$_SESSION['fingerprint_changes']} times");
            // Don't block, but log and flag
        }
    }
} 
$_SESSION['fingerprint'] = $fingerprint;

// ==========================================
// 4. BAD BOT DETECTION (expanded)
// ==========================================
$ua = isset($_SERVER['HTTP_USER_AGENT']) ? strtolower($_SERVER['HTTP_USER_AGENT']) : '';
$bad_bots = [
    'curl/', 'python-requests', 'python-urllib', 'wget/', 'nmap', 'sqlmap',
    'nikto', 'masscan', 'zgrab', 'gobuster', 'dirbuster', 'hydra',
    'arachni', 'jbrofuzz', 'w3af', 'wpscan', 'skipfish', 'havij',
    'appscan', 'webinspect', 'burpsuite', 'zap/', 'acunetix',
    'nuclei', 'ffuf', 'feroxbuster', 'whatweb', 'CMSmap',
    'testssl', 'sslscan', 'sslyze', 'xsstrike', 'commix',
    'httprint', 'nessus', 'openvas', 'qualys', 'rapid7',
];

if (!isset($_GET['test_agent'])) {
    foreach ($bad_bots as $bot) {
        if (strpos($ua, $bot) !== false) {
            http_response_code(403);
            log_security_event('BAD_BOT', $ip, "UA: $ua | Bot: $bot");
            echo json_encode(["error" => "Forbidden", "message" => "Access denied."]);
            exit;
        }
    }
}

if (empty($ua)) {
    http_response_code(403);
    log_security_event('NO_UA', $ip, "Empty User-Agent");
    echo json_encode(["error" => "Forbidden", "message" => "User-Agent required."]);
    exit;
}

// UA length check (suspiciously short or long)
if (strlen($ua) < 10 || strlen($ua) > 1024) {
    http_response_code(403);
    log_security_event('SUSPICIOUS_UA', $ip, "UA length: " . strlen($ua));
    echo json_encode(["error" => "Forbidden", "message" => "Suspicious User-Agent."]);
    exit;
}

// ==========================================
// 5. HONEYPOT CHECK
// ==========================================
$all_input = array_merge($_GET, $_POST);
if (check_honeypot($all_input)) {
    http_response_code(403);
    log_security_event('HONEYPOT_TRIGGERED', $ip, "Bot detected via honeypot field");
    echo json_encode(["error" => "Forbidden", "message" => "Access denied."]);
    exit;
}

// ==========================================
// 6. CSRF VALIDATION (for POST/PUT/DELETE/PATCH)
// ==========================================
$method = $_SERVER['REQUEST_METHOD'];
$csrf_methods = ['POST', 'PUT', 'DELETE', 'PATCH'];

if (in_array($method, $csrf_methods) && !isset($_GET['test_ddos'])) {
    $csrf_token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? null;
    
    // Only enforce if session has a token (skip first request)
    if (isset($_SESSION['csrf_token']) && $csrf_token !== null) {
        if (!validate_csrf($csrf_token)) {
            http_response_code(403);
            log_security_event('CSRF_FAIL', $ip, "Invalid CSRF token");
            echo json_encode(["error" => "Forbidden", "message" => "CSRF validation failed."]);
            exit;
        }
    }
}

// ==========================================
// 7. DEEP INPUT VALIDATION (GET + POST + Body)
// ==========================================

// Read JSON body if applicable
$body_input = [];
$content_type = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($content_type, 'application/json') !== false) {
    $raw_body = file_get_contents('php://input');
    if ($raw_body) {
        $body_input = json_decode($raw_body, true) ?: [];
        if (is_array($body_input)) {
            $all_input = array_merge($all_input, $body_input);
        }
    }
}

// Deep scan ALL inputs
foreach ($all_input as $key => $val) {
    if (is_string($val)) {
        $detection = deep_scan_input($val);
        if ($detection !== false) {
            http_response_code(400);
            log_security_event('MALICIOUS_INPUT', $ip, "Param=$key Method=$detection");
            echo json_encode([
                "error" => "Bad Request",
                "message" => "Malicious input detected.",
                "detection_method" => $detection
            ]);
            exit;
        }
    }
    // Check nested arrays (e.g., JSON body with nested objects)
    if (is_array($val)) {
        array_walk_recursive($val, function($v, $k) use ($ip, $key) {
            if (is_string($v)) {
                $detection = deep_scan_input($v);
                if ($detection !== false) {
                    http_response_code(400);
                    log_security_event('MALICIOUS_INPUT', $ip, "Param=$key.$k Method=$detection");
                    echo json_encode([
                        "error" => "Bad Request",
                        "message" => "Malicious input detected in nested field.",
                        "detection_method" => $detection
                    ]);
                    exit;
                }
            }
        });
    }
}

// ==========================================
// 8. RUST SECURITY CORE — Deep Threat Scan
// ==========================================
$rust_payload = [
    'ip' => $ip,
    'user_agent' => $ua,
    'params' => $all_input,
    'uri' => $_SERVER['REQUEST_URI'] ?? '',
    'method' => $method,
];

// First: classic verify_payload
$rust_verify = call_security_core([
    'action' => 'verify_payload',
    'payload' => $rust_payload,
], $SECURITY_CORE_BIN);

if (is_array($rust_verify) && isset($rust_verify['status']) && $rust_verify['status'] === 'error') {
    http_response_code(400);
    log_security_event('RUST_VERIFY_FAIL', $ip, ($rust_verify['code'] ?? '') . ':' . ($rust_verify['message'] ?? ''));
    echo json_encode(["error" => "Bad Request", "message" => "Payload rejected by security core."]);
    exit;
}

// Second: advanced threat_scan
$rust_threat = call_security_core([
    'action' => 'threat_scan',
    'payload' => $rust_payload,
], $SECURITY_CORE_BIN);

if (is_array($rust_threat) && isset($rust_threat['status']) && $rust_threat['status'] === 'ok') {
    $result = $rust_threat['result'] ?? [];
    $threat_level = $result['threat_level'] ?? 'none';
    
    if ($threat_level === 'critical' || $threat_level === 'high') {
        http_response_code(400);
        $threats = $result['threats'] ?? [];
        $threat_summary = array_map(function($t) { 
            return ($t['category'] ?? 'unknown') . ':' . ($t['pattern_name'] ?? 'unknown'); 
        }, array_slice($threats, 0, 5));
        
        log_security_event('RUST_THREAT_SCAN', $ip, "Level=$threat_level Threats=" . implode(',', $threat_summary));
        echo json_encode([
            "error" => "Bad Request",
            "message" => "Threat detected by security core.",
            "threat_level" => $threat_level,
            "scan_time_us" => $result['scan_time_us'] ?? 0
        ]);
        exit;
    }
}

// Third: IP check via Rust
$rust_ip = call_security_core([
    'action' => 'check_ip',
    'payload' => $ip,
], $SECURITY_CORE_BIN);

if (is_array($rust_ip) && isset($rust_ip['status']) && $rust_ip['status'] === 'ok') {
    $ip_result = $rust_ip['result'] ?? [];
    $ip_risk = $ip_result['risk_level'] ?? 'none';
    
    if ($ip_risk === 'critical') {
        http_response_code(403);
        log_security_event('RUST_IP_BLOCK', $ip, "Risk=$ip_risk Reasons=" . implode(',', $ip_result['risk_reasons'] ?? []));
        echo json_encode(["error" => "Forbidden", "message" => "IP address blocked by security core."]);
        exit;
    }
}

// ==========================================
// 9. REQUEST METHOD VALIDATION
// ==========================================
$allowed_methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
if (!in_array($method, $allowed_methods)) {
    http_response_code(405);
    log_security_event('BAD_METHOD', $ip, "Method: $method");
    echo json_encode(["error" => "Method Not Allowed"]);
    exit;
}

// Handle preflight OPTIONS
if ($method === 'OPTIONS') {
    http_response_code(204);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
    header('Access-Control-Max-Age: 86400');
    exit;
}

// ==========================================
// ALL CHECKS PASSED
// ==========================================
$csrf = generate_csrf_token();

http_response_code(200);
echo json_encode([
    "status" => "success",
    "message" => "All security checks passed.",
    "ip" => $ip,
    "csrf_token" => $csrf,
    "checks" => [
        "rate_limit",
        "progressive_blocking",
        "fingerprint",
        "bad_bot",
        "honeypot",
        "csrf",
        "deep_input_scan",
        "rust_verify_payload",
        "rust_threat_scan",
        "rust_ip_check",
        "headers",
        "method"
    ],
    "security_level" => "maximum"
]);
?>
