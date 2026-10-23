# Deploy do plano de conteúdo (A + B + C) — ordem de produção

Ramo: `integration/plano-conteudo` (A `plan/a-ar-iniciativas` + B `plan/b-comunicados` + C `plan/c-despesa-seo`
+ correções de integração). Tudo foi testado **só localmente** (Supabase local com cópia só-leitura da
produção de 23 out 2026). Nada disto foi aplicado em produção.

Contagens “prod” abaixo: consulta só-leitura à produção a 23 out 2026, ~13:30 (Lisboa). Confirmar de novo
no dia (secção 0.3), porque os syncs diários mexem nestas tabelas.

---

## 0. Antes de começar

1. **Parar os crons durante o rollout** (o sync antigo de `main`, a correr contra o esquema novo, reescrevia
   temas/fases das iniciativas com o mapper antigo até ao sync novo):
   - GitHub Actions: `gh workflow disable "Sync diário (AR + despesa + digest + comunicados)"`
     (cron 06:30 UTC, mas o GitHub arranca-o com 5–9 h de atraso — não contar com a hora).
   - Cloudflare Worker `avoto-daily-cron` (cron 06:15 UTC, chama a edge `ar-sync`): desligar o trigger no
     dashboard (Workers → avoto-daily-cron → Triggers) ou fazer o rollout fora dessa hora.
2. **Backup das tabelas que as migrações alteram ou apagam** (ou confirmar PITR ativo no projeto):
   ```bash
   supabase db dump --linked --data-only -f backup-plano-conteudo-$(date +%F).sql \
     -s public  # ou, mais leve: pg_dump --data-only -t public.iniciativas -t public.comunicados \
     #   -t public.comunicados_digests -t public.despesas_publicas -t public.investimentos \
     #   -t public.investimento_voto_counts -t public.votos_investimentos
   ```
3. **Contagens de partida** (devem bater com a tabela da secção 1; se não baterem, parar e rever):
   ```sql
   select (select count(*) from iniciativas) ini,
          (select count(*) from comunicados where url_oficial like '%/governo/nomeacoes/%') nomeacoes,
          (select count(*) from comunicados_digests) cdig,
          (select count(*) from despesas_publicas) desp,
          (select count(*) from despesas_publicas where source='base.gov.pt' and id !~ '^base-[0-9a-f]{28}$') desp_legacy,
          (select count(*) from investimentos) inv,
          (select count(*) from votos_investimentos) votos_inv;
   -- 23 out: 2346 | 18 | 129 | 1198 | 379 | 501 | 0
   ```

## 1. Migrações (por esta ordem — `supabase db push`)

Cada ficheiro corre numa transação. Ordem obrigatória: A antes de B (B lê `iniciativas.procedimento`),
B e A antes da migração de integração (`metricas_globais` usa as duas colunas novas).

| # | Ficheiro | Escreve | Apaga | Prod (23 out) |
|---|----------|---------|-------|---------------|
| 1 | `20261023120000_ar_iniciativas_ficha_rica.sql` (A) | enum `iniciativa_estado` + `aprovado_generalidade`, `retirado`; 12 colunas novas em `iniciativas` (ficha rica jsonb, `tema_fonte`, `procedimento`, `dossie_id`…); `UPDATE tema` antigo → nome canónico; nova `upsert_iniciativa_from_ar` | nada | **828** iniciativas mudam de nome de tema (ex. “Educação” → “Educação e Ciência”). Os 850 “Outros” só mudam no sync (passo 5) |
| 2 | `20261023121000_comunicados_noticias_ligacoes.sql` (B) | `tipo='nomeacao'` nas nomeações; colunas `tags/areas/officials/roles/tema`; nova `generate_comunicados_digest`; regenera os digests que ficam; tabela `comunicado_iniciativa` (vazia) + RLS; `pg_trgm`; `propose_comunicado_links`, `review_comunicado_link` | `comunicados_digests` de dias sem entradas reais | **18** comunicados → `nomeacao` (ficam na BD, escondidos); **63** de 129 digests apagados (56 vazios + 7 só com nomeações); **66** regenerados |
| 3 | `20261023122000_despesa_dedup_legacy_entidade_nif.sql` (C) | tabela `despesa_entidades` (30 NIF); coluna `entidade_nif`; entidade = nome canónico por NIF (original em `meta.entidade_fonte`); investimentos/votos dos ids antigos passam para o gémeo hash; `CHECK despesas_base_id_hash_chk` (ids antigos já não entram); trigger `investimentos_base_mirror_chk`; nova `upsert_despesa_publica` | despesas com id antigo que têm gémeo hash; os seus investimentos | **379** de 1198 despesas apagadas → **819**; **158** de 501 investimentos apagados → **343**; entidades 76 nomes → **30**; ~817 linhas com entidade reescrita. Votos em investimentos: 0 (a migração aborta se houver conflito de votos) |
| 4 | `20261023130000_contratos_base_prototipo.sql` (C) | tabelas `contratos_base`, `entidades_publicas` (vazias), `refresh_entidades_publicas()`, vista `despesa_contrato_base` | nada | 0 linhas (protótipo; o ingest do Portal Base completo **não** faz parte deste rollout) |
| 5 | `20261023140000_metricas_globais_plano_conteudo.sql` (integração) | vista `metricas_globais` única: `investimentos` = despesas ≥ 100 000 €, `comunicados` sem nomeações, `iniciativas_disponiveis` sem procedimentos | nada | só vista |

