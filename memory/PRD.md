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
- **Scanner**: 35 testes de vulnerabilidades

## Funcionalidades Implementadas

### Scanner de Vulnerabilidades (35 testes)
1. SQL Injection
2. XSS (Cross-Site Scripting)
3. XXE (XML External Entity)
4. Command Injection
5. Path Traversal / LFI
6. SSRF (Server-Side Request Forgery)
7. Open Redirect
8. Log Injection
9. SSTI (Server-Side Template Injection)
10. LDAP Injection
11. NoSQL Injection
12. JWT Manipulation
13. Insecure WebSocket
14. Insecure Deserialization
15. HTTP Request Smuggling
16. CRLF Injection
17. Host Header Injection
18. Security Headers Check
19. SSL/TLS Verification
20. CORS Misconfiguration
21. Directory Listing
22. Rate Limiting Check
23. HTTP Parameter Pollution
24. Information Disclosure
25. Sensitive Directories
26. Clickjacking
27. Backup Files Exposure
28. XML Injection
29. File Upload Detection
30. IDOR
31. Brute Force Protection
32. Weak Password Policy
33. Session Fixation
34. CSRF Protection
35. Error Handling/Leakage

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
19/02/2026
