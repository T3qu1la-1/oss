# 👁️ Olho De Cristo - OSINT & Pentester Toolkit

Conjunto avançado de ferramentas para Reconhecimento e Pentest.

## 🚀 Novidades desta versão
- **🪨 RocksDB Integration**: Migração total para o RocksDB (substituindo MongoDB). Mais rápido, embarcado e sem dependências externas.
- **🛡️ Rust Security Core**: Sidecar em Rust para validação de payloads e criptografia HMAC de alta performance.
- **⚡ Performance**: Backend Python otimizado com middleware de segurança proativo.

## 🛠️ Instalação e Uso

1. **Bootstrap**:
   ```bash
   npm run bootstrap
   ```
   *(Isso instalará dependências de Frontend, Backend Python e tentará buscar dependências Rust)*

2. **Build do Rust (Opcional, mas recomendado)**:
   Se você tiver Rust instalado, compile o core de segurança:
   ```bash
   npm run build:rust
   ```

3. **Execução Local**:
   ```bash
   npm run start:dev
   ```

## 🔒 Segurança
O sistema agora utiliza um middleware que delega tarefas críticas para o binário Rust (se compilado). Caso o binário não esteja presente, o sistema opera em modo de compatibilidade Python.
