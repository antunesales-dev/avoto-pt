# Consola do browser: o que é da A Voto vs ruído

## Da app (corrigir se aparecer)

| Sintoma | Causa | Fix |
|---------|--------|-----|
| `POST .../rpc/get_my_profile` **403** | RPC `SECURITY INVOKER` sem `USAGE` em `private` | Migration `private_schema_usage_authenticated` |
| CSP: *inline script* + hash `sha256-WzGu7/...` | **HTML antigo em cache** (SW/PWA) com script inline | Deploy **SPA** no GH Pages (sem SW); CSP inclui o hash para o cleanup antigo correr; hard refresh |
| `GET .../investimentos` **404** | GitHub Pages devolve **status 404** + body `404.html` (= SPA). É normal | App deve carregar na mesma; se ficar em branco, hard refresh / limpar dados do site |
| Turnstile não aparece | Falta `VITE_TURNSTILE_SITE_KEY` no CI e/ou `TURNSTILE_SECRET_KEY` na edge | Ver secção Turnstile abaixo |

## **Não** é a A Voto (ignorar / desactivar extensão)

| Sintoma | Origem |
|---------|--------|
| `background.js` · `No tab with id` | Extensão Chrome (password managers, ads, etc.) |
| `apps.rokt.com` preload / woff | Extensão Rokt / ads |
| `UNAUTHORIZED_NO_AUTH_HEADER` isolado | Pedido sem JWT (extensão, prefetch) |

Como confirmar: janela anónima **sem extensões** — se o erro some, não é nosso código.

## Turnstile (anti-bot)

| Peça | Onde | Estado típico se “não set” |
|------|------|----------------------------|
| Site key (pública) | GitHub Actions secret `VITE_TURNSTILE_SITE_KEY` | Widget **não** renderiza; login sem captcha no UI |
| Secret | `supabase secrets set TURNSTILE_SECRET_KEY=...` | Edge `request-otp` **salta** verificação se secret vazio |

Para activar de verdade:

1. Cloudflare Dashboard → Turnstile → Add site (domínio `antunesales-dev.github.io`)
2. Repo → Settings → Secrets → `VITE_TURNSTILE_SITE_KEY` = site key
3. `supabase secrets set TURNSTILE_SECRET_KEY=<secret>` no projecto
4. Redeploy Pages + `supabase functions deploy request-otp`

## Hard refresh no GH Pages

Chrome: DevTools → Application → Storage → **Clear site data** no origin
`https://antunesales-dev.github.io`, depois recarregar.
