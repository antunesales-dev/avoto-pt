import { defineStore, acceptHMRUpdate } from 'pinia'
import { ref } from 'vue'
import { fetchAllRows } from '@/lib/fetchAll'
import { plainOfficialText } from '@/lib/plainText'
import { supabase } from '@/lib/supabase'

/** Limpa HTML residual do Portal Base (ex. `<br/>` → legível). */
function cleanDespesaRow(row) {
  if (!row) return row
  return {
    ...row,
    titulo: plainOfficialText(row.titulo) || row.titulo,
    entidade: plainOfficialText(row.entidade) || row.entidade,
    categoria: plainOfficialText(row.categoria) || row.categoria,
    descricao: plainOfficialText(row.descricao) || row.descricao,
  }
}

function cleanInvestimentoRow(row) {
  if (!row) return row
  return {
    ...row,
    titulo: plainOfficialText(row.titulo) || row.titulo,
    entidade: plainOfficialText(row.entidade) || row.entidade,
    sector: plainOfficialText(row.sector) || row.sector,
    descricao: plainOfficialText(row.descricao) || row.descricao,
  }
}

/**
 * Digests · despesa pública · investimentos (+ votos cidadãos)
 */
export const useFinanceStore = defineStore('finance', () => {
  const digests = ref([])
  const despesas = ref([])
  const investimentos = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function loadDigests() {
    // todos os digests (paginado no servidor REST)
    digests.value = await fetchAllRows(() =>
      supabase.from('daily_digests').select('*').order('digest_date', { ascending: false }),
    )
  }

  async function loadDespesas() {
    const rows = await fetchAllRows(() =>
      supabase
        .from('despesas_publicas')
        .select('*')
        .order('montante_eur', { ascending: false, nullsFirst: false }),
    )
    despesas.value = (rows || []).map(cleanDespesaRow)
  }

  async function loadInvestimentos() {
    const [inv, agg] = await Promise.all([
      fetchAllRows(() =>
        supabase
          .from('investimentos')
          .select('*')
          .order('montante_eur', { ascending: false, nullsFirst: false }),
      ),
      fetchAllRows(() => supabase.from('investimento_votos_agg').select('*')),
    ])
    const map = Object.fromEntries((agg || []).map((a) => [a.investimento_id, a]))
    investimentos.value = (inv || []).map((row) => {
      const cleaned = cleanInvestimentoRow(row)
      return {
        ...cleaned,
        votosCidadaos: {
          favor: Number(map[row.id]?.favor ?? 0),
          contra: Number(map[row.id]?.contra ?? 0),
          abstencao: Number(map[row.id]?.abstencao ?? 0),
        },
      }
    })
  }

  async function loadAll() {
    loading.value = true
    error.value = null
    try {
      await Promise.all([loadDigests(), loadDespesas(), loadInvestimentos()])
    } catch (e) {
      error.value = e.message || String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  function getInvestimento(id) {
    return investimentos.value.find((i) => i.id === id) || null
  }

  function getDespesa(id) {
    return despesas.value.find((d) => d.id === id) || null
  }

  /** Garante detalhe mesmo se a lista em memória ainda não tiver o registo. */
  async function ensureDespesa(id) {
    if (!id) return null
    const existing = getDespesa(id)
    if (existing) return existing
    const { data, error: err } = await supabase
      .from('despesas_publicas')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (err) throw err
    if (!data) return null
    const cleaned = cleanDespesaRow(data)
    if (!getDespesa(id)) {
      despesas.value = [cleaned, ...despesas.value]
    }
    return cleaned
  }

  function getDigest(id) {
    return digests.value.find((d) => d.id === id) || null
  }

  async function refreshInvestimentoVotes(id) {
    const { data, error: err } = await supabase
      .from('investimento_votos_agg')
      .select('*')
      .eq('investimento_id', id)
      .maybeSingle()
    if (err) throw err
    const idx = investimentos.value.findIndex((i) => i.id === id)
    if (idx >= 0) {
      investimentos.value[idx] = {
        ...investimentos.value[idx],
        votosCidadaos: {
          favor: Number(data?.favor ?? 0),
          contra: Number(data?.contra ?? 0),
          abstencao: Number(data?.abstencao ?? 0),
        },
      }
    }
  }

  return {
    digests,
    despesas,
    investimentos,
    loading,
    error,
    loadAll,
    loadDigests,
    loadDespesas,
    loadInvestimentos,
    getInvestimento,
    getDespesa,
    ensureDespesa,
    getDigest,
    refreshInvestimentoVotes,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFinanceStore, import.meta.hot))
}
