/**
 * Mapper único dos Dados Abertos da AR (JSON “IniciativasXVII_json.txt”) → linha `iniciativas`.
 *
 * Partilhado por:
 *   - scripts/sync-ar.mjs (Node, sync diário no GitHub Actions)
 *   - supabase/functions/_shared/ar.ts (edge function ar-sync)
 *
 * JS puro (ESM), sem dependências, para correr em Node, Deno e testes `node --test`.
 */
import { classifyTema, normalizeText } from './temas.js'

export const DA_INICIATIVAS = 'https://www.parlamento.pt/Cidadania/Paginas/DAIniciativas.aspx'
/** Ficha pública da iniciativa na AR (formato confirmado a 23/10/2026 com BID=315160 → P 1/XVII). */
export const AR_FICHA_URL = 'https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID='

/** Siglas da AR (detalhe de votação, autores) → ids internos da A Voto. */
export const SIGLA_TO_ID = {
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
  JPP: 'jpp',
}

/** Partidos com assento na XVII Legislatura (para votações unânimes sem detalhe). */
export const PARTIDOS_LEGISLATURA = {
  XVII: ['be', 'cds', 'chega', 'il', 'jpp', 'livre', 'pan', 'pcp', 'ps', 'psd'],
}

const LIMITS = { documentos: 80, intervencoes: 80, fases: 120, descricaoVoto: 400 }

const str = (v) => (v == null ? '' : String(v))
const day = (v) => {
  const s = str(v).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !s.startsWith('0001') ? s : null
}
const arr = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? [v] : [])
export function stripTags(s) {
  return str(s)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
/** "<I> 86-PSD</I>" → { id: 'psd', n: 86 } ; "CH" → { id: 'chega', n: null } */
function parseSiglaToken(raw) {
  const s = str(raw).replace(/<[^>]+>/g, '').replace(/\s+/g, '').toUpperCase()
  const m = s.match(/^(?:(\d+)-)?(.+)$/)
  if (!m) return null
  const id = SIGLA_TO_ID[m[2]] || null
  return id ? { id, n: m[1] ? Number(m[1]) : null } : null
}
function siglaToId(raw) {
  return parseSiglaToken(raw)?.id || null
}

/**
 * "A Favor: <I>PSD</I>, <I> CH</I><BR>Contra:<I>PCP</I><BR>Ausência: <I>L</I>"
 * → { psd: 'favor', chega: 'favor', pcp: 'contra' } (ausentes ficam de fora; ver parseAusencias).
 */
export function parseDetalhePartidos(detalhe) {
  return parseDetalhe(detalhe).partidos
}

/** Como parseDetalhePartidos, mas devolve também o nº de deputados por partido quando a AR o indica ("86-PSD"). */
export function parseDetalhe(detalhe) {
  const partidos = {}
  const deputados = {}
  if (!detalhe) return { partidos, deputados }
  const text = str(detalhe)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?i>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
  const sections = [
    { re: /a\s*favor\s*:?\s*([^\n]+)/i, voto: 'favor' },
    { re: /contra\s*:?\s*([^\n]+)/i, voto: 'contra' },
    { re: /absten[cç][aã]o\s*:?\s*([^\n]+)/i, voto: 'abstencao' },
  ]
  for (const { re, voto } of sections) {
    const m = text.match(re)
    if (!m) continue
    for (const tok of m[1].split(/[,;|/]/)) {
      const t = parseSiglaToken(tok)
      if (!t) continue
      partidos[t.id] = voto
      if (t.n != null) deputados[t.id] = t.n
    }
  }
  return { partidos, deputados }
}

export function parseAusencias(vo) {
  const out = new Set()
  for (const s of arr(vo?.ausencias)) {
    const id = siglaToId(s)
    if (id) out.add(id)
  }
  const m = str(vo?.detalhe)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?i>/gi, ' ')
    .match(/aus[eê]ncia\s*:?\s*([^\n]+)/i)
  if (m) {
    for (const tok of m[1].split(/[,;|/]/)) {
      const id = siglaToId(tok)
      if (id) out.add(id)
    }
  }
  return [...out].sort()
}

