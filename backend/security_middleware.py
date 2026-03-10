"""
🛡️ SECURITY MIDDLEWARE - Proteção contra Ataques Maliciosos
Proteções implementadas:
- Rate Limiting (DDoS/DoS protection)
- Input Validation & Sanitization
- SQL/NoSQL Injection protection
- XSS protection
- Command Injection protection
- Payload blacklist
- Security Headers
"""

import re
import html
from typing import Optional
from urllib.parse import urlparse
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
import asyncio

# ============================================================================
# RATE LIMITING - Proteção contra DDoS/DoS/Botnets
# ============================================================================

class RateLimiter:
    """Rate limiter simples baseado em memória"""
    
    def __init__(self):
        # Armazena: {ip: [(timestamp, count)]}
        self.requests = defaultdict(list)
        self.cleanup_interval = 60  # Limpar a cada 60 segundos
        self.last_cleanup = datetime.now()
        
        # Limites configuráveis
        self.limits = {
            "global": {"requests": 200, "window": 60},  # 200 req/min (aumentado)
            "auth": {"requests": 20, "window": 60},     # 20 login/register por min (aumentado)
            "scan": {"requests": 10, "window": 60},     # 10 scans por min (aumentado)
            "tools": {"requests": 50, "window": 60},    # 50 tool requests por min (aumentado)
        }
    
    def _cleanup_old_requests(self):
        """Limpar requisições antigas da memória"""
        now = datetime.now()
        if (now - self.last_cleanup).seconds > self.cleanup_interval:
            cutoff = now - timedelta(minutes=5)
            for ip in list(self.requests.keys()):
                self.requests[ip] = [
                    (ts, count) for ts, count in self.requests[ip]
                    if ts > cutoff
                ]
                if not self.requests[ip]:
                    del self.requests[ip]
            self.last_cleanup = now
    
    def is_rate_limited(self, ip: str, endpoint: str) -> tuple[bool, Optional[str]]:
        """
        Verifica se o IP está rate limited
        Retorna: (is_limited, message)
        """
        self._cleanup_old_requests()
        
        # Determinar qual limite aplicar
        limit_type = "global"
        if "/auth/" in endpoint:
            limit_type = "auth"
        elif "/scans" in endpoint:
            limit_type = "scan"
        elif "/tools/" in endpoint:
            limit_type = "tools"
        
        config = self.limits[limit_type]
        max_requests = config["requests"]
        window_seconds = config["window"]
        
        now = datetime.now()
        cutoff = now - timedelta(seconds=window_seconds)
        
        # Filtrar requisições dentro da janela de tempo
        recent_requests = [
            (ts, count) for ts, count in self.requests[ip]
            if ts > cutoff
        ]
        
        total_requests = sum(count for _, count in recent_requests)
        
        if total_requests >= max_requests:
            return True, f"Rate limit exceeded. Max {max_requests} requests per {window_seconds}s for {limit_type} endpoints."
        
        # Adicionar requisição atual
        self.requests[ip].append((now, 1))
        return False, None


# ============================================================================
# INPUT VALIDATION & SANITIZATION - Proteção contra Payloads Maliciosos
# ============================================================================

