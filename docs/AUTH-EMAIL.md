# Auth por email (OTP / magic link)

## Fluxo

1. Browser → edge `request-otp` (Turnstile + gate device/IP).
2. Edge → `auth.signInWithOtp` com `emailRedirectTo` =
   `{origin}{base}/auth/callback?next=/perfil` (ex. GitHub Pages:
   `https://antunesales-dev.github.io/avoto-pt/auth/callback?next=/perfil`).
3. Utilizador: **link** no email → `/auth/callback` processa `code` / `token_hash` / hash
   e redirecciona; **ou** código de 6 dígitos em `/entrar` (mesmo browser em que pediu o OTP).

### Dashboard Supabase (obrigatório)

Authentication → URL configuration:

| Campo | Valor (dev GH Pages) |
|-------|----------------------|
| Site URL | `https://antunesales-dev.github.io/avoto-pt` |
| Redirect URLs | `https://antunesales-dev.github.io/avoto-pt/**` |
| | `https://antunesales-dev.github.io/avoto-pt/auth/callback` |
| | `https://antunesales-dev.github.io/avoto-pt/entrar` |

Sem o callback na allowlist, o link cai no site **sem** tokens → parece “só login de novo”.

### PKCE

O magic link com `flowType: pkce` precisa do `code_verifier` no **mesmo browser** onde pediu o
email. Se abrir o mail noutro dispositivo, use o **código de 6 dígitos** no browser original.

## Limites

| Camada | O quê | Onde |
|--------|--------|------|
| A Voto (BD) | Pedidos por IP / device / email (após envio OK) | `assert_auth_otp_allowed` / `record_auth_otp_sent` |
| **Supabase Auth** | **Envio real de emails** (`over_email_send_rate_limit`) | GoTrue `/otp` — **não controlamos** |

Se Auth Logs mostra `429: email rate limit exceeded` / `over_email_send_rate_limit`:

- **Esperar ~1 h** desde o último 429 (janela típica free/built-in mail).
- **Não clicar** de novo em “Receber link” ou “Recuperar palavra-passe” (piora o balde).
- Alternativa: **palavra-passe** (não usa `/otp` de magic link).

O balde de email é **por projecto**, não só por endereço.

## UI

- Cooldown local após envio OK (60s) e após `EMAIL_RATE_LIMITED` (1 h).
- Mensagem distinta: limite de email Supabase vs rate limit app.

## Produção (recomendado)

1. **SMTP próprio** (Auth → SMTP) no dashboard Supabase — limites e deliverability melhores.
2. Site URL + Redirect URLs com o domínio real (`github.io` e/ou `avoto.pt`).
3. Turnstile configurado em produção.
4. (Pro+) Leaked password protection no dashboard.

## O que o agente / ops **não** deve fazer

- Não invocar `signInWithOtp` / `request-otp` com emails reais de utilizadores para “testar”.
- Não limpar rate limits da BD como substituto do limite Auth de email (não resolve `over_email_send_rate_limit`).
