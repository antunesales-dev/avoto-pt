/**
 * Filtros de período para listas (votações, despesa, resumos).
 * Compara só o dia civil (YYYY-MM-DD), sem bugs de timezone UTC vs local.
 */

export const DATE_RANGE_OPTIONS = [
  { id: 'todos', label: 'Todas as datas' },
  { id: 'hoje', label: 'Hoje' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: '90d', label: 'Últimos 90 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'ano', label: 'Este ano' },
  { id: 'futuro', label: 'Futuro' },
  { id: 'passados', label: 'Já passaram' },
]

/**
 * Extrai { y, m, d } de string ISO, Date, ou timestamp.
 * @returns {{ y: number, m: number, d: number } | null}
 */
export function parseDayParts(iso) {
  if (iso == null || iso === '') return null

  if (iso instanceof Date && !Number.isNaN(iso.getTime())) {
    return {
      y: iso.getFullYear(),
      m: iso.getMonth() + 1,
      d: iso.getDate(),
    }
  }

  if (typeof iso === 'number' && Number.isFinite(iso)) {
    const dt = new Date(iso)
    if (Number.isNaN(dt.getTime())) return null
    return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }
  }

  const s = String(iso).trim()
  // 2026-07-17 | 2026-07-17T00:00:00Z | 2026-07-17 00:00:00+00
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (m) {
    return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
  }
  // 17/07/2026
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s)
  if (m) {
    return { y: Number(m[3]), m: Number(m[2]), d: Number(m[1]) }
  }
  // fallback Date.parse
  const dt = new Date(s)
  if (!Number.isNaN(dt.getTime())) {
    // Se a string era só data ISO, Date.parse trata como UTC e em PT pode mudar o dia.
    // Preferir só se não era ISO-like.
    if (!/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }
    }
  }
  return null
}

/** Chave ordenável YYYYMMDD */
export function dayKey(parts) {
  if (!parts) return null
  return parts.y * 10000 + parts.m * 100 + parts.d
}

export function todayParts() {
  const n = new Date()
  return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }
}

export function todayKey() {
  return dayKey(todayParts())
}

function addDaysParts(parts, delta) {
  const dt = new Date(parts.y, parts.m - 1, parts.d)
  dt.setDate(dt.getDate() + delta)
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }
}

/** Compat: devolve Date local meia-noite (legado). */
export function parseDay(iso) {
  const p = parseDayParts(iso)
  if (!p) return null
  return new Date(p.y, p.m - 1, p.d)
}

/**
 * @param {string|Date|null|undefined} iso
 * @param {string} rangeId
 */
export function matchesDateRange(iso, rangeId) {
  if (!rangeId || rangeId === 'todos') return true

  const parts = parseDayParts(iso)
  if (!parts) return false

  const k = dayKey(parts)
  const t0 = todayKey()
  const today = todayParts()

  if (rangeId === 'hoje') return k === t0

  if (rangeId === '7d') {
    const from = dayKey(addDaysParts(today, -6)) // inclui hoje = 7 dias
    return k >= from && k <= t0
  }

  if (rangeId === '30d') {
    const from = dayKey(addDaysParts(today, -29))
    return k >= from && k <= t0
  }

  if (rangeId === '90d') {
    const from = dayKey(addDaysParts(today, -89))
    return k >= from && k <= t0
  }

  // "Esta semana" (seg–dom) — mantido se ainda for usado
  if (rangeId === 'semana') {
    const day = new Date(today.y, today.m - 1, today.d).getDay()
    const offset = day === 0 ? -6 : 1 - day
    const mon = addDaysParts(today, offset)
    const sun = addDaysParts(mon, 6)
    const kMon = dayKey(mon)
    const kSun = dayKey(sun)
    return k >= kMon && k <= kSun
  }

  if (rangeId === 'mes') {
    return parts.y === today.y && parts.m === today.m
  }

  if (rangeId === 'ano') {
    return parts.y === today.y
  }

  if (rangeId === 'futuro') return k > t0

  if (rangeId === 'passados') return k < t0

  return true
}

export function dateRangeLabel(rangeId) {
  return DATE_RANGE_OPTIONS.find((o) => o.id === rangeId)?.label || 'Todas as datas'
}

/**
 * Períodos candidatos por tipo de página (ainda filtrados pelos dados reais).
 * Despesa/investimentos/digest: sem “Futuro” (registos são retrospectivos).
 * Iniciativas: “Futuro” só se houver datas de votação/entrada futuras.
 */
export const DATE_RANGE_BY_CONTEXT = {
  iniciativas: ['todos', 'hoje', '7d', '30d', '90d', 'mes', 'ano', 'futuro', 'passados'],
  despesa: ['todos', 'hoje', '7d', '30d', '90d', 'mes', 'ano', 'passados'],
  investimentos: ['todos', 'hoje', '7d', '30d', '90d', 'mes', 'ano', 'passados'],
  digest: ['todos', 'hoje', '7d', '30d', '90d', 'mes', 'ano', 'passados'],
}

/**
 * Devolve só opções com resultados nos dados actuais (+ “Todas”).
 * @param {Array<string|Date|null|undefined>} isoDates
 * @param {string[]} candidateIds
 * @returns {{ id: string, label: string, count: number }[]}
 */
export function availableDateRanges(isoDates, candidateIds = null) {
  const list = Array.isArray(isoDates) ? isoDates : []
  const ids =
    candidateIds ||
    DATE_RANGE_OPTIONS.map((o) => o.id)

  const out = []
  for (const id of ids) {
    const base = DATE_RANGE_OPTIONS.find((o) => o.id === id)
    if (!base) continue
    if (id === 'todos') {
      out.push({ ...base, count: list.length })
      continue
    }
    let n = 0
    for (const iso of list) {
      if (matchesDateRange(iso, id)) n += 1
    }
    if (n > 0) out.push({ ...base, count: n })
  }
  return out
}

/** Opções úteis para uma página, com base nos dados carregados. */
export function optionsForContext(context, isoDates) {
  const ids = DATE_RANGE_BY_CONTEXT[context] || DATE_RANGE_OPTIONS.map((o) => o.id)
  return availableDateRanges(isoDates, ids)
}

/** Se o período activo deixou de existir (0 resultados), volta a “todos”. */
export function coerceDateRange(rangeId, options) {
  if (!rangeId || rangeId === 'todos') return 'todos'
  if (Array.isArray(options) && options.some((o) => o.id === rangeId)) return rangeId
  return 'todos'
}
