# Backend — migrations, RLS, realtime, rate limits, edge

## Migrations

| Ficheiro | Conteúdo |
|----------|----------|
| `20260803160000_init.sql` | schema base |
| `20260803170000_user_data_encryption.sql` | PII/votos encriptados + RPCs |
| `20260803190000_hardening.sql` | rate limits, audit, AR sync, RLS, realtime, health |

```bash
supabase db push   # remoto linkado
# ou
pnpm db:push
```

## RLS (resumo)

| Tabela | Anon/Auth |
|--------|-----------|
| `profiles` | sem select/write directo (só RPC) |
| `votos_cidadaos` | sem select/write directo (só RPC) |
| `iniciativas` | select all; write bloqueado a clients |
| `iniciativa_voto_counts` | select all; write bloqueado a clients |
| `rate_limit_buckets` | sem policies (só definer) |
| `audit_events` | sem policies (só definer) |
| `ar_sync_runs` | select authenticated |

## Rate limits

- `private.check_rate_limit(subject, action, window_sec, max_hits)`
- `cast_voto`: 20 / min / user
- `update_my_partido`: 10 / min / user
- Auth (GoTrue): ver `[auth.rate_limit]` em `config.toml` + dashboard cloud

Erro: `RATE_LIMITED` → UI mostra aviso.

## Realtime

- Tabela `iniciativa_voto_counts` na publication `supabase_realtime`
- Cliente: `dataStore.startRealtime()` no boot
- Dashboard: Database → Replication → activar tabela se o `ALTER PUBLICATION` não bastar no cloud

## Edge Functions

| Nome | Path | Auth |
|------|------|------|
| `health` | `/functions/v1/health` | anon |
| `ar-sync` | `/functions/v1/ar-sync` | cron secret ou service_role |

```bash
pnpm fn:deploy
supabase secrets set AVOTO_CRON_SECRET='…'
```

## Auth rate limits (Supabase hosted)

Dashboard → Authentication → Rate Limits (emails, sign-in).  
Local: `supabase/config.toml` `[auth.rate_limit]`.
