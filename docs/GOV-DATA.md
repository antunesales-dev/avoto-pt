# Dados governamentais na A Voto

Plataforma **independente**. Usa **apenas** portais oficiais do Estado / AR.

## Pilares

| Pilar | O quê | Tabelas | Voto cidadão |
|-------|--------|---------|--------------|
| **Parlamento** | Iniciativas e votações AR | `iniciativas`, contagens | A favor / Contra / Abstenção |
| **Digest diário** | O que foi a voto e **como** (partidos + cidadãos) | `daily_digests` | (agrega votos existentes) |
| **Despesa** | Contratos, linhas OE, spending | `despesas_publicas` | leitura + transparência |
| **Investimentos** | Grandes investimentos | `investimentos` | Aprovar / Rejeitar / Abster + vs decisão oficial |

## Fontes oficiais (permitidas)

- [Dados Abertos AR](https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx)
- [Base.gov.pt](https://www.base.gov.pt) — contratos públicos
- [dados.gov.pt](https://dados.gov.pt) — catálogo Estado
- [DGO](https://www.dgo.gov.pt) — orçamento

**Proibido:** notícias, blogs, wikis, agregadores não oficiais.

## Jobs (edge)

| Function | Frequência sugerida | Função |
|----------|---------------------|--------|
| `ar-sync` | diária | iniciativas / votações AR |
| `daily-digest` | diária (após ar-sync) | gera `daily_digests` |
| `despesa-sync` | diária | despesas + investimentos oficiais |

Cron: Cloudflare Worker ou scheduler com `x-avoto-cron-secret`.

## Princípios de produto

- Não é democracia directa nem voto vinculativo.
- Não pretende ser amostra representativa da população.
- Não recomenda partidos nem “vencedores”.
- Despesa e investimentos: **transparência e comparação**, não “controlo do governo”.
