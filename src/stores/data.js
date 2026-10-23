import { defineStore, acceptHMRUpdate } from 'pinia'
import { ref } from 'vue'
import { fetchAllRows } from '@/lib/fetchAll'
import { supabase } from '@/lib/supabase'
import { canonicalTema } from '@/data/temas'

/** Colunas leves para a lista (a ficha rica — fases, votações, documentos, debates — só no detalhe). */
const LIST_COLUMNS = [
  'id',
  'id_oficial',
  'titulo',
  'tipo',
  'legislatura',
  'numero',
  'autores',
  'data_entrada',
  'data_votacao',
  'estado',
  'tema',
  'tema_fonte',
  'descricao_oficial',
  'explicacao',
  'links',
  'resultado_partidos',
  'votacao_principal',
  'procedimento',
  'dossie_id',
].join(',')

/**
 * Dados públicos: iniciativas + agregados (Supabase).
 * Realtime: contagens de votos.
 */
export const useDataStore = defineStore('data', () => {
  const iniciativas = ref([])
  const metricas = ref({
    cidadaos_registados: 0,
    votos_emitidos: 0,
    iniciativas_disponiveis: 0,
    digests: 0,
    despesas: 0,
    investimentos: 0,
    comunicados: 0,
    taxa_participacao_media: 0,
  })

  function applyMetricas(row) {
    if (!row) return
    metricas.value = {
      cidadaos_registados: Number(row.cidadaos_registados || 0),
      votos_emitidos: Number(row.votos_emitidos || 0),
      iniciativas_disponiveis: Number(row.iniciativas_disponiveis || 0),
      digests: Number(row.digests || 0),
      despesas: Number(row.despesas || 0),
      investimentos: Number(row.investimentos || 0),
      comunicados: Number(row.comunicados || 0),
      taxa_participacao_media: Number(row.taxa_participacao_media || 0),
    }
  }
  const loading = ref(false)
  const loadingDetail = ref(false)
  const error = ref(null)
  let realtimeChannel = null

  function mapIniciativa(row, agg) {
    const full = 'fases' in row
    return {
      id: row.id,
      idOficial: row.id_oficial,
      titulo: row.titulo,
      tipo: row.tipo,
      legislatura: row.legislatura,
      numero: row.numero,
      autores: row.autores || [],
      dataEntrada: row.data_entrada,
      dataVotacao: row.data_votacao,
      estado: row.estado,
      tema: canonicalTema(row.tema),
      temaFonte: row.tema_fonte || null,
      descricaoOficial: row.descricao_oficial,
      explicacao: row.explicacao,
      links: row.links || [],
      resultadoPartidos: row.resultado_partidos || {},
      votacaoPrincipal: row.votacao_principal || null,
      procedimento: Boolean(row.procedimento),
      dossieId: row.dossie_id || null,
      // ficha rica (só quando carregada com loadDetalhe / ensureIniciativa)
      detalheCarregado: full,
      arIniId: row.ar_ini_id || null,
      autoresDeputados: row.autores_deputados || [],
      fases: row.fases || [],
      votacoes: row.votacoes || [],
      documentos: row.documentos || [],
      comissao: row.comissao || null,
      debates: row.debates || [],
      conjuntas: row.conjuntas || [],
      votosCidadaos: {
        favor: Number(agg?.favor ?? 0),
        contra: Number(agg?.contra ?? 0),
        abstencao: Number(agg?.abstencao ?? 0),
      },
    }
  }

  async function loadAll() {
    loading.value = true
    error.value = null
    try {
      // PostgREST limita a 1000 por request — paginar
      const [iniRows, aggRows, metRes] = await Promise.all([
        fetchAllRows(() =>
          supabase
            .from('iniciativas')
            .select(LIST_COLUMNS)
            .order('data_votacao', { ascending: false, nullsFirst: false })
            .order('id', { ascending: true }),
        ),
        fetchAllRows(() => supabase.from('iniciativa_votos_agg').select('*')),
        supabase.from('metricas_globais').select('*').maybeSingle(),
      ])
      if (metRes.error) throw metRes.error

      const aggMap = Object.fromEntries((aggRows || []).map((a) => [a.iniciativa_id, a]))
      iniciativas.value = (iniRows || []).map((row) => mapIniciativa(row, aggMap[row.id]))

      applyMetricas(metRes.data)
    } catch (e) {
      error.value = e.message || String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  function getIniciativa(id) {
    return iniciativas.value.find((i) => i.id === id) || null
  }

  /**
   * Garante a ficha completa (fases, votações, documentos, debates…) da iniciativa.
   * A lista só traz colunas leves; aqui vai-se buscar a linha inteira e junta-se à lista.
   */
  async function ensureIniciativa(id) {
    if (!id) return null
    const existing = getIniciativa(id)
    if (existing?.detalheCarregado) return existing

    loadingDetail.value = true
    try {
      const [{ data: row, error: err }, { data: agg }] = await Promise.all([
        supabase.from('iniciativas').select('*').eq('id', id).maybeSingle(),
        supabase.from('iniciativa_votos_agg').select('*').eq('iniciativa_id', id).maybeSingle(),
      ])
      if (err) throw err
      if (!row) return existing || null
      const mapped = mapIniciativa(row, agg)
      const idx = iniciativas.value.findIndex((i) => i.id === id)
      if (idx >= 0) iniciativas.value[idx] = mapped
      else iniciativas.value = [mapped, ...iniciativas.value]
      return mapped
    } finally {
      loadingDetail.value = false
    }
  }

  /** Iniciativas do mesmo dossiê (da lista em memória; leve). */
  function dossieDe(item) {
    if (!item?.dossieId) return []
    return iniciativas.value.filter((i) => i.dossieId === item.dossieId && i.id !== item.id)
  }

  async function refreshAgg(iniciativaId) {
    const { data, error: err } = await supabase
      .from('iniciativa_votos_agg')
      .select('*')
      .eq('iniciativa_id', iniciativaId)
      .maybeSingle()
    if (err) throw err
    const idx = iniciativas.value.findIndex((i) => i.id === iniciativaId)
    if (idx >= 0) {
      const current = iniciativas.value[idx]
      iniciativas.value[idx] = {
        ...current,
        votosCidadaos: {
          favor: Number(data?.favor ?? 0),
          contra: Number(data?.contra ?? 0),
          abstencao: Number(data?.abstencao ?? 0),
        },
      }
    }
    const met = await supabase.from('metricas_globais').select('*').maybeSingle()
    if (!met.error) applyMetricas(met.data)
  }

  function applyCountRow(row) {
    if (!row?.iniciativa_id) return
    const idx = iniciativas.value.findIndex((i) => i.id === row.iniciativa_id)
    if (idx < 0) return
    const current = iniciativas.value[idx]
    iniciativas.value[idx] = {
      ...current,
      votosCidadaos: {
        favor: Number(row.favor ?? 0),
        contra: Number(row.contra ?? 0),
        abstencao: Number(row.abstencao ?? 0),
      },
    }
  }

  function startRealtime() {
    if (realtimeChannel) return
    realtimeChannel = supabase
      .channel('public:voto-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'iniciativa_voto_counts',
        },
        (payload) => {
          const row = payload.new || payload.old
          if (row) applyCountRow(row)
          // métricas globais: refresh leve
          supabase
            .from('metricas_globais')
            .select('*')
            .maybeSingle()
            .then(({ data }) => {
              if (data) applyMetricas(data)
            })
        },
      )
      .subscribe()
  }

  function stopRealtime() {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  return {
    iniciativas,
    metricas,
    loading,
    loadingDetail,
    error,
    loadAll,
    getIniciativa,
    ensureIniciativa,
    dossieDe,
    refreshAgg,
    startRealtime,
    stopRealtime,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDataStore, import.meta.hot))
}
