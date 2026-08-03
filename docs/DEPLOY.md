# Deploy — Cloudflare Pages

| | |
|---|---|
| **Project** | `avoto-pt` |
| **URL produção** | https://avoto-pt.pages.dev |
| **Dashboard CF** | https://dash.cloudflare.com → Pages → avoto-pt |
| **Backend** | Supabase `qevavihconurfgmayzze` (Frankfurt) |

## Build

```bash
pnpm install
pnpm build          # output: dist/spa
# requer .env com VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

## Deploy manual

```bash
export CLOUDFLARE_API_TOKEN=…
export CLOUDFLARE_ACCOUNT_ID=…
pnpm deploy
# ou:
pnpm exec wrangler pages deploy dist/spa --project-name=avoto-pt --branch=main
```

## CI (GitHub Actions)

Workflow: `.github/workflows/deploy-pages.yml`  
Secrets no repo:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Push a `main` → build + deploy automático.

## SPA / security headers

- `public/_redirects` — `/* /index.html 200` (history mode)
- `public/_headers` — X-Frame-Options, nosniff, etc.

## Auth redirects (Supabase)

Site URL: `https://avoto-pt.pages.dev`  
Allow list: `https://avoto-pt.pages.dev/**`, localhost:9000  

Quando existir `avoto.pt`, actualizar no dashboard Supabase Auth + custom domain no Pages.

## Estado Epic 2

- [x] Projecto Pages criado  
- [x] Deploy produção  
- [x] SPA routes 200  
- [x] Env de build com Supabase cloud  
- [x] Headers / redirects  
- [x] GitHub secrets + workflow  
- [ ] Domínio custom `avoto.pt` — guia: [`DOMAIN-AVOTO-PT.md`](./DOMAIN-AVOTO-PT.md)  

