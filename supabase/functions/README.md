# Edge Functions — A Voto

| Function | Auth | Função |
|----------|------|--------|
| `health` | pública (anon) | `platform_health` + liveness |
| `ar-sync` | cron secret | Fetch Dados Abertos AR → iniciativas |
| `despesa-sync` | cron secret | Portal Base (SNS open data) → despesas + investimentos |
| `daily-digest` | cron secret | Digest multi-secção do dia |
| `request-otp` | pública (rate limited) | Magic link/OTP com limite IP+device |

Detalhe: [`docs/AR-IMPORT.md`](../../docs/AR-IMPORT.md).

## Local

```bash
supabase functions serve
```

## Deploy

```bash
pnpm fn:deploy
# ou:
supabase functions deploy ar-sync despesa-sync daily-digest health
supabase secrets set AVOTO_CRON_SECRET='…'
```

## Cron

Worker em `workers/daily-cron` (CF): `15 6 * * *` UTC.

```
POST …/functions/v1/ar-sync?limit=200
POST …/functions/v1/despesa-sync?limit=80
POST …/functions/v1/daily-digest
Headers: Authorization Bearer <service_role>, x-avoto-cron-secret, apikey
```