/**
 * Tipo de votação a partir do nome da fase.
 *  final         → decide aprovado/rejeitado
 *  generalidade  → aprovado só na generalidade / rejeitado
 *  especialidade → intermédia
 *  procedimento  → requerimentos, recursos, baixas sem votação (não decide o estado)
 */
export function tipoVotacao(fase) {
  const f = normalizeText(fase)
  if (/^requerimento|recurso da decisao|^baixa comissao|adiamento/.test(f)) return 'procedimento'
  if (/votacao final global|votacao final|votacao global|votacao deliberacao|votacao novo decreto|confirmacao do decreto/.test(f)) {
    return 'final'
  }
  if (/votacao na generalidade/.test(f)) return 'generalidade'
  if (/votacao na especialidade/.test(f)) return 'especialidade'
  return 'outra'
}

function resultadoSentido(resultado) {
  const r = normalizeText(resultado)
  if (r.includes('rejeit')) return 'rejeitado'
  if (r.includes('aprov') || r.includes('adot') || r.includes('adopt')) return 'aprovado'
  return null
}

/** Todas as votações em plenário da iniciativa, por ordem cronológica. */
export function extractVotacoes(eventos, legislatura = 'XVII') {
  const out = []
  const seen = new Set()
  const presentes = PARTIDOS_LEGISLATURA[legislatura] || PARTIDOS_LEGISLATURA.XVII
  for (const e of arr(eventos)) {
    for (const vo of arr(e?.Votacao)) {
      if (!vo || typeof vo !== 'object') continue
      const key = str(vo.id) || `${e.OevId}-${vo.data}-${vo.resultado}`
      if (seen.has(key)) continue
      seen.add(key)
      const detalhe = vo.detalhe ? str(vo.detalhe) : null
      const ausencias = parseAusencias(vo)
      const parsed = parseDetalhe(detalhe)
      let partidos = parsed.partidos
      const unanime = normalizeText(vo.unanime) === 'unanime'
      const sentido = resultadoSentido(vo.resultado)
      if (!Object.keys(partidos).length && sentido && (unanime || !detalhe)) {
        // unânime / sem detalhe: todos os partidos presentes no mesmo sentido (sem os ausentes)
        const voto = sentido === 'aprovado' ? 'favor' : 'contra'
        partidos = {}
        for (const id of presentes) if (!ausencias.includes(id)) partidos[id] = voto
      }
      out.push({
        id: str(vo.id) || null,
        data: day(vo.data) || day(e?.DataFase),
        fase: str(e?.Fase).trim(),
        tipo: tipoVotacao(e?.Fase),
        resultado: vo.resultado ? str(vo.resultado) : null,
        unanime,
        descricao: vo.descricao ? stripTags(vo.descricao).slice(0, LIMITS.descricaoVoto) : null,
        partidos,
        deputados: Object.keys(parsed.deputados).length ? parsed.deputados : null,
        ausencias,
        reuniao: vo.reuniao ? str(vo.reuniao) : null,
      })
    }
  }
  out.sort((a, b) => str(a.data).localeCompare(str(b.data)))
  return out
}

const PUBLICADA_RE = /^lei \(publicacao dr\)|^resolucao da ar \(publicacao dr\)|^resolucao \(publicacao dar\)|^deliberacao \(publicacao dar\)/

/**
 * Estado “honesto”:
 *  - aprovado / rejeitado: só por votação final (final global, final, global, deliberação, novo decreto)
 *    ou publicação em DR/DAR como lei/resolução/deliberação.
 *  - rejeitado também na generalidade (a iniciativa morre aí).
 *  - aprovado_generalidade: passou a generalidade, sem votação final.
 *  - requerimentos (ex.: baixa à comissão sem votação) nunca contam.
 * @returns {{ estado: string, votacao: object|null }}
 */
