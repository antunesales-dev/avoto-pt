<template>
  <div class="page-shell">
    <h1 class="page-title">Iniciativas</h1>
    <p class="page-subtitle">
      Iniciativas da AR com tema e, quando existir no registo oficial, o
      <strong>voto de cada partido</strong>. Login para votar como cidadão.
    </p>

    <div class="toolbar av-card av-card-pad">
      <label class="search">
        <q-icon name="search" size="20px" />
        <input
          v-model="query"
          type="search"
          placeholder="Pesquisar por título, número ou tema…"
          aria-label="Pesquisar iniciativas"
        />
      </label>
      <div class="filter-row" style="margin: 0">
        <button
          v-for="d in detalheOpts"
          :key="d.id"
          type="button"
          class="chip-btn"
          :class="{ 'is-active': detalhe === d.id }"
          @click="detalhe = d.id"
        >
          {{ d.label }}
        </button>
      </div>
      <div class="filter-row" style="margin: 0">
        <button
          v-for="t in temas"
          :key="t"
          type="button"
          class="chip-btn"
          :class="{ 'is-active': tema === t }"
          @click="tema = t"
        >
          {{ t }}
        </button>
      </div>
      <div class="filter-row" style="margin: 0">
        <button
          v-for="e in estados"
          :key="e.id"
          type="button"
          class="chip-btn"
          :class="{ 'is-active': estado === e.id }"
          @click="estado = e.id"
        >
          {{ e.label }}
        </button>
      </div>
    </div>

    <div class="results-bar">
      <p class="results-count">
        <template v-if="total">
          A mostrar <strong>{{ rangeFrom }}–{{ rangeTo }}</strong> de
          <strong>{{ total }}</strong>
          {{ total === 1 ? 'iniciativa' : 'iniciativas' }}
          · página {{ page }} / {{ totalPages }}
        </template>
        <template v-else>Nenhuma iniciativa</template>
      </p>
      <label class="page-size">
        Por página
        <select v-model.number="pageSize" aria-label="Resultados por página">
          <option :value="12">12</option>
          <option :value="24">24</option>
          <option :value="48">48</option>
        </select>
      </label>
    </div>

    <div v-if="pageItems.length" class="init-grid">
      <InitiativeCard v-for="item in pageItems" :key="item.id" :item="item" />
    </div>
    <div v-else class="av-card av-card-pad">
      <p style="margin: 0; color: var(--pt-muted)">Nenhuma iniciativa corresponde aos filtros.</p>
    </div>

    <nav v-if="totalPages > 1" class="pager" aria-label="Paginação de iniciativas">
      <button
        type="button"
        class="btn btn--outline btn--sm"
        :disabled="page <= 1"
        @click="goPage(1)"
      >
        «
      </button>
      <button
        type="button"
        class="btn btn--outline btn--sm"
        :disabled="page <= 1"
        @click="goPage(page - 1)"
      >
        Anterior
      </button>

      <button
        v-for="p in pageWindow"
        :key="p"
        type="button"
        class="pager__num"
        :class="{ 'is-active': p === page, 'is-ellipsis': p === '…' }"
        :disabled="p === '…'"
        @click="p !== '…' && goPage(p)"
      >
        {{ p }}
      </button>

      <button
        type="button"
        class="btn btn--outline btn--sm"
        :disabled="page >= totalPages"
        @click="goPage(page + 1)"
      >
        Seguinte
      </button>
      <button
        type="button"
        class="btn btn--outline btn--sm"
        :disabled="page >= totalPages"
        @click="goPage(totalPages)"
      >
        »
      </button>
    </nav>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InitiativeCard from '@/components/InitiativeCard.vue'
import { hasPartyVotes, temas } from '@/data/partidos'
import { useDataStore } from '@/stores/data'

const data = useDataStore()
const route = useRoute()
const router = useRouter()

const query = ref('')
const tema = ref('Todos')
const estado = ref('todos')
/** Por defeito: só as que têm votos de partidos (o resto é ruído sem detalhe) */
const detalhe = ref('com_partidos')
const page = ref(1)
const pageSize = ref(12)

