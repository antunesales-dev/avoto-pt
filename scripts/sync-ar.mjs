#!/usr/bin/env node
/**
 * Sync AR → Supabase (Node; o JSON ~80MB rebenta a edge free).
 *
 * Uso:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/sync-ar.mjs [--limit=200]
 *
 * CI: .github/workflows/sync-daily.yml
 */
import { createClient } from '@supabase/supabase-js'

const DA = 'https://www.parlamento.pt/Cidadania/Paginas/DAIniciativas.aspx'
const UA = 'A-Voto/1.0 (+https://avoto.pt; official open data sync)'

const SIGLA_TO_ID = {
  PS: 'ps',
  PSD: 'psd',
  CH: 'chega',
  CHEGA: 'chega',
  IL: 'il',
  BE: 'be',
  PCP: 'pcp',
  PEV: 'pcp',
  L: 'livre',
  LIVRE: 'livre',
  PAN: 'pan',
  'CDS-PP': 'cds',
  CDS: 'cds',
  // JPP e outros: ignorados se não temos cor/UI
}

/** Partidos com UI na A Voto — para unânimes */
const PARTIDOS_UI = ['ps', 'psd', 'chega', 'il', 'be', 'pcp', 'livre', 'pan', 'cds']

const TEMA_RULES = [
  [/sa[uú]de|hospital|sns|medicament|m[eé]dic/i, 'Saúde'],
  [/educa|escol|universid|ensino|aluno|professor/i, 'Educação'],
  [/habita|renda|arrendamento|casa|im[oó]vel|fogos/i, 'Habitação'],
  [/trabalh|sal[aá]rio|desemprego|greve|contrato de trabalho|ss\b|segurança social/i, 'Trabalho'],
  [/ambient|clima|energia|res[ií]duo|floresta|água|ocean|biodivers/i, 'Ambiente'],
  [/or[cç]ament|imposto|irc|irs|iva|d[eé]ficit|finan[cç]|banc[aá]|econom/i, 'Economia'],
  [/justi[cç]a|tribunal|c[oó]digo penal|crime|pris/i, 'Justiça'],
  [/imigra|estrangeir|asilo|fronteira/i, 'Imigração'],
  [/defesa|for[cç]as armadas|militar|nato/i, 'Defesa'],
  [/agricult|pescas|rural|florest/i, 'Agricultura'],
  [/transport|infraestrut|estrada|ferrovi|metro|aeroporto/i, 'Transportes'],
  [/cultura|patrim[oó]nio|museu|desporto|media|imprensa/i, 'Cultura'],
  [/fam[ií]lia|crian[cç]a|igualdade|g[eé]nero|discrimina/i, 'Direitos sociais'],
  [/autarqu|munic[ií]p|regi[aã]o aut[oó]nom|descentral/i, 'Autarquias'],
  [/constitui|eleitor|assembleia|parlament|regimento|partid/i, 'Instituições'],
]

function inferTema(titulo, tipoDesc = '') {
  const text = `${titulo} ${tipoDesc}`
  for (const [re, tema] of TEMA_RULES) {
    if (re.test(text)) return tema
  }
  return 'Outros'
}

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

function parseDetalhePartidos(detalhe) {
  const out = {}
  if (!detalhe) return out
  const text = String(detalhe)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?i>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
  // secções: A Favor / Contra / Abstenção (com ou sem acento)
  const sections = [
    { re: /a\s*favor\s*:?\s*([^\n]+)/i, voto: 'favor' },
    { re: /contra\s*:?\s*([^\n]+)/i, voto: 'contra' },
    { re: /absten[cç][aã]o\s*:?\s*([^\n]+)/i, voto: 'abstencao' },
  ]
  for (const { re, voto } of sections) {
    const m = text.match(re)
    if (!m) continue
    // siglas: PSD, CH, CDS-PP, L, …
    const chunk = m[1]
    for (const tok of chunk.split(/[,;|/]/)) {
      const sigla = tok.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().toUpperCase()
      if (!sigla) continue
      // token pode ser "CH" ou " PSD "
      const id = SIGLA_TO_ID[sigla] || SIGLA_TO_ID[sigla.replace(/\s/g, '')]
      if (id) out[id] = voto
    }
  }
  return out
}