Verificação logo a seguir:
```sql
select (select count(*) from despesas_publicas) desp,            -- 819
       (select count(*) from investimentos) inv,                -- 343
       (select count(*) from despesa_entidades) entidades,      -- 30
       (select count(*) from comunicados_digests) cdig,         -- 66
       (select count(*) filter (where coalesce((items->>'count')::int,0)=0) from comunicados_digests) vazios; -- 0
select * from metricas_globais;
```
Os testes SQL (`supabase/tests/*.sql`) são só para a BD local (inserem fixtures numa transação revertida);
não os correr em produção.

## 2. Edge functions

```bash
supabase functions deploy ar-sync          # A: mapper partilhado (_shared/ar-mapper.js + _shared/temas.js)
supabase functions deploy comunicados-sync # B: notícias do portugal.gov.pt, sem nomeações, sem digests vazios
supabase functions deploy despesa-sync     # C: guardas de id hash / entidade canónica
```
(`pnpm fn:deploy` **não** inclui `comunicados-sync`; usar os comandos acima.)
Nota: `deno check supabase/functions/ar-sync/index.ts` dá um erro de tipos que **já existe em `main`**
(SupabaseClient genérico); o deploy não faz type-check, mas não foi testado o deploy real.

## 3. Secrets

```bash
supabase secrets set GOV_SEARCH_KEY='<chave pública que o site portugal.gov.pt envia no header Authorization ao índice de pesquisa>'
# opcional: supabase secrets set GOV_SEARCH_ENDPOINT='https://discover-euc1.sitecorecloud.io/discover/v2/135545443'
```
- A chave é pública (vai em cada visita ao site), mas **não** a commitar. Se rodar, o sync continua (só os
  comunicados do CM via sitemap) e regista `noticias: …` em `errors` do `ar_sync_runs`.
