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

/** Portais oficiais quando o registo não traz deep-link (Portal Base não expõe URL por contrato no feed SNS). */
const FALLBACK_LINKS = {
  'base.gov.pt': [
    { label: 'Portal Base (IMPIC)', url: 'https://www.base.gov.pt' },
    {
      label: 'Dataset Portal Base (SNS Transparência)',
      url: 'https://transparencia.sns.gov.pt/explore/dataset/portal-base/',
    },
    {
      label: 'dados.gov.pt — Contratos Portal Base',
      url: 'https://dados.gov.pt/pt/datasets/contratos-publicos-portal-base-impic-contratos-de-2012-a-2026/',
    },
  ],
  base_gov: [
    { label: 'Portal Base (IMPIC)', url: 'https://www.base.gov.pt' },
    {
      label: 'Dataset Portal Base (SNS Transparência)',
      url: 'https://transparencia.sns.gov.pt/explore/dataset/portal-base/',
    },
  ],
  'dados.gov.pt': [{ label: 'dados.gov.pt', url: 'https://dados.gov.pt' }],
  ar_dados_abertos: [
    {
      label: 'Dados Abertos da Assembleia da República',
      url: 'https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx',
    },
  ],
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

/**
 * Lista de ligações oficiais para um registo (despesa / investimento).
 * Usa `links` do registo; se vazio, fallback por `source` (+ listas extra opcionais).
 */
export function resolveSourceLinks(record, extraLists = []) {
  const seen = new Set()
  const out = []

  function pushList(list) {
    if (!Array.isArray(list)) return
    for (const l of list) {
      const url = l?.url ? String(l.url).trim() : ''
      if (!url || seen.has(url)) continue
      seen.add(url)
      out.push({
        label: (l.label && String(l.label).trim()) || url,
        url,
      })
    }
  }

  pushList(record?.links)
  for (const extra of extraLists) pushList(extra)

  if (!out.length && record?.source) {
    pushList(FALLBACK_LINKS[record.source] || FALLBACK_LINKS[String(record.source).toLowerCase()])
  }

  // Último recurso: portais oficiais genéricos de despesa
  if (!out.length) {
    pushList(FALLBACK_LINKS['base.gov.pt'])
  }

  return out
}
