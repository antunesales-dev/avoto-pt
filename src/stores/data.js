import { defineStore, acceptHMRUpdate } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

/**
 * Dados públicos: iniciativas + agregados (Supabase).
 */
export const useDataStore = defineStore('data', () => {
  const iniciativas = ref([])
  const metricas = ref({
    cidadaos_registados: 0,
    votos_emitidos: 0,
    iniciativas_disponiveis: 0,
    taxa_participacao_media: 0,
  })
  const loading = ref(false)
  const error = ref(null)

  function mapIniciativa(row, agg) {
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
      tema: row.tema,
      descricaoOficial: row.descricao_oficial,
      explicacao: row.explicacao,
      links: row.links || [],
      resultadoPartidos: row.resultado_partidos || {},
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
      const [iniRes, aggRes, metRes] = await Promise.all([
        supabase.from('iniciativas').select('*').order('data_votacao', { ascending: false, nullsFirst: false }),
        supabase.from('iniciativa_votos_agg').select('*'),
        supabase.from('metricas_globais').select('*').maybeSingle(),
      ])
      if (iniRes.error) throw iniRes.error
      if (aggRes.error) throw aggRes.error
      if (metRes.error) throw metRes.error

      const aggMap = Object.fromEntries((aggRes.data || []).map((a) => [a.iniciativa_id, a]))
      iniciativas.value = (iniRes.data || []).map((row) => mapIniciativa(row, aggMap[row.id]))

      if (metRes.data) {
        metricas.value = {
          cidadaos_registados: Number(metRes.data.cidadaos_registados || 0),
          votos_emitidos: Number(metRes.data.votos_emitidos || 0),
          iniciativas_disponiveis: Number(metRes.data.iniciativas_disponiveis || 0),
          taxa_participacao_media: Number(metRes.data.taxa_participacao_media || 0),
        }
      }
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
    if (!met.error && met.data) {
      metricas.value = {
        cidadaos_registados: Number(met.data.cidadaos_registados || 0),
        votos_emitidos: Number(met.data.votos_emitidos || 0),
        iniciativas_disponiveis: Number(met.data.iniciativas_disponiveis || 0),
        taxa_participacao_media: Number(met.data.taxa_participacao_media || 0),
      }
    }
  }

  return {
    iniciativas,
    metricas,
    loading,
    error,
    loadAll,
    getIniciativa,
    refreshAgg,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDataStore, import.meta.hot))
}