/**
 * Escolhe a melhor votação: prioriza fases finais E detalhe com partidos.
 * Unânimes sem detalhe → todos os partidos UI no mesmo sentido.
 */
function pickMainVotacao(eventos) {
  if (!Array.isArray(eventos)) return null
  const priority = [
    'votação final global',
    'votação final',
    'votação global',
    'votação na generalidade',
    'votação deliberação',
    'votação na especialidade',
    'votação',
  ]
  const cands = []
  for (const e of eventos) {
    if (!e?.Votacao) continue
    const list = Array.isArray(e.Votacao) ? e.Votacao : [e.Votacao]
    const faseL = String(e.Fase || '').toLowerCase()
    let phaseScore = 1
    for (let i = 0; i < priority.length; i++) {
      if (faseL.includes(priority[i])) {
        phaseScore = 100 - i
        break
      }
    }
    for (const vo of list) {
      if (!vo || typeof vo !== 'object') continue
      const detalhe = vo.detalhe ? String(vo.detalhe) : null
      const parties = parseDetalhePartidos(detalhe)
      const unanime = Boolean(vo.unanime)
      cands.push({
        score: phaseScore + (Object.keys(parties).length ? 40 : 0) + (detalhe ? 10 : 0),
        data: vo.data ? String(vo.data).slice(0, 10) : e.DataFase ? String(e.DataFase).slice(0, 10) : null,
        resultado: vo.resultado ? String(vo.resultado) : null,
        detalhe,
        descricao: vo.descricao ? String(vo.descricao) : null,
        parties,
        unanime,
        fase: e.Fase || '',
      })
    }
  }
  if (!cands.length) return null
  cands.sort((a, b) => b.score - a.score)
  const best = cands[0]
  let parties = { ...best.parties }
  if (!Object.keys(parties).length) {
    // unânime ou detalhe vazio: inferir do resultado
    const res = (best.resultado || '').toLowerCase()
    let voto = null
    if (res.includes('aprov') || res.includes('adopt') || res.includes('adot')) voto = 'favor'
    else if (res.includes('rejeit')) voto = 'contra'
    if (voto && (best.unanime || !best.detalhe)) {
      for (const id of PARTIDOS_UI) parties[id] = voto
    }
  }
  return {
    data: best.data,
    resultado: best.resultado,
    detalhe: best.detalhe,
    descricao: best.descricao,
    parties,
    fase: best.fase,
  }
}

