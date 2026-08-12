# Plano · Voto só em iniciativas + Comunicados (info) sem duplicar

**Estado:** planeamento (sem implementação neste doc).  
**Objectivo:** clarificar o produto; votação cidadã **apenas** em iniciativas da AR; nova área de **comunicados/medidas** só de leitura, com **digest próprio**, sem repetir o que já existe.

---

## 1. Princípios (acordados)

| Princípio | Significado |
|-----------|-------------|
| **Voto = Parlamento** | Só iniciativas AR (comparação com partidos). |
| **Despesa / Investimentos = dinheiro público** | Consulta; **sem** voto cidadão. |
| **Comunicados = Executivo** | Anúncios / medidas (ex. portugal.gov.pt); **sem** voto. |
| **Sem info repetida** | Cada facto tem **uma** casa canónica; outras páginas só **linkam**. |
| **Digest ≠ feed único** | Resumo do dia (AR + despesa) **≠** digest de comunicados. |

---

## 2. Mapa de conteúdo (anti-duplicação)

| Tipo de facto | Casa canónica | Aparece noutro sítio? | Voto? |
|---------------|---------------|------------------------|-------|
| Votação AR | `/iniciativas` (+ detalhe) | Resumo do dia (secção Parlamento); Comparação | **Sim** |
| Contrato Portal Base | `/despesa` | Investimentos = **vista filtrada** do mesmo contrato (≥100k), **não** 2.ª fonte; Resumo do dia secção Despesa | **Não** |
| Contrato ≥100k (hoje “investimento”) | Mesmo registo que despesa (`despesa_id`) | Lista `/investimentos` = filtro + copy “grande valor”; detalhe sem voto | **Não** (após reformulação) |
| Comunicado / medida Governo | `/comunicados` (novo) | Digest **próprio** de comunicados; **nunca** no Resumo do dia AR | **Não** |
| Post X @govpt | Não é fonte de verdade | No máximo link externo; **não** importar como registo | — |

### Regras de não-repetição (implementação)

1. **Investimento** continua a ser o **mesmo contrato** que Despesa (`despesa_id` / stable id). UI: “é o mesmo registo; aqui filtrado por valor”. Sem segundo texto inventado.  
2. **Comunicado** tem `source_url` canónico (URL portugal.gov.pt). Se o mesmo URL voltar no sync → **upsert**, não duplicar linha.  
3. **Resumo do dia** (`generate_daily_digest` / `/digest`): **só** `data_votacao` AR + `data_publicacao` despesa. **Zero** comunicados.  
4. **Digest de comunicados** (novo job/RPC): **só** comunicados com data oficial do comunicado. **Zero** iniciativas, **zero** contratos.  
5. Cross-links opcionais (fase 2): “no mesmo dia também houve X votações” → link para `/digest?data=…`, **sem** copiar itens.

---

## 3. Fase A — Reformular votos (só iniciativas)

### 3.1 Produto / UI

| Onde | Acção |
|------|--------|
| `/investimentos` | Remover copy de “aprovar / rejeitar / abster-se”. Tom = **consulta** (como Despesa). |
| `/investimentos/:id` | Remover secção **Voto dos cidadãos**, botões, `VoteBar` de cidadãos. Manter montante, entidade, fontes, link à despesa irmã. |
| “Decisão oficial” | Manter só se for dado real; senão simplificar para nota de registo (evitar parecer voto de partidos). |
| `/como-funciona`, `/sobre`, `/dados`, métricas | Texto: voto cidadão **apenas** em iniciativas da AR. |
| Perfil / histórico | Se listar votos de investimento, deixar de oferecer novos; histórico antigo: ver 3.3. |
| Nav | Manter Despesa + Investimentos (ou, mais tarde, unificar — **fora** desta fase). |

### 3.2 Código app

- Remover / deixar de exportar uso de `castVotoInvestimento` na UI.  
- `auth.castVotoInvestimento` → deprecar (remover ou no-op documentado).  
- Store `finance`: pode deixar de carregar agregados de votos de investimento para a lista (simplifica).  
- Digest: se ainda injeta `votos_cidadaos` em itens `investimento`, **parar** (só iniciativas têm voto no boletim).

### 3.3 Backend / BD

| Peça | Acção recomendada |
|------|-------------------|
| `cast_voto_investimento` | **Revogar** `EXECUTE` a `authenticated` / anon (fail-loud se alguém chamar API). |
| Tabelas `votos_investimentos`, `investimento_voto_counts`, views agg | **Manter** por agora (histórico); não apagar na 1.ª PR. Opcional: migração futura de archive. |
| `cast_voto` (iniciativas) | **Intocado** — continua o único caminho de voto. |
| RLS | Escrita de votos investimento já bloqueada a client directo; garantir só service/legado. |

### 3.4 Critérios de aceite (Fase A)

- [ ] Não há UI de voto em investimentos.  
- [ ] Voto em iniciativa AR continua (login, confirmação, imutável).  
- [ ] RPC `cast_voto_investimento` não é invocável por client.  
- [ ] Copy e docs de produto alinhados.  
- [ ] Despesa e investimentos **não** duplicam narrativa de “duas fontes”.

### 3.5 Ordem de PRs (Fase A)

