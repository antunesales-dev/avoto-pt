import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'

/**
 * Financiamento público: só doações (entradas) por agora.
 */
export const useFinancePublicStore = defineStore('financePublic', () => {
  const donations = ref([])
  const resumo = ref({
    total_in: 0,
    n_donations: 0,
  })
  const loading = ref(false)
  const error = ref(null)

  const paymentLink = computed(() => {
    const u = import.meta.env.VITE_STRIPE_PAYMENT_LINK_URL || ''
    return typeof u === 'string' && u.startsWith('https://') ? u : ''
  })

  async function load() {
    loading.value = true
    error.value = null
    try {
      const [led, sum] = await Promise.all([
        supabase.rpc('list_donations_ledger'),
        supabase.rpc('financiamento_resumo'),
      ])
      if (led.error) throw led.error
      if (sum.error) throw sum.error
      donations.value = led.data || []
      resumo.value = {
        total_in: Number(sum.data?.total_in ?? 0),
        n_donations: Number(sum.data?.n_donations ?? 0),
      }
    } catch (e) {
      error.value = e.message || String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    donations,
    resumo,
    loading,
    error,
    paymentLink,
    load,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFinancePublicStore, import.meta.hot))
}
