# Import AR + despesa + digest multi-secção

## Fluxo (BD = API)

```
Dados Abertos AR (JSON legislatura)
    → edge ar-sync → public.iniciativas
Portal Base (via SNS Transparência open data)
    → edge despesa-sync → public.despesas_publicas + investimentos
    → edge daily-digest → public.daily_digests (secções)
```

Tudo lido pela app via Supabase REST (RLS select público nas tabelas de conteúdo).

## ar-sync

O ficheiro oficial **IniciativasXVII_json.txt** tem ~80 MB. A **edge free do Supabase** não o processa (WORKER_RESOURCE_LIMIT). Por isso:

| Caminho | Quando |
|---------|--------|
| **`node scripts/sync-ar.mjs --limit=200`** | Produção / local / CI |
| **GitHub Action `sync-daily.yml`** | Cron 06:30 UTC |
| Edge `ar-sync` | Só payload pequeno ou teste `limit≤40` (pode falhar) |

Passos do script:

1. Abre [DAIniciativas](https://www.parlamento.pt/Cidadania/Paginas/DAIniciativas.aspx)
2. Legislatura actual → URL assinada `IniciativasXVII_json.txt`
3. Mapeia AR → schema A Voto + votos por partido (`Votacao[].detalhe`)
4. Upsert `upsert_iniciativa_from_ar`

Secrets CI: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AVOTO_CRON_SECRET`.

## despesa-sync

Fonte: dataset **Portal Base** exposto em  
https://transparencia.sns.gov.pt/explore/dataset/portal-base/  
(contratos com origem no Portal Base / IMPIC — portal oficial).

Filtro por defeito: `preco_contratual > 100000`, ordenado por data de publicação.  
Contratos ≥ 500 000 € também geram linha em `investimentos` (votáveis).

## daily-digest (multi-secção)

`items` JSON:

```json
{
  "sections": {
    "iniciativas": { "count": 0, "items": [] },
    "despesas": { "count": 0, "items": [] },
    "investimentos": { "count": 0, "items": [] }
  },
  "legacy_items": []
}
```

Sem AI — só agregação factual.

## Cron

Worker: `workers/daily-cron/`  
Cron: `15 6 * * *` UTC → ar-sync → despesa-sync → daily-digest.

```bash
cd workers/daily-cron
wrangler secret put AVOTO_CRON_SECRET
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler deploy
```

Trigger manual: `POST /run` com header `x-avoto-cron-secret`.

## Limitações honestas

- Votos por partido dependem do texto `detalhe` da AR (parse de siglas conhecidas).
- Despesa: amostra recente de contratos Base (não o dump completo multi-GB de dados.gov).
- URLs assinadas do portal AR expiram; a descoberta diária renova-as.
