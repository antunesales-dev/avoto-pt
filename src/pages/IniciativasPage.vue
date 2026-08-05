<template>
  <div class="page-shell">
    <h1 class="page-title">Iniciativas</h1>
    <p class="page-subtitle">
      Iniciativas da AR com tema e, quando existir no registo oficial, o
      <strong>voto de cada partido</strong> (listado em
      <strong>ordem alfabética por sigla</strong>, não por tamanho de bancada). Login para votar
      como cidadão.
      <router-link to="/como-funciona">Porquê esta ordem?</router-link>
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
      <DateRangeFilter
        v-model="periodo"
        label="Data da votação AR (ou entrada)"
        :options="periodoOpts"
        :count="filtradas.length"
      />
    </div>

    <ListPager
      :page="page"
      :page-size="pageSize"
      :total="total"
      :total-pages="totalPages"
      :range-from="rangeFrom"
      :range-to="rangeTo"
      :page-window="pageWindow"
      :sizes="sizes"
      unit="iniciativas"
      aria-label="Paginação de iniciativas"
      @go="goPage"
      @update:page-size="setPageSize"
    />

    <div v-if="pageItems.length" class="init-grid">
      <InitiativeCard v-for="item in pageItems" :key="item.id" :item="item" />
    </div>
    <div v-else class="av-card av-card-pad">
      <p style="margin: 0; color: var(--pt-muted)">
        Nenhuma iniciativa corresponde aos filtros
        <template v-if="periodo !== 'todos'"> (período: {{ dateRangeLabel(periodo) }})</template
        >.
      </p>
    </div>

    <ListPager
      v-if="totalPages > 1"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :total-pages="totalPages"
      :range-from="rangeFrom"
      :range-to="rangeTo"
      :page-window="pageWindow"
      :sizes="sizes"
      :show-size="false"
      unit="iniciativas"
      aria-label="Paginação de iniciativas (rodapé)"
      @go="goPage"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import DateRangeFilter from '@/components/DateRangeFilter.vue'
import InitiativeCard from '@/components/InitiativeCard.vue'
import ListPager from '@/components/ListPager.vue'
import { usePagination } from '@/composables/usePagination'
import { hasPartyVotes, temas } from '@/data/partidos'
import { dateRangeLabel, matchesDateRange, optionsForContext } from '@/lib/dateRange'
import { useDataStore } from '@/stores/data'

const data = useDataStore()
const query = ref('')
const tema = ref('Todos')
const estado = ref('todos')
const detalhe = ref('com_partidos')
const periodo = ref('todos')

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

/** Data de referência: votação AR; se não houver, data de entrada (para “futuro” / calendário). */
function dataRefIniciativa(i) {
  return i.dataVotacao || i.dataEntrada || null
}

/** Lista base (sem período) — para calcular que chips de data fazem sentido. */
const baseFiltradas = computed(() => {
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

const periodoOpts = computed(() =>
  optionsForContext(
    'iniciativas',
    baseFiltradas.value.map((i) => dataRefIniciativa(i)),
  ),
)

const filtradas = computed(() =>
  baseFiltradas.value.filter((i) => matchesDateRange(dataRefIniciativa(i), periodo.value)),
)

const {
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
} = usePagination(filtradas, { defaultSize: 12 })

function setPageSize(n) {
  pageSize.value = n
}

watch([query, tema, estado, detalhe, periodo], () => resetPage())
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
.init-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  @media (min-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
