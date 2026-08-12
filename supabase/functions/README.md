# Edge Functions — A Voto

| Function | Auth | Função |
|----------|------|--------|
| `health` | pública (anon) | `platform_health` + liveness |
| `ar-sync` | cron secret | Fetch Dados Abertos AR → iniciativas |
| `despesa-sync` | cron secret | Portal Base → despesas + investimentos |
| `daily-digest` | cron secret | Digest AR + despesa (`daily_digests`) |
| `comunicados-sync` | cron secret | portugal.gov.pt → comunicados + digests próprios |
| `comunicados-digest` | cron secret | Regenerar índice diário de comunicados |
| `request-otp` | pública (rate limited) | Magic link/OTP com limite IP+device |
| `delete-my-account` | JWT do utilizador | Apagar a própria conta (RGPD) |
| `stripe-webhook` | Stripe signature | Doações → ledger |

Detalhe: [`docs/GOV-DATA.md`](../../docs/GOV-DATA.md), [`docs/AR-IMPORT.md`](../../docs/AR-IMPORT.md).

## Deploy

```bash
supabase functions deploy ar-sync despesa-sync daily-digest comunicados-sync comunicados-digest health stripe-webhook request-otp delete-my-account
supabase secrets set AVOTO_CRON_SECRET='…'
```

## Cron

Worker `workers/daily-cron` e `.github/workflows/sync-daily.yml`:

```
POST …/ar-sync?limit=200
POST …/despesa-sync?limit=400
POST …/daily-digest  (ou scripts/generate-digests.mjs)
POST …/comunicados-sync?limit=80
Headers: Authorization Bearer <service_role>, x-avoto-cron-secret, apikey
```
