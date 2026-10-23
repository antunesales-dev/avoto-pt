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
POST …/comunicados-sync?limit=30&days=3   (backfill: ?days=60&news_only=1)
node scripts/link-comunicados.mjs --days=14   (propõe ligações comunicados ↔ iniciativas)
Headers: Authorization Bearer <service_role>, x-avoto-cron-secret, apikey
```

### comunicados-sync: notícias do portugal.gov.pt

O `sitemap.xml` do portal só lista a página índice das notícias. As notícias são descobertas
pelo índice de pesquisa público que a própria página `/gc25/comunicacao/noticias` usa no browser
(Sitecore Search, ordenado por data, 50 por pedido; ~4 pedidos para 60 dias). Precisa do secret:

```
supabase secrets set GOV_SEARCH_KEY='<chave pública enviada pelo portal no header Authorization>'
```

Alternativa (usada em produção): o secret `GOV_SEARCH_KEY` do repositório GitHub é enviado pelos
workflows "Sync diário" e "Backfill plano de conteúdo" no header `x-gov-search-key`. A função só aceita
esse header de chamadores autorizados (cron secret / service_role) e tem prioridade sobre o env.

Sem chave (header ou env) a função continua a importar os comunicados do CM pelo sitemap e regista
o aviso em `ar_sync_runs.meta.sample_errors`. Pedidos com pausa (`delay_ms`, mín. 500 ms) e UA
identificado; guarda texto + `card:tags/areas/officials/roles` + link; não guarda imagens (Lusa).
Nomeações (`/governo/nomeacoes/`) não são importadas; digests só para dias com entradas.

Testes: `pnpm test:comunicados` (Deno + node:test) e, numa BD local,
`psql … -f supabase/tests/comunicados_ligacoes.sql`.

