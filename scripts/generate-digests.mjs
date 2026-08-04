#!/usr/bin/env node
/**
 * Gera digests multi-secção para todas as datas com actividade na BD.
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const admin = createClient(url, key)

async function datesFrom(table, col) {
  const { data, error } = await admin.from(table).select(col).not(col, 'is', null).limit(5000)
  if (error) throw error
  return (data || []).map((r) => String(r[col]).slice(0, 10)).filter(Boolean)
}

async function main() {
  // Só datas oficiais do registo — nunca last_synced_at (isso enchia o “dia” com o catálogo).
  const sets = await Promise.all([
    datesFrom('iniciativas', 'data_votacao'),
    datesFrom('despesas_publicas', 'data_publicacao'),
    datesFrom('investimentos', 'data_referencia'),
  ])

  const all = [...new Set(sets.flat())].sort().reverse()
  console.log('Datas a gerar (só oficiais):', all.length)

  let ok = 0
  let fail = 0
  for (const d of all) {
    const { data, error } = await admin.rpc('generate_daily_digest', { p_date: d })
    if (error) {
      fail++
      console.error('fail', d, error.message)
    } else {
      ok++
      process.stdout.write(`  ${data}\r`)
    }
  }
  console.log(`\nDigests: ${ok} ok, ${fail} fail`)

  const { count } = await admin
    .from('daily_digests')
    .select('*', { count: 'exact', head: true })
  console.log('Total digests na BD:', count)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