- GitHub Actions: nenhum secret novo (o passo de ligações usa `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`).
- Cloudflare Pages: nada obrigatório. As Pages Functions de SEO leem `/seo-config.json` (escrito no build a
  partir de `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, valores públicos); opcionalmente definir
  `SUPABASE_URL`/`SUPABASE_ANON_KEY` nas env vars do projeto Pages.

## 4. Merge para `main`

PR `integration/plano-conteudo` → `main`. O workflow `deploy-cloudflare-prod.yml` faz `pnpm build`
(Quasar + `scripts/prerender-meta.mjs`) e `wrangler pages deploy dist/pwa`, que também publica
`functions/` (SEO de `/iniciativas/:id`, `/comunicados/:id`, `/despesa/:id`).
Depois: `cd workers/daily-cron && wrangler deploy` (B mudou o pedido de comunicados para `?limit=30&days=3`).

Verificar: `curl -s https://avoto.pt/iniciativas/ar-xvii-p-1 -D - | grep -i -E 'x-avoto-seo|<title>'`
(deve dar `x-avoto-seo: db`), `/investimentos` → 301 `/contratos`.

## 5. Sync completo e backfills (por esta ordem)

1. **AR completo**: Actions → “Sync diário” → *Run workflow* com `ar_limit=all` (ou
   `node scripts/sync-ar.mjs --limit=all`). Esperado (JSON da AR de 23 out): 2164 iniciativas, 209 dossiês,
   ~158 `aprovado_generalidade`, 26 `retirado`, JPP em ~1524.
2. **Temas das iniciativas que não vêm no JSON desse dia**: `node scripts/reclassify-temas-legacy.mjs --dry-run`
   e depois sem `--dry-run`. A 23 out o JSON publicado pela AR só vai até 14 set, mas a produção tem 182
   iniciativas mais recentes (sincronizadas a 22 out); sem isto ficam com o tema da regex antiga
   (57 em “Outros”). Com isto “Outros” fica em ~13 (0,6 %). O próximo JSON da AR com essas iniciativas
   sobrepõe-se (tema pela comissão).
3. **Notícias 60 dias** (uma vez): `POST /functions/v1/comunicados-sync?news_only=1&days=60` com o service role
   (4 pedidos ao índice, 1 s entre pedidos). Esperado ~187 notícias, 52 digests.
4. **Ligações**: `node scripts/link-comunicados.mjs --days=60` (≈ 3 s; esperado ~72 comunicados, ~125 propostas).
   Públicas só as confirmadas e as `auto_alta` (score ≥ 0,65: ~17). **Decisão do Tiago**: rever as restantes
   (`--confirm=`/`--reject=`). Ex.: heranças ↔ P 69 tem score 0,55 → só aparece no site depois de
   `node scripts/link-comunicados.mjs --confirm=<id da notícia>:ar-xvii-p-69`.
5. **Digests AR**: `node scripts/generate-digests.mjs`.
6. Reativar o workflow (`gh workflow enable …`) e o trigger do worker.

## 6. Rollback

- **Frontend + SEO**: Cloudflare Pages → Deployments → *Rollback* para o deploy anterior (ou revert do merge
  em `main`, que volta a publicar).
- **Edge functions**: `git checkout 53650a4 -- supabase/functions && supabase functions deploy ar-sync comunicados-sync despesa-sync`.
- **Secret**: `supabase secrets unset GOV_SEARCH_KEY` (desliga só as notícias).
- **BD** (as migrações não têm “down” automático; por ordem inversa):
  - #5 e #4: repor a vista de `20260812160000_comunicados_metricas_notif.sql`;
    `drop view despesa_contrato_base; drop table contratos_base, entidades_publicas;` (vazias).
  - #3: `alter table despesas_publicas drop constraint despesas_base_id_hash_chk;`
    `drop trigger investimentos_base_mirror_chk on investimentos;` e repor do backup (passo 0.2) as
    379 despesas e 158 investimentos apagados (`insert … on conflict do nothing`) e a coluna `entidade`
    (`update … set entidade = meta->>'entidade_fonte' where meta ? 'entidade_fonte'`). Repor a
    `upsert_despesa_publica` de `main`.
  - #2: os 63 digests apagados voltam do backup; `update comunicados set tipo='outro' where tipo='nomeacao'`
    (eram `outro`); `drop table comunicado_iniciativa`. As notícias importadas podem ficar ou
    `delete from comunicados where tipo='noticia'`.
  - #1: os valores novos do enum não se apagam; correr o sync AR de `main` (mapper antigo), que reescreve
    estado/tema de todas as iniciativas sincronizadas. As colunas novas podem ficar (o frontend antigo não as lê).
  - Registo: `supabase migration repair --status reverted 20261023140000 20261023130000 20261023122000 20261023121000 20261023120000`
    se os ficheiros saírem de `main`.

## 7. Como foi testado (local)

`/workspace/int-local/rebuild.sh` (fora do repo): `supabase db reset` do zero com todas as migrações +
testes SQL; depois esquema de `main` + cópia só-leitura de prod → `supabase migration up` → sync AR
(`AR_JSON_FILE`) → reclassificação → notícias 60 dias → ligações → digests → contagens + testes SQL.
`pnpm test` (node), `pnpm test:deno`, `scripts/db-local/test-despesa-dedup*.sh` (Postgres simples),
`pnpm build`, `wrangler pages dev` + curl de SEO, screenshots headless sem erros de consola.
