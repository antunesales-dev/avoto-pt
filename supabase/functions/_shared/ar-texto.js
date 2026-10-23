/**
 * Extrator determinístico do texto oficial das iniciativas da AR (sem LLM, sem serviços pagos).
 *
 * Entrada: o documento que a AR publica em `IniLinkTexto` (normalmente .docx; .doc/.pdf servidos em PDF).
 * Saída: excertos LITERAIS do documento — nunca resumos inventados:
 *   - exposicao:     primeiros parágrafos da “Exposição de motivos” / nota justificativa (texto integral, por ordem)
 *   - objeto:        corpo do “Artigo 1.º” (normalmente “Objeto”: o que a lei faz)
 *   - artigos:       articulado de topo [{ n, epigrafe }] (sem os artigos citados dentro de alterações)
 *   - dispositivo:   parte resolutiva de projetos de resolução / deliberação (o que se recomenda / decide)
 *
 * JS puro (ESM) para correr em Node, Deno e `node --test`. A leitura do ZIP vive em scripts/lib/docx.mjs.
 */

export const EXTRATOR_VERSAO = 1

const LIMITS = { exposicaoParas: 40, exposicaoChars: 24_000, paraChars: 3_000, objetoChars: 1_500, artigos: 60, dispositivo: 25 }

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

function decodeXml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
}

const clean = (s) => String(s || '').replace(/[\u00a0\u2007\u202f]/g, ' ').replace(/[ \t\r\n]+/g, ' ').trim()

/**
 * word/document.xml → [{ t, lista }] (só o corpo; ignora tabelas aninhadas? não — inclui o texto das células como parágrafos).
 * Notas de rodapé vivem noutro ficheiro e ficam de fora.
 */
export function paragraphsFromDocxXml(xml) {
  const body = String(xml || '')
  const out = []
  for (const m of body.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const p = m[0]
    let t = ''
    for (const r of p.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)) t += r[1] != null ? decodeXml(r[1]) : ' '
    t = clean(t)
    if (!t) continue
    out.push({ t, lista: /<w:numPr>/.test(p) })
  }
  return out
}

/**
 * Texto de `pdftotext -layout` → parágrafos. Linhas em branco separam parágrafos; linhas curtas muito
 * indentadas (títulos centrados: “Artigo 1.º”, “Objeto”) ficam sozinhas; números de página e notas de
 * rodapé com ligações saem; um bloco que começa por minúscula continua o anterior (quebra de página).
 */
export function paragraphsFromPlainText(text) {
  const blocks = []
  let cur = []
  const flush = () => {
    if (cur.length) blocks.push(cur.join(' '))
    cur = []
  }
  for (const raw of String(text || '').replace(/\f/g, '\n\n').split('\n')) {
    const line = raw.replace(/\s+$/, '')
    const t = clean(line)
    if (!t) {
      flush()
      continue
    }
    if (/^\d{1,3}$/.test(t) || /^p[aá]g(ina)?\.? ?\d+/i.test(t)) {
      flush()
      continue
    }
    const indent = line.length - line.trimStart().length
    if (indent >= 12 && t.length <= 110) {
      flush()
      blocks.push(t)
      continue
    }
    cur.push(t)
  }
  flush()
  const out = []
  for (let b of blocks) {
    b = clean(b.replace(/(\p{Ll})- (\p{Ll})/gu, '$1$2'))
    if (/https?:\/\//i.test(b) && b.length < 400) continue // notas de rodapé / referências
    if (/ \| /.test(b) && b.length < 220) continue // “Título da notícia | Jornal” (referências em rodapé)
    if (/^\d{1,3}\s/.test(b) && b.length < 300 && out.length && /[.;:]$/.test(out.at(-1).t) === false) continue
    const prev = out.at(-1)
    if (prev && /^\p{Ll}/u.test(b) && !/[.:;]$/.test(prev.t) && !prev.titulo) {
      prev.t = clean(prev.t + ' ' + b)
      continue
    }
    out.push({ t: b, lista: /^([a-z]\)|\d+\s?[-–.)]|[•▪●-])\s/i.test(b), titulo: b.length <= 110 && !/[.;,]$/.test(b) })
  }
  return out.map(({ t, lista }) => ({ t, lista }))
}