const detalheOpts = [
  { id: 'com_partidos', label: 'Com voto dos partidos' },
  { id: 'com_votacao', label: 'Com data de votação AR' },
  { id: 'todas', label: 'Todas' },
]

const estados = [
  { id: 'todos', label: 'Todos os estados' },
  { id: 'em_discussao', label: 'Em discussão' },
  { id: 'aprovado', label: 'Aprovado' },
  { id: 'rejeitado', label: 'Rejeitado' },
]

const filtradas = computed(() => {
  const q = query.value.trim().toLowerCase()
  return data.iniciativas.filter((i) => {
    if (detalhe.value === 'com_partidos' && !hasPartyVotes(i.resultadoPartidos)) return false
    if (detalhe.value === 'com_votacao' && !i.dataVotacao) return false
    if (tema.value !== 'Todos' && i.tema !== tema.value) return false
    if (estado.value !== 'todos' && i.estado !== estado.value) return false
    if (!q) return true
    return (
      i.titulo.toLowerCase().includes(q) ||
      i.idOficial.toLowerCase().includes(q) ||
      i.tema.toLowerCase().includes(q) ||
      i.tipo.toLowerCase().includes(q)
    )
  })
})

const total = computed(() => filtradas.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const rangeFrom = computed(() => (total.value ? (page.value - 1) * pageSize.value + 1 : 0))
const rangeTo = computed(() => Math.min(page.value * pageSize.value, total.value))

const pageItems = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtradas.value.slice(start, start + pageSize.value)
})

/** Janela de números de página com reticências */
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

function goPage(p) {
  const next = Math.min(totalPages.value, Math.max(1, Number(p) || 1))
  page.value = next
  router.replace({
    query: {
      ...route.query,
      p: next > 1 ? String(next) : undefined,
      ps: pageSize.value !== 12 ? String(pageSize.value) : undefined,
    },
  })
  // topo da lista (não do site inteiro se nav fixa)
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Reset página quando filtros mudam
watch([query, tema, estado, detalhe], () => {
  if (page.value !== 1) goPage(1)
  else {
    // limpar ?p da URL se estivermos na 1
    if (route.query.p) {
      router.replace({
        query: { ...route.query, p: undefined },
      })
    }
  }
})

watch(pageSize, () => {
  goPage(1)
})

// hidratar da URL
watch(
  () => route.query,
  (q) => {
    const p = Number(q.p)
    if (Number.isFinite(p) && p >= 1) page.value = p
    const ps = Number(q.ps)
    if (ps === 12 || ps === 24 || ps === 48) pageSize.value = ps
  },
  { immediate: true },
)

// se totalPages encolher (filtros), clamp
watch(totalPages, (tp) => {
  if (page.value > tp) goPage(tp)
})
</script>

<style scoped lang="scss">
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-bottom: 1rem;
}
.search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--pt-border);
  border-radius: 10px;
  padding: 0.55rem 0.85rem;
  background: var(--pt-cream);
  color: var(--pt-muted);
  input {
    flex: 1;
    border: none;
    background: transparent;
    font-family: var(--font-body);
    font-size: 0.98rem;
    color: var(--pt-ink);
    outline: none;
  }
}
.results-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 1rem;
  margin: 0 0 0.85rem;
}
.results-count {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--pt-muted);
  margin: 0;
}
.page-size {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--pt-muted);
  select {
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 600;
    padding: 0.3rem 0.45rem;
    border: 1px solid var(--pt-border);
    border-radius: 6px;
    background: var(--pt-cream);
    color: var(--pt-navy);
  }
}
.init-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  @media (min-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
}
.pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 1.5rem 0 0.5rem;
}
.pager__num {
  min-width: 2.25rem;
  height: 2.25rem;
  padding: 0 0.45rem;
  border: 1.5px solid var(--pt-border);
  border-radius: 6px;
  background: #fff;
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--pt-navy);
  cursor: pointer;
  &:hover:not(:disabled) {
    border-color: var(--pt-green);
  }
  &.is-active {
    background: var(--pt-green);
    border-color: var(--pt-green);
    color: #fff;
  }
  &.is-ellipsis {
    border: none;
    background: transparent;
    cursor: default;
    min-width: 1.25rem;
  }
  &:disabled:not(.is-ellipsis) {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
</style>
