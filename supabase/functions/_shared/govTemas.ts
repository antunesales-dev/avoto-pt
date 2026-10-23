/**
 * Área governativa (portugal.gov.pt `card:areas`) → tema canónico da avoto.
 * Taxonomia: os 16 temas canónicos de `_shared/temas.js` (mesmos nomes que as iniciativas). Puro, sem I/O — testável com `deno test`.
 * Áreas genéricas (Primeiro-Ministro, Presidência, Assuntos Parlamentares) desempatam
 * pelas tags (`card:tags`) e, em último caso, pelo título.
 */

import { TEMAS, TEMA_OUTROS } from './temas.js'

/**
 * Os 16 temas canónicos vêm da fonte única partilhada com o sync da AR e a UI
 * (`_shared/temas.js`), sem “Outros”: uma notícia do Governo tem sempre área governativa.
 */
export const TEMAS_CANONICOS: readonly string[] = Object.freeze(
  (TEMAS as string[]).filter((t) => t !== TEMA_OUTROS),
)

export type TemaCanonico = string

const FALLBACK: TemaCanonico = 'Estado, Autarquias e Instituições'

export function norm(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Área (normalizada) → tema. `null` = área genérica, decidir por tags/título. */
const AREA_MAP: Record<string, TemaCanonico | null> = {
  'saude': 'Saúde',
  'educacao, ciencia e inovacao': 'Educação e Ciência',
  'trabalho, solidariedade e seguranca social': 'Trabalho e Segurança Social',
  'infraestruturas e habitacao': 'Transportes e Infraestruturas', // Habitação via palavra-chave
  'financas': 'Finanças e Impostos',
  'economia e da coesao territorial': 'Economia',
  'economia e coesao territorial': 'Economia',
  'economia': 'Economia',
  'ambiente e energia': 'Ambiente e Energia',
  'agricultura e mar': 'Agricultura e Mar',
  'justica': 'Justiça e Direitos',
  'administracao interna': 'Segurança e Administração Interna',
  'defesa nacional': 'Defesa',
  'negocios estrangeiros': 'Europa e Mundo',
  'cultura, juventude e desporto': 'Cultura, Juventude e Desporto',
  'reforma do estado': null, // transversal: só vale se não houver área/tag mais específica
  'primeiro-ministro': null,
  'presidencia': null,
  'assuntos parlamentares': null,
}

/** Palavras-chave (com limites de palavra) → tema. Ordem = prioridade. */
const KEYWORDS: [RegExp, TemaCanonico][] = [
  [/\b(habitac\w*|casas?|arrendament\w*|rendas?|heranc\w*|imoveis|imovel|devolutos?)\b/, 'Habitação'],
  [/\b(aima|imigra\w*|migra\w*|nacionalidade|estrangeiros residentes|asilo)\b/, 'Imigração e Nacionalidade'],
  [/\b(saude|sns|hospita\w*|medic\w*|enfermeir\w*|inem)\b/, 'Saúde'],
  [/\b(educac\w*|escolas?|ensino|universidad\w*|ciencia|professor\w*|alunos?)\b/, 'Educação e Ciência'],
  [/\b(pens\w*|seguranca social|salari\w*|emprego|trabalh\w*|idosos?|complemento solidario|prestac\w* social)\b/, 'Trabalho e Segurança Social'],
  [/\b(irs|irc|iva|impostos?|fisca\w*|orcamento|oe\d*|financas)\b/, 'Finanças e Impostos'],
  [/\b(ferrovi\w*|comboios?|aeroport\w*|transportes?|portos?|rodovi\w*|metro)\b/, 'Transportes e Infraestruturas'],
  [/\b(ambiente|energia|clima\w*|florest\w*|agua|lince)\b/, 'Ambiente e Energia'],
  [/\b(agric\w*|pescas?|mar|politica agricola comum)\b/, 'Agricultura e Mar'],
  [/\b(justica|tribuna\w*|codigo civil|penal|prisoes?)\b/, 'Justiça e Direitos'],
  [/\b(psp|gnr|policia\w*|incendios?|bombeiros?|protecao civil|seguranca interna)\b/, 'Segurança e Administração Interna'],
  [/\b(defesa|militar\w*|forcas armadas|exercito|marinha|nato)\b/, 'Defesa'],
  [/\b(europ\w*|ue|diplomac\w*|china|espanha|alemanha|ucrania|cabo verde|sao tome|estados unidos|nacoes unidas|onu|cimeira|cooperacao bilateral|condolencias)\b/, 'Europa e Mundo'],
  [/\b(cultura|desporto|juventude|jovens|imprensa|lusa|musica|comunicacao social)\b/, 'Cultura, Juventude e Desporto'],
  [/\b(economia|empresas?|investimento|export\w*|pme|prr|tap|privatizac\w*|coesao)\b/, 'Economia'],
  [/\b(autarqu\w*|municipi\w*|freguesias?|reforma do estado|reforma da administracao publica|administracao publica|tribunal de contas|servicos publicos)\b/, 'Estado, Autarquias e Instituições'],
]

function byKeywords(text: string): TemaCanonico | null {
  const t = norm(text)
  if (!t) return null
  for (const [re, tema] of KEYWORDS) if (re.test(t)) return tema
  return null
}

export function temaFromGov(input: {
  areas?: string[] | null
  tags?: string[] | null
  priorityTag?: string | null
  titulo?: string | null
}): TemaCanonico {
  const areas = (input.areas || []).map(norm).filter(Boolean)
  const tags = [input.priorityTag || '', ...(input.tags || [])].filter(Boolean)
  const habitacaoHint = byKeywords([...tags, input.titulo || ''].join(' | ')) === 'Habitação'

  for (const a of areas) {
    if (!(a in AREA_MAP)) continue
    const t = AREA_MAP[a]
    if (t === 'Transportes e Infraestruturas' && habitacaoHint) return 'Habitação'
    if (t) return t
  }
  // Área genérica / desconhecida: 1.ª tag prioritária, depois restantes tags, depois título
  for (const tag of tags) {
    const t = byKeywords(tag)
    if (t) return t
  }
  return byKeywords(input.titulo || '') || FALLBACK
}

// Guarda: qualquer tema usado aqui tem de existir na taxonomia canónica partilhada.
for (const t of [FALLBACK, ...Object.values(AREA_MAP), ...KEYWORDS.map(([, t]) => t)]) {
  if (t !== null && !TEMAS_CANONICOS.includes(t)) {
    throw new Error(`govTemas: tema '${t}' não existe em _shared/temas.js`)
  }
}