1. **PR A1** — UI + copy (sem voto em investimentos).  
2. **PR A2** — Revogar RPC + limpar store/digest de votos investimento.  
3. **PR A3** (opcional) — Métricas/perfil se ainda contarem votos investimento.

---

## 4. Fase B — Comunicados + digest próprio

### 4.1 Produto

| | |
|--|--|
| **Rota** | `/comunicados` (+ opcional `/comunicados/:id`) |
| **Nav** | Principal ou grupo Análise, junto a Despesa/Dados — **não** misturar com Iniciativas. |
| **Badge** | “Informação — sem voto” em lista e detalhe. |
| **Fonte** | **portugal.gov.pt** (notícias/comunicados). **Não** @govpt como fonte primária. |
| **Campos** | `id` estável (hash URL), `titulo`, `publicado_em`, `resumo`/`excerto`, `url_oficial`, `tipo` opcional, `last_synced_at`. |
| **Lista** | Filtro de datas (reutilizar `DateRangeFilter`), paginação, link ↗ fonte. |
| **Sem** | VoteBar, CID, comparação partidos, entrada no `/digest` actual. |

### 4.2 Digest próprio de comunicados

| | Resumo do dia (actual) | Digest comunicados (novo) |
|--|------------------------|---------------------------|
| **Job** | `daily-digest` → `generate_daily_digest` | Novo: ex. `comunicados-digest` → `generate_comunicados_digest` |
| **Tabela** | `daily_digests` | Nova: ex. `comunicados_digests` **ou** `daily_digests` com `kind = 'comunicados'` — preferência: **tabela ou kind separado** para não misturar UI |
| **Conteúdo** | AR + despesa (datas oficiais) | Só comunicados daquele dia |
| **UI** | `/digest` | `/comunicados` com secção “Por dia” **ou** `/comunicados/resumo` — **uma** superfície, sem segundo sítio a listar os mesmos cards em full |

**Anti-duplicação no digest comunicados:**

- O digest do dia **referencia** IDs de comunicados (ou lista curta com link “ver ficha”), não reescreve artigo completo se a ficha já existe.  
- Lista `/comunicados` = catálogo completo; “resumo do dia de comunicados” = **índice do dia**, não 2.ª cópia do texto.

### 4.3 Sync

1. Edge (ou script Node se HTML for pesado): fetch listagem portugal.gov.pt.  
2. Parse: título, data, URL, excerto.  
3. Upsert por `url_oficial` / hash.  
4. Cron: após ou em paralelo a AR/despesa — **step separado** no `daily-cron` / GitHub Actions.  
5. Depois do sync: gerar digest de comunicados **só** para a data do run (e backfill opcional).

### 4.4 Critérios de aceite (Fase B)

- [ ] Página de lista + detalhe mínimo (ou detalhe = redirect à fonte se preferires thin client).  
- [ ] Zero voto.  
- [ ] Zero itens de comunicados em `/digest` (AR).  
- [ ] Digest/job próprio; UI sem repetir o catálogo inteiro duas vezes no mesmo ecrã.  
- [ ] Fontes e `/dados` documentam a nova fonte.  
- [ ] Sync idempotente (re-run não multiplica linhas).

### 4.5 Ordem de PRs (Fase B)

1. **PR B1** — Schema + RLS (leitura pública, escrita service_role).  
2. **PR B2** — Sync + secrets/cron.  
3. **PR B3** — UI `/comunicados`.  
4. **PR B4** — `generate_comunicados_digest` + ligação na UI (índice do dia).  
5. **PR B5** — Docs `/dados`, Sobre, Como funciona.

---

## 5. O que **não** fazer (claro)

- Não juntar comunicados ao `generate_daily_digest` actual.  
- Não votar em comunicados nem em contratos.  
- Não importar timeline X como BD.  
- Não duplicar o mesmo contrato como “notícia” e “despesa”.  
- Não criar “Resumo do dia” genérico que mistura AR + Governo + contratos no mesmo cartão sem secções canónicas (hoje AR+despesa já tem secções; comunicados ficam **fora**).

---

## 6. Sequência global

```
Fase A (votos)  →  A1 UI  →  A2 RPC  →  (A3 limpeza)
        ↓
Fase B (comunicados)  →  B1 schema  →  B2 sync  →  B3 UI  →  B4 digest próprio  →  B5 docs
```

**Primeiro A, depois B** — evita misturar “ainda se vota em investimentos” com a nova área de info.

---

## 7. Riscos

| Risco | Mitigação |
|-------|-----------|
| Scraper portugal.gov.pt parte | IDs por URL; falha ruidosa no sync panel; não inventar texto |
| Utilizadores estranham fim do voto em investimentos | Copy curta na página Investimentos: “Passámos a consulta; o voto fica nas iniciativas da AR” |
| Expectativa de “tudo no Resumo do dia” | UI e docs: dois boletins com propósitos diferentes |

---

## 8. Decisão de produto (lock)

1. **Voto cidadão = só iniciativas AR.**  
2. **Investimentos = info (como despesa), sem voto.**  
3. **Comunicados = info, página própria, digest próprio, fonte portugal.gov.pt.**  
4. **Sem informação repetida** — uma casa canónica + links.

Quando quiseres executar: começar por **PR A1** (UI sem voto em investimentos).
