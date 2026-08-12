# Plano · Voto só em iniciativas + Comunicados (info) sem duplicar

**Estado:** **Fase A e Fase B implementadas** (2026-08). Manter este doc alinhado com o código.

## Princípios

| Princípio | Significado |
|-----------|-------------|
| **Voto = Parlamento** | Só iniciativas AR. |
| **Despesa / Investimentos = dinheiro** | Consulta; sem voto. |
| **Comunicados = Executivo** | portugal.gov.pt; sem voto. |
| **Sem info repetida** | Uma casa canónica + links. |
| **Dois digests** | `/digest` = AR+despesa · índice em `/comunicados` = só Governo. |

## Fase A — feita

- UI investimentos sem voto; `cast_voto_investimento` revogado a `authenticated`.
- Migration `20260812120000_vote_only_iniciativas.sql`.
- Copy Início / Dados / Como funciona / Métricas.

## Fase B — feita

| Peça | Onde |
|------|------|
| Schema | `20260812140000_comunicados_gov.sql` → `comunicados`, `comunicados_digests`, `generate_comunicados_digest` |
| Sync | `comunicados-sync` (sitemap + HTML), `_shared/comunicados.ts` |
| Digest job | `comunicados-digest` (+ gerado no sync) |
| UI | `/comunicados`, `/comunicados/:id`, nav principal |
| Cron | `workers/daily-cron`, `.github/workflows/sync-daily.yml` |
| Docs | `GOV-DATA.md`, `/dados`, Sobre, Resumo do dia |

### Fonte e limites do sync

- **Fonte:** sitemap + páginas `portugal.gov.pt` (gc25): CM, notícias com slug, nomeações, etc.
- **Não** X/@govpt.
- Notícias diárias que o sitemap não lista com slug individual podem faltar até o portal as expor no sitemap — o sync falha ruidoso no painel de importações.

## Anti-duplicação (operacional)

1. Contrato Base → só `despesas_publicas` (+ vista investimentos).  
2. Comunicado → só `comunicados` (+ índice `comunicados_digests`).  
3. Votação AR → só `iniciativas` (+ `daily_digests`).  
4. Nunca copiar o mesmo texto em duas listas como se fossem factos distintos.
