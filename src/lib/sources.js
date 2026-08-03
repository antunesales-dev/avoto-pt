/** Rótulos de fonte para UI — nunca expor "seed" como se fosse dado real. */

const LABELS = {
  ar_dados_abertos: 'Dados Abertos AR',
  'base.gov.pt': 'Portal Base',
  base_gov: 'Portal Base',
  'dados.gov.pt': 'dados.gov.pt',
  oficial: 'Fonte oficial',
  multi_section: 'Agregado A Voto',
  unknown: 'Fonte não indicada',
}

export function sourceLabel(source) {
  if (!source || source === 'seed') return 'Fonte oficial' // seed não deve aparecer em prod
  return LABELS[source] || String(source)
}

export function sourceBadgeClass(source) {
  if (!source || source === 'seed') return 'badge--muted'
  if (source === 'ar_dados_abertos') return 'badge--green'
  if (String(source).includes('base')) return 'badge--navy'
  return 'badge--green'
}
