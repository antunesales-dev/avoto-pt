/**
 * Ficha da iniciativa: contexto factual derivado SÓ dos dados oficiais já guardados
 * (Dados Abertos da AR + excertos literais do texto oficial). Sem resumos gerados.
 * Funções puras — testadas em tests/ficha-contexto.test.mjs.
 */

const fmt = (iso) => {
  if (!iso) return null
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : null
}
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`

/**
 * Factos curtos para o bloco “Em resumo” (cada um com origem nos dados oficiais).
 * @returns {{ k: string, v: string }[]}
 */
export function factosFicha(item) {
  if (!item) return []
  const out = []
  const autores = (item.autores || []).join(', ')
  if (item.tipo) out.push({ k: 'Tipo', v: autores ? `${item.tipo} · ${autores}` : item.tipo })
  const deps = (item.autoresDeputados || []).length
  if (deps) out.push({ k: 'Proponentes', v: plural(deps, 'deputado', 'deputados') })
  if (item.dataEntrada) out.push({ k: 'Entrada na AR', v: fmt(item.dataEntrada) })
  const c = item.comissao
  if (c?.nome) out.push({ k: 'Comissão', v: c.nome })
  if (c?.apreciacao_publica?.inicio || c?.apreciacao_publica?.fim) {
    const a = c.apreciacao_publica
    out.push({ k: 'Apreciação pública', v: [fmt(a.inicio), fmt(a.fim)].filter(Boolean).join(' – ') })
  }
  const nAud = (c?.audicoes_datas || []).length || Number(c?.audicoes || 0)
  if (nAud) out.push({ k: 'Audições na comissão', v: plural(nAud, 'audição', 'audições') })
  const nPareceres = (c?.pareceres_recebidos || []).length
  if (nPareceres) out.push({ k: 'Pareceres recebidos', v: String(nPareceres) })
  const nDeb = (item.debates || []).length
  if (nDeb) {
    const oradores = new Set()
    for (const d of item.debates) for (const o of d.intervencoes || []) if (o.nome) oradores.add(o.nome)
    out.push({ k: 'Debate em plenário', v: oradores.size ? `${plural(nDeb, 'sessão', 'sessões')} · ${plural(oradores.size, 'orador', 'oradores')}` : plural(nDeb, 'sessão', 'sessões') })
  }
  const nVot = (item.votacoes || []).length
  if (nVot) out.push({ k: 'Votações em plenário', v: String(nVot) })
  const vp = item.votacaoPrincipal
  if (vp?.resultado) out.push({ k: 'Resultado', v: [vp.resultado, vp.fase, fmt(vp.data)].filter(Boolean).join(' · ') })
  const nPet = (item.peticoes || []).length
  if (nPet) out.push({ k: 'Petições associadas', v: String(nPet) })
  const nConj = (item.conjuntas || []).length
  if (nConj) out.push({ k: 'Discutida com', v: plural(nConj, 'outra iniciativa', 'outras iniciativas') })
  return out
}

const GRUPOS = [
  { id: 'texto', label: 'Texto da iniciativa', re: /^texto|texto final|texto de substitui/i },
  { id: 'pareceres', label: 'Pareceres', re: /parecer/i },
  { id: 'nota', label: 'Notas técnicas e de admissibilidade', re: /nota t[eé]cnica|admissibilidade/i },
  { id: 'relatorio', label: 'Relatórios', re: /relat[oó]rio/i },
  { id: 'publico', label: 'Apreciação e consulta pública', re: /aprecia[cç][aã]o p[uú]blica|consulta p[uú]blica|contributo/i },
  { id: 'propostas', label: 'Propostas de alteração e guiões', re: /proposta.*(altera|substitui)|substitui[cç][aã]o de proposta|quadro comparativo|gui[aã]o|requerimento/i },
]

/** Agrupa os documentos por natureza (ordem estável; o resto em “Outros documentos”). */
export function agruparDocumentos(docs) {
  const map = new Map(GRUPOS.map((g) => [g.id, { id: g.id, label: g.label, itens: [] }]))
  const outros = { id: 'outros', label: 'Outros documentos', itens: [] }
  for (const d of docs || []) {
    const hay = `${d.titulo || ''} ${d.tipo || ''}`
    const g = GRUPOS.find((x) => x.re.test(hay))
    ;(g ? map.get(g.id) : outros).itens.push(d)
  }
  return [...map.values(), outros].filter((g) => g.itens.length)
}

/** “docx”, “pdf”, “pdf:doc” → rótulo honesto da fonte do excerto. */
export function fonteTextoLabel(formato) {
  const f = String(formato || '')
  if (f === 'docx') return 'texto oficial (.docx) publicado pela AR'
  if (f.startsWith('pdf')) return 'texto oficial (PDF) publicado pela AR — extração automática do PDF, pode ter falhas de formatação'
  return 'texto oficial publicado pela AR'
}

/** O que mostrar em “O que propõe”: objeto (lei) ou parte dispositiva (resolução / deliberação). */
export function oQuePropoe(texto) {
  if (!texto || texto.estado !== 'ok') return null
  if (texto.objeto) return { tipo: 'objeto', titulo: 'Artigo 1.º do texto oficial', linhas: String(texto.objeto).split('\n').filter(Boolean) }
  const disp = (texto.dispositivo || []).filter(Boolean)
  if (disp.length) return { tipo: 'dispositivo', titulo: 'Parte dispositiva do texto oficial', intro: texto.transicao || null, linhas: disp }
  return null
}

/** Descrição oficial só se acrescentar algo ao título (a AR quase nunca preenche epígrafe/observações). */
export function descricaoUtil(item) {
  const n = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const d = n(item?.descricaoOficial)
  return d && d !== n(item?.titulo) ? item.descricaoOficial : null
}

/** Percurso compacto: fases principais, sem repetições consecutivas do mesmo nome. */
export function fasesCompactas(fases, re) {
  const out = []
  for (const f of fases || []) {
    if (re && !re.test(f.fase)) continue
    const prev = out.at(-1)
    if (prev && prev.fase === f.fase) {
      prev.repeticoes = (prev.repeticoes || 1) + 1
      prev.ate = f.data
      if (!prev.dar && f.dar) prev.dar = f.dar
      continue
    }
    out.push({ ...f })
  }
  return out
}
