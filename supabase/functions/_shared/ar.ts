/**
 * Dados Abertos AR — descoberta + mapeamento (sem fontes não oficiais).
 * Portal: https://www.parlamento.pt/Cidadania/Paginas/DAIniciativas.aspx
 */

const DA_INICIATIVAS =
  'https://www.parlamento.pt/Cidadania/Paginas/DAIniciativas.aspx'
const UA = 'A-Voto/1.0 (+https://avoto.pt; civic open data; contact via GitHub)'

/** Siglas AR (detalhe de votação) → ids internos */
const SIGLA_TO_ID: Record<string, string> = {
  PS: 'ps',
  PSD: 'psd',
  CH: 'chega',
  CHEGA: 'chega',
  IL: 'il',
  BE: 'be',
  PCP: 'pcp',
  L: 'livre',
  LIVRE: 'livre',
  PAN: 'pan',
  'CDS-PP': 'cds',
  CDS: 'cds',
}

export type MappedIniciativa = Record<string, unknown>

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Parse "A Favor: <I>PSD</I>… Contra:… Abstenção:…" */
export function parseDetalhePartidos(detalhe: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!detalhe) return out
  const text = detalhe
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?i>/gi, '')
    .replace(/&nbsp;/gi, ' ')

  const sections: { key: string; voto: string }[] = [
    { key: 'a favor', voto: 'favor' },
    { key: 'contra', voto: 'contra' },
    { key: 'absten', voto: 'abstencao' }, // abstenção / abstencao
  ]

  for (const { key, voto } of sections) {
    const re = new RegExp(`${key}[^:]*:\\s*([^\\n]+)`, 'i')
    const m = text.match(re)
    if (!m) continue
    const chunk = m[1]
    for (const raw of chunk.split(/[,;]/)) {
      const sigla = raw.replace(/<[^>]+>/g, '').trim().toUpperCase()
      if (!sigla) continue
      const id = SIGLA_TO_ID[sigla]
      if (id) out[id] = voto
    }
  }
  return out
}

function mapEstado(resultado: string | null | undefined, fases: string[]): string {
  const r = (resultado || '').toLowerCase()
  if (r.includes('rejeit')) return 'rejeitado'
  if (r.includes('aprov')) return 'aprovado'
  const joined = fases.join(' ').toLowerCase()
  if (joined.includes('arquiv')) return 'arquivado'
  return 'em_discussao'
}

function pickMainVotacao(eventos: unknown[]): {
  data: string | null
  resultado: string | null
  detalhe: string | null
  descricao: string | null
} | null {
  if (!Array.isArray(eventos)) return null
  const priority = [
    'votação final global',
    'votação final',
    'votação global',
    'votação na generalidade',
    'votação na especialidade',
  ]
  type Cand = { score: number; data: string | null; resultado: string | null; detalhe: string | null; descricao: string | null }
  let best: Cand | null = null

  for (const ev of eventos) {
    if (!ev || typeof ev !== 'object') continue
    const e = ev as Record<string, unknown>
    const fase = String(e.Fase || '')
    const votos = e.Votacao
    if (!votos) continue
    const list = Array.isArray(votos) ? votos : [votos]
    for (const v of list) {
      if (!v || typeof v !== 'object') continue
      const vo = v as Record<string, unknown>
      const faseL = fase.toLowerCase()
      let score = 1
      for (let i = 0; i < priority.length; i++) {
        if (faseL.includes(priority[i])) {
          score = 100 - i
          break
        }
      }
      const cand: Cand = {
        score,
        data: vo.data ? String(vo.data).slice(0, 10) : e.DataFase ? String(e.DataFase).slice(0, 10) : null,
        resultado: vo.resultado ? String(vo.resultado) : null,
        detalhe: vo.detalhe ? String(vo.detalhe) : null,
        descricao: vo.descricao ? String(vo.descricao) : null,
      }
      if (!best || cand.score > best.score) best = cand
    }
  }
  return best
}