function mapAr(raw) {
  const iniId = raw.IniId != null ? String(raw.IniId) : ''
  if (!iniId) return null
  const leg = String(raw.IniLeg || 'XVII')
  const tipoCod = String(raw.IniTipo || '')
  const nr = raw.IniNr != null ? String(raw.IniNr) : ''
  const titulo = String(raw.IniTitulo || '').trim()
  if (!titulo) return null
  const tipoDesc = String(raw.IniDescTipo || raw.IniTipo || 'Iniciativa')
  const idOficial = [tipoCod, nr, leg].filter(Boolean).join(' ').trim() || iniId
  const id = `ar-${leg.toLowerCase()}-${tipoCod.toLowerCase() || 'x'}-${nr || iniId}`.replace(
    /[^a-z0-9-]+/gi,
    '-',
  )
  const eventos = Array.isArray(raw.IniEventos) ? raw.IniEventos : []
  const main = pickMainVotacao(eventos)
  let estado = 'em_discussao'
  const r = (main?.resultado || '').toLowerCase()
  if (r.includes('rejeit')) estado = 'rejeitado'
  else if (r.includes('aprov') || r.includes('adopt') || r.includes('adot')) estado = 'aprovado'
  // arquivado por fase
  const fases = eventos.map((e) => String(e?.Fase || '').toLowerCase()).join(' ')
  if (fases.includes('arquiv')) estado = 'arquivado'

  const autores = []
  const outros = raw.IniAutorOutros
  if (outros?.nome) autores.push(String(outros.nome))
  if (Array.isArray(raw.IniAutorGruposParlamentares)) {
    for (const g of raw.IniAutorGruposParlamentares) {
      if (g?.GP || g?.nome || g?.sigla) autores.push(String(g.GP || g.nome || g.sigla))
    }
  }
  let dataEntrada = null
  for (const e of eventos) {
    if (String(e?.Fase || '').toLowerCase() === 'entrada' && e.DataFase) {
      dataEntrada = String(e.DataFase).slice(0, 10)
      break
    }
  }
  const links = []
  if (raw.IniLinkTexto) links.push({ label: 'Texto na AR', url: String(raw.IniLinkTexto) })
  links.push({ label: 'Dados Abertos AR', url: DA })

  const descParts = []
  if (main?.descricao) descParts.push(main.descricao)
  if (raw.IniObs) descParts.push(String(raw.IniObs))
  if (raw.IniEpigrafe) descParts.push(String(raw.IniEpigrafe))
  const descricao = (descParts.join(' — ') || titulo)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000)

  const parties = main?.parties || {}
  let explicacao = ''
  if (main?.fase && Object.keys(parties).length) {
    explicacao = `Votação AR (${main.fase})${main.resultado ? `: ${main.resultado}` : ''}. Sentido de voto por partido a partir do registo oficial.`
  } else if (main?.resultado) {
    explicacao = `Resultado AR: ${main.resultado}. Sem detalhe nominal de grupos parlamentares no registo desta votação.`
  } else {
    explicacao = 'Ainda sem votação nominal de grupos parlamentares nos Dados Abertos para esta iniciativa.'
  }

  return {
    id,
    id_oficial: idOficial,
    titulo,
    tipo: tipoDesc,
    legislatura: leg,
    numero: nr ? Number(nr) || null : null,
    autores: [...new Set(autores.filter(Boolean))],
    data_entrada: dataEntrada,
    data_votacao: main?.data || null,
    estado,
    tema: inferTema(titulo, tipoDesc),
    descricao_oficial: descricao,
    explicacao,
    links,
    resultado_partidos: parties,
  }
}

async function discoverJsonUrl() {
  if (process.env.AR_INICIATIVAS_URL) return process.env.AR_INICIATIVAS_URL
  const page = await fetch(DA, { headers: { 'User-Agent': UA } })
  const html0 = await page.text()
  const leg =
    html0.match(/href="(\/Cidadania\/Paginas\/DAIniciativas\.aspx\?t=57465a4a[^"]+)"/i) ||
    html0.match(/href="(\/Cidadania\/Paginas\/DAIniciativas\.aspx\?t=[^"]+Path=[^"]+)"/i)
  if (!leg) throw new Error('Legislatura link not found')
  const legUrl = 'https://www.parlamento.pt' + leg[1].replace(/&amp;/g, '&')
  const html = await (await fetch(legUrl, { headers: { 'User-Agent': UA, Referer: DA } })).text()
  const jsonLink =
    html.match(
      /href="(https:\/\/app\.parlamento\.pt\/webutils\/docs\/doc\.txt\?[^"]*Iniciativas[A-Z0-9]*_json\.txt[^"]*)"/i,
    ) || html.match(/href="(https:\/\/app\.parlamento\.pt\/webutils\/docs\/doc\.txt\?path=[^"]+)"/i)
  if (!jsonLink) throw new Error('JSON file link not found')
  return jsonLink[1].replace(/&amp;/g, '&')
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
    console.log('Discovering AR JSON…')
    const jsonUrl = await discoverJsonUrl()
    console.log('Downloading…')
    const res = await fetch(jsonUrl, {
      headers: { 'User-Agent': UA, Accept: 'application/json', Referer: DA },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const list = await res.json()
    if (!Array.isArray(list)) throw new Error('Expected JSON array')
    console.log('Raw iniciativas:', list.length)

    const mapped = list.map(mapAr).filter(Boolean)
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
    for (let i = 0; i < batch.length; i += 20) {
      const slice = batch.slice(i, i + 20)
      const results = await Promise.all(
        slice.map(async (p) => {
          const { error } = await admin.rpc('upsert_iniciativa_from_ar', { p })
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

    await admin
      .from('ar_sync_runs')
      .update({
        status: 'ok',
        finished_at: new Date().toISOString(),
        upserted,
        skipped,
        meta: { mode: 'node_script', limit, raw: list.length },
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
