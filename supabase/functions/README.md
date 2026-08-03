# Edge Functions — A Voto

| Function | Auth | Função |
|----------|------|--------|
| `health` | pública (anon) | `platform_health` + liveness |
| `ar-sync` | `x-avoto-cron-secret` ou service_role | Sync Dados Abertos AR (MVP) |

## Local

```bash
supabase functions serve
# health: http://127.0.0.1:54321/functions/v1/health
```

## Deploy

```bash
supabase functions deploy health --project-ref qevavihconurfgmayzze
supabase functions deploy ar-sync --project-ref qevavihconurfgmayzze
supabase secrets set AVOTO_CRON_SECRET='…' --project-ref qevavihconurfgmayzze
```

## Cron (produção)

Cloudflare Worker cron ou Supabase scheduled trigger a chamar:

```
POST https://qevavihconurfgmayzze.supabase.co/functions/v1/ar-sync
Authorization: Bearer <anon_or_service_key>
apikey: <anon_or_service_key>
x-avoto-cron-secret: <AVOTO_CRON_SECRET>
```