const RE_EXPOSICAO = /^(exposicao de motivos|nota justificativa|preambulo|fundamentacao|justificacao)\b\.?:?$/
const RE_EXPOSICAO_INLINE = /^(exposi[cç][aã]o de motivos|nota justificativa)\s*[:.–-]\s*\S/i
const RE_ARTIGO = /^artigo (\d+)\.?\s?[ºo°]?(?:-([a-z]))?\.?$/i
/** “A Assembleia da República [/ A Comissão Permanente da AR] resolve / delibera …” — já é o dispositivo. */
const RE_AR_DECIDE = /^a (comissao permanente da )?assembleia da republica,? (resolve|delibera|nos termos)/
/** Parágrafo que introduz a parte dispositiva (fim da exposição). */
function isLeadIn(t) {
  const n = norm(t)
  if (/^assim\s*:?$/.test(n) || /^(nestes|neste) termos\s*:?$/.test(n)) return true
  if (!/^(assim|nestes termos|neste termos|pelo exposto|face ao exposto|em face do exposto|perante o exposto|deste modo|nesta conformidade|tendo em conta o exposto|atento o exposto|considerando o exposto|em conformidade|por todo o exposto|ao abrigo|nos termos (da|do|das|dos) (alinea|n\.|artigo|disposic|constituic|regiment|lei))\b/.test(n)) {
    return RE_AR_DECIDE.test(n)
  }
  return /(ao abrigo|abaixo[- ]assinad|apresenta(m)? a assembleia|vem apresentar|vem propor|vem requerer|requer(em)? a apreciacao|disposicoes (constitucionais|regimentais|legais)|regimentais|(o|a) seguinte (projeto|proposta)|nos termos (da|do|das|dos) (alinea|n\.|artigo|constituic|regiment|lei n))/.test(n)
}
const RE_FECHO = /^(palacio de s(ao|\.) bento|assembleia da republica,? (palacio|\d|em \d|lisboa)|lisboa,? \d|sao bento,|as deputadas|os deputados|a deputada|o deputado|a deputada unica|o deputado unico|o grupo parlamentar|pelo grupo parlamentar|os proponentes|o presidente|a presidente|o primeiro-ministro|visto e aprovado|comissao representativa)/

function cut(s, max) {
  if (s.length <= max) return s
  const slice = s.slice(0, max)
  const end = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('; '))
  return (end > max * 0.5 ? slice.slice(0, end + 1) : slice.replace(/\s+\S*$/, '')) + ' […]'
}

/**
 * @param {{t:string, lista?:boolean}[]} paras
 * @param {{ titulo?: string, tipo?: string }} [meta]  tipo = IniTipo (J, P, R, D, …)
 */
