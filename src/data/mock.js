/**
 * Dados de demonstração — A Voto (Bancada Cidadã)
 * Apenas para visualização da interface. Em produção virão dos Dados Abertos da AR.
 */

export const metricasGlobais = {
  cidadaosRegistados: 12847,
  votosEmitidos: 94321,
  iniciativasDisponiveis: 186,
  taxaParticipacaoMedia: 38.4,
  legislatura: 'XVI',
  actualizadoEm: '2026-08-01',
}

export const partidos = [
  { id: 'ps', sigla: 'PS', nome: 'Partido Socialista', cor: '#ff66a1' },
  { id: 'psd', sigla: 'PSD', nome: 'Partido Social Democrata', cor: '#ff6600' },
  { id: 'chega', sigla: 'CHEGA', nome: 'CHEGA', cor: '#202056' },
  { id: 'il', sigla: 'IL', nome: 'Iniciativa Liberal', cor: '#00aeee' },
  { id: 'be', sigla: 'BE', nome: 'Bloco de Esquerda', cor: '#8b0000' },
  { id: 'pcp', sigla: 'PCP', nome: 'Partido Comunista Português', cor: '#ff0000' },
  { id: 'livre', sigla: 'LIVRE', nome: 'LIVRE', cor: '#00c800' },
  { id: 'pan', sigla: 'PAN', nome: 'Pessoas–Animais–Natureza', cor: '#036a38' },
  { id: 'cds', sigla: 'CDS-PP', nome: 'CDS – Partido Popular', cor: '#0093d4' },
]

/** @typedef {'favor'|'contra'|'abstencao'|'nao_participou'} VotoPartido */

