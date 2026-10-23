#!/usr/bin/env node
/**
 * PROTÓTIPO (passo 13): ingere o Portal Base completo (IMPIC via dados.gov.pt) em contratos_base.
 *
 *   node scripts/ingest-portal-base.mjs --ano=2026 [--min-preco=0] [--limit=N] [--file=Contratos2026.json|.zip] [--dry-run]
 *
 * Fonte: https://dados.gov.pt/pt/datasets/contratos-publicos-portal-base-impic-contratos-de-2012-a-2026/
 * (API udata: /api/1/datasets/<slug>/ → recurso contratos<ano>.zip com um JSON por ano; semanal).
 * Escreve via PostgREST com SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (upsert por idcontrato).
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const DATASET = 'contratos-publicos-portal-base-impic-contratos-de-2012-a-2026'
const UA = 'A-Voto/1.0 (+https://avoto.pt; civic open data)'
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)
const ano = Number(args.ano || new Date().getFullYear())
const minPreco = Number(args['min-preco'] || 0)
const limit = args.limit ? Number(args.limit) : Infinity
const dryRun = Boolean(args['dry-run'])
const BATCH = 1000

/** "dd/mm/aaaa" → "aaaa-mm-dd" */
export function isoDate(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || '').trim())
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

/** "510103448 - Unidade Local de Saúde de Coimbra, E.P.E." → { nif, nome } */
export function nifNome(s) {
  const t = String(s || '').trim()
  const m = /^([A-Z]{0,2}\d{6,12})\s+-\s+(.*)$/.exec(t)
  return m ? { nif: m[1], nome: m[2].trim() } : { nif: null, nome: t }
}

function cpvItem(s) {
  const m = /^(\d{8}-\d)\s+-\s+(.*)$/.exec(String(s || '').trim())
  return m ? { codigo: m[1], descricao: m[2].trim() } : { codigo: null, descricao: String(s || '').trim() }
}

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v))
const simNao = (v) => (v === 'Sim' ? true : v === 'Não' ? false : null)
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

export function mapContrato(r, fonte) {
  const adj = nifNome((r.adjudicante || [])[0])
  return {
    id: String(r.idcontrato),
    id_procedimento: r.idprocedimento ? String(r.idprocedimento) : null,
    objeto: clean(r.objectoContrato).slice(0, 1000),
    descricao: clean(r.descContrato).slice(0, 4000),
    tipos_contrato: (r.tipoContrato || []).map(clean),
    tipo_procedimento: clean(r.tipoprocedimento),
    adjudicante_nif: adj.nif,
    adjudicante_nome: adj.nome,
    adjudicatarios: (r.adjudicatarios || []).map(nifNome),
    preco_contratual: num(r.precoContratual),
    preco_base: num(r.precoBaseProcedimento),
    preco_total_efetivo: num(r.PrecoTotalEfetivo) || null,
    data_publicacao: isoDate(r.dataPublicacao),
    data_celebracao: isoDate(r.dataCelebracaoContrato),
    data_decisao: isoDate(r.dataDecisaoAdjudicacao),
    data_fecho: isoDate(r.dataFechoContrato),
    prazo_execucao_dias: Number.isInteger(r.prazoExecucao) ? r.prazoExecucao : null,
    cpv: (r.cpv || []).map(cpvItem),
    local_execucao: (r.localExecucao || []).map(clean),
    fundamentacao: clean(r.fundamentacao),
    procedimento_centralizado: simNao(r.ProcedimentoCentralizado),
    acordo_quadro: clean(r.numAcordoQuadro),
    n_anuncio: clean(r.nAnuncio),
    contrato_ecologico: simNao(r.ContratEcologico),
    ano: Number(r.Ano) || null,
    fonte_ficheiro: fonte,
  }
}

async function resolveFile() {
  if (args.file) return path.resolve(args.file)
  const meta = await fetch(`https://dados.gov.pt/api/1/datasets/${DATASET}/`, { headers: { 'User-Agent': UA } })
  if (!meta.ok) throw new Error(`dados.gov.pt HTTP ${meta.status}`)
  const ds = await meta.json()
  const res = ds.resources.find((r) => r.title === `contratos${ano}.zip`)
  if (!res) throw new Error(`sem recurso contratos${ano}.zip no dataset`)
  const dest = path.join(os.tmpdir(), `contratos${ano}.zip`)
  console.log(`a descarregar ${res.url} (${(res.filesize / 1e6).toFixed(0)} MB)`)
  const r = await fetch(res.url, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`download HTTP ${r.status}`)
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()))
  return dest
}

function readJson(file) {
  const raw = file.endsWith('.zip')
    ? execFileSync('unzip', ['-p', file], { maxBuffer: 2 ** 31 - 1 })
    : fs.readFileSync(file)
  return JSON.parse(raw.toString('utf8'))
}

async function main() {
  const t0 = Date.now()
  const file = await resolveFile()
  const all = readJson(file)
  const seen = new Set()
  const rows = []
  let semId = 0
  let dup = 0
  for (const r of all) {
    if (!r.idcontrato) {
      semId++
      continue
    }
    const c = mapContrato(r, path.basename(file))
    if (seen.has(c.id)) {
      dup++
      continue
    }
    seen.add(c.id)
    if ((c.preco_contratual ?? 0) < minPreco) continue
    rows.push(c)
    if (rows.length >= limit) break
  }
  console.log(`ficheiro: ${all.length} registos · ${rows.length} a gravar · ${dup} ids repetidos · ${semId} sem id`)
  if (dryRun) return

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  const db = createClient(url, key, { auth: { persistSession: false } })
  let ok = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error } = await db.from('contratos_base').upsert(chunk, { onConflict: 'id' })
    if (error) throw new Error(`upsert lote ${i / BATCH}: ${error.message}`)
    ok += chunk.length
    if ((i / BATCH) % 20 === 0) console.log(`  ${ok}/${rows.length}`)
  }
  const { data: nEnt, error: e2 } = await db.rpc('refresh_entidades_publicas')
  if (e2) throw new Error(`refresh_entidades_publicas: ${e2.message}`)
  console.log(`ok: ${ok} contratos, ${nEnt} entidades, ${((Date.now() - t0) / 1000).toFixed(0)} s`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message || e)
    process.exit(1)
  })
}
