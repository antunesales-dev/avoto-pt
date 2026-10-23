#!/usr/bin/env node
/**
 * Texto oficial das iniciativas (IniLinkTexto da AR) → `iniciativa_textos` (excertos literais, com fonte).
 *
 * Determinístico: sem LLM nem serviços pagos. .docx lido directamente (scripts/lib/docx.mjs);
 * .doc/.pdf via a conversão em PDF da própria AR + `pdftotext -layout` (poppler-utils) se existir.
 *
 * Idempotente: só processa iniciativas sem texto, com URL do texto diferente do guardado,
 * versão do extrator antiga, ou erro há mais de 24 h. Escreve em lotes pequenos (25 linhas)
 * por upsert — cada pedido é curto e nunca se aproxima do statement_timeout (8 s).
 *
 * Uso:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/extract-textos-ar.mjs [--limit=200] [--ids=ar-xvii-j-176,…]
 *        [--force] [--concurrency=3] [--delay-ms=250]
 *   Só medir (sem BD): AR_JSON_FILE=IniciativasXVII_json.txt node scripts/extract-textos-ar.mjs --dry-run --out=cobertura.json --limit=all
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { docxDocumentXml } from './lib/docx.mjs'
import { EXTRATOR_VERSAO, extractTextoAr, formatoTexto, paragraphsFromDocxXml, paragraphsFromPlainText, urlsDescarga } from '../supabase/functions/_shared/ar-texto.js'
import { buildId } from '../supabase/functions/_shared/ar-mapper.js'

const UA = 'A-Voto/1.0 (+https://avoto.pt; official open data)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function parseArgs(argv = process.argv.slice(2)) {
  const o = { limit: 200, ids: null, force: false, concurrency: 3, delayMs: 250, dryRun: false, out: null }
  for (const a of argv) {
    const [k, v = ''] = a.replace(/^--/, '').split('=')
    if (k === 'limit') o.limit = v === 'all' || v === '0' ? 100_000 : Math.max(1, Number(v) || 200)
    else if (k === 'ids') o.ids = v.split(',').map((s) => s.trim()).filter(Boolean)
    else if (k === 'force') o.force = true
    else if (k === 'concurrency') o.concurrency = Math.min(6, Math.max(1, Number(v) || 3))
    else if (k === 'delay-ms') o.delayMs = Math.max(0, Number(v) || 0)
    else if (k === 'dry-run') o.dryRun = true
    else if (k === 'out') o.out = v
  }
  return o
}

let pdftotextOk
function hasPdftotext() {
  if (pdftotextOk === undefined) {
    try {
      execFileSync('pdftotext', ['-v'], { stdio: 'ignore' })
      pdftotextOk = true
    } catch {
      pdftotextOk = false
    }
  }
  return pdftotextOk
}

function pdfParagraphs(buf) {
  const dir = mkdtempSync(join(tmpdir(), 'avoto-pdf-'))
  try {
    const f = join(dir, 't.pdf')
    writeFileSync(f, buf)
    const txt = execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', f, '-'], { maxBuffer: 64 * 1024 * 1024, timeout: 60_000 }).toString('utf8')
    return paragraphsFromPlainText(txt)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Cache opcional em disco (desenvolvimento/medição): AR_TEXTO_CACHE_DIR=/tmp/ar-textos */
const CACHE_DIR = (process.env.AR_TEXTO_CACHE_DIR || '').trim()

async function download(url, attempts = 2) {
  const cacheFile = CACHE_DIR ? join(CACHE_DIR, createHash('sha1').update(url).digest('hex')) : null
  if (cacheFile) {
    try {
      return readFileSync(cacheFile)
    } catch {
      /* sem cache */
    }
  }
  const buf = await downloadNet(url, attempts)
  if (cacheFile) writeFileSync(cacheFile, buf)
  return buf
}

async function downloadNet(url, attempts) {
  let last
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(90_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (e) {
      last = e
      if (i < attempts) await sleep(3_000 * i)
    }
  }
  throw last
}