export const iniciativas = [
  {
    id: 'pl-42-xvi',
    idOficial: 'PL 42/XVI/1',
    titulo: 'Projeto de Lei que reforça a transparência das votações parlamentares',
    tipo: 'Projeto de Lei',
    legislatura: 'XVI',
    numero: 42,
    autores: ['Grupo Parlamentar do PS'],
    dataEntrada: '2025-11-12',
    dataVotacao: '2026-03-18',
    estado: 'aprovado',
    tema: 'Instituições',
    descricaoOficial:
      'Procede à alteração do Regimento da Assembleia da República, prevendo a publicação atempada e em formato aberto dos resultados nominais de todas as votações em plenário.',
    explicacao:
      'A iniciativa propõe que os resultados de todas as votações em Plenário sejam publicados de forma atempada, em formatos reutilizáveis (JSON/CSV), incluindo o sentido de voto de cada deputado, quando a votação for nominal. Não altera o quórum nem as regras de maioria.',
    links: [
      { label: 'Texto na AR (simulado)', url: 'https://www.parlamento.pt' },
      { label: 'Resultados oficiais (simulado)', url: 'https://www.parlamento.pt' },
    ],
    resultadoPartidos: {
      ps: 'favor',
      psd: 'favor',
      chega: 'abstencao',
      il: 'favor',
      be: 'favor',
      pcp: 'favor',
      livre: 'favor',
      pan: 'favor',
      cds: 'contra',
    },
    votosCidadaos: { favor: 6120, contra: 1840, abstencao: 920 },
  },
  {
    id: 'pl-118-xvi',
    idOficial: 'PL 118/XVI/1',
    titulo: 'Proposta de Lei do Orçamento do Estado para 2026',
    tipo: 'Proposta de Lei',
    legislatura: 'XVI',
    numero: 118,
    autores: ['Governo'],
    dataEntrada: '2025-10-10',
    dataVotacao: '2025-11-28',
    estado: 'aprovado',
    tema: 'Economia',
    descricaoOficial:
      'Aprova o Orçamento do Estado para o ano económico de 2026, incluindo as receitas e despesas do Estado e as alterações fiscais e sociais associadas.',
    explicacao:
      'Documento anual que define receitas e despesas públicas para 2026. A votação na generalidade e especialidade define o enquadramento orçamental do país. Os dados aqui apresentados são ilustrativos da comparação cidadãos vs partidos.',
    links: [
      { label: 'Texto na AR (simulado)', url: 'https://www.parlamento.pt' },
    ],
    resultadoPartidos: {
      ps: 'favor',
      psd: 'contra',
      chega: 'contra',
      il: 'contra',
      be: 'contra',
      pcp: 'contra',
      livre: 'abstencao',
      pan: 'abstencao',
      cds: 'contra',
    },
    votosCidadaos: { favor: 3890, contra: 7120, abstencao: 1540 },
  },
  {
    id: 'pj-r-33-xvi',
    idOficial: 'PjR 33/XVI/1',
    titulo: 'Projeto de Resolução sobre habitação acessível nas áreas metropolitanas',
    tipo: 'Projeto de Resolução',
    legislatura: 'XVI',
    numero: 33,
    autores: ['Grupo Parlamentar do BE', 'Grupo Parlamentar do LIVRE'],
    dataEntrada: '2026-01-20',
    dataVotacao: '2026-04-09',
    estado: 'rejeitado',
    tema: 'Habitação',
    descricaoOficial:
      'Recomenda ao Governo um conjunto de medidas urgentes para reforço da oferta de habitação a custos acessíveis nas Áreas Metropolitanas de Lisboa e do Porto.',
    explicacao:
      'Trata-se de uma resolução (não vinculativa como uma lei) que recomenda políticas de habitação. A votação indica o posicionamento de cada bancada face a esse conjunto de recomendações.',
    links: [
      { label: 'Texto na AR (simulado)', url: 'https://www.parlamento.pt' },
    ],
    resultadoPartidos: {
      ps: 'contra',
      psd: 'contra',
      chega: 'contra',
      il: 'contra',
      be: 'favor',
      pcp: 'favor',
      livre: 'favor',
      pan: 'favor',
      cds: 'contra',
    },
    votosCidadaos: { favor: 8450, contra: 2100, abstencao: 680 },
  },
  {
    id: 'pl-7-xvi',
    idOficial: 'PL 7/XVI/1',
    titulo: 'Projeto de Lei de proteção da costa e zonas húmidas',
    tipo: 'Projeto de Lei',
    legislatura: 'XVI',
    numero: 7,
    autores: ['Grupo Parlamentar do PAN', 'Grupo Parlamentar do LIVRE'],
    dataEntrada: '2025-09-03',
    dataVotacao: '2026-02-11',
    estado: 'aprovado',
    tema: 'Ambiente',
    descricaoOficial:
      'Estabelece medidas de proteção reforçada da orla costeira e de zonas húmidas de interesse nacional, com regime sancionatório e instrumentos de ordenamento.',
    explicacao:
      'O diploma reforça regras de construção e uso do solo na orla costeira e em zonas húmidas classificadas, com o objectivo de preservar ecossistemas e reduzir riscos de erosão e inundação.',
    links: [
      { label: 'Texto na AR (simulado)', url: 'https://www.parlamento.pt' },
    ],
    resultadoPartidos: {
      ps: 'favor',
      psd: 'abstencao',
      chega: 'contra',
      il: 'abstencao',
      be: 'favor',
      pcp: 'favor',
      livre: 'favor',
      pan: 'favor',
      cds: 'contra',
    },
    votosCidadaos: { favor: 9210, contra: 980, abstencao: 740 },
  },
  {
    id: 'mocao-confianca-1',
    idOficial: 'Moção 1/XVI',
    titulo: 'Moção de confiança ao Governo',
    tipo: 'Moção',
    legislatura: 'XVI',
    numero: 1,
    autores: ['Governo'],
    dataEntrada: '2025-04-02',
    dataVotacao: '2025-04-10',
    estado: 'aprovado',
    tema: 'Instituições',
    descricaoOficial:
      'Moção de confiança apresentada pelo Governo à Assembleia da República, nos termos constitucionais.',
    explicacao:
      'Instrumento parlamentar em que o Governo solicita a confiança da Assembleia da República. O resultado determina a continuidade ou a queda do Governo, conforme a Constituição.',
    links: [
      { label: 'Texto na AR (simulado)', url: 'https://www.parlamento.pt' },
    ],
    resultadoPartidos: {
      ps: 'favor',
      psd: 'contra',
      chega: 'contra',
      il: 'contra',
      be: 'contra',
      pcp: 'contra',
      livre: 'abstencao',
      pan: 'abstencao',
      cds: 'contra',
    },
    votosCidadaos: { favor: 4210, contra: 6980, abstencao: 1320 },
  },
  {
    id: 'pl-201-xvi',
    idOficial: 'PL 201/XVI/1',
    titulo: 'Projeto de Lei sobre literacia digital e cidadania nas escolas',
    tipo: 'Projeto de Lei',
    legislatura: 'XVI',
    numero: 201,
    autores: ['Grupo Parlamentar da IL', 'Grupo Parlamentar do PSD'],
    dataEntrada: '2026-05-14',
    dataVotacao: null,
    estado: 'em_discussao',
    tema: 'Educação',
    descricaoOficial:
      'Introduz conteúdos obrigatórios de literacia digital, pensamento crítico e cidadania no ensino básico e secundário.',
    explicacao:
      'A proposta define competências mínimas de literacia digital e cidadania a integrar nos currículos. Ainda se encontra em discussão — os cidadãos podem votar; o resultado oficial da AR será actualizado quando existir votação.',
    links: [
      { label: 'Texto na AR (simulado)', url: 'https://www.parlamento.pt' },
    ],
    resultadoPartidos: {
      ps: 'nao_participou',
      psd: 'nao_participou',
      chega: 'nao_participou',
      il: 'nao_participou',
      be: 'nao_participou',
      pcp: 'nao_participou',
      livre: 'nao_participou',
      pan: 'nao_participou',
      cds: 'nao_participou',
    },
    votosCidadaos: { favor: 5340, contra: 1120, abstencao: 890 },
  },
  {
    id: 'pj-r-12-xvi',
    idOficial: 'PjR 12/XVI/1',
    titulo: 'Projeto de Resolução — reforço do SNS no interior do país',
    tipo: 'Projeto de Resolução',
    legislatura: 'XVI',
    numero: 12,
    autores: ['Grupo Parlamentar do PCP'],
    dataEntrada: '2025-12-02',
    dataVotacao: '2026-01-22',
    estado: 'aprovado',
    tema: 'Saúde',
    descricaoOficial:
      'Recomenda ao Governo medidas de reforço da rede de cuidados de saúde primários e hospitalares no interior do território continental e nas regiões autónomas.',
    explicacao:
      'A resolução foca o acesso a cuidados de saúde em territórios de baixa densidade, recomendando investimentos e incentivos à fixação de profissionais de saúde.',
    links: [
      { label: 'Texto na AR (simulado)', url: 'https://www.parlamento.pt' },
    ],
    resultadoPartidos: {
      ps: 'favor',
      psd: 'favor',
      chega: 'abstencao',
      il: 'abstencao',
      be: 'favor',
      pcp: 'favor',
      livre: 'favor',
      pan: 'favor',
      cds: 'favor',
    },
    votosCidadaos: { favor: 10240, contra: 560, abstencao: 410 },
  },
  {
    id: 'pl-55-xvi',
    idOficial: 'PL 55/XVI/1',
    titulo: 'Projeto de Lei de alteração ao Código do Trabalho — teletrabalho',
    tipo: 'Projeto de Lei',
    legislatura: 'XVI',
    numero: 55,
    autores: ['Grupo Parlamentar do PSD'],
    dataEntrada: '2026-02-28',
    dataVotacao: '2026-06-04',
    estado: 'rejeitado',
    tema: 'Trabalho',
    descricaoOficial:
      'Altera o regime de teletrabalho no Código do Trabalho, clarificando direitos, deveres e compensação de despesas.',
    explicacao:
      'Propõe regras mais detalhadas sobre elegibilidade, compensação de custos e direito à desconexão no teletrabalho. Os números de cidadãos são dados de demonstração.',
    links: [
      { label: 'Texto na AR (simulado)', url: 'https://www.parlamento.pt' },
    ],
    resultadoPartidos: {
      ps: 'contra',
      psd: 'favor',
      chega: 'favor',
      il: 'favor',
      be: 'contra',
      pcp: 'contra',
      livre: 'abstencao',
      pan: 'abstencao',
      cds: 'favor',
    },
    votosCidadaos: { favor: 4680, contra: 3910, abstencao: 1220 },
  },
]

