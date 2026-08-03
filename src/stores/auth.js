import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, ref } from 'vue'
import { perfilDemo } from '@/data/mock'

/**
 * Sessão + votos de demonstração (sem backend).
 * Em produção: Supabase Auth + constraint único (user_id, iniciativa_id).
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  /** @type {import('vue').Ref<Record<string, 'favor'|'contra'|'abstencao'>>} */
  const votos = ref({})

  const isLoggedIn = computed(() => user.value != null)
  const cid = computed(() => user.value?.id ?? null)

  function loginDemo() {
    user.value = {
      id: perfilDemo.id,
      partidoPreferencia: perfilDemo.partidoPreferencia,
    }
  }

  function logout() {
    user.value = null
    votos.value = {}
  }

  function getVoto(iniciativaId) {
    return votos.value[iniciativaId] ?? null
  }

  function jaVotou(iniciativaId) {
    return getVoto(iniciativaId) != null
  }

  /**
   * Regista o voto. Imutável: se já existir, rejeita.
   * @returns {{ ok: true, voto: string } | { ok: false, reason: 'not_logged_in'|'already_voted' }}
   */
  function castVoto(iniciativaId, voto) {
    if (!user.value) {
      return { ok: false, reason: 'not_logged_in' }
    }
    if (votos.value[iniciativaId]) {
      return { ok: false, reason: 'already_voted' }
    }
    if (!['favor', 'contra', 'abstencao'].includes(voto)) {
      return { ok: false, reason: 'invalid' }
    }
    votos.value = { ...votos.value, [iniciativaId]: voto }
    return { ok: true, voto }
  }

  return {
    user,
    votos,
    isLoggedIn,
    cid,
    loginDemo,
    logout,
    getVoto,
    jaVotou,
    castVoto,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
