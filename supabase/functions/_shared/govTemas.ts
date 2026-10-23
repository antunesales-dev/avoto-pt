/**
 * Área governativa (portugal.gov.pt `card:areas`) → tema canónico da avoto.
 * Taxonomia: plano de conteúdo (16 temas). Puro, sem I/O — testável com `deno test`.
 * Áreas genéricas (Primeiro-Ministro, Presidência, Assuntos Parlamentares) desempatam
 * pelas tags (`card:tags`) e, em último caso, pelo título.
 */

export const TEMAS_CANONICOS = [
  'Saúde',
  'Educação e Ciência',
  'Trabalho e Segurança Social',
  'Habitação',
  'Transportes e Infraestruturas',
  'Finanças e Impostos',
  'Economia',
  'Ambiente e Energia',
  'Agricultura e Mar',
  'Justiça e Direitos',
  'Imigração e Nacionalidade',
  'Segurança e Administração Interna',
  'Defesa',
  'Europa e Mundo',
  'Cultura, Juventude e Desporto',
  'Estado, Autarquias e Instituições',
] as const

export type TemaCanonico = (typeof TEMAS_CANONICOS)[number]

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
