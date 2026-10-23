#!/usr/bin/env node
/**
 * Sync AR → Supabase (Node; o JSON ~80MB rebenta a edge free).
 *
 * Uso:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/sync-ar.mjs [--limit=200]
 *
 * Desenvolvimento local (sem descarregar 100 MB de cada vez):
 *   AR_JSON_FILE=/caminho/IniciativasXVII_json.txt node scripts/sync-ar.mjs --limit=all
 *
 * O mapeamento AR → linha `iniciativas` vive em supabase/functions/_shared/ar-mapper.js
 * (partilhado com a edge function ar-sync). Testes: `pnpm test`.
 *
 * CI: .github/workflows/sync-daily.yml
 */
import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { assignDossies, mapArIniciativa } from '../supabase/functions/_shared/ar-mapper.js'

const DA = 'https://www.parlamento.pt/Cidadania/Paginas/DAIniciativas.aspx'
const UA = 'A-Voto/1.0 (+https://avoto.pt; official open data sync)'
// Último URL directo conhecido (XVII legislatura). Só usado se a descoberta falhar.
// Verificado a 2026-10-23: devolve o mesmo ficheiro (md5 igual, 2164 iniciativas) que o URL da descoberta.
// O parâmetro `path` muda a cada pedido à página da AR, mas os URLs antigos continuam válidos.
const AR_JSON_FALLBACK_URL =
  'https://app.parlamento.pt/webutils/docs/doc.txt?path=UQGSgE0Sp3tRCG2sn6zo8opxlYmNMYGWq7K%2bBVFroxGb8rT5%2bwdlFUWxrSb9vW017QRyajTH7FzYzqHk%2feBxphUs3seEKgdDbGcOW2WU5UMiySEcmNR23wvpbUtv6q5dLMQWKYYgMGSV9u5McWMka%2fPxuKmp6kvEh3JUmsagJ3RZWYjSeVEOsgF%2bPK0DfMP9Gw22neN1NTs3y7WLnbytRrlGWiKl%2fZRQUeZFT45Frfr58FECBbg9jywaDFWsHHU8NcV5uHH%2f2N8u7qVXB95xTo0nPaNmZ2FqBZ9T6wmMd4na7znOS9yuLydjwdU7ve%2f0w%2b0frYuMrB%2b67AaZ32uzuIn2SRHR9x0P6Bz%2bYoF9goJWikrxoaQuQohPP4mbkLdj&fich=IniciativasXVII_json.txt&Inline=true'

function parseArgs() {
  let limit = 200
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--limit=')) {
      const n = Number(a.split('=')[1])
      if (a.endsWith('=all') || n === 0) limit = 100_000
      else limit = Math.min(100_000, n || 200)
    }
  }
  return { limit }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Fetch an HTML page and extract a match, retrying on network errors,
 * non-2xx responses or pages missing the expected link (parlamento.pt
 * occasionally serves an error/maintenance page to CI runners).
 */
async function fetchAndMatch(url, headers, patterns, what, attempts = 3) {
  let lastInfo = ''
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) })
      const html = await res.text()
      const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim().slice(0, 120)
      lastInfo = `HTTP ${res.status}, ${html.length} bytes, title="${title}"`
      if (res.ok) {
        for (const re of patterns) {
          const m = html.match(re)
          if (m) return m
        }
      }
    } catch (e) {
      lastInfo = String(e?.message || e)
    }
    if (attempt < attempts) {
      console.warn(`${what} not found (attempt ${attempt}/${attempts}: ${lastInfo}); retrying…`)
      await sleep(30_000 * attempt)
    }
  }
  throw new Error(`${what} not found (${lastInfo})`)
}

async function discoverJsonUrlFromPages() {
  const leg = await fetchAndMatch(
    DA,
    { 'User-Agent': UA },
    [
      /href="(\/Cidadania\/Paginas\/DAIniciativas\.aspx\?t=57465a4a[^"]+)"/i,
      /href="(\/Cidadania\/Paginas\/DAIniciativas\.aspx\?t=[^"]+Path=[^"]+)"/i,
    ],
    'Legislatura link',
  )
  const legUrl = 'https://www.parlamento.pt' + leg[1].replace(/&amp;/g, '&')
  const jsonLink = await fetchAndMatch(
    legUrl,
    { 'User-Agent': UA, Referer: DA },
    [
      /href="(https:\/\/app\.parlamento\.pt\/webutils\/docs\/doc\.txt\?[^"]*Iniciativas[A-Z0-9]*_json\.txt[^"]*)"/i,
      /href="(https:\/\/app\.parlamento\.pt\/webutils\/docs\/doc\.txt\?path=[^"]+)"/i,
    ],
    'JSON file link',
  )
  return jsonLink[1].replace(/&amp;/g, '&')
}