export function decideEstado(votacoes, fases) {
  const fasesN = fases.map((f) => normalizeText(f))
  const hasParties = (v) => v && Object.keys(v.partidos || {}).length > 0
  const lastOf = (pred) => [...votacoes].reverse().find(pred)
  const finais = (sentido) => (v) => v.tipo === 'final' && resultadoSentido(v.resultado) === (sentido || resultadoSentido(v.resultado)) && resultadoSentido(v.resultado)
  // Votação a mostrar: a última do mesmo tipo/sentido com detalhe por partido, senão a última.
  const pick = (pred) => lastOf((v) => pred(v) && hasParties(v)) || lastOf(pred) || null

  // 1) Publicada como lei/resolução/deliberação → aprovada (mesmo que haja votações posteriores, ex.: confirmação após veto)
  if (fasesN.some((f) => PUBLICADA_RE.test(f))) {
    return {
      estado: 'aprovado',
      votacao: pick(finais('aprovado')) || pick((v) => v.tipo === 'especialidade' || v.tipo === 'generalidade'),
    }
  }
  // 2) Última votação final decide
  const final = lastOf(finais())
  if (final) {
    const sentido = resultadoSentido(final.resultado)
    const sameDay = (v) => finais(sentido)(v) && v.data === final.data
    return { estado: sentido, votacao: pick(sameDay) || final }
  }
  // 3) Generalidade: rejeitada morre aí; aprovada fica “aprovado na generalidade”
  const gen = lastOf((v) => v.tipo === 'generalidade' && resultadoSentido(v.resultado))
  if (gen) {
    const s = resultadoSentido(gen.resultado)
    const sameDay = (v) => v.tipo === 'generalidade' && resultadoSentido(v.resultado) === s && v.data === gen.data
    return { estado: s === 'rejeitado' ? 'rejeitado' : 'aprovado_generalidade', votacao: pick(sameDay) || gen }
  }
  if (fasesN.some((f) => f.startsWith('retirada'))) return { estado: 'retirado', votacao: null }
  if (fasesN.some((f) => f.includes('arquiv') || f === 'nao admissao')) return { estado: 'arquivado', votacao: null }
  return { estado: 'em_discussao', votacao: null }
}

/**
 * Comissão competente (Competente = "S"): a primeira a quem a iniciativa baixou.
 * A AR repete a comissão em várias fases (distribuição, parecer, especialidade): junta-se
 * relatores, pareceres e audições de todas as entradas com o mesmo nome.
 */
export function extractComissao(eventos) {
  let out = null
  const relatores = new Map()
  const pareceres = new Set()
  const audDatas = new Set()
  for (const e of arr(eventos)) {
    for (const c of arr(e?.Comissao)) {
      if (str(c?.Competente).toUpperCase() !== 'S' || !c?.Nome) continue
      const nome = str(c.Nome).trim()
      if (!out) {
        out = { nome, id: c.IdComissao ? str(c.IdComissao) : null, data_distribuicao: day(c.DataDistribuicao), relatores: [], pareceres_recebidos: [], audicoes: 0, audicoes_datas: [], apreciacao_publica: null }
      }
      if (nome !== out.nome) continue
      out.data_distribuicao = out.data_distribuicao || day(c.DataDistribuicao)
      for (const r of arr(c.Relatores)) {
        if (r?.nome && !relatores.has(str(r.nome).trim())) relatores.set(str(r.nome).trim(), { nome: str(r.nome).trim(), gp: r.gp ? str(r.gp) : null })
      }
      for (const p of arr(c.PareceresRecebidos)) if (p?.nome) pareceres.add(str(p.nome).trim())
      out.audicoes += arr(c.Audicoes).length
      for (const a of arr(c.Audicoes)) {
        const d = day(a?.data)
        if (d) audDatas.add(d)
      }
      const ini = day(c.DatainicioApreciacaoPublica)
      const fim = day(c.DatafimApreciacaoPublica)
      if ((ini || fim) && !out.apreciacao_publica) out.apreciacao_publica = { inicio: ini, fim }
    }
  }
  if (!out) return null
  out.relatores = [...relatores.values()]
  out.pareceres_recebidos = [...pareceres].slice(0, 30)
  out.audicoes_datas = [...audDatas].sort().slice(0, 40)
  return out
}

function firstDar(pubs) {
  for (const p of arr(pubs)) {
    if (p?.URLDiario) {
      return { tipo: p.pubTipo ? str(p.pubTipo) : null, numero: p.pubNr ? str(p.pubNr) : null, url: str(p.URLDiario) }
    }
  }
  return null
}

