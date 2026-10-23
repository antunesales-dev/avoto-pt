/**
 * Taxonomia canónica de temas da A Voto (fonte única: sync Node, edge function e UI).
 *
 * Ordem de decisão (ver classifyTema):
 *   1. Comissão parlamentar competente indicada pela AR (fonte oficial).
 *      Comissões mistas (Assuntos Constitucionais; Infraestruturas, Mobilidade e Habitação)
 *      desempatam com palavras-chave do título, restritas aos temas dessa comissão.
 *   2. Sem comissão: palavras-chave no título, com limites de palavra e sem acentos
 *      (evita “iva” em “legislativa”, “irc” em “circulação”, “media” em “imediata”).
 *   3. Nada encaixa → “Outros”.
 *
 * Ficheiro JS puro (ESM) para ser importado por Node, Deno e Vite sem build.
 */

export const TEMA_OUTROS = 'Outros'

/** 16 temas canónicos (ordem de apresentação na UI) + “Outros”. */
export const TEMAS = [
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
  TEMA_OUTROS,
]

/** Temas antigos (regex sobre o título) → tema canónico. Usado na migração e na UI (links antigos). */
export const LEGACY_TEMA_MAP = {
  Educação: 'Educação e Ciência',
  Trabalho: 'Trabalho e Segurança Social',
  Ambiente: 'Ambiente e Energia',
  Agricultura: 'Agricultura e Mar',
  Justiça: 'Justiça e Direitos',
  Imigração: 'Imigração e Nacionalidade',
  Transportes: 'Transportes e Infraestruturas',
  Cultura: 'Cultura, Juventude e Desporto',
  Autarquias: 'Estado, Autarquias e Instituições',
  Instituições: 'Estado, Autarquias e Instituições',
  'Direitos sociais': 'Justiça e Direitos',
}

