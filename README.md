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

## 🌐 Deployment (Vercel & Localhost)

### Localhost (Desenvolvimento)
Para rodar tudo localmente:
1.  Configure o `.env` na raiz e em `frontend/.env`.
2.  Execute `npm run bootstrap` para preparar o ambiente.
3.  Execute `npm run start:dev` para subir Backend (8000) e Frontend (3000).

### Vercel (Produção - Frontend)
O projeto está configurado para deploy automático do frontend na Vercel:
1.  Conecte seu repositório à Vercel.
2.  Configure a Environment Variable `REACT_APP_BACKEND_URL` na Vercel apontando para seu backend de produção (ex: Railway, Render ou VPS).
3.  O arquivo `vercel.json` cuidará das rotas e do diretório de build.

> [!NOTE]
> O backend utiliza RocksDB para persistência local, por isso **não deve ser hospedado como Vercel Function**. Use uma hospedagem com volume persistente para o backend Python.

## 🔒 Segurança
O sistema agora utiliza um middleware que delega tarefas críticas para o binário Rust (se compilado). Caso o binário não esteja presente, o sistema opera em modo de compatibilidade Python.