export const perfilDemo = {
  id: 'CID-7K9M2X',
  partidoPreferencia: 'PS',
  totalVotos: 24,
  alinhamentos: [
    { partidoId: 'ps', percentagem: 71 },
    { partidoId: 'livre', percentagem: 64 },
    { partidoId: 'pan', percentagem: 58 },
    { partidoId: 'be', percentagem: 52 },
    { partidoId: 'psd', percentagem: 41 },
    { partidoId: 'il', percentagem: 38 },
    { partidoId: 'pcp', percentagem: 35 },
    { partidoId: 'cds', percentagem: 29 },
    { partidoId: 'chega', percentagem: 18 },
  ],
  historico: [
    { iniciativaId: 'pl-42-xvi', voto: 'favor', data: '2026-03-19' },
    { iniciativaId: 'pl-118-xvi', voto: 'contra', data: '2025-11-29' },
    { iniciativaId: 'pj-r-33-xvi', voto: 'favor', data: '2026-04-10' },
    { iniciativaId: 'pl-7-xvi', voto: 'favor', data: '2026-02-12' },
    { iniciativaId: 'pl-201-xvi', voto: 'favor', data: '2026-05-20' },
  ],
}

/** Navegação principal (barra / app) */
export const navPrincipal = [
  { to: '/', label: 'Início', icon: 'home', exact: true },
  { to: '/iniciativas', label: 'Iniciativas', icon: 'gavel' },
  { to: '/comparacao', label: 'Comparação', icon: 'compare_arrows' },
  { to: '/metricas', label: 'Métricas', icon: 'insights' },
]

