# 🛡️ DOCUMENTAÇÃO DE SEGURANÇA - Pentesting Toolkit

## Proteções Implementadas

Este documento descreve todas as proteções de segurança implementadas no sistema.

---

## 1. 🚦 RATE LIMITING - Proteção contra DDoS/DoS/Botnets

### Descrição
Sistema de rate limiting baseado em IP do cliente para prevenir:
- Ataques DDoS (Distributed Denial of Service)
- Ataques DoS (Denial of Service)
- Spam de requisições
- Abuse de endpoints
- Ataques de força bruta

### Limites Configurados

| Endpoint Type | Limite | Janela de Tempo |
|--------------|--------|-----------------|
| **Global** | 100 requisições | 60 segundos |
| **Auth** (login/register) | 10 requisições | 60 segundos |
| **Scans** | 5 requisições | 60 segundos |
| **Tools** | 20 requisições | 60 segundos |

### Como Funciona
- Rastreia requisições por IP do cliente
- Conta requisições em janelas de tempo deslizantes
- Retorna HTTP 429 (Too Many Requests) quando limite é excedido
- Limpeza automática de dados antigos a cada 60 segundos

### Localização
- **Backend:** `/app/backend/security_middleware.py` - Classe `RateLimiter`

---

## 2. 🔍 INPUT VALIDATION & SANITIZATION

### Proteção Contra Payloads Maliciosos

#### SQL Injection
Detecta e bloqueia:
```sql
UNION SELECT, DROP TABLE, INSERT INTO, DELETE FROM, UPDATE SET
--, #, /*, */ (SQL comments)
OR 1=1, AND 1=1
```

#### NoSQL Injection
Detecta e bloqueia:
```javascript
$ne, $gt, $lt, $gte, $lte, $regex, $where
{...$...:...} (MongoDB operators)
```

#### XSS (Cross-Site Scripting)
Detecta e bloqueia:
```html
<script>, <iframe>, <object>, <embed>
javascript:, on* (onclick, onload, etc)
<img src=...>
```

#### Command Injection
Detecta e bloqueia:
```bash
; cat, | ls, && rm, `wget`, $(curl)
Command chaining (&&, ||, ;)
Backticks e command substitution
```

#### Path Traversal
Detecta e bloqueia:
```
../, ..\
/etc/passwd, /etc/shadow
```

#### Server-Side Template Injection
Detecta e bloqueia:
```
{{...}}, ${...}, <%...%>
```

### Validações Específicas

#### URLs
- ✅ Apenas protocolos HTTP/HTTPS
- ✅ Máximo 2048 caracteres
- ✅ Sem caracteres perigosos: `< > " ' \` { } | \ ^ [ ]`
- ✅ Formato válido (scheme + netloc)

#### Emails
- ✅ Formato válido (regex)
- ✅ Máximo 255 caracteres
- ✅ Sem padrões maliciosos

#### Arquivos
- ✅ Tamanho máximo: 10MB
- ✅ Tipos permitidos: JPEG, PNG, GIF, BMP, TIFF
- ✅ Nome de arquivo validado (sem path traversal)
- ✅ Apenas caracteres seguros: `[a-zA-Z0-9._-]`

#### Textos Gerais
- ✅ HTML escaping automático
- ✅ Remoção de caracteres de controle
- ✅ Limite de tamanho configurável

### Localização
- **Backend:** `/app/backend/security_middleware.py` - Classe `SecurityValidator`

---

## 3. 🔒 SECURITY HEADERS

Headers de segurança adicionados a todas as respostas:

### X-Content-Type-Options: nosniff
Previne MIME type sniffing attacks

### X-Frame-Options: DENY
Previne clickjacking ao bloquear iframes

### X-XSS-Protection: 1; mode=block
Ativa proteção XSS do navegador

### Strict-Transport-Security
Força HTTPS por 1 ano (incluindo subdomínios)

### Content-Security-Policy
Política de segurança de conteúdo:
- Scripts apenas do próprio domínio
- Estilos apenas do próprio domínio
- Permite inline scripts/styles (para compatibilidade)

### Localização
- **Backend:** `/app/backend/security_middleware.py` - Classe `SecurityMiddleware`

---

## 4. 🛡️ MIDDLEWARE DE SEGURANÇA

### Aplicação Global
O `SecurityMiddleware` é aplicado a **TODAS** as requisições (exceto `/`, `/docs`, `/openapi.json`, `/ws`)

### Fluxo de Validação
1. **Rate Limiting** - Verifica se IP excedeu limites
2. **Query Parameters** - Valida todos os parâmetros contra payloads
3. **Security Headers** - Adiciona headers na resposta

### Localização
- **Backend:** `/app/backend/server.py` - `app.add_middleware(SecurityMiddleware)`

---

## 5. 🎯 VALIDAÇÃO NOS ENDPOINTS

### Endpoints Protegidos

#### POST /api/scans
- ✅ Nome do scan validado (max 200 chars)
- ✅ URL do target validada contra payloads
- ✅ Tipo de scan validado (max 50 chars)

