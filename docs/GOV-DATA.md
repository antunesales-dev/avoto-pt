# Dados oficiais na A Voto

Plataforma **independente**. Usa **apenas** portais oficiais do Estado / AR / Governo.

## Pilares (sem repetir o mesmo facto em duas “fontes”)

| Pilar | O quê | Tabelas | Voto cidadão | Casa na UI |
|-------|--------|---------|--------------|------------|
| **Parlamento** | Iniciativas e votações AR | `iniciativas`, contagens | **Sim** | `/iniciativas`, Comparação |
| **Resumo do dia** | Boletim **AR + despesa** do dia (datas oficiais) | `daily_digests` | só agrega votos AR | `/digest` |
| **Despesa** | Catálogo de contratos Base | `despesas_publicas` | **Não** | `/despesa` |
| **Investimentos** | **Subconjunto** da despesa (≥ 100k €) | `investimentos` (`despesa_id`) | **Não** (consulta) | `/investimentos` |
| **Comunicados** | Notícias / CM / nomeações oficiais | `comunicados` | **Não** | `/comunicados` |
| **Digest comunicados** | Índice diário **só** de comunicados | `comunicados_digests` | **Não** | secção em `/comunicados` |

**Importante:**

- Despesa e investimentos **não são duas fontes** — mesmo Portal Base; investimentos = filtro de valor.
- Comunicados **não** entram no Resumo do dia AR e **não** misturam contratos.
- Voto cidadão **apenas** em iniciativas da AR.

## Fontes oficiais (permitidas)

- [Dados Abertos AR](https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx)
- [Base.gov.pt](https://www.base.gov.pt) — contratos públicos
- [dados.gov.pt](https://dados.gov.pt) — catálogo Estado
- [portugal.gov.pt](https://portugal.gov.pt) — comunicados e notícias do Governo (sitemap + páginas)
- [DGO](https://www.dgo.gov.pt) — orçamento (referência)

**Proibido como fonte de verdade:** notícias privadas, blogs, wikis, **feeds X/Twitter** (ex. @govpt), agregadores não oficiais.

## Jobs (edge / Node)

| Function / script | Frequência | Função |
|-------------------|------------|--------|
| `ar-sync` / `scripts/sync-ar.mjs` | diária | Dados Abertos AR → `iniciativas` |
| `despesa-sync` | diária | Portal Base → despesas + investimentos |
| `daily-digest` / `generate-digests.mjs` | diária | `daily_digests` (AR + despesa) |
| `comunicados-sync` | diária | portugal.gov.pt → `comunicados` + `comunicados_digests` |
| `comunicados-digest` | sob demanda | regenerar um dia de comunicados |

Cron: `workers/daily-cron` e `.github/workflows/sync-daily.yml`.

## Princípios de produto

- Não é democracia directa nem voto vinculativo.
- Não pretende ser amostra representativa da população.
- Não recomenda partidos nem “vencedores”.
- Despesa, investimentos e comunicados: **transparência**, não “controlo do governo”.
- **Uma casa canónica por tipo de facto** — o resto liga, não duplica.

## Ordem dos partidos (anti-enviesamento)

**Regra canónica:** listas e badges em **ordem alfabética da sigla** (`localeCompare` pt-PT).

Ver UI em `/como-funciona` e composição em `src/data/composicaoAr.js`.

## Plano de evolução

- [`docs/PLAN-VOTOS-E-COMUNICADOS.md`](./PLAN-VOTOS-E-COMUNICADOS.md) — votos só AR + comunicados.