/** Percurso: todas as fases com data, por ordem cronológica. */
export function extractFases(eventos) {
  const out = arr(eventos)
    .filter((e) => e?.Fase)
    .map((e, i) => ({
      i,
      data: day(e.DataFase),
      fase: str(e.Fase).trim(),
      codigo: e.CodigoFase ? str(e.CodigoFase) : null,
      obs: e.ObsFase ? stripTags(e.ObsFase).slice(0, 300) : null,
      dar: firstDar(e.PublicacaoFase),
      votacao: arr(e.Votacao).length > 0,
      debate: arr(e.Intervencoesdebates).length > 0,
    }))
  out.sort((a, b) => str(a.data).localeCompare(str(b.data)) || a.i - b.i)
  return out.slice(0, LIMITS.fases).map(({ i, ...rest }) => rest)
}

/** Documentos: texto da iniciativa, anexos, anexos por fase e documentos da comissão. Sem duplicados. */
export function extractDocumentos(raw) {
  const out = []
  const seen = new Set()
  const push = (d) => {
    const url = str(d.url).trim()
    if (!url || seen.has(url)) return
    seen.add(url)
    out.push({ titulo: str(d.titulo).trim() || 'Documento', tipo: d.tipo || null, data: d.data || null, fase: d.fase || null, url })
  }
  if (raw.IniLinkTexto) push({ titulo: 'Texto da iniciativa', tipo: 'Texto', url: raw.IniLinkTexto })
  for (const a of arr(raw.IniAnexos)) push({ titulo: a?.anexoNome, tipo: 'Anexo', url: a?.anexoFich })
  for (const e of arr(raw.IniEventos)) {
    const fase = str(e?.Fase).trim() || null
    for (const a of arr(e?.AnexosFase)) push({ titulo: a?.anexoNome, tipo: 'Anexo', data: day(e?.DataFase), fase, url: a?.anexoFich })
    for (const c of arr(e?.Comissao)) {
      for (const d of arr(c?.Documentos)) {
        push({ titulo: d?.TituloDocumento, tipo: d?.TipoDocumento || 'Comissão', data: day(d?.DataDocumento), fase, url: d?.URL })
      }
    }
  }
  for (const l of arr(raw.Links)) push({ titulo: l?.TituloDocumento, tipo: l?.TipoDocumento || 'Ligação', data: day(l?.DataDocumento), url: l?.URL })
  return out.slice(0, LIMITS.documentos)
}

/** Debates em plenário: data, vídeo e DAR por intervenção, oradores (deputados e Governo). */
export function extractDebates(eventos) {
  const out = []
  for (const e of arr(eventos)) {
    for (const d of arr(e?.Intervencoesdebates)) {
      const intervencoes = []
      for (const o of arr(d?.oradores)) {
        const deps = arr(o?.deputadosOradores)
        const gov = o?.membrosGoverno?.nome ? o.membrosGoverno : null
        const video = arr(o?.linkVideo).map((v) => str(v?.link)).find(Boolean) || null
        const dar = firstDar(o?.publicacao)
        if (deps.length) {
          for (const dep of deps) {
            intervencoes.push({ nome: str(dep?.nome).trim(), gp: dep?.GP ? str(dep.GP) : null, cargo: null, video, dar: dar?.url || null })
          }
        } else if (gov) {
          intervencoes.push({ nome: str(gov.nome).trim(), gp: null, cargo: gov.cargo ? str(gov.cargo) : 'Governo', video, dar: dar?.url || null })
        } else if (video || dar) {
          intervencoes.push({ nome: null, gp: null, cargo: null, video, dar: dar?.url || null })
        }
      }
      const darDebate = intervencoes.map((i) => i.dar).find(Boolean) || null
      out.push({
        data: day(d?.dataReuniaoPlenaria) || day(e?.DataFase),
        fase: str(e?.Fase).trim(),
        video: intervencoes.map((i) => i.video).find(Boolean) || null,
        dar: darDebate,
        intervencoes: intervencoes.slice(0, LIMITS.intervencoes),
      })
    }
  }
  out.sort((a, b) => str(a.data).localeCompare(str(b.data)))
  return out
}

