# Auth por email (OTP / magic link)

## Fluxo

1. Browser → edge `request-otp` (Turnstile + gate device/IP).
2. Edge → `auth.signInWithOtp` (Supabase Auth envia o email).
3. Utilizador: link no email **ou** código de 6 dígitos em `/entrar`.

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
