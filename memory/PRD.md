# OLHOS DE DEUS - PRD (Product Requirements Document)

## Resumo do Projeto
Plataforma profissional de segurança ofensiva e OSINT que unifica ferramentas de pentesting, scanner de vulnerabilidades e inteligência de fontes abertas.

## Problema Original
Criar uma aplicação web unificando:
1. https://github.com/T3qu1la-1/pentester.git (Scanner de vulnerabilidades)
2. https://github.com/mitocondria40/OSINT-dork-tool.git (Google Dorks)
3. https://osintframework.com/ (Ferramentas OSINT)
4. https://boitata.app.br/ (Ferramentas de segurança ofensiva)

## Requisitos de Idioma
- Interface 100% em Português (PT-BR)
- Nome do projeto: "Olhos De Deus"

## Arquitetura Técnica
- **Frontend**: React.js com navegação via state
- **Backend**: FastAPI (Python)
- **Banco de Dados**: MongoDB
- **Scanner**: 73 testes de vulnerabilidades

## Funcionalidades Implementadas

### Scanner de Vulnerabilidades (73 testes)

**SQL Injection (4 testes):**
1. SQL Error-Based
2. SQL Union-Based
3. SQL Blind Boolean
4. SQL Time-Based

**XSS - Cross-Site Scripting (3 testes):**
5. XSS Reflected
6. XSS DOM-Based
7. XSS Filter Bypass

**Outras Injeções (7 testes):**
8. Command Injection
9. XXE (XML External Entity)
10. SSTI (Server-Side Template Injection)
11. LDAP Injection
12. XPath Injection
13. NoSQL Injection
14. GraphQL Injection

**File/Path Vulnerabilities (4 testes):**
15. LFI (Local File Inclusion)
16. RFI (Remote File Inclusion)
17. Path Traversal
18. File Upload Detection

**SSRF (1 teste):**
19. SSRF (Server-Side Request Forgery)

**Autenticação & Autorização (5 testes):**
20. Auth Bypass
21. Default Credentials
22. JWT Vulnerabilities
23. Session Fixation
24. Brute Force Protection

**Headers & Configurações (6 testes):**
25. Security Headers Check
26. CORS Misconfiguration
27. SSL/TLS Verification
28. Cookie Security
29. HTTP Methods
30. Server Info Disclosure

**Arquivos Sensíveis (3 testes):**
31. Sensitive Files
32. Backup Files Exposure
33. Directory Listing

**Redirects & CSRF (3 testes):**
34. Open Redirect
35. CSRF Protection
36. CRLF Injection

**Miscelânea (6 testes):**
37. Clickjacking
38. Host Header Injection
39. Cache Poisoning
40. Error Handling/Leakage
41. IDOR
42. Rate Limiting Check

**Testes Avançados (31 testes):**
43. HTTP Request Smuggling
44. HTTP Parameter Pollution
45. WebSocket Security
46. XML Injection
47. CSV Injection
48. Prototype Pollution
49. Mass Assignment
50. Subdomain Takeover
51. Email Header Injection
52. Git Repository Exposure
53. Environment File Exposure (.env)
54. Docker/Kubernetes Config Exposure
55. Cloud Metadata SSRF (AWS/GCP/Azure)
56. HTTP Response Splitting
57. Race Condition
58. Insecure Deserialization
59. Path Confusion
60. Unicode Normalization Bypass
61. Timing Attack
62. Memory Disclosure
63. Null Byte Injection
64. API Key Exposure in Source
65. GraphQL Introspection
66. CORS Wildcard with Credentials
67. OAuth Redirect URI Validation
68. DNS Rebinding Protection
69. JWT Algorithm Confusion
70. Weak SSL/TLS Ciphers
71. Business Logic Flaws
72. Format String Vulnerabilities
73. Buffer Overflow Detection

### Páginas Implementadas
- **Home/Dashboard**: Visão geral da plataforma
- **Pentester**: Scanner de vulnerabilidades com formulário e progresso
- **Relatórios**: Visualização e download de relatórios de segurança
- **OSINT Dorks**: Gerador de Google Dorks
- **OSINT Framework**: Agregador de 150+ ferramentas OSINT
- **Boitatá Tools**: Ferramentas de segurança ofensiva
- **Academy**: Conteúdo educacional de segurança
- **Emoji-Crypt**: Criptografia com emojis
- **EXIF Hunter**: Extrator de metadados de imagens

### APIs Backend
- `POST /api/scans` - Criar novo scan
- `GET /api/scans` - Listar todos os scans
- `GET /api/scans/{id}` - Obter scan específico
- `GET /api/scans/{id}/vulnerabilities` - Listar vulnerabilidades
- `GET /api/stats` - Estatísticas gerais

## Status Atual
- ✅ Scanner completo com 35 testes funcionando
- ✅ Página de Relatórios funcional
- ✅ Todas as páginas navegáveis
- ✅ Interface em PT-BR
- ✅ Logo e branding "Olhos De Deus"

## Estatísticas do Sistema
- Total de Scans: 11+
- Total de Vulnerabilidades Encontradas: 83+
- Vulnerabilidades Críticas: 18
- Vulnerabilidades Altas: 27

## Tarefas Futuras (Backlog)
- P2: Página de Política de Privacidade
- P2: Documentação de Testes
- P2: Implementar funcionalidade real para todas as ferramentas OSINT/Boitatá
- P2: React Router para URLs diretas

## Data da Última Atualização
28/02/2026 - Expandido scanner para 73 testes de vulnerabilidades
