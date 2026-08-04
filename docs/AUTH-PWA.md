# Auth sem password + PWA e notificações

## Rate limit / anti-duplicação de contas

Não é perfeito (VPN, limpar `localStorage`), mas reduz abuso óbvio.

| Controlo | Limite |
|----------|--------|
| Pedidos OTP por **IP** | 8 / hora |
| Pedidos OTP por **device_id** | 5 / hora |
| Pedidos OTP por **email** | 4 / hora |
| **Contas novas** por device | máx. **2** |

- Cliente: `localStorage` `avoto-device-id` (`src/lib/deviceId.js`)
- Edge: `request-otp` (IP via `cf-connecting-ip` / `x-forwarded-for`)
- BD: `device_accounts` + `assert_auth_otp_allowed` + `register_device_account`
- Após login: liga device → user

Com 2 contas já no device, OTP só permite **login** (`shouldCreateUser: false`).

### Cloudflare Turnstile (anti-bot)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Turnstile** → Add widget  
   - Domínios: `avoto-pt.pages.dev`, `avoto.pt`, `localhost`, `antunesales-dev.github.io`
2. **Site key** → build env `VITE_TURNSTILE_SITE_KEY` (CF Pages + GH Actions secrets)
3. **Secret key** → só na edge:
   ```bash
   supabase secrets set TURNSTILE_SECRET_KEY='0x…'
   supabase functions deploy request-otp --no-verify-jwt
   ```
4. Sem secret na edge: Turnstile **não é obrigatório** (dev local).  
   Com secret: token inválido/ausente → **403**.

Widget em `/entrar` (`TurnstileWidget.vue`); verificação em `request-otp`.

Recomendado em Cloudflare (prod): Rate Limiting no path da function `request-otp`.

## Decisão

**Login principal = magic link + código OTP por email** (sem palavra-passe).

| Critério | Porquê |
|----------|--------|
| Simplicidade | Email → link ou código de 6 dígitos. Sem memorizar passwords. |
| Segurança | Sem reutilização de passwords; tokens de uso único e curta validade (Supabase Auth). |
| Conta | `shouldCreateUser: true` — primeiro acesso cria conta + CID. |
| Password | Continua opcional (legado / quem já tinha conta). |

Isto é o padrão correcto para uma app cívica: menos fricção, menos superfície de ataque (sem repositório de hashes de password a proteger no mesmo grau), e o email já é o canal de recuperação.

---

## Fluxo de entrada

1. Utilizador indica o **email** em `/entrar`.
2. `signInWithOtp` envia email com **magic link** + **código**.
3. Opções:
   - Clicar no link → sessão em `/entrar` → redireccionamento.
   - Introduzir o código → `verifyOtp` → sessão.
4. Trigger de perfil cria `profiles` + CID + `notification_prefs` por defeito.

### Supabase Dashboard (Auth)

- **Site URL:** `https://avoto-pt.pages.dev` (depois `https://avoto.pt`)
- **Redirect URLs** (já alinhadas com Epic 4):
  - `https://avoto-pt.pages.dev/**`
  - `https://*.pages.dev/**`
  - `https://antunesales-dev.github.io/avoto-pt/**`
  - `http://localhost:9000/**`
  - `https://avoto.pt/**` (quando o domínio estiver activo)
- Templates de email: preferir **pt-PT** (Magic Link / OTP).
- Rate limits Auth: manter defaults Supabase; não desactivar confirmações em produção.

### Código

| Ficheiro | Função |
|----------|--------|
| `src/stores/auth.js` | `enviarMagicLink`, `verificarOtp` |
| `src/pages/EntrarPage.vue` | UI 2 passos (email → código) |
| `src/pages/RegistoPage.vue` | Encaminha para Entrar (password opcional) |

---

## PWA

A app builda em modo **PWA** (`quasar build -m pwa` → `dist/pwa`).

| Peça | Local |
|------|--------|
| Manifest | `src-pwa/manifest.json` (nome A Voto, theme verde PT, standalone) |
| Ícones | `public/icons/icon-*.png` |
| Service worker | `src-pwa/sw/custom-sw.js` (**InjectManifest**) |
| Deploy CI | `dist/pwa` (Cloudflare Pages + GitHub Pages) |

**Instalar:** no Chrome/Edge/Android, “Instalar app” / “Adicionar ao ecrã principal”. iOS Safari: Partilhar → Adicionar ao ecrã principal.

---

## Notificações

### O que existe agora

1. **Preferências** na BD (`notification_prefs`): digest, iniciativas, investimentos, despesa.
2. **UI no Perfil:** activar permissão do browser + toggles.
3. **Realtime (tab / PWA aberta ou em background controlado pelo SO):**
   - INSERT em `daily_digests`
   - INSERT em `iniciativas` (novas leis / propostas)
   - INSERT em `investimentos`
4. **Service worker:** `notificationclick` abre a rota certa; handler `push` preparado para VAPID.

### O que falta para push com app fechada

Web Push completo:

1. Gerar chaves **VAPID** (ex.: `web-push generate-vapid-keys`).
2. Expor a chave pública no front (`VITE_VAPID_PUBLIC_KEY`).
3. No Perfil, após permissão: `pushManager.subscribe` → gravar em `push_subscriptions`.
4. Edge function (cron ou trigger) envia com a chave privada (secret Supabase / CF).
5. Payload JSON: `{ "title", "body", "url", "tag" }`.

Tabela `push_subscriptions` já existe (migration `20260803210000_notifications.sql`).

### Segurança / RGPD

- Preferências e subscrições: RLS só `auth.uid()`.
- Notificações sobre **dados públicos** (iniciativas, digests), não sobre o voto do utilizador.
- Sem tracking de engajamento de notificação sem necessidade.
- Opt-in explícito no browser + toggles granulares no perfil.

---

## Checklist ops

- [ ] `supabase db push` (migration notifications + realtime)
- [ ] Templates Auth magic link / OTP em pt-PT
- [ ] Smoke: enviar código → entrar → votar
- [ ] Smoke PWA: install + permissão + toggle
- [ ] (depois) VAPID + edge push