#### POST /api/auth/register
- ✅ Email validado (formato + malicious patterns)
- ✅ Username validado (max 100 chars)
- ✅ Senha: mínimo 6 chars, máximo 128 chars

#### POST /api/auth/login
- ✅ Email validado
- ✅ Rate limiting: max 10 tentativas/minuto

#### POST /api/tools/extract-exif
- ✅ Tipo de arquivo validado
- ✅ Nome de arquivo validado
- ✅ Tamanho máximo: 10MB

#### POST /api/tools/clone-website
- ✅ URL validada contra payloads
- ✅ Timeout: 10 segundos
- ✅ Tamanho máximo resposta: 5MB

#### POST /api/tools/analyze-face
- ✅ Tipo de arquivo validado
- ✅ Tamanho máximo: 10MB

#### GET /api/scans (com paginação)
- ✅ Parâmetros validados (page, limit)
- ✅ Limite máximo: 100 itens por página
- ✅ Campos de ordenação permitidos

---

## 6. ⚛️ ERROR BOUNDARY (React)

### Descrição
Componente React que captura erros em componentes filhos e previne crash completo da aplicação.

### Funcionalidades
- ✅ Captura erros de renderização
- ✅ Exibe UI amigável ao usuário
- ✅ Mostra detalhes técnicos em desenvolvimento
- ✅ Permite recarregar ou voltar à home
- ✅ Log de erros no console

### Localização
- **Frontend:** `/app/frontend/src/components/ErrorBoundary.jsx`
- **Aplicado em:** `/app/frontend/src/App.js` (wrapper principal)

---

## 7. 🔔 SISTEMA DE NOTIFICAÇÕES TOAST

### Descrição
Sistema de notificações visuais usando Sonner para feedback imediato ao usuário.

### Eventos com Toast
- ✅ Login bem-sucedido
- ✅ Registro bem-sucedido
- ✅ Logout
- ✅ Erros de autenticação
- ✅ Feedback visual rico (cores, ícones)

### Configuração
- **Posição:** Top-right
- **Duração:** 4 segundos
- **Rich Colors:** Ativado
- **Close Button:** Ativado

### Localização
- **Frontend:** 
  - `/app/frontend/src/App.js` (Toaster component)
  - `/app/frontend/src/context/AuthContext.js` (uso do toast)

---

## 8. 📊 PAGINAÇÃO NOS SCANS

### Descrição
Sistema de paginação para prevenir sobrecarga ao carregar muitos scans.

### Parâmetros
- **page:** Número da página (1-10000)
- **limit:** Itens por página (1-100, default: 20)
- **sort_by:** Campo de ordenação (createdAt, name, status, target)
- **order:** asc/desc (default: desc)

### Resposta
```json
{
  "scans": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

### Localização
- **Backend:** `/app/backend/server.py` - `GET /api/scans`

---

## 🔐 RESUMO DE PROTEÇÕES

### ✅ Proteções Implementadas
1. Rate Limiting (DDoS/DoS protection)
2. Input Validation & Sanitization
3. SQL/NoSQL Injection protection
4. XSS protection
5. Command Injection protection
6. Path Traversal protection
7. Security Headers
8. File Upload validation
9. URL validation
10. Email validation
11. Error Boundary (React)
12. Toast notifications
13. Paginação

### 🚀 Performance
- Rate limiting usa memória com limpeza automática
- Validações são rápidas (regex otimizadas)
- Paginação reduz carga do banco

### 🎯 Próximas Melhorias Sugeridas
1. IP Blocking automático após múltiplas violações
2. CAPTCHA em endpoints sensíveis
3. 2FA (Two-Factor Authentication)
4. Logs de auditoria detalhados
5. WAF (Web Application Firewall) em nível de infraestrutura
6. Monitoramento em tempo real (Sentry, LogRocket)

---

## 📝 Notas Importantes

### Sobre PHP
O usuário mencionou usar PHP para proteção adicional. Esclarecimento:
- As proteções implementadas em Python/FastAPI são **equivalentes** e **seguras**
- FastAPI é moderno, rápido e tem as mesmas capacidades de segurança
- Adicionar PHP seria redundante e criaria complexidade desnecessária
- Se necessário, uma camada WAF (Cloudflare, ModSecurity) seria mais eficaz

### Sobre "Concha" (Shell)
- **NÃO recomendado:** Adicionar shells em aplicações web é um risco crítico de segurança
- Pode criar backdoors e vulnerabilidades graves
- As proteções contra Command Injection já previnem isso

### Proteção DDoS em Larga Escala
- Proteção em nível de aplicação tem limites
- Para DDoS massivo, usar:
  - Cloudflare (CDN + DDoS protection)
  - AWS Shield
  - nginx rate limiting em nível de servidor
  - Load balancers com proteção DDoS

---

**Última atualização:** 2025
**Versão:** 1.0
**Status:** ✅ Implementado e Testado