async function discoverJsonUrl() {
  try {
    return await discoverJsonUrlFromPages()
  } catch (e) {
    const envUrl = (process.env.AR_INICIATIVAS_URL || '').trim()
    const fallback = envUrl || AR_JSON_FALLBACK_URL
    const source = envUrl ? 'AR_INICIATIVAS_URL' : 'AR_JSON_FALLBACK_URL (hardcoded)'
    console.warn(`::warning::AR discovery failed (${e?.message || e}); falling back to ${source}`)
    return fallback
  }
}

async function fetchJsonWithRetry(url, attempts = 3) {
  let lastErr
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json', Referer: DA },
        signal: AbortSignal.timeout(300_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const list = await res.json()
      if (!Array.isArray(list)) throw new Error('Expected JSON array')
      return list
    } catch (e) {
      lastErr = e
      if (attempt < attempts) {
        console.warn(`AR JSON download failed (attempt ${attempt}/${attempts}: ${e?.message || e}); retrying…`)
        await sleep(30_000 * attempt)
      }
    }
  }
  throw lastErr
}

/**
 * A AR já serviu um ficheiro com menos iniciativas do que a véspera (22/10: 2346; 23/10: 2164).
 * O upsert nunca apaga linhas, mas convém avisar no run para não passar despercebido.
 */
async function warnIfShrunk(admin, rawCount) {
  const { data } = await admin
    .from('ar_sync_runs')
    .select('meta')
    .eq('status', 'ok')
    .eq('source', 'parlamento.pt')
    .not('meta->raw', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1)
  const prev = Number(data?.[0]?.meta?.raw || 0)
  if (prev && rawCount < prev) {
    console.warn(
      `::warning::AR JSON has fewer iniciativas than the last OK sync (${rawCount} < ${prev}). Existing rows are kept (upsert never deletes).`,
    )
  }
}

async function main() {
  const { limit } = parseArgs()
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const admin = createClient(url, key)

  const { data: run, error: runErr } = await admin
    .from('ar_sync_runs')
    .insert({ status: 'running', source: 'parlamento.pt', meta: { mode: 'node_script', limit } })
    .select('id')
    .single()
  if (runErr) throw runErr

  try {
    let list
    const file = (process.env.AR_JSON_FILE || '').trim()
    if (file) {
      console.log('Reading AR JSON from AR_JSON_FILE…')
      list = JSON.parse(await readFile(file, 'utf8'))
      if (!Array.isArray(list)) throw new Error('AR_JSON_FILE: expected JSON array')
    } else {
      console.log('Discovering AR JSON…')
      const jsonUrl = await discoverJsonUrl()
      console.log('Downloading…')
      list = await fetchJsonWithRetry(jsonUrl)
    }
    console.log('Raw iniciativas:', list.length)
    await warnIfShrunk(admin, list.length)

    const mapped = list.map(mapArIniciativa).filter(Boolean)
    const nDossies = assignDossies(mapped)
    console.log('Dossiês (≥ 2 iniciativas):', nDossies)
    // Preferir: tem partidos → tem data votação → mais recente
    mapped.sort((a, b) => {
      const pa = Object.keys(a.resultado_partidos || {}).length ? 1 : 0
      const pb = Object.keys(b.resultado_partidos || {}).length ? 1 : 0
      if (pb !== pa) return pb - pa
      const hasA = a.data_votacao ? 1 : 0
      const hasB = b.data_votacao ? 1 : 0
      if (hasB !== hasA) return hasB - hasA
      return String(b.data_votacao || b.data_entrada || '').localeCompare(
        String(a.data_votacao || a.data_entrada || ''),
      )
    })
    const batch = mapped.slice(0, limit)
    console.log('Upserting', batch.length)

    let upserted = 0
    let skipped = 0
    const errors = []
    for (let i = 0; i < batch.length; i += 20) {
      const slice = batch.slice(i, i + 20)
      const results = await Promise.all(
        slice.map(async (p) => {
          const { error } = await admin.rpc('upsert_iniciativa_from_ar', { p })
          if (error && errors.length < 5) errors.push(`${p.id}: ${error.message}`)
          return !error
        }),
      )
      for (const ok of results) {
        if (ok) upserted++
        else skipped++
      }
      process.stdout.write(`  ${upserted + skipped}/${batch.length}\r`)
    }
    console.log('\nDone', { upserted, skipped })
    if (errors.length) console.warn('Sample errors:', errors)

    await admin
      .from('ar_sync_runs')
      .update({
        status: 'ok',
        finished_at: new Date().toISOString(),
        upserted,
        skipped,
        meta: { mode: 'node_script', limit, raw: list.length, dossies: nDossies, source: file ? 'file' : 'parlamento.pt' },
      })
      .eq('id', run.id)
  } catch (e) {
    await admin
      .from('ar_sync_runs')
      .update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: String(e),
      })
      .eq('id', run.id)
    console.error(e)
    process.exit(1)
  }
}

main()