/** Descarrega e extrai. Nunca lança: devolve sempre uma linha para `iniciativa_textos`. */
export async function processar({ id, titulo, url }) {
  const base = { iniciativa_id: id, fonte_url: url, formato: formatoTexto(url), versao: EXTRATOR_VERSAO, extraido_em: new Date().toISOString() }
  const vazio = { exposicao: [], objeto: null, artigos: [], dispositivo: [], transicao: null, n_paragrafos: 0, sha256: null, erro: null }
  if (!url) return { ...base, ...vazio, estado: 'sem_texto' }
  let lastErr = null
  for (const cand of urlsDescarga(url)) {
    if (cand.formato === 'pdf' && !hasPdftotext()) {
      lastErr = 'pdftotext indisponível'
      continue
    }
    try {
      const buf = await download(cand.url)
      let paras
      if (cand.formato === 'docx') {
        const xml = docxDocumentXml(buf)
        if (!xml) throw new Error('docx inválido')
        paras = paragraphsFromDocxXml(xml)
      } else {
        paras = pdfParagraphs(buf)
      }
      const r = extractTextoAr(paras, { titulo })
      return {
        ...base,
        formato: cand.formato === 'docx' ? 'docx' : `pdf${base.formato && base.formato !== 'pdf' ? `:${base.formato}` : ''}`,
        sha256: createHash('sha256').update(buf).digest('hex'),
        estado: r.estado,
        exposicao: r.exposicao,
        objeto: r.objeto,
        artigos: r.artigos,
        dispositivo: r.dispositivo,
        transicao: r.transicao,
        n_paragrafos: r.n_paragrafos,
        erro: null,
      }
    } catch (e) {
      lastErr = String(e?.message || e).slice(0, 300)
    }
  }
  return { ...base, ...vazio, estado: 'erro', erro: lastErr }
}

async function pool(items, n, delayMs, fn) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i], i)
        if (delayMs) await sleep(delayMs)
      }
    }),
  )
  return out
}

function textoUrlFromLinks(links) {
  return (Array.isArray(links) ? links : []).find((l) => /^texto/i.test(String(l?.label || '')))?.url || null
}

async function candidatosDb(admin, o) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    let q = admin.from('iniciativas').select('id,titulo,links').order('data_entrada', { ascending: false, nullsFirst: false })
      .order('id', { ascending: true }) // ordem total: sem isto a paginação por range repete/salta linhas
      .range(from, from + 999)
    if (o.ids) q = q.in('id', o.ids)
    const { data, error } = await q
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
  }
  const have = new Map()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from('iniciativa_textos')
      .select('iniciativa_id,fonte_url,versao,estado,erro,extraido_em')
      .order('iniciativa_id')
      .range(from, from + 999)
    if (error) throw error
    for (const r of data) have.set(r.iniciativa_id, r)
    if (data.length < 1000) break
  }
  const dayAgo = Date.now() - 24 * 3600 * 1000
  const seen = new Set()
  return rows
    .filter((r) => !seen.has(r.id) && seen.add(r.id))
    .map((r) => ({ id: r.id, titulo: r.titulo, url: textoUrlFromLinks(r.links) }))
    .filter((r) => {
      if (o.force) return true
      const h = have.get(r.id)
      if (!h) return true
      if ((h.fonte_url || null) !== (r.url || null)) return true
      if (Number(h.versao || 0) < EXTRATOR_VERSAO) return true
      if (h.estado !== 'erro') return false
      // Erro por falta de ferramenta local (não da AR): repetir logo que o pdftotext exista
      if (h.erro === 'pdftotext indisponível' && hasPdftotext()) return true
      return new Date(h.extraido_em).getTime() < dayAgo
    })
    .slice(0, o.limit)
}

function candidatosFicheiro(file, o) {
  const list = JSON.parse(readFileSync(file, 'utf8'))
  return list
    .map((x) => ({ id: buildId(x.IniLeg, x.IniTipo, x.IniNr, x.IniId), titulo: x.IniTitulo, url: x.IniLinkTexto || null, tipo: x.IniTipo }))
    .filter((r) => !o.ids || o.ids.includes(r.id))
    .slice(0, o.limit)
}

async function main() {
  const o = parseArgs()
  if (o.dryRun) {
    const file = (process.env.AR_JSON_FILE || '').trim()
    if (!file) throw new Error('--dry-run precisa de AR_JSON_FILE')
    const items = candidatosFicheiro(file, o)
    console.log('Iniciativas:', items.length)
    let done = 0
    const res = await pool(items, o.concurrency, o.delayMs, async (it) => {
      const r = await processar(it)
      if (++done % 50 === 0) console.log(`  ${done}/${items.length}`)
      return { ...r, tipo: it.tipo }
    })
    if (o.out) writeFileSync(o.out, JSON.stringify(res))
    const by = {}
    for (const r of res) by[r.estado] = (by[r.estado] || 0) + 1
    console.log('Estados:', by)
    return
  }
  const { createClient } = await import('@supabase/supabase-js')
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  const admin = createClient(url, key, { auth: { persistSession: false } })
  const items = await candidatosDb(admin, o)
  console.log('Por processar:', items.length)
  const stats = {}
  for (let i = 0; i < items.length; i += 25) {
    const slice = items.slice(i, i + 25)
    const rows = await pool(slice, o.concurrency, o.delayMs, processar)
    const { error } = await admin.from('iniciativa_textos').upsert(rows, { onConflict: 'iniciativa_id' })
    if (error) throw new Error(`upsert lote ${i / 25 + 1}: ${error.message}`)
    for (const r of rows) stats[r.estado] = (stats[r.estado] || 0) + 1
    console.log(`  ${Math.min(i + 25, items.length)}/${items.length}`, stats)
  }
  console.log('Feito:', stats)
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
