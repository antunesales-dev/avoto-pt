/**
 * “Contratos ≥ 100 000 €” é uma vista de Despesa (mesmo Portal Base), não outra fonte.
 * O mesmo limiar é usado pelo sync (`_shared/despesa.ts`) e pela métrica
 * `metricas_globais.investimentos`.
 */
export const CONTRATO_LIMIAR_EUR = 100_000

export const CONTRATOS_LABEL = 'Contratos ≥ 100 000 €'

export function isContratoGrande(d) {
  const v = Number(d?.montante_eur)
  return Number.isFinite(v) && v >= CONTRATO_LIMIAR_EUR
}

/** /investimentos/inv-<despesa_id> (links antigos e notificações) → /despesa/<despesa_id> */
export function despesaIdFromInvestimentoId(id) {
  return String(id || '').replace(/^inv-/, '')
}
