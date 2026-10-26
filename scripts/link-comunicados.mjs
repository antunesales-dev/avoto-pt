#!/usr/bin/env node
/**
 * Propõe ligações comunicados/notícias do Governo ↔ iniciativas da AR
 * (pg_trgm + janela de datas, RPC `propose_comunicado_links`) e permite revê-las.
 *
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   node scripts/link-comunicados.mjs [--since=YYYY-MM-DD | --days=60] [--min=0.33] [--top=5] [--sample=10] [--batch=25]
 *     (em lotes de --batch comunicados por chamada, abaixo do statement_timeout de 8 s)
 *   node scripts/link-comunicados.mjs --confirm=<comunicado_id>:<iniciativa_id> [--por=nome]
 *   node scripts/link-comunicados.mjs --reject=<comunicado_id>:<iniciativa_id>
 *   node scripts/link-comunicados.mjs --reset=<comunicado_id>:<iniciativa_id>   (volta a "proposta")
 *
 * Propostas (confirmado = null) aparecem na app como "sugestão automática";
 * confirmadas (true) como ligação verificada; rejeitadas (false) ficam escondidas
 * e nunca são re-propostas.
 */
import { createClient } from '@supabase/supabase-js'

export function parseArgs(argv) {
  const out = {}
  for (const a of argv) {
    const m = a.match(/^--([a-z-]+)(?:=(.*))?$/)
    if (m) out[m[1]] = m[2] ?? true
  }
  return out
}

export function sinceFrom(args, today = new Date()) {
  if (args.since && /^\d{4}-\d{2}-\d{2}$/.test(args.since)) return args.since
  const days = Number(args.days || 60)
  const d = new Date(today.getTime() - (Number.isFinite(days) ? days : 60) * 86400000)
  return d.toISOString().slice(0, 10)
}

export function parsePair(v) {
  const s = String(v || '')
  const i = s.indexOf(':')
  if (i <= 0 || i === s.length - 1) throw new Error(`Par inválido "${s}" (usar comunicado_id:iniciativa_id)`)
  return { comunicado_id: s.slice(0, i), iniciativa_id: s.slice(i + 1) }
}

/** Divide uma lista em lotes de tamanho n. */
export function chunk(list, n) {
  const out = []
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n))
  return out
}

const isTimeout = (e) => e?.code === '57014' || /statement timeout/i.test(e?.message || '')
// RPC sem o parâmetro p_ids (migração 20261023160124 ainda não aplicada)
const isMissingParam = (e) => e?.code === 'PGRST202' || /p_ids/.test(e?.message || '')

/**
 * Propõe ligações em lotes de comunicados (RPC com p_ids), para nunca chegar ao
 * statement_timeout de 8 s do PostgREST. Um lote que ainda assim exceda o tempo é dividido ao meio.
 * Resultado idêntico a uma chamada única: o IDF é sempre do corpus inteiro e o ranking é por comunicado.
 * Inclui todos os comunicados da janela (qualquer tipo) para que propostas antigas de comunicados
 * que mudaram de tipo continuem a ser limpas, como na chamada única.
 */
export async function proposeInBatches(admin, params, batch = 25) {
  const ids = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from('comunicados')
      .select('id')
      .gte('publicado_em', params.p_since)
      .order('publicado_em', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + 999)
    if (error) throw error
    ids.push(...(data || []).map((x) => x.id))
    if (!data || data.length < 1000) break
  }
  const tot = { comunicados: 0, propostas: 0, novas: 0, lotes: 0, maxMs: 0 }
  const run = async (part) => {
    const t = Date.now()
    const { data, error } = await admin.rpc('propose_comunicado_links', { ...params, p_ids: part })
    if (error) {
      if (isTimeout(error) && part.length > 1) {
        const mid = Math.ceil(part.length / 2)
        await run(part.slice(0, mid))
        await run(part.slice(mid))
        return
      }
      throw error
    }
    const r = Array.isArray(data) ? data[0] : data
    tot.comunicados += r?.comunicados ?? 0
    tot.propostas += r?.propostas ?? 0
    tot.novas += r?.novas ?? 0
    tot.lotes++
    tot.maxMs = Math.max(tot.maxMs, Date.now() - t)
  }
  try {
    for (const part of chunk(ids, batch)) await run(part)
  } catch (e) {
    if (!isMissingParam(e) || tot.lotes) throw e
    console.warn('propose_comunicado_links sem p_ids (migração por aplicar): chamada única')
    const { data, error } = await admin.rpc('propose_comunicado_links', params)
    if (error) throw error
    const r = Array.isArray(data) ? data[0] : data
    return { comunicados: r?.comunicados ?? 0, propostas: r?.propostas ?? 0, novas: r?.novas ?? 0, lotes: 0, maxMs: 0 }
  }
  return tot
}

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const admin = createClient(url, key, { auth: { persistSession: false } })
  const args = parseArgs(process.argv.slice(2))

  for (const [flag, value] of [['confirm', true], ['reject', false], ['reset', null]]) {
    if (!args[flag]) continue
    const p = parsePair(args[flag])
    const { error } = await admin.rpc('review_comunicado_link', {
      p_comunicado_id: p.comunicado_id,
      p_iniciativa_id: p.iniciativa_id,
      p_confirmado: value,
      p_por: typeof args.por === 'string' ? args.por : 'script',
    })
    if (error) throw error
    console.log(`${flag}: ${p.comunicado_id} ↔ ${p.iniciativa_id}`)
    return
  }

  const since = sinceFrom(args)
  const params = { p_since: since }
  if (args.min) params.p_min = Number(args.min)
  if (args.top) params.p_top = Number(args.top)
  const batch = Math.max(1, Number(args.batch || 25))
  const t0 = Date.now()
  const r = await proposeInBatches(admin, params, batch)
  console.log(
    `Desde ${since}: ${r.comunicados} comunicados com ligação, ${r.propostas} propostas (${r.novas} novas) em ${Date.now() - t0} ms` +
      (r.lotes ? ` — ${r.lotes} lote(s) de ≤${batch}, máx. ${r.maxMs} ms/lote` : ' — chamada única'),
  )

  const sample = Number(args.sample ?? 10)
  if (sample > 0) {
    const { data: rows, error: e2 } = await admin
      .from('comunicado_iniciativa')
      .select('score, confirmado, motivo, comunicados!inner(titulo, publicado_em), iniciativas!inner(id_oficial, titulo)')
      .gte('comunicados.publicado_em', since)
      .order('score', { ascending: false })
      .limit(sample)
    if (e2) throw e2
    for (const x of rows || []) {
      const flag = x.confirmado === true ? '✔' : x.motivo?.auto_alta ? '★' : '·'
      console.log(
        `${flag} ${Number(x.score).toFixed(2)}  [${x.comunicados.publicado_em}] ${x.comunicados.titulo.slice(0, 70)}\n         ↔ ${x.iniciativas.id_oficial}: ${x.iniciativas.titulo.slice(0, 90)}`,
      )
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e?.message || e)
    process.exit(1)
  })
}