function autoresFrom(raw: Record<string, unknown>): string[] {
  const out: string[] = []
  const gp = raw.IniAutorGruposParlamentares
  if (Array.isArray(gp)) {
    for (const g of gp) {
      if (g && typeof g === 'object') {
        const o = g as Record<string, unknown>
        const nome = o.GP || o.nome || o.sigla
        if (nome) out.push(String(nome))
      } else if (typeof g === 'string') out.push(g)
    }
  } else if (gp && typeof gp === 'object') {
    const o = gp as Record<string, unknown>
    // sometimes nested array under key
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) {
        for (const g of v) {
          if (g && typeof g === 'object') {
            const x = g as Record<string, unknown>
            out.push(String(x.GP || x.nome || x.sigla || ''))
          }
        }
      }
    }
  }
  const outros = raw.IniAutorOutros
  if (outros && typeof outros === 'object') {
    const o = outros as Record<string, unknown>
    if (o.nome) out.push(String(o.nome))
    else if (o.sigla) out.push(String(o.sigla))
  }
  const deps = raw.IniAutorDeputados
  if (Array.isArray(deps)) {
    for (const d of deps.slice(0, 8)) {
      if (d && typeof d === 'object') {
        const o = d as Record<string, unknown>
        const n = o.nome || o.depNome || o.Nome
        if (n) out.push(String(n))
      }
    }
  }
  return [...new Set(out.filter(Boolean))]
}

function dataEntrada(eventos: unknown[]): string | null {
  if (!Array.isArray(eventos)) return null
  for (const ev of eventos) {
    if (!ev || typeof ev !== 'object') continue
    const e = ev as Record<string, unknown>
    if (String(e.Fase || '').toLowerCase() === 'entrada' && e.DataFase) {
      return String(e.DataFase).slice(0, 10)
    }
  }
  return null
}

export function mapArIniciativa(raw: Record<string, unknown>): MappedIniciativa | null {
  const iniId = raw.IniId != null ? String(raw.IniId) : ''
  if (!iniId) return null

  const leg = String(raw.IniLeg || 'XVII')
  const tipoCod = String(raw.IniTipo || '')
  const nr = raw.IniNr != null ? String(raw.IniNr) : ''
  const tipoDesc = String(raw.IniDescTipo || raw.IniTipo || 'Iniciativa')
  const titulo = String(raw.IniTitulo || '').trim()
  if (!titulo) return null

  const idOficial = [tipoCod, nr, leg].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || iniId
  const id = `ar-${leg.toLowerCase()}-${tipoCod.toLowerCase() || 'x'}-${nr || iniId}`.replace(
    /[^a-z0-9-]+/gi,
    '-',
  )

  const eventos = Array.isArray(raw.IniEventos) ? raw.IniEventos : []
  const fases = eventos.map((e) =>
    e && typeof e === 'object' ? String((e as Record<string, unknown>).Fase || '') : '',
  )
  const main = pickMainVotacao(eventos)
  const resultado_partidos = parseDetalhePartidos(main?.detalhe)
  const estado = mapEstado(main?.resultado, fases)

  const links: { label: string; url: string }[] = []
  if (raw.IniLinkTexto) {
    links.push({ label: 'Texto na AR', url: String(raw.IniLinkTexto) })
  }
  if (Array.isArray(raw.Links)) {
    for (const l of raw.Links) {
      if (l && typeof l === 'object') {
        const o = l as Record<string, unknown>
        const url = o.url || o.URL || o.link
        if (url) links.push({ label: String(o.titulo || o.label || 'Ligação AR'), url: String(url) })
      }
    }
  }
  links.push({
    label: 'Dados Abertos AR — Iniciativas',
    url: DA_INICIATIVAS,
  })

  const descricao =
    (main?.descricao && stripTags(main.descricao)) ||
    (raw.IniObs ? stripTags(String(raw.IniObs)) : '') ||
    titulo

  return {
    id,
    id_oficial: idOficial || id,
    titulo,
    tipo: tipoDesc,
    legislatura: leg,
    numero: nr ? Number(nr) || null : null,
    autores: autoresFrom(raw),
    data_entrada: dataEntrada(eventos),
    data_votacao: main?.data || null,
    estado,
    tema: 'Instituições',
    descricao_oficial: descricao.slice(0, 4000),
    explicacao: '',
    links,
    resultado_partidos,
  }
}

