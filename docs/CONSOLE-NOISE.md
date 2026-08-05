# Consola do browser: o que é da A Voto vs ruído

## Da app (corrigir se aparecer)

| Sintoma | Causa | Fix |
|---------|--------|-----|
| `POST .../rpc/get_my_profile` **403** | RPC `SECURITY INVOKER` chama `private.*` sem `USAGE` no schema | Migration `private_schema_usage_authenticated` |
| CSP: *inline script* blocked, hash `sha256-WzGu7/...` | Script de cleanup SW em `index.html` inline | `public/sw-cleanup.js` + `<script src>` |
| `.../dados` **404** em assets/chunks | SW/cache antigo ou deploy sem `404.html` SPA | `sw-cleanup.js` + workflow copia `404.html` |

## **Não** é a A Voto (ignorar / desactivar extensão)

| Sintoma | Origem |
|---------|--------|
| `background.js` · `No tab with id` | Extensão Chrome (password managers, ads, etc.) |
| `apps.rokt.com` preload / woff | Extensão Rokt / ads |
| `UNAUTHORIZED_NO_AUTH_HEADER` isolado | Pedido sem JWT (extensão, prefetch) |

Como confirmar: janela anónima **sem extensões** — se o erro some, não é nosso código.
