import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'

function normalizePaymentUrl(u) {
  const s = typeof u === 'string' ? u.trim() : ''
  if (!s) return ''
  if (!/^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com)\//i.test(s)) {
    // aceitar outros https seguros (fallback)
    if (s.startsWith('https://')) return s
    return ''
  }
  return s
}

/**
 * Financiamento público: doações + link de pagamento (env ou site_settings).
 * Doar não exige login.
 */
export const useFinancePublicStore = defineStore('financePublic', () => {
  const donations = ref([])
  const resumo = ref({
    total_in: 0,
    n_donations: 0,
  })
  const paymentLinkFromDb = ref('')
  const loading = ref(false)
  const error = ref(null)

  const paymentLink = computed(() => {
    const fromDb = normalizePaymentUrl(paymentLinkFromDb.value)
    if (fromDb) return fromDb
    return normalizePaymentUrl(import.meta.env.VITE_STRIPE_PAYMENT_LINK_URL || '')
  })

  const canDonate = computed(() => Boolean(paymentLink.value))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const [led, sum, settings] = await Promise.all([
        supabase.rpc('list_donations_ledger'),
        supabase.rpc('financiamento_resumo'),
        supabase
          .from('site_settings')
          .select('stripe_payment_link_url')
          .eq('id', 1)
          .maybeSingle(),
      ])
      if (led.error) throw led.error
      if (sum.error) throw sum.error
      // settings: se a tabela ainda não existir em algum ambiente, não rebentar a página
      if (!settings.error && settings.data) {
        paymentLinkFromDb.value = settings.data.stripe_payment_link_url || ''
      }
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
    canDonate,
    load,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFinancePublicStore, import.meta.hot))
}