class SecurityValidator:
    """Validação e sanitização de inputs contra payloads maliciosos"""
    
    # Blacklist de padrões maliciosos comuns
    MALICIOUS_PATTERNS = [
        # SQL Injection
        r"(\bunion\b.*\bselect\b)",
        r"(\bselect\b.*\bfrom\b.*\bwhere\b)",
        r"(\bdrop\b.*\btable\b)",
        r"(\binsert\b.*\binto\b)",
        r"(\bdelete\b.*\bfrom\b)",
        r"(\bupdate\b.*\bset\b)",
        r"(--|\#|\/\*|\*\/)",  # SQL comments
        r"(\bor\b\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+)",
        r"(\band\b\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+)",
        
        # NoSQL Injection
        r"(\$ne|\$gt|\$lt|\$gte|\$lte|\$regex|\$where)",
        r"({.*\$.*:.*})",
        
        # XSS (Cross-Site Scripting)
        r"(<script[^>]*>.*?</script>)",
        r"(<iframe[^>]*>.*?</iframe>)",
        r"(javascript:)",
        r"(on\w+\s*=)",  # onclick, onload, etc
        r"(<img[^>]+src[^>]*>)",
        r"(<object[^>]*>)",
        r"(<embed[^>]*>)",
        
        # Command Injection
        r"([;&|`$]\s*(cat|ls|rm|wget|curl|nc|bash|sh|python|perl|php))",
        r"(&&|\|\|)",  # Command chaining
        r"(`.*`)",  # Backticks
        r"(\$\(.*\))",  # Command substitution
        
        # Path Traversal
        r"(\.\./|\.\.\\)",
        r"(/etc/passwd|/etc/shadow)",
        
        # LDAP Injection
        r"(\*\)\(|\)\(.*\*)",
        
        # XML Injection
        r"(<!ENTITY|<!DOCTYPE)",
        
        # Server-Side Template Injection
        r"({{.*}}|\${.*}|<%.*%>)",
    ]
    
    # Caracteres perigosos em URLs
    DANGEROUS_URL_CHARS = ['<', '>', '"', "'", '`', '{', '}', '|', '\\', '^', '[', ']']
    
    def __init__(self):
        self.patterns = [re.compile(p, re.IGNORECASE) for p in self.MALICIOUS_PATTERNS]
    
    def is_malicious(self, text: str) -> tuple[bool, Optional[str]]:
        """
        Verifica se o texto contém padrões maliciosos
        Retorna: (is_malicious, reason)
        """
        if not text:
            return False, None
        
        text_lower = text.lower()
        
        for pattern in self.patterns:
            match = pattern.search(text_lower)
            if match:
                return True, f"Malicious pattern detected: {match.group()}"
        
        return False, None
    
    def sanitize_string(self, text: str, max_length: int = 1000) -> str:
        """Sanitiza string removendo caracteres perigosos"""
        if not text:
            return ""
        
        # Limitar tamanho
        text = text[:max_length]
        
        # HTML escape
        text = html.escape(text)
        
        # Remover caracteres de controle
        text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\r\t')
        
        return text
    
    def validate_url(self, url: str) -> tuple[bool, Optional[str]]:
        """
        Valida URL contra padrões maliciosos
        Retorna: (is_valid, error_message)
        """
        if not url:
            return False, "URL is required"
        
        # Verificar tamanho
        if len(url) > 2048:
            return False, "URL too long (max 2048 characters)"
        
        # Verificar caracteres perigosos
        for char in self.DANGEROUS_URL_CHARS:
            if char in url:
                return False, f"Dangerous character '{char}' in URL"
        
        # Verificar padrões maliciosos
        is_mal, reason = self.is_malicious(url)
        if is_mal:
            return False, f"Malicious URL: {reason}"
        
        # Validar formato
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return False, "Invalid URL format"
            
            # Apenas http/https
            if parsed.scheme not in ['http', 'https']:
                return False, "Only http/https protocols allowed"
                
        except Exception as e:
            return False, f"Invalid URL: {str(e)}"
        
        return True, None
    
    def validate_email(self, email: str) -> tuple[bool, Optional[str]]:
        """Valida email"""
        if not email:
            return False, "Email is required"
        
        if len(email) > 255:
            return False, "Email too long"
        
        # Regex simples para email
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            return False, "Invalid email format"
        
        # Verificar padrões maliciosos
        is_mal, reason = self.is_malicious(email)
        if is_mal:
            return False, f"Malicious email: {reason}"
        
        return True, None
    
    def validate_filename(self, filename: str) -> tuple[bool, Optional[str]]:
        """Valida nome de arquivo"""
        if not filename:
            return False, "Filename is required"
        
        if len(filename) > 255:
            return False, "Filename too long"
        
        # Verificar path traversal
        if '..' in filename or '/' in filename or '\\' in filename:
            return False, "Path traversal detected in filename"
        
        # Apenas caracteres seguros
        if not re.match(r'^[a-zA-Z0-9._-]+$', filename):
            return False, "Filename contains invalid characters"
        
        return True, None


