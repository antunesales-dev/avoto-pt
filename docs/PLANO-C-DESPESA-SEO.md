# Plano C — Despesa, Contratos ≥ 100 000 €, fontes novas e SEO

Branch `plan/c-despesa-seo` (passos 6, 7, 13 e 14 do plano de conteúdo de 23 out 2026).
Tudo foi testado localmente. **Nada foi aplicado em produção.**

## Passo 6: despesas duplicadas e entidade por NIF

Migração `supabase/migrations/20261023122000_despesa_dedup_legacy_entidade_nif.sql`:

- apaga as linhas com id antigo (`base-<nif>-<data>-<preço>-<slug>`) **só quando há gémeo** com id hash:
  mesmo NIF adjudicante (vem no id antigo), título normalizado (minúsculas, espaços colapsados), montante,
  data de publicação e data de celebração. Em prod são 379 linhas e as 379 têm gémeo: 369 com o título
  exatamente igual e 10 em que só muda o espaçamento (“Medicamentos  Exclusivos”). Nos 8 casos de ULS
  Arrábida em que a fonte tem duas linhas para o mesmo contrato, escolhe-se a de adjudicatária igual;
- uma linha antiga **sem** gémeo não é apagada: fica com `meta.legacy_sem_gemeo = true`;
- os investimentos das linhas antigas (158) passam para `inv-<gémeo>`, com votos e contagens. Se alguém
  tiver votado nos dois, a migração aborta, porque fundir os votos obrigaria a decifrá-los. Em prod há 0 votos em investimentos;
- `despesa_entidades`: nome canónico por NIF, que é o nome limpo mais frequente desde 2024. O nome da fonte
  fica em `meta.entidade_fonte`. Passam de 76 nomes para 30 entidades;
- guardas: `upsert_despesa_publica` recusa ids antigos (`LEGACY_DESPESA_ID`), o check
  `despesas_base_id_hash_chk` faz o mesmo na tabela, e um trigger exige que um investimento Base seja
  `inv-<despesa_id existente>`. O edge `despesa-sync` valida também os payloads de backfill.
- `metricas_globais.investimentos` passa a contar as despesas ≥ 100 000 €.

Prova (cópia de prod lida por SELECT, 23 out 2026): `scripts/db-local/test-despesa-dedup.sh` e
`scripts/db-local/test-despesa-dedup-edge.sh`.

| | antes | depois |
|---|---|---|
| despesas | 1198 (819 hash + 379 antigas) | 819 (0 antigas) |
| investimentos | 501 | 343 (= despesas ≥ 100 000 €) |
| nomes de entidade | 76 | 30 (30 NIF) |
| linhas hash perdidas ou alteradas | — | 0 |
| antigas apagadas sem gémeo | — | 0 |

Ao repetir a migração, não muda nenhuma linha. Um sync real de 200 contratos (SNS, 23 out) gravou 200 ids que já existiam e 0 ids antigos.

**Para aplicar em prod (precisa de OK):** `supabase db push` (ou `apply_migration`) com as duas migrações e,
depois, o deploy de `despesa-sync`. A ordem é: primeiro a migração e depois o edge, porque o edge novo envia `entidade_nif`.

## Passo 7: “Contratos ≥ 100 000 €”

- `/contratos` (`ContratosPage.vue`) é uma vista de Despesa (`despesas_publicas`, montante ≥ 100 000 €) e liga a `/despesa/:id`;
- `/investimentos` redireciona para `/contratos` e `/investimentos/inv-<id>` para `/despesa/<id>` (no router e com 301 no `_redirects`);
- o nav, a home (botão e estatística), Métricas, Sobre, Dados, Digest, Perfil e as notificações PWA passam a usar o novo nome;
- a tabela `investimentos` mantém-se (o sync continua a preenchê-la, por causa dos votos e do realtime), mas já não é uma secção à parte.

## Passo 13: fontes para lá da saúde (spike)

| Fonte | Acesso | Volume | Licença | Veredito |
|---|---|---|---|---|
| **Portal Base completo** (IMPIC, dados.gov.pt `contratos-publicos-portal-base-impic-contratos-de-2012-a-2026`) | API udata → `contratos<ano>.zip` (1 JSON/ano), semanal | 2026: 194 863 contratos, 4379 entidades, 16,3 mil M€; 45 MB zip / 348 MB JSON | `other-pd` (domínio público) | **Escolhida.** Tem `idcontrato` oficial e link direto ao detalhe |
| PRR (Estrutura de Missão Recuperar Portugal) | xlsx diário: Projetos (386 911 linhas: valor aprovado/pago, datas, investimento), Entidades, Contratualização, Localizações | 40 MB xlsx | “notspecified” → confirmar | Boa para “Investimentos” reais. Fase 2 |
| Portugal 2030 (AD&C) | xlsx mensal “03_Lista de Operações” (24 544 operações, NIF e nome do beneficiário, fundo, custo elegível, fundo pago, estado) | 19 MB xlsx | “notspecified” → confirmar | Boa. Fase 2, junto com o PRR |
| SNS Transparência (atual) | API Opendatasoft | só a saúde, sem id de contrato | aberta | Fica até a Base completa entrar |

Protótipo local:

- migração `20261023130000_contratos_base_prototipo.sql` com as tabelas novas `contratos_base` (id = `idcontrato`),
  `entidades_publicas`, a RPC `refresh_entidades_publicas()` e a vista `despesa_contrato_base`, que liga a Despesa atual ao `idcontrato`;
- `scripts/ingest-portal-base.mjs --ano=2026` descarrega do dados.gov.pt e faz upsert por PostgREST com service_role.
  Local: 193 905 contratos em 25 s (956 ids repetidos no próprio ficheiro, descartados);
- ligação: 123 das 126 despesas SNS de 2026 já encontram o `idcontrato` oficial. Isto permite, mais tarde,
  trocar o id hash pelo id oficial e acabar de vez com a deduplicação por heurística.

Falta para produção: um job semanal (GitHub Actions), as páginas (pesquisa por entidade/CPV) e a decisão
sobre o volume (cerca de 200 mil linhas por ano; ~1,3 M desde 2020). O plano gratuito do Supabase tem 500 MB:
ou se guardam só ≥ 5 000 €, ou só os últimos 2 anos, ou se passa ao plano Pro.

## Passo 14: SEO sem SSR

Escolhida a opção mais leve compatível com Quasar SPA e Cloudflare Pages:

- `scripts/prerender-meta.mjs` (corre no `pnpm build`) escreve `dist/pwa/<rota>.html` para 17 rotas estáticas,
  com o `<title>`, description, canonical, og e twitter certos, e um `<noscript>` com o título. O Pages serve `/despesa` a partir de `despesa.html`;
- `functions/{iniciativas,despesa,comunicados}/[id].js` são Pages Functions que leem a ficha no Supabase
  (anon, cache de 10 min, timeout de 2,5 s) e devolvem o shell com a meta da ficha. Se a BD falhar, usam a meta da secção.
  O `_routes.json` limita as Functions a estas 3 rotas (assets e páginas estáticas não as invocam);
- config: `SUPABASE_URL`/`SUPABASE_ANON_KEY` nas variáveis do projeto Pages ou, sem nada configurado,
  o `seo-config.json` gerado no build a partir das `VITE_*` (valores públicos, que já estão no bundle);
- router: na 1.ª navegação mantém o `<title>` do servidor, porque o Googlebot executa JS.

Prova: `curl` contra `wrangler pages dev dist/pwa` (ver o relatório do agente) e os testes `node --test seo/`.
