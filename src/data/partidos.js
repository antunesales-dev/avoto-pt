/**
 * Metadados de exibição (siglas/cores) — não são fonte de votos da AR.
 * Ordem canónica: alfabética por sigla (pt), para não enviesar por “tamanho”
 * de bancada ou posição no hemiciclo. Listas por métrica (ex. alinhamento %)
 * ordenam-se à parte; empates voltam a esta ordem.
 */
const PARTIDOS_RAW = [
  { id: 'be', sigla: 'BE', nome: 'Bloco de Esquerda', cor: '#8b0000' },
  { id: 'cds', sigla: 'CDS-PP', nome: 'CDS – Partido Popular', cor: '#0093d4' },
  { id: 'chega', sigla: 'CHEGA', nome: 'CHEGA', cor: '#202056' },
  { id: 'il', sigla: 'IL', nome: 'Iniciativa Liberal', cor: '#00aeee' },
  { id: 'livre', sigla: 'LIVRE', nome: 'LIVRE', cor: '#00c800' },
  { id: 'pan', sigla: 'PAN', nome: 'Pessoas–Animais–Natureza', cor: '#036a38' },
  { id: 'pcp', sigla: 'PCP', nome: 'Partido Comunista Português', cor: '#ff0000' },
  { id: 'ps', sigla: 'PS', nome: 'Partido Socialista', cor: '#ff66a1' },
  { id: 'psd', sigla: 'PSD', nome: 'Partido Social Democrata', cor: '#ff6600' },
]

/** Compara partidos por sigla (pt-PT), estável e neutro. */
export function comparePartidosAlfa(a, b) {
  const sa = (a?.sigla || a?.id || '').toString()
  const sb = (b?.sigla || b?.id || '').toString()
  return sa.localeCompare(sb, 'pt', { sensitivity: 'base' })
}

export function sortPartidosAlfa(list) {
  return [...(list || [])].sort(comparePartidosAlfa)
}

/** Lista canónica — sempre alfabética por sigla. */
export const partidos = sortPartidosAlfa(PARTIDOS_RAW)

export const temas = [
  'Todos',
  'Saúde',
  'Educação',
  'Habitação',
  'Trabalho',
  'Ambiente',
  'Economia',
  'Justiça',
  'Imigração',
  'Defesa',
  'Agricultura',
  'Transportes',
  'Cultura',
  'Direitos sociais',
  'Autarquias',
  'Instituições',
  'Outros',
]

/** true se há pelo menos um sentido de voto de partido */
export function hasPartyVotes(resultadoPartidos) {
  if (!resultadoPartidos || typeof resultadoPartidos !== 'object') return false
  return Object.values(resultadoPartidos).some((v) => v && v !== 'nao_participou')
}

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
  return (v?.favor || 0) + (v?.contra || 0) + (v?.abstencao || 0)
}

export function percentagens(v) {
  const t = totalVotos(v) || 1
  return {
    favor: Math.round(((v?.favor || 0) / t) * 1000) / 10,
    contra: Math.round(((v?.contra || 0) / t) * 1000) / 10,
    abstencao: Math.round(((v?.abstencao || 0) / t) * 1000) / 10,
  }
}

export function getPartido(id) {
  return partidos.find((p) => p.id === id)
}

/**
 * % de cidadãos cujo voto coincide com o sentido de voto do partido nesta iniciativa.
 * null = sem base (partido não votou, ou zero votos de cidadãos) — nunca inventar 0%.
 */
export function alinhamentoCidadaosPartido(iniciativa, partidoId) {
  const votoP = iniciativa.resultadoPartidos?.[partidoId]
  if (!votoP || votoP === 'nao_participou') return null
  const t = totalVotos(iniciativa.votosCidadaos)
  if (!t) return null
  const key = votoP === 'favor' ? 'favor' : votoP === 'contra' ? 'contra' : 'abstencao'
  return Math.round((iniciativa.votosCidadaos[key] / t) * 1000) / 10
}

export function formatDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** Data e hora local pt-PT a partir de ISO/timestamptz. */
export function formatDateTime(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('pt-PT', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return formatDate(iso)
  }
}

export function formatNumber(n) {
  return new Intl.NumberFormat('pt-PT').format(n ?? 0)
}