/** Descobre URL assinada do JSON da legislatura actual (XVII preferida). */
export async function discoverArIniciativasJsonUrl(): Promise<{ url: string; label: string }> {
  const override = Deno.env.get('AR_INICIATIVAS_URL')
  if (override) return { url: override, label: 'env:AR_INICIATIVAS_URL' }

  const page = await fetch(DA_INICIATIVAS, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
  })
  if (!page.ok) throw new Error(`DAIniciativas HTTP ${page.status}`)
  const html0 = await page.text()

  // Prefer XVII, then XVI, then first Path link
  const legLink =
    html0.match(/href="(\/Cidadania\/Paginas\/DAIniciativas\.aspx\?t=57465a4a[^"]+)"/i) ||
    html0.match(/href="(\/Cidadania\/Paginas\/DAIniciativas\.aspx\?t=57465a4a4945[^"]+)"/i) ||
    html0.match(/href="(\/Cidadania\/Paginas\/DAIniciativas\.aspx\?t=[^"]+Path=[^"]+)"/i)

  if (!legLink) throw new Error('Não encontrei link de legislatura em DAIniciativas')

  const legUrl = 'https://www.parlamento.pt' + legLink[1].replace(/&amp;/g, '&')
  const legPage = await fetch(legUrl, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html',
      Referer: DA_INICIATIVAS,
    },
  })
  if (!legPage.ok) throw new Error(`Legislatura page HTTP ${legPage.status}`)
  const html = await legPage.text()

  const jsonLink =
    html.match(
      /href="(https:\/\/app\.parlamento\.pt\/webutils\/docs\/doc\.txt\?[^"]*Iniciativas[A-Z0-9]*_json\.txt[^"]*)"/i,
    ) ||
    html.match(
      /href="(https:\/\/app\.parlamento\.pt\/webutils\/docs\/doc\.txt\?path=[^"]+)"/i,
    )

  if (!jsonLink) throw new Error('Não encontrei ficheiro JSON de iniciativas no portal AR')

  return {
    url: jsonLink[1].replace(/&amp;/g, '&'),
    label: 'parlamento.pt Dados Abertos',
  }
}

/**
 * Stream-parse de um array JSON top-level sem carregar o ficheiro inteiro na RAM
 * (o JSON da AR XVII tem ~80 MB — rebenta o limite da edge se fizer res.json()).
 */
async function* streamJsonArrayObjects(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let depth = 0
  let inString = false
  let escape = false
  let objStart = -1
  let arrayStarted = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })

    let i = 0
    while (i < buf.length) {
      const ch = buf[i]

      if (!arrayStarted) {
        if (ch === '[') arrayStarted = true
        i++
        continue
      }

      if (objStart < 0) {
        if (ch === '{') {
          objStart = i
          depth = 1
          inString = false
          escape = false
        }
        i++
        continue
      }

      // dentro de objecto
      if (inString) {
        if (escape) escape = false
        else if (ch === '\\') escape = true
        else if (ch === '"') inString = false
        i++
        continue
      }

      if (ch === '"') {
        inString = true
        i++
        continue
      }
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          const slice = buf.slice(objStart, i + 1)
          objStart = -1
          try {
            yield JSON.parse(slice) as Record<string, unknown>
          } catch {
            /* objecto malformado — ignora */
          }
          // descarta prefixo processado
          buf = buf.slice(i + 1)
          i = 0
          continue
        }
      }
      i++
    }

    // manter só a partir do objecto em curso
    if (objStart > 0) {
      buf = buf.slice(objStart)
      objStart = 0
    } else if (objStart < 0 && buf.length > 64) {
      // só whitespace/vírgulas entre objectos
      buf = buf.slice(-8)
    }
  }
}

export async function fetchArIniciativas(limit = 250): Promise<{
  items: MappedIniciativa[]
  sourceUrl: string
  sourceLabel: string
  rawCount: number
}> {
  const { url, label } = await discoverArIniciativasJsonUrl()
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json,text/plain,*/*',
      Referer: DA_INICIATIVAS,
    },
  })
  if (!res.ok) throw new Error(`Download AR JSON HTTP ${res.status}`)
  if (!res.body) throw new Error('AR JSON sem body stream')

  const mapped: MappedIniciativa[] = []
  let rawCount = 0
  for await (const row of streamJsonArrayObjects(res.body)) {
    rawCount++
    const m = mapArIniciativa(row)
    if (m) mapped.push(m)
  }

  mapped.sort((a, b) => {
    const hasA = a.data_votacao ? 1 : 0
    const hasB = b.data_votacao ? 1 : 0
    if (hasB !== hasA) return hasB - hasA
    const da = String(a.data_votacao || a.data_entrada || '')
    const db = String(b.data_votacao || b.data_entrada || '')
    return db.localeCompare(da)
  })

  return {
    items: mapped.slice(0, Math.max(1, limit)),
    sourceUrl: url.split('?')[0],
    sourceLabel: label,
    rawCount,
  }
}
