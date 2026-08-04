/**
 * Despesa pública — fonte oficial via Portal Base (espelho SNS Transparência / dados.gov).
 * Dataset: contratos Portal Base (saúde) — API pública open data.
 * https://transparencia.sns.gov.pt · dados originários base.gov.pt
 *
 * IDs estáveis (SHA-256 dos campos oficiais) para o mesmo contrato não criar
 * linhas duplicadas em cada sync.
 */

const SNS_BASE =
  'https://transparencia.sns.gov.pt/api/explore/v2.1/catalog/datasets/portal-base/records'

const UA = 'A-Voto/1.0 (+https://avoto.pt; civic open data)'

export type MappedDespesa = Record<string, unknown>
export type MappedInvestimento = Record<string, unknown>

/** Normaliza texto para chave de identidade (minúsculas, sem acentos, espaços colapsados). */
function normKey(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** ID estável e curto a partir dos campos que identificam o contrato no dataset. */
async function stableContractId(parts: string[]): Promise<string> {
  const raw = parts.map(normKey).join('|')
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `base-${hex.slice(0, 28)}`
}

export async function fetchBaseContratos(limit = 80): Promise<{
  despesas: MappedDespesa[]
  investimentos: MappedInvestimento[]
  source: string
  total: number
}> {
  // API SNS: máx. 100 por página — paginar até `limit`
  const pageSize = 100
  const target = Math.max(1, Math.min(2000, limit))
  const rows: Record<string, unknown>[] = []
  let total = 0
  let offset = 0

  while (rows.length < target) {
    const take = Math.min(pageSize, target - rows.length)
    const url =
      `${SNS_BASE}?limit=${take}&offset=${offset}` +
      `&order_by=-data_de_publicacao` +
      `&where=${encodeURIComponent('preco_contratual > 50000')}`

    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`SNS portal-base HTTP ${res.status}`)
    const body = await res.json()
    total = Number(body.total_count || 0)
    const batch: Record<string, unknown>[] = body.results || []
    if (!batch.length) break
    rows.push(...batch)
    offset += batch.length
    if (batch.length < take) break
  }

  // Dedup na resposta da API (mesma linha duas vezes na página)
  const seen = new Set<string>()
  const despesas: MappedDespesa[] = []
  const investimentos: MappedInvestimento[] = []

  for (const row of rows) {
    const objeto = String(row.objeto_do_contrato || row.objecto || 'Contrato público')
    const entidade = String(
      row.entidades_adjudicantes_normalizado || row.entidade_adjudicante || '',
    )
    const adjudicataria = String(row.entidades_adjudicatarias_normalizado || '')
    const montante = row.preco_contratual != null ? Number(row.preco_contratual) : null
    const dataPub = row.data_de_publicacao
      ? String(row.data_de_publicacao).slice(0, 10)
      : null
    const dataCeleb = row.data_de_celebracao_do_contrato
      ? String(row.data_de_celebracao_do_contrato).slice(0, 10)
      : null
    const tipoProc = String(row.tipo_de_procedimento || '')
    const tiposContrato = String(row.tipos_de_contrato || '').replace(/<br\s*\/?>/gi, ' · ')
    const cpvs = String(row.cpvs || '')
    const nifAdj = String(row.nifs_dos_adjudicantes || '')
    const nifAdjudicataria = String(row.nifs_das_adjudicatarias || '')

    // Chave estável: NIF × datas × preço × objecto × adjudicatária
    // (dataset SNS não expõe id único de contrato)
    const id = await stableContractId([
      nifAdj,
      nifAdjudicataria,
      dataPub || '',
      dataCeleb || '',
      montante != null && !Number.isNaN(montante) ? String(montante) : '',
      objeto,
      tipoProc,
    ])

    if (seen.has(id)) continue
    seen.add(id)

    const links = [
      {
        label: 'Portal Base (IMPIC)',
        url: 'https://www.base.gov.pt',
      },
      {
        label: 'Dataset Portal Base (SNS Transparência)',
        url: 'https://transparencia.sns.gov.pt/explore/dataset/portal-base/',
      },
      {
        label: 'dados.gov.pt — Contratos Portal Base',
        url: 'https://dados.gov.pt/pt/datasets/contratos-publicos-portal-base-impic-contratos-de-2012-a-2026/',
      },
    ]

    const despesa: MappedDespesa = {
      id,
      tipo: 'contrato_publico',
      titulo: objeto.slice(0, 300),
      entidade,
      montante_eur: montante != null && !Number.isNaN(montante) ? String(montante) : null,
      moeda: 'EUR',
      data_publicacao: dataPub,
      data_inicio: dataCeleb,
      data_fim: null,
      descricao: [tiposContrato, tipoProc, cpvs].filter(Boolean).join(' · ').slice(0, 2000),
      categoria: tiposContrato.split(' · ')[0] || 'Contrato público',
      links,
      meta: {
        fonte: 'portal_base_via_sns_transparencia',
        adjudicataria: adjudicataria || null,
        nif_adjudicante: nifAdj || null,
        nif_adjudicataria: nifAdjudicataria || null,
        local: row.local_de_execucao || null,
        identity: 'sha256(nif|nif_adj|datas|preco|objeto|proc)',
      },
      source: 'base.gov.pt',
      source_id: id,
    }
    despesas.push(despesa)

    // Subconjunto votável: mesmo contrato Base, limiar alto — NÃO é uma fonte diferente.
    if (montante != null && montante >= 100_000) {
      investimentos.push({
        id: `inv-${id}`,
        titulo: objeto.slice(0, 300),
        descricao: despesa.descricao,
        montante_eur: String(montante),
        entidade,
        sector: String(despesa.categoria),
        data_referencia: dataPub,
        decisao_oficial: 'em_curso',
        decisao_detalhe:
          'Contrato do Portal Base (≥ 100 000 €) exposto para voto cidadão na A Voto — não é uma segunda despesa inventada.',
        despesa_id: id,
        links,
        source: 'base.gov.pt',
      })
    }
  }

  return {
    despesas,
    investimentos,
    source: SNS_BASE,
    total,
  }
}
