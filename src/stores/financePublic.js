import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'

/**
 * Financiamento público: doações + saídas (infra / maintainer).
 */
export const useFinancePublicStore = defineStore('financePublic', () => {
  const donations = ref([])
  const outflows = ref([])
  const resumo = ref({
    total_in: 0,
    total_out_infra: 0,
    total_out_maintainer: 0,
    total_out: 0,
    balance: 0,
    n_donations: 0,
    n_outflows: 0,
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
      const [led, out, sum] = await Promise.all([
        supabase.rpc('list_donations_ledger'),
        supabase
          .from('project_outflows')
          .select('id, amount_eur, spent_on, kind, label, created_at')
          .order('spent_on', { ascending: false })
          .limit(200),
        supabase.rpc('financiamento_resumo'),
      ])
      if (led.error) throw led.error
      if (out.error) throw out.error
      if (sum.error) throw sum.error
      donations.value = led.data || []
      outflows.value = out.data || []
      resumo.value = {
        total_in: Number(sum.data?.total_in ?? 0),
        total_out_infra: Number(sum.data?.total_out_infra ?? 0),
        total_out_maintainer: Number(sum.data?.total_out_maintainer ?? 0),
        total_out: Number(sum.data?.total_out ?? 0),
        balance: Number(sum.data?.balance ?? 0),
        n_donations: Number(sum.data?.n_donations ?? 0),
        n_outflows: Number(sum.data?.n_outflows ?? 0),
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
    outflows,
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