/** Navegação secundária (menu Mais) */
export const navMais = [
  { to: '/como-funciona', label: 'Como funciona', icon: 'help_outline' },
  { to: '/dados', label: 'Fontes de dados', icon: 'storage' },
  { to: '/sobre', label: 'Sobre', icon: 'info_outline' },
  { to: '/privacidade', label: 'Privacidade', icon: 'privacy_tip' },
]

/** Conta — sempre na barra, fora do Mais */
export const navConta = [
  { to: '/perfil', label: 'Perfil', icon: 'person_outline' },
]

/** Todas as rotas com label (títulos, etc.) */
export const navegacao = [...navPrincipal, ...navMais, ...navConta]

export const temas = [
  'Todos',
  'Instituições',
  'Economia',
  'Habitação',
  'Ambiente',
  'Educação',
  'Saúde',
  'Trabalho',
]

export const estadosLabel = {
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  em_discussao: 'Em discussão',
  arquivado: 'Arquivado',
}

export const votoLabel = {
  favor: 'A favor',
  contra: 'Contra',
  abstencao: 'Abstenção',
  nao_participou: 'Sem votação',
}

export function totalVotos(v) {
  return v.favor + v.contra + v.abstencao
}

export function percentagens(v) {
  const t = totalVotos(v) || 1
  return {
    favor: Math.round((v.favor / t) * 1000) / 10,
    contra: Math.round((v.contra / t) * 1000) / 10,
    abstencao: Math.round((v.abstencao / t) * 1000) / 10,
  }
}

export function getIniciativa(id) {
  return iniciativas.find((i) => i.id === id)
}

export function getPartido(id) {
  return partidos.find((p) => p.id === id)
}

/** Alinhamento cidadãos vs partido: % de cidadãos que votaram no mesmo sentido que o partido */
export function alinhamentoCidadaosPartido(iniciativa, partidoId) {
  const votoP = iniciativa.resultadoPartidos[partidoId]
  if (!votoP || votoP === 'nao_participou') return null
  const t = totalVotos(iniciativa.votosCidadaos)
  if (!t) return 0
  const key = votoP === 'favor' ? 'favor' : votoP === 'contra' ? 'contra' : 'abstencao'
  return Math.round((iniciativa.votosCidadaos[key] / t) * 1000) / 10
}

export function formatDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatNumber(n) {
  return new Intl.NumberFormat('pt-PT').format(n)
}