/** Iniciativas discutidas em conjunto (IDs da AR). */
export function extractConjuntas(eventos, selfId) {
  const map = new Map()
  for (const e of arr(eventos)) {
    for (const c of arr(e?.IniciativasConjuntas)) {
      const id = str(c?.id)
      if (!id || id === selfId || map.has(id)) continue
      map.set(id, {
        ar_ini_id: id,
        id_oficial: [c.tipo, c.nr, c.leg].filter(Boolean).join(' '),
        iniciativa_id: buildId(c.leg || 'XVII', c.tipo, c.nr, id),
        tipo: c.descTipo ? str(c.descTipo) : null,
        titulo: stripTags(c.titulo).slice(0, 300),
        autor: c.autor ? str(c.autor) : null,
      })
    }
  }
  return [...map.values()]
}

/** Ficha pública de uma petição na AR (BID = id da petição nos Dados Abertos). */
export const AR_PETICAO_URL = 'https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalhePeticao.aspx?BID='

/**
 * Petições associadas: `Peticoes` (com id) e `PeticoesConjuntas` por fase (discutidas em conjunto; sem id fiável).
 * [{ id, numero, legislatura, assunto, url, conjunta }]
 */
export function extractPeticoes(raw) {
  const map = new Map()
  for (const p of arr(raw?.Peticoes)) {
    const numero = p?.numero != null ? str(p.numero) : ''
    const leg = str(p?.legislatura || '')
    const key = `${leg}-${numero}`
    if (!numero || map.has(key)) continue
    const id = p?.id ? str(p.id) : null
    map.set(key, { id, numero, legislatura: leg || null, assunto: stripTags(p?.assunto).slice(0, 400) || null, url: id ? AR_PETICAO_URL + encodeURIComponent(id) : null, conjunta: false })
  }
  for (const e of arr(raw?.IniEventos)) {
    for (const p of arr(e?.PeticoesConjuntas)) {
      const numero = p?.nr != null ? str(p.nr) : ''
      const leg = str(p?.leg || '')
      const key = `${leg}-${numero}`
      if (!numero || map.has(key)) continue
      map.set(key, { id: null, numero, legislatura: leg || null, assunto: stripTags(p?.titulo).slice(0, 400) || null, url: null, conjunta: true })
    }
  }
  return [...map.values()].slice(0, 30)
}

