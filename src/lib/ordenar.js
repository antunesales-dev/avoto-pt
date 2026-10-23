/**
 * Ordenação cliente das listas de Despesa e Contratos.
 * Sem dependências (testável com `node --test`).
 */

export const ORDEM_DATA = 'data'
export const ORDEM_VALOR = 'valor'

export const ORDEM_OPCOES = [
  { id: ORDEM_DATA, label: 'Mais recentes' },
  { id: ORDEM_VALOR, label: 'Maior valor' },
]

function toTime(v) {
  if (v == null || v === '') return null
  const t = Date.parse(v)
  return Number.isFinite(t) ? t : null
}

function toNum(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Descendente com nulos no fim. */
function cmpDescNullsLast(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return b - a
}

/**
 * Devolve uma cópia ordenada (não altera `rows`).
 * - `data`: mais recente primeiro (`getDate(row)`), sem data no fim; empate → maior valor.
 * - `valor`: maior `montante_eur` primeiro, sem valor no fim; empate → mais recente.
 * @param {Array<object>} rows
 * @param {'data'|'valor'} ordem
 * @param {(row: object) => any} getDate
 */
export function ordenarPorDataOuValor(rows, ordem, getDate) {
  const list = Array.isArray(rows) ? [...rows] : []
  const date = (r) => toTime(getDate(r))
  const valor = (r) => toNum(r?.montante_eur)
  const primary = ordem === ORDEM_VALOR ? valor : date
  const secondary = ordem === ORDEM_VALOR ? date : valor
  return list.sort(
    (a, b) =>
      cmpDescNullsLast(primary(a), primary(b)) || cmpDescNullsLast(secondary(a), secondary(b)),
  )
}
