import { computed, ref, watch, unref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * Paginação de listas (cliente).
 * @param {import('vue').Ref|import('vue').ComputedRef|Array} sourceList
 * @param {{ defaultSize?: number, queryPrefix?: string, sizes?: number[] }} opts
 */
export function usePagination(sourceList, opts = {}) {
  const defaultSize = opts.defaultSize ?? 12
  const sizes = opts.sizes ?? [12, 24, 48]
  const queryPrefix = opts.queryPrefix ?? ''
  const pKey = queryPrefix ? `${queryPrefix}p` : 'p'
  const psKey = queryPrefix ? `${queryPrefix}ps` : 'ps'

  const route = useRoute()
  const router = useRouter()

  const page = ref(1)
  const pageSize = ref(defaultSize)

  const list = computed(() => {
    // Aceita Ref, ComputedRef, array Pinia (proxy) ou getter
    let v = typeof sourceList === 'function' ? sourceList() : unref(sourceList)
    // storeToRefs / nested ref edge case
    if (v && !Array.isArray(v) && Array.isArray(v.value)) v = v.value
    return Array.isArray(v) ? v : []
  })

  const total = computed(() => list.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value) || 1))

  const rangeFrom = computed(() => (total.value ? (page.value - 1) * pageSize.value + 1 : 0))
  const rangeTo = computed(() => Math.min(page.value * pageSize.value, total.value))

  const pageItems = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return list.value.slice(start, start + pageSize.value)
  })

  const pageWindow = computed(() => {
    const n = totalPages.value
    const cur = page.value
    if (n <= 9) return Array.from({ length: n }, (_, i) => i + 1)
    const set = new Set([1, n, cur, cur - 1, cur + 1, cur - 2, cur + 2])
    const nums = [...set].filter((p) => p >= 1 && p <= n).sort((a, b) => a - b)
    const out = []
    let prev = 0
    for (const p of nums) {
      if (prev && p - prev > 1) out.push('…')
      out.push(p)
      prev = p
    }
    return out
  })

  function goPage(p, { scroll = true } = {}) {
    const next = Math.min(totalPages.value, Math.max(1, Number(p) || 1))
    page.value = next
    const q = { ...route.query }
    if (next > 1) q[pKey] = String(next)
    else delete q[pKey]
    if (pageSize.value !== defaultSize) q[psKey] = String(pageSize.value)
    else delete q[psKey]
    router.replace({ query: q }).catch(() => {})
    if (scroll && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function resetPage() {
    goPage(1, { scroll: false })
  }

  // hidratar URL
  watch(
    () => route.query,
    (q) => {
      const p = Number(q[pKey])
      if (Number.isFinite(p) && p >= 1) page.value = p
      const ps = Number(q[psKey])
      if (sizes.includes(ps)) pageSize.value = ps
    },
    { immediate: true },
  )

  watch(pageSize, () => goPage(1))

  watch(totalPages, (tp) => {
    if (page.value > tp) goPage(tp, { scroll: false })
  })

  return {
    page,
    pageSize,
    sizes,
    total,
    totalPages,
    rangeFrom,
    rangeTo,
    pageItems,
    pageWindow,
    goPage,
    resetPage,
  }
}