/** IniciativasOrigem / IniciativasOriginadas → [{ ar_ini_id, id_oficial, iniciativa_id, tipo, titulo }] */
export function extractRelacionadasAr(list) {
  const out = []
  const seen = new Set()
  for (const c of arr(list)) {
    const id = str(c?.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    const leg = str(c.legislatura || 'XVII')
    out.push({
      ar_ini_id: id,
      id_oficial: [c.tipo, c.numero, leg].filter(Boolean).join(' '),
      iniciativa_id: c.tipo && c.numero ? buildId(leg, c.tipo, c.numero, id) : null,
      tipo: c.descTipo ? str(c.descTipo) : null,
      titulo: stripTags(c.assunto).slice(0, 300) || null,
    })
  }
  return out.slice(0, 30)
}

const AUTOR_GENERICO = new Set(['grupos parlamentares', 'deputados'])

/**
 * Autores reais: GP proponentes (siglas), deputados com nome (estruturado em autores_deputados)
 * e entidades (Governo, Assembleias Legislativas, Comissão X, Cidadãos…). Sem rótulos genéricos.
 */
export function extractAutores(raw) {
  const autores = []
  const deputados = []
  const outros = raw.IniAutorOutros
  const outrosNome = str(outros?.nome).trim()
  if (outrosNome && !AUTOR_GENERICO.has(normalizeText(outrosNome))) {
    if (normalizeText(outrosNome) === 'comissoes' && outros?.iniAutorComissao) autores.push(str(outros.iniAutorComissao).trim())
    else if (normalizeText(outrosNome) === 'par') autores.push('Presidente da Assembleia da República')
    else autores.push(outrosNome)
  }
  for (const g of arr(raw.IniAutorGruposParlamentares)) {
    const s = str(g?.GP || g?.sigla || g?.nome || (typeof g === 'string' ? g : '')).trim()
    if (s) autores.push(s)
  }
  for (const d of arr(raw.IniAutorDeputados)) {
    const nome = str(d?.nome).trim()
    if (nome) deputados.push({ nome, gp: d?.GP ? str(d.GP) : null })
  }
  // Deputados sem GP proponente registado: incluir as siglas dos GP dos deputados
  if (!arr(raw.IniAutorGruposParlamentares).length) {
    for (const d of deputados) if (d.gp) autores.push(d.gp)
  }
  return { autores: [...new Set(autores)], autores_deputados: deputados }
}

/** Procedimentos internos (prazos de CPI, deslocações do PR, urgências…) — ocultos por defeito na lista. */
const PROCEDIMENTO_RES = [
  /^suspensao do prazo de funcionamento da comissao/,
  /^prorrogacao do prazo (de funcionamento )?da comissao/,
  /^deslocacao d[oa] (sua excelencia )?(o |a )?presidente da republica/,
  /^composicao (da|das|do) (comissao|delegac)/,
  /^concessao de processo de urgencia/,
  /^prorrogacao do periodo normal de funcionamento/,
  /^constituicao de uma comissao eventual de verificacao de poderes/,
  /^convocacao do plenario/,
  /^distribuicao de lugares/,
  /^elenco e composicao/,
  /^suspensao dos trabalhos das comissoes/,
  /^fixa a composicao, distribuicao e elenco/,
  /^voto de (pesar|congratulacao|saudacao|condenacao|louvor)/,
]
export function isProcedimento(titulo) {
  const t = normalizeText(titulo)
  return PROCEDIMENTO_RES.some((re) => re.test(t))
}

export function buildId(leg, tipo, nr, iniId) {
  const l = str(leg || 'XVII').toLowerCase()
  const t = str(tipo).toLowerCase() || 'x'
  return `ar-${l}-${t}-${str(nr) || str(iniId)}`.replace(/[^a-z0-9-]+/gi, '-')
}

/** raw (objecto do JSON da AR) → payload para `upsert_iniciativa_from_ar`. null se inválido. */
export function mapArIniciativa(raw) {
  if (!raw || typeof raw !== 'object') return null
  const iniId = raw.IniId != null ? str(raw.IniId) : ''
  if (!iniId) return null
  const titulo = str(raw.IniTitulo).replace(/\s+/g, ' ').trim()
  if (!titulo) return null
  const leg = str(raw.IniLeg || 'XVII')
  const tipoCod = str(raw.IniTipo)
  const nr = raw.IniNr != null ? str(raw.IniNr) : ''
  const tipoDesc = str(raw.IniDescTipo || raw.IniTipo || 'Iniciativa')
  const idOficial = [tipoCod, nr, leg].filter(Boolean).join(' ').trim() || iniId
  const eventos = arr(raw.IniEventos)
  const fasesNomes = eventos.map((e) => str(e?.Fase))

  const votacoes = extractVotacoes(eventos, leg)
  const { estado, votacao: main } = decideEstado(votacoes, fasesNomes)
  const comissao = extractComissao(eventos)
  const procedimento = isProcedimento(titulo)
  let { tema, fonte: temaFonte } = classifyTema({ comissao: comissao?.nome, titulo })
  if (procedimento && temaFonte !== 'comissao') {
    // Procedimentos internos (prazos de CPI, deslocações do PR, urgências) são assuntos da própria AR
    tema = 'Estado, Autarquias e Instituições'
    temaFonte = 'procedimento'
  }
  const { autores, autores_deputados } = extractAutores(raw)

  let dataEntrada = null
  for (const e of eventos) {
    if (normalizeText(e?.Fase) === 'entrada' && day(e?.DataFase)) {
      dataEntrada = day(e.DataFase)
      break
    }
  }

  const links = [{ label: 'Ficha da iniciativa na AR', url: AR_FICHA_URL + encodeURIComponent(iniId) }]
  if (raw.IniLinkTexto) links.push({ label: 'Texto na AR', url: str(raw.IniLinkTexto) })
  links.push({ label: 'Dados Abertos AR', url: DA_INICIATIVAS })

  const descParts = []
  if (raw.IniEpigrafe) descParts.push(str(raw.IniEpigrafe))
  if (raw.IniObs) descParts.push(str(raw.IniObs))
  const descricao = stripTags(descParts.join(' — ')).slice(0, 4000) || titulo

  const parties = main?.partidos || {}
  let explicacao
  if (main && Object.keys(parties).length) {
    explicacao = `Votação AR (${main.fase})${main.resultado ? `: ${main.resultado}` : ''}. Sentido de voto por partido a partir do registo oficial.`
  } else if (main?.resultado) {
    explicacao = `Resultado AR (${main.fase}): ${main.resultado}. Sem detalhe nominal de grupos parlamentares no registo desta votação.`
  } else if (estado === 'aprovado') {
    explicacao = 'Aprovada e publicada (sem votação nominal de grupos parlamentares no registo).'
  } else {
    explicacao = 'Ainda sem votação final ou na generalidade nos Dados Abertos para esta iniciativa.'
  }

  return {
    id: buildId(leg, tipoCod, nr, iniId),
    ar_ini_id: iniId,
    id_oficial: idOficial,
    titulo,
    tipo: tipoDesc,
    legislatura: leg,
    numero: nr ? Number(nr) || null : null,
    autores,
    autores_deputados,
    data_entrada: dataEntrada,
    data_votacao: main?.data || null,
    estado,
    tema,
    tema_fonte: temaFonte,
    descricao_oficial: descricao,
    explicacao,
    links,
    resultado_partidos: parties,
    votacao_principal: main ? { id: main.id, fase: main.fase, tipo: main.tipo, data: main.data, resultado: main.resultado, deputados: main.deputados || null } : null,
    fases: extractFases(eventos),
    votacoes,
    documentos: extractDocumentos(raw),
    comissao,
    debates: extractDebates(eventos),
    conjuntas: extractConjuntas(eventos, iniId),
    peticoes: extractPeticoes(raw),
    iniciativas_origem: extractRelacionadasAr(raw.IniciativasOrigem),
    iniciativas_originadas: extractRelacionadasAr(raw.IniciativasOriginadas),
    texto_substituido: str(raw.IniTextoSubst).toUpperCase() === 'SIM' ? stripTags(raw.IniTextoSubstCampo).slice(0, 300) || 'Texto substituído' : null,
    procedimento,
    dossie_id: null,
  }
}

/**
 * Dossiês: agrupa iniciativas discutidas em conjunto (IniciativasConjuntas) e as de título idêntico.
 * Muta `items` (define dossie_id) e devolve nº de dossiês com ≥ 2 iniciativas.
 * dossie_id = 'dossie-' + id da iniciativa mais antiga do grupo (estável entre syncs).
 */
export function assignDossies(items) {
  const byAr = new Map(items.map((it, i) => [it.ar_ini_id, i]))
  const parent = items.map((_, i) => i)
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const union = (a, b) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb)
  }
  items.forEach((it, i) => {
    for (const c of it.conjuntas || []) {
      const j = byAr.get(c.ar_ini_id)
      if (j != null) union(i, j)
    }
  })
  const byTitle = new Map()
  items.forEach((it, i) => {
    const k = normalizeText(it.titulo).replace(/[^\p{L}\p{N} ]+/gu, '').trim()
    if (!k) return
    if (byTitle.has(k)) union(i, byTitle.get(k))
    else byTitle.set(k, i)
  })
  const groups = new Map()
  items.forEach((_, i) => {
    const r = find(i)
    if (!groups.has(r)) groups.set(r, [])
    groups.get(r).push(i)
  })
  let n = 0
  for (const idxs of groups.values()) {
    if (idxs.length < 2) {
      items[idxs[0]].dossie_id = null
      continue
    }
    n++
    const oldest = idxs
      .map((i) => items[i])
      .sort((a, b) => str(a.data_entrada).localeCompare(str(b.data_entrada)) || Number(a.ar_ini_id) - Number(b.ar_ini_id))[0]
    for (const i of idxs) items[i].dossie_id = `dossie-${oldest.id}`
  }
  return n
}