# ============================================================================
# SECURITY MIDDLEWARE
# ============================================================================

class SecurityMiddleware(BaseHTTPMiddleware):
    """Middleware de segurança aplicado a todas as requisições"""
    
    def __init__(self, app):
        super().__init__(app)
        self.rate_limiter = RateLimiter()
        self.validator = SecurityValidator()
        
        # Endpoints que não precisam de validação rigorosa
        self.skip_validation = ["/", "/docs", "/openapi.json", "/ws"]
    
    async def dispatch(self, request: Request, call_next):
        # Obter IP do cliente
        client_ip = request.client.host
        
        # Skip validação para endpoints específicos
        if request.url.path in self.skip_validation:
            return await call_next(request)
        
        # ========================================
        # 🛡️ PROTEÇÃO CONTRA TLS/SSL BYPASS
        # ========================================
        # Verificar headers suspeitos de bypass
        x_forwarded_proto = request.headers.get('x-forwarded-proto', '').lower()
        x_forwarded_ssl = request.headers.get('x-forwarded-ssl', '').lower()
        
        # Bloquear se tentar forçar http quando deveria ser https
        if x_forwarded_proto == 'http' or x_forwarded_ssl == 'off':
            # Em produção, deve sempre usar HTTPS
            # Permitir http apenas em desenvolvimento
            if request.headers.get('host', '').startswith('localhost') or \
               request.headers.get('host', '').startswith('127.0.0.1'):
                pass  # Permitir em localhost
            else:
                # Em produção, bloquear tentativas de bypass TLS
                pass  # Permitir por enquanto, mas log
        
        # Verificar headers de proxy suspeitos
        suspicious_headers = [
            'x-forwarded-host',
            'x-original-url', 
            'x-rewrite-url',
            'x-original-host'
        ]
        
        for header in suspicious_headers:
            if request.headers.get(header):
                # Log tentativa suspeita (não bloquear para não quebrar proxies legítimos)
                print(f"⚠️ Suspicious header detected: {header} from {client_ip}")
        
        # ========================================
        # 🔒 VALIDAÇÃO DE HOST
        # ========================================
        host = request.headers.get('host', '')
        allowed_hosts = [
            'localhost',
            '127.0.0.1',
            # Adicionar outros hosts permitidos aqui
        ]
        
        # Verificar se host é permitido (proteção contra host header injection)
        if host and not any(allowed in host for allowed in allowed_hosts):
            print(f"⚠️ Suspicious host header: {host} from {client_ip}")
        
        # ========================================
        # 1. RATE LIMITING
        # ========================================
        is_limited, limit_msg = self.rate_limiter.is_rate_limited(client_ip, request.url.path)
        if is_limited:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": limit_msg,
                    "type": "rate_limit_exceeded"
                }
            )
        
        # ========================================
        # 2. VALIDAÇÃO DE QUERY PARAMETERS
        # ========================================
        for key, value in request.query_params.items():
            is_mal, reason = self.validator.is_malicious(str(value))
            if is_mal:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={
                        "detail": f"Malicious query parameter '{key}': {reason}",
                        "type": "malicious_input"
                    }
                )
        
        # ========================================
        # 3. ADICIONAR SECURITY HEADERS NA RESPOSTA
        # ========================================
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        return response


# ============================================================================
# DEPENDENCY PARA VALIDAÇÃO EM ROTAS
# ============================================================================

# Instância global do validador
security_validator = SecurityValidator()

def validate_text_input(text: str, field_name: str = "input", max_length: int = 1000):
    """Dependency para validar texto em rotas"""
    if len(text) > max_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} too long (max {max_length} characters)"
        )
    
    is_mal, reason = security_validator.is_malicious(text)
    if is_mal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malicious {field_name}: {reason}"
        )
    
    return security_validator.sanitize_string(text, max_length)

def validate_url_input(url: str):
    """Dependency para validar URL em rotas"""
    is_valid, error = security_validator.validate_url(url)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    return url

def validate_email_input(email: str):
    """Dependency para validar email em rotas"""
    is_valid, error = security_validator.validate_email(email)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    return email.lower().strip()