/** Minúsculas, sem acentos, espaços normalizados. */
export function normalizeText(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[“”«»"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Constrói uma regex com limite de palavra à esquerda (prefixo/radical) e, para termos
 * terminados em `$`, também à direita (palavra exacta). Texto já normalizado.
 *   'educa'  → educação, educativo…
 *   'iva$'   → só “iva” (não “legislativa”)
 */
function kw(terms) {
  const parts = terms.map((t) => {
    const exact = t.endsWith('$')
    const body = (exact ? t.slice(0, -1) : t).replace(/ /g, '\\s+')
    return exact ? `${body}(?![\\p{L}\\p{N}])` : body
  })
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${parts.join('|')})`, 'gu')
}

/** Palavras-chave por tema (texto normalizado, sem acentos). */
export const KEYWORDS = {
  Saúde: kw([
    'saude', 'sns$', 'hospita', 'medic', 'enfermeir', 'farmac', 'doenca', 'doente', 'cuidados paliativos',
    'cuidados continuados', 'vacina', 'oncolog', 'inem$', 'gravidez', 'parto$', 'obstetr', 'dentist',
    'saude mental', 'psicolog', 'cancro', 'diabetes', 'utentes', 'centros? de saude', 'ivg$', 'aborto',
    'esclerose', 'demencia', 'sangue', 'antibiotic', 'alerg', 'imunoterapia', 'nutricionist', 'clinic', 'terapeut',
    'transplant', 'tratamento', 'infec', 'epidemi', 'cuidados de saude',
  ]),
  'Educação e Ciência': kw([
    'educa', 'escol', 'ensino', 'universi', 'alunos?$', 'professor', 'docente', 'estudant', 'ciencia',
    'cientific', 'investigacao cientifica', 'creche', 'pre-escolar', 'manuais escolares', 'propinas?$',
    'politecnic', 'bolsas? de estudo', 'conselho nacional de educacao', 'aprendizagem', 'formacao profissional',
  ]),
  'Trabalho e Segurança Social': kw([
    'trabalh', 'salari', 'emprego', 'desemprego', 'greve', 'sindica', 'contratacao coletiva',
    'seguranca social', 'pensao', 'pensoes', 'pensionista', 'reformados', 'idade da reforma', 'abono',
    'subsidio de', 'prestac(?:ao|oes) socia', 'rendimento social', 'inclusao', 'deficiencia', 'cuidador',
    'estafeta', 'precari', 'ferias$', 'licenca parental', 'parentalidade', 'regimes? contributivos?',
    'idos(?:o|a)s', 'envelhecimento', 'lares?$', 'pobreza', 'carreiras? contributiva', 'carreira', 'profissoes',
    'profissionais', 'desgaste rapido', 'reforma aos', 'semana de quatro dias', 'vida independente', 'cartao social',
    'apoio social', 'apoios sociais', 'protecao social', 'solidariedade social', 'ipss$', 'sem-abrigo', 'sem abrigo',
  ]),
  Habitação: kw([
    'habitac', 'arrendament', 'rendas?$', 'casas?$', 'imobiliari', 'imove(?:l|is)$', 'alojamento local',
    'condomin', 'despejo', 'inquilin', 'senhorio', 'credito a habitacao', 'herancas? indivisa', 'fogos$',
    'construcao de habitacao', 'solos?$', 'licenciamento urbanistico', 'urbanis', 'edificacao',
  ]),
  'Transportes e Infraestruturas': kw([
    'transport', 'ferrovi', 'comboio', 'cp$', 'metro$', 'metropolitano', 'autocarro', 'aeroport',
    'estradas?$', 'autoestrada', 'portage', 'pontes?$', 'mobilidade', 'ctt$', 'correios', 'navegante',
    'passes?$', 'tvde$', 'travessia', 'infraestrutur', 'portos?$', 'aviac', 'tap$', 'rodovi', 'ciclovi',
    'telecomunic', 'ic\\d+$', 'a\\d+$', 'en\\d+$', 'linha do', 'bilhetica', 'taxis?$', 'conducao',
    'carta de conducao', 'veiculos?$', 'automove',
  ]),
  'Finanças e Impostos': kw([
    'impost', 'fiscal', 'tribut', 'iva$', 'irs$', 'irc$', 'imi$', 'imt$', 'isv$', 'isp$', 'iuc$', 'orcament',
    'financas', 'financeir', 'bancos?$', 'bancari', 'banca$', 'divida publica', 'taxas?$', 'deducao',
    'deducoes', 'beneficios? fiscai', 'seguros?$', 'mercado de capitais', 'contribuic(?:ao|oes) extraordinaria',
    'milionarios', 'riqueza', 'despesa publica', 'contas publicas', 'credito$', 'juros?$', 'tributacao',
    'investidores', 'poupanca', 'fundo de', 'fundos de',
  ]),
  Economia: kw([
    'econom', 'empresa', 'empresari', 'comercio', 'comerciais', 'industri', 'turismo', 'consumidor',
    'concorrencia', 'pme$', 'pmes$', 'startup', 'inovacao', 'restaura', 'precos?$', 'inflacao', 'combustive',
    'mercados?$', 'exporta', 'investimento', 'coesao territorial', 'interior$', 'fundos europeus', 'prr$',
    'portugal 2030', 'empreendedor', 'custo de vida', 'cabaz', 'insolvenc', 'fast fashion', 'textil', 'ordens? dos',
    'ordens profissionais', 'publicidade',
  ]),
  'Ambiente e Energia': kw([
    'ambient', 'clima', 'energ', 'eletric', 'renovav', 'residuo', 'reciclag', 'aguas?$', 'rios?$', 'oceano',
    'litoral', 'costeir', 'biodivers', 'poluic', 'emissoes', 'carbono', 'natureza', 'natural$', 'naturais$',
    'areas? protegidas', 'parque natural', 'reserva natural', 'mineracao', 'litio', 'hidrogenio', 'gas natural',
    'solar', 'eolic', 'barragem', 'seca$', 'efluentes', 'amianto', 'apagao', 'paisagem protegida', 'zonas? humida',
    'ecologic', 'peninsula', 'lagoa', 'serra d', 'sustentab',
  ]),
  'Agricultura e Mar': kw([
    'agricult', 'agricola', 'agro', 'pescas?$', 'pescador', 'mar$', 'maritim', 'florest', 'rural', 'pecuar',
    'vinh', 'vitivinic', 'regadio', 'baldios', 'animais', 'animal$', 'caca$', 'veterinar', 'fertilizant',
    'aquicultura', 'agricultores', 'tauromaq', 'touradas?$', 'apicult', 'gado', 'racas autoctones', 'alimentar',
  ]),
  'Justiça e Direitos': kw([
    'justica', 'tribuna', 'juiz', 'juizes', 'codigo penal', 'codigo civil', 'processo penal', 'processo civil',
    'crime', 'criminal', 'prisio', 'prisoes', 'penitenc', 'reclus', 'violencia', 'igualdade', 'discrimina',
    'direitos$', 'direito ao', 'liberdade', 'genero', 'lgbt', 'criancas', 'menores', 'famili', 'ministerio publico',
    'advoga', 'notari', 'heranca', 'sucess', 'eutanasia', 'morte medicamente assistida', 'corrupc',
    'branqueamento', 'registo civil', 'mudanca de sexo', 'dados pessoais', 'protecao de dados', 'casamento', 'divorcio', 'adocao', 'tortura',
    'esquecimento', 'vitimas', 'abuso', 'mutilacao', 'trafico', 'racis', 'xenofob', 'pornograf', 'assedio',
    'maus tratos', 'infancia', 'chat control', 'privacidade', 'desaparecimento de pessoas',
  ]),
  'Imigração e Nacionalidade': kw([
    'imigra', 'estrangeir', 'asilo', 'refugiad', 'nacionalidade', 'aima$', 'apatrid',
    'autorizac(?:ao|oes) de residencia', 'vistos?$', 'fronteira', 'reagrupamento familiar', 'migrant',
    'manifestac(?:ao|oes) de interesse',
  ]),
  'Segurança e Administração Interna': kw([
    'policia', 'psp$', 'gnr$', 'seguranca interna', 'seguranca publica', 'forcas de seguranca',
    'forcas e servicos de seguranca', 'protecao civil', 'bombeir', 'incendio', 'videovigilancia', 'armas?$',
    'seguranca rodoviaria', 'sis$', 'sef$', 'emergencia$', 'catastrofe', 'calamidade', 'administracao interna',
    'guardas?$', 'agentes de autoridade', 'seguranca privada', 'unef$', 'ciberseguranca', 'resiliencia nacional',
  ]),
  Defesa: kw([
    'defesa nacional', 'forcas armadas', 'militar', 'exercito', 'marinha', 'forca aerea', 'antigos combatentes',
    'nato$', 'otan$', 'servico militar', 'industria de defesa', 'defesa$',
  ]),
  'Europa e Mundo': kw([
    'europe', 'uniao europeia', 'internaciona', 'palestin', 'israel', 'ucrania', 'russia', 'gaza', 'venezuela',
    'comunidades portuguesas', 'emigrant', 'diaspora', 'cplp$', 'tratado', 'acordo entre', 'convencao',
    'cooperacao', 'onu$', 'nacoes unidas', 'conselho da europa', 'irao', 'sahara', 'timor', 'angola',
    'mocambique', 'brasil', 'consula', 'embaixad', 'diplomat', 'paises de lingua', 'estados unidos',
    'china', 'cuba', 'genocid', 'mercosul', 'taiwan', 'mundial', 'paz$',
  ]),
  'Cultura, Juventude e Desporto': kw([
    'cultur', 'patrimoni', 'museu', 'cinema', 'teatro', 'artes?$', 'artist', 'livro', 'bibliotec', 'desport',
    'futebol', 'jovens', 'juventude', 'comunicacao social', 'imprensa', 'jornalis', 'rtp$', 'lusa$',
    'lingua portuguesa', 'monumento', 'arqueolog', 'musica', 'espetacul', 'meios de comunicacao', 'audiovisua',
    'edificio', 'centenario', 'comemorac', 'celebrac', 'atletas?$', 'blogs?$', 'acervo', 'arquivo nacional', 'dia nacional',
  ]),
  'Estado, Autarquias e Instituições': kw([
    'autarqu', 'municip', 'freguesia', 'regiao autonoma', 'regioes autonomas', 'madeira', 'acores',
    'descentraliz', 'regionaliz', 'eleic', 'eleitor', 'eleitos', 'referendo', 'constituic', 'constitucional',
    'assembleia da republica', 'parlament', 'regimento', 'deputad', 'partidos politicos', 'partidos$',
    'presidente da republica', 'administracao publica', 'funcao publica', 'reforma do estado', 'transparencia',
    'lobbying', 'representacao (?:profissional )?de interesses', 'comissao parlamentar', 'comissao eventual',
    'comissoes parlamentares', 'inquerito parlamentar', 'titulares de cargos', 'plenario',
    'grupos parlamentares', 'estatuto dos deputados', 'conselho de estado', 'provedor', 'trabalhadores em funcoes publicas',
    'dirigentes', 'entidade administrativa', 'reguladora', 'simplex', 'burocrac', 'servicos publicos',
    'comissao permanente', 'processo de urgencia', 'legislatura$', 'regioes administrativas', 'organizacao administrativa',
    'organizacoes nao-governamentais', 'governo regional',
  ]),
}

/** Comissão competente da AR → tema canónico (ou lista de temas para desempate). */
const COMISSAO_RULES = [
  [/assuntos constitucionais/, {
    default: 'Justiça e Direitos',
    tiebreak: ['Imigração e Nacionalidade', 'Segurança e Administração Interna', 'Estado, Autarquias e Instituições', 'Justiça e Direitos'],
  }],
  [/^comissao de saude/, 'Saúde'],
  [/orcamento, financas/, 'Finanças e Impostos'],
  [/trabalho, seguranca social/, 'Trabalho e Segurança Social'],
  [/infraestruturas, mobilidade e habitacao/, { default: 'Transportes e Infraestruturas', tiebreak: ['Habitação'] }],
  [/agricultura/, 'Agricultura e Mar'],
  [/educacao e ciencia|educacao, ciencia/, 'Educação e Ciência'],
  [/negocios estrangeiros|assuntos europeus/, 'Europa e Mundo'],
  [/ambiente e energia|ambiente/, 'Ambiente e Energia'],
  [/cultura, comunicacao|cultura/, 'Cultura, Juventude e Desporto'],
  [/economia e coesao|economia/, 'Economia'],
  [/reforma do estado|poder local|transparencia e estatuto/, 'Estado, Autarquias e Instituições'],
  [/defesa nacional/, 'Defesa'],
]

/** Pontuação por tema = nº de palavras-chave distintas no texto. */
export function scoreTemas(texto, only = null) {
  const t = normalizeText(texto)
  const scores = {}
  for (const [tema, re] of Object.entries(KEYWORDS)) {
    if (only && !only.includes(tema)) continue
    const m = t.match(re)
    if (m) scores[tema] = new Set(m).size
  }
  return scores
}

function bestTema(scores, order) {
  let best = null
  let bestScore = 0
  for (const tema of order) {
    const s = scores[tema] || 0
    if (s > bestScore) {
      best = tema
      bestScore = s
    }
  }
  return best
}

/** Tema só a partir do texto (fallback). */
export function inferTemaFromText(texto) {
  return bestTema(scoreTemas(texto), TEMAS) || TEMA_OUTROS
}

/** Tema a partir do nome da comissão (com desempate pelo texto). null se a comissão não é conhecida. */
export function temaFromComissao(nomeComissao, texto = '') {
  const c = normalizeText(nomeComissao)
  if (!c) return null
  for (const [re, rule] of COMISSAO_RULES) {
    if (!re.test(c)) continue
    if (typeof rule === 'string') return rule
    const scores = scoreTemas(texto, rule.tiebreak)
    return bestTema(scores, rule.tiebreak) || rule.default
  }
  return null
}

/**
 * Classifica uma iniciativa.
 * @param {{ comissao?: string|null, titulo: string, extra?: string }} p
 * @returns {{ tema: string, fonte: 'comissao'|'palavras_chave'|'nenhuma' }}
 */
export function classifyTema({ comissao, titulo, extra = '' }) {
  const texto = `${titulo || ''} ${extra || ''}`
  const viaComissao = temaFromComissao(comissao, texto)
  if (viaComissao) return { tema: viaComissao, fonte: 'comissao' }
  const viaTexto = inferTemaFromText(texto)
  if (viaTexto !== TEMA_OUTROS) return { tema: viaTexto, fonte: 'palavras_chave' }
  return { tema: TEMA_OUTROS, fonte: 'nenhuma' }
}

/** Normaliza um tema vindo da BD (temas antigos → canónicos). */
export function canonicalTema(tema) {
  if (!tema) return TEMA_OUTROS
  if (TEMAS.includes(tema)) return tema
  return LEGACY_TEMA_MAP[tema] || tema
}
