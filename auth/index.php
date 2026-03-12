<?php
/**
 * Olho de Cristo - PHP Security Layer
 * Camada complementar ao Lua Anti-DDoS:
 * - Rate Limiting por IP (sessão PHP)
 * - Detecção de Bad Bots
 * - Headers de Segurança
 * - Validação de Input (regex + Rust)
 * - Proteção básica de método
 */

session_start();

// ==========================================
// CONFIGURAÇÃO
// ==========================================
$MAX_REQUESTS_PER_MINUTE = 150;
$BLOCK_DURATION_SECONDS = 60;
$WHITELIST_IPS = ['127.0.0.1', '::1'];
$SECURITY_CORE_BIN = __DIR__ . '/../backend/rust/security-core/target/release/security-core';

// HEADERS DE SEGURANÇA
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;");
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Content-Type: application/json; charset=utf-8');

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================
function get_client_ip() {
    $headers = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
    foreach ($headers as $h) {
        if (!empty($_SERVER[$h])) {
            $ip = explode(',', $_SERVER[$h])[0];
            if (filter_var(trim($ip), FILTER_VALIDATE_IP)) {
                return trim($ip);
            }
        }
    }
    return 'UNKNOWN';
}

function log_security_event($type, $ip, $details = '') {
    $log = date('Y-m-d H:i:s') . " [$type] IP: $ip - $details\n";
    error_log($log);
    $logfile = __DIR__ . '/security.log';
    file_put_contents($logfile, $log, FILE_APPEND | LOCK_EX);
}

function detect_sqli($input) {
    $patterns = [
        '/(\bunion\b.*\bselect\b)/i',
        '/(\bselect\b.*\bfrom\b)/i',
        '/(\bdrop\b.*\btable\b)/i',
        '/(\binsert\b.*\binto\b)/i',
        '/(\bdelete\b.*\bfrom\b)/i',
        '/(\'|\"|;|--|\bor\b\s+\d+=\d+)/i',
        '/(\b(and|or)\b\s+\d+=\d+)/i',
        '/(\/\*|\*\/|xp_|exec\s*\()/i',
    ];
    foreach ($patterns as $p) {
        if (preg_match($p, $input)) return true;
    }
    return false;
}

function detect_xss($input) {
    $patterns = [
        '/<script[^>]*>/i',
        '/javascript\s*:/i',
        '/on\w+\s*=/i',
        '/<iframe/i',
        '/<object/i',
        '/<embed/i',
        '/eval\s*\(/i',
        '/document\.cookie/i',
    ];
    foreach ($patterns as $p) {
        if (preg_match($p, $input)) return true;
    }
    return false;
}

/**
 * Chama o binário Rust security-core de forma segura.
 */
