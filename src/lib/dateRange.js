/**
 * Filtros de período para listas (votações, despesa, resumos).
 * Datas em calendário local (pt) — só a parte YYYY-MM-DD.
 */

export const DATE_RANGE_OPTIONS = [
  { id: 'todos', label: 'Todas as datas' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mês' },
  { id: 'futuro', label: 'Futuro' },
  { id: 'passados', label: 'Já passaram' },
]

/** @param {string|Date|null|undefined} iso */
export function parseDay(iso) {
  if (iso == null || iso === '') return null
  if (iso instanceof Date && !Number.isNaN(iso.getTime())) {
    return new Date(iso.getFullYear(), iso.getMonth(), iso.getDate())
  }
  const s = String(iso).slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || !mo || !d) return null
  return new Date(y, mo - 1, d)
}

function startOfToday() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

/** Segunda-feira da semana corrente (calendário local). */
function startOfWeekMonday(from = startOfToday()) {
  const day = from.getDay() // 0=dom
  const offset = day === 0 ? -6 : 1 - day
  const mon = new Date(from)
  mon.setDate(from.getDate() + offset)
  return mon
}

/**
 * @param {string|Date|null|undefined} iso
 * @param {string} rangeId
 * @returns {boolean}
 */
export function matchesDateRange(iso, rangeId) {
  if (!rangeId || rangeId === 'todos') return true
  const d = parseDay(iso)
  if (!d) return false

  const today = startOfToday()
  const t = d.getTime()
  const t0 = today.getTime()

  if (rangeId === 'hoje') return t === t0

  if (rangeId === 'semana') {
    const mon = startOfWeekMonday(today)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return t >= mon.getTime() && t <= sun.getTime()
  }

  if (rangeId === 'mes') {
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
  }

  if (rangeId === 'futuro') return t > t0

  if (rangeId === 'passados') return t < t0

  return true
}

/** Rótulo curto do período activo (para empty states). */
export function dateRangeLabel(rangeId) {
  return DATE_RANGE_OPTIONS.find((o) => o.id === rangeId)?.label || 'Todas as datas'
}