export function extractTextoAr(paras, meta = {}) {
  const ps = (paras || []).map((p) => ({ t: clean(p.t), lista: !!p.lista })).filter((p) => p.t)
  const res = { versao: EXTRATOR_VERSAO, estado: 'sem_estrutura', exposicao: [], objeto: null, artigos: [], dispositivo: [], transicao: null, n_paragrafos: ps.length }
  if (!ps.length) {
    res.estado = 'vazio'
    return res
  }
  const tituloN = norm(meta.titulo)

  // 1) Início da exposição de motivos
  let start = ps.findIndex((p) => RE_EXPOSICAO.test(norm(p.t)))
  let temTitulo = start >= 0
  if (start >= 0) start += 1
  else if ((start = ps.findIndex((p) => RE_EXPOSICAO_INLINE.test(p.t))) >= 0) temTitulo = true // “Exposição de motivos: A …”
  else {
    // sem título “Exposição de motivos”: saltar cabeçalho (n.º da iniciativa, título, linhas curtas)
    start = ps.findIndex((p, i) => i < 15 && p.t.length >= 140 && norm(p.t) !== tituloN && !RE_ARTIGO.test(p.t))
    if (start < 0) start = 0
  }

  // 2) Fim: primeiro parágrafo de transição ou “Artigo 1.º”
  let end = ps.length
  let transicao = false
  for (let i = start; i < ps.length; i++) {
    if (isLeadIn(ps[i].t) || RE_ARTIGO.test(ps[i].t)) {
      end = i
      transicao = true
      break
    }
  }
  if (end === ps.length && !temTitulo) end = start // sem estrutura reconhecível: não arriscar
  let chars = 0
  for (let i = start; i < end && res.exposicao.length < LIMITS.exposicaoParas; i++) {
    const t = ps[i].t
    if (RE_FECHO.test(norm(t))) break
    if (t.length < 3) continue
    const semTitulo = res.exposicao.length ? t : t.replace(/^(exposi[cç][aã]o de motivos|nota justificativa)\s*[:.–-]\s*/i, '')
    if (!semTitulo) continue
    const para = cut(semTitulo, LIMITS.paraChars)
    if (chars + para.length > LIMITS.exposicaoChars) break
    chars += para.length
    res.exposicao.push(para)
  }

  // 3) Articulado de topo: Artigo 1.º, 2.º, … em sequência (artigos citados dentro de alterações saltam a sequência)
  let last = 0
  const artIdx = []
  for (let i = end; i < ps.length; i++) {
    const m = ps[i].t.match(RE_ARTIGO)
    if (!m) continue
    const n = Number(m[1])
    if (m[2]) continue // 5.º-A: aditados dentro de alterações
    if (n === last + 1) {
      const nxt = ps[i + 1]?.t || ''
      const epigrafe = nxt && nxt.length <= 160 && !RE_ARTIGO.test(nxt) && !/^\d|^[a-z]\)/i.test(nxt) && !/[.;:]$/.test(nxt) ? nxt : null
      res.artigos.push({ n, epigrafe: epigrafe && !/^\[?…\]?$|^\[\.\.\.\]$|^\[…\]$/.test(epigrafe) ? epigrafe : null })
      artIdx.push({ i, epigrafe: !!epigrafe })
      last = n
      if (res.artigos.length >= LIMITS.artigos) break
    } else if (n === 1 && last >= 1) break // anexo (ex.: decreto-lei autorizado) recomeça a numeração
  }
  if (artIdx.length) {
    const a = artIdx[0]
    const from = a.i + (a.epigrafe ? 2 : 1)
    const to = artIdx[1]?.i ?? Math.min(ps.length, from + 8)
    const body = []
    for (let i = from; i < to && body.join(' ').length < LIMITS.objetoChars; i++) {
      if (RE_FECHO.test(norm(ps[i].t))) break
      body.push(ps[i].t)
    }
    res.objeto = body.length ? cut(body.join('\n'), LIMITS.objetoChars) : null
  }

  // 4) Parte dispositiva sem articulado (resoluções, deliberações, apreciações)
  if (!artIdx.length && transicao) {
    const lead = ps[end].t
    const leadN = norm(lead)
    let i = end
    // “A Assembleia da República … resolve …” é já o dispositivo; “Assim, … apresenta o seguinte projeto…:” é só transição
    if (!RE_AR_DECIDE.test(leadN)) {
      i = end + 1
      res.transicao = cut(lead, 600) // “Assim, … recomenda ao Governo que:” — contexto literal das alíneas
    }
    while (i < ps.length && isLeadIn(ps[i].t) && !RE_AR_DECIDE.test(norm(ps[i].t))) {
      res.transicao = cut(ps[i].t, 600)
      i++
    }
    for (; i < ps.length && res.dispositivo.length < LIMITS.dispositivo; i++) {
      const t = ps[i].t
      if (RE_FECHO.test(norm(t))) break
      if (/^\d{1,2} de [a-zç]+ de \d{4}/i.test(norm(t))) break
      res.dispositivo.push(cut(t, 1_200))
    }
  }

  // “Recomendar ao Governo que:” isolado antes das alíneas é introdução, não alínea
  while (res.dispositivo.length > 1 && res.dispositivo[0].length < 200 && /:$/.test(res.dispositivo[0])) {
    res.transicao = res.dispositivo.shift()
  }

  // Apreciações parlamentares / requerimentos: o próprio parágrafo de transição é o pedido
  if (!artIdx.length && !res.dispositivo.length && transicao && isLeadIn(ps[end].t) && ps[end].t.length > 80) {
    res.dispositivo.push(cut(ps[end].t, 1_200))
    res.transicao = null
  }

  if (res.exposicao.length || res.objeto || res.dispositivo.length) res.estado = 'ok'
  return res
}

/** Formato do ficheiro a partir do `fich=` do URL da AR. */
export function formatoTexto(url) {
  const m = String(url || '').match(/[?&]fich=[^&]*?\.(docx|doc|pdf|rtf|odt)(?:&|$)/i)
  return m ? m[1].toLowerCase() : null
}

/**
 * URLs a descarregar: .docx original (doc.docx) quando existe; senão a conversão em PDF da AR (doc.pdf).
 * Sempre https (o http da AR fica pendurado em alguns runners).
 */
export function urlsDescarga(url) {
  const u = String(url || '').trim().replace(/^http:\/\//i, 'https://')
  if (!u) return []
  const f = formatoTexto(u)
  const pdf = u.replace(/\/doc\.(docx|pdf|doc)\?/i, '/doc.pdf?')
  if (f === 'docx') return [{ formato: 'docx', url: u.replace(/\/doc\.(pdf|docx)\?/i, '/doc.docx?') }, { formato: 'pdf', url: pdf }]
  return [{ formato: 'pdf', url: pdf }]
}
