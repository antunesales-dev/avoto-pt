# Dados governamentais na A Voto

Plataforma **independente**. Usa **apenas** portais oficiais do Estado / AR.

## Pilares

| Pilar | O quê | Tabelas | Voto cidadão |
|-------|--------|---------|--------------|
| **Parlamento** | Iniciativas e votações AR | `iniciativas`, contagens | A favor / Contra / Abstenção |
| **Resumo do dia** | Boletim diário (leis + despesa do dia) | `daily_digests` | só agrega; não é 3.ª lista completa |
| **Despesa** | Catálogo completo de contratos / spending | `despesas_publicas` | só consulta |
| **Investimentos** | **Subconjunto** da despesa (≥ 100k €) para voto | `investimentos` (mesmo Base, `despesa_id`) | Aprovar / Rejeitar / Abster |

**Importante:** despesa e investimentos **não são duas fontes**. O sync Base grava tudo em despesa e copia os contratos ≥ 100k € para investimentos (voto). O resumo do dia **não** deve listar os dois como se fossem conteúdos distintos.

## Fontes oficiais (permitidas)

- [Dados Abertos AR](https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx)
- [Base.gov.pt](https://www.base.gov.pt) — contratos públicos
- [dados.gov.pt](https://dados.gov.pt) — catálogo Estado
- [DGO](https://www.dgo.gov.pt) — orçamento

**Proibido:** notícias, blogs, wikis, agregadores não oficiais.

## Jobs (edge)

| Function | Frequência sugerida | Função |
|----------|---------------------|--------|
| `ar-sync` | diária | fetch Dados Abertos AR → `iniciativas` |
| `despesa-sync` | diária | Portal Base (SNS open data) → despesas + investimentos |
| `daily-digest` | diária (após syncs) | digest multi-secção |

Cron: `workers/daily-cron` (CF Worker, 06:15 UTC) com `x-avoto-cron-secret`.  
Detalhe: [`docs/AR-IMPORT.md`](./AR-IMPORT.md).

## Princípios de produto

- Não é democracia directa nem voto vinculativo.
- Não pretende ser amostra representativa da população.
- Não recomenda partidos nem “vencedores”.
- Despesa e investimentos: **transparência e comparação**, não “controlo do governo”.
- **Voto de partidos:** sentido por grupo parlamentar (favor / contra / abstenção), sem peso por nº de deputados. Listas em **ordem alfabética de sigla**; só barras de alinhamento % ordenam por métrica (empate → alfabético).
- **Mudança de governo / legislatura:** cada iniciativa guarda o resultado da votação histórica da AR; o sync actualiza dados oficiais novos. Partidos novos = mapear sigla no import + metadados de UI (cor/sigla).

## Partidos na UI

Ficheiro `src/data/partidos.js` — só cores/siglas de apresentação. Fonte de verdade dos votos = Dados Abertos da AR (`resultado_partidos` por iniciativa).

## Digest (agora vs depois)

| Agora | Depois (opcional) |
|-------|-------------------|
| Multi-secção: iniciativas + despesas + investimentos | AI só para **rephrasing** informal por item |
| Título/summary = **templates** pt-PT | Factos mandam; AI não inventa |
| UI `/digest` por secção | Mesma estrutura de `items.sections` |
