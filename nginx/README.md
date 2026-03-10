# 🛡️ Nginx Anti-DDoS Deployment

## Requisitos
- **OpenResty** (Nginx + LuaJIT) — [https://openresty.org](https://openresty.org)
- Ou Docker: `docker pull openresty/openresty`

## Deploy via Docker (Recomendado)

```bash
# Na raiz do projeto
docker run -d \
  --name olhos-de-deus-proxy \
  -p 80:80 \
  -v $PWD/nginx/conf/nginx.conf:/etc/nginx/conf.d/default.conf \
  -v $PWD/nginx/anti-ddos/lua:/etc/nginx/lua \
  --network host \
  openresty/openresty
```

## Deploy Manual
1. Instale o OpenResty
2. Copie `nginx/conf/nginx.conf` → `/etc/nginx/nginx.conf`
3. Copie `nginx/anti-ddos/lua/` → `/etc/nginx/lua/`
4. `nginx -t && nginx -s reload`

## O que faz
- **JS Challenge Page**: Similar ao Cloudflare "I'm Under Attack" mode
- **Rate Limiting**: 30 req/s por IP na API, burst de 50
- **Bad Bot Blocking**: Bloqueia user-agents de scrapers/bots
- **Security Headers**: CSP, X-Frame-Options, XSS Protection
- **Proxy Reverso**: Frontend (porta 3000) e Backend (porta 8000) sob porta 80