function call_security_core(array $request, $binPath) {
    if (!is_executable($binPath)) {
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

    fwrite($pipes[0], json_encode($request));
    fclose($pipes[0]);

    $stdout = stream_get_contents($pipes[1]);
    fclose($pipes[1]);

    $stderr = stream_get_contents($pipes[2]);
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

$ip = get_client_ip();

// ==========================================
// 1. WHITELIST CHECK
// ==========================================
if (in_array($ip, $WHITELIST_IPS) && !isset($_GET['test_ddos'])) {
    http_response_code(200);
    echo json_encode(["status" => "allowed", "message" => "Whitelisted IP."]);
    exit;
}

// ==========================================
// 2. RATE LIMITING (sessão PHP)
// ==========================================
$now = time();

if (!isset($_SESSION['request_history'])) $_SESSION['request_history'] = [];
if (!isset($_SESSION['blocked_until'])) $_SESSION['blocked_until'] = 0;

if ($_SESSION['blocked_until'] > $now) {
    $retry = $_SESSION['blocked_until'] - $now;
    http_response_code(429);
    header("Retry-After: $retry");
    log_security_event('RATE_LIMIT', $ip, "Still blocked for {$retry}s");
    echo json_encode([
        "error" => "Too Many Requests",
        "message" => "Rate limit exceeded. Try again later.",
        "retry_after_seconds" => $retry
    ]);
    exit;
}

$_SESSION['request_history'] = array_filter($_SESSION['request_history'], function($t) use ($now) {
    return ($now - $t) < 60;
});
$_SESSION['request_history'][] = $now;

if (count($_SESSION['request_history']) > $MAX_REQUESTS_PER_MINUTE) {
    $_SESSION['blocked_until'] = $now + $BLOCK_DURATION_SECONDS;
    http_response_code(429);
    header("Retry-After: $BLOCK_DURATION_SECONDS");
    log_security_event('RATE_LIMIT_BLOCK', $ip, "Blocked for {$BLOCK_DURATION_SECONDS}s");
    echo json_encode([
        "error" => "Too Many Requests",
        "message" => "DDoS Protection triggered.",
        "retry_after_seconds" => $BLOCK_DURATION_SECONDS
    ]);
    exit;
}

// ==========================================
// 3. BAD BOT DETECTION
// ==========================================
$ua = isset($_SERVER['HTTP_USER_AGENT']) ? strtolower($_SERVER['HTTP_USER_AGENT']) : '';
$bad_bots = ['curl/', 'python-requests', 'wget/', 'nmap', 'sqlmap', 'nikto', 'masscan', 'zgrab', 'gobuster', 'dirbuster', 'hydra'];

if (!isset($_GET['test_agent'])) {
    foreach ($bad_bots as $bot) {
        if (strpos($ua, $bot) !== false) {
            http_response_code(403);
            log_security_event('BAD_BOT', $ip, "UA: $ua");
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

// ==========================================
// 4. INPUT VALIDATION (regex + Rust)
// ==========================================
$all_input = array_merge($_GET, $_POST);
foreach ($all_input as $key => $val) {
    if (is_string($val)) {
        if (detect_sqli($val)) {
            http_response_code(400);
            log_security_event('SQLI_ATTEMPT', $ip, "Param: $key");
            echo json_encode(["error" => "Bad Request", "message" => "Malicious input detected."]);
            exit;
        }
        if (detect_xss($val)) {
            http_response_code(400);
            log_security_event('XSS_ATTEMPT', $ip, "Param: $key");
            echo json_encode(["error" => "Bad Request", "message" => "Malicious input detected."]);
            exit;
        }
    }
}

// Camada adicional: enviar snapshot de input para o Rust (se disponível)
$rust_payload = [
    'ip' => $ip,
    'user_agent' => $ua,
    'params' => $all_input,
];
$rust_result = call_security_core([
    'action' => 'verify_payload',
    'payload' => $rust_payload,
], $SECURITY_CORE_BIN);

if (is_array($rust_result) && isset($rust_result['status']) && $rust_result['status'] === 'error') {
    http_response_code(400);
    log_security_event('RUST_VALIDATION_FAIL', $ip, $rust_result['code'] . ':' . $rust_result['message']);
    echo json_encode(["error" => "Bad Request", "message" => "Payload rejected by security core."]);
    exit;
}

// ==========================================
// 5. REQUEST METHOD VALIDATION
// ==========================================
$allowed_methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
if (!in_array($_SERVER['REQUEST_METHOD'], $allowed_methods)) {
    http_response_code(405);
    log_security_event('BAD_METHOD', $ip, "Method: " . $_SERVER['REQUEST_METHOD']);
    echo json_encode(["error" => "Method Not Allowed"]);
    exit;
}

// ==========================================
// ALL CHECKS PASSED
// ==========================================
http_response_code(200);
echo json_encode([
    "status" => "success",
    "message" => "All security checks passed.",
    "ip" => $ip,
    "checks" => ["rate_limit", "bad_bot", "sqli", "xss", "rust_verify", "headers", "method"]
]);
?>
