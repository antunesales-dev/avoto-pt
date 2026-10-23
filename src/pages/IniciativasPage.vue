<template>
  <div class="page-shell">
    <h1 class="page-title">Iniciativas</h1>
    <p class="page-subtitle">
      Iniciativas da AR — tema e, quando existir, o voto oficial de cada partido (por ordem
      alfabética de sigla). Login para votar.
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
      <div class="filter-row toggles" style="margin: 0">
        <label class="toggle">
          <input v-model="agrupar" type="checkbox" />
          Agrupar por dossiê (iniciativas discutidas em conjunto ou com o mesmo título)
        </label>
        <label class="toggle">
          <input v-model="mostrarProcedimentos" type="checkbox" />
          Mostrar procedimentos internos ({{ nProcedimentos }}: prazos de comissões de inquérito,
          deslocações do PR, urgências…)
        </label>
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
      <InitiativeCard
        v-for="item in pageItems"
        :key="item.id"
        :item="item"
        :dossie-count="agrupar ? (dossieCounts[item.dossieId] || 1) - 1 : 0"
      />
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
const agrupar = ref(true)
const mostrarProcedimentos = ref(false)

const detalheOpts = [
  { id: 'com_partidos', label: 'Com voto dos partidos' },
  { id: 'com_votacao', label: 'Com data de votação AR' },
  { id: 'todas', label: 'Todas' },
]

const estados = [
  { id: 'todos', label: 'Todos os estados' },
  { id: 'em_discussao', label: 'Em discussão' },
  { id: 'aprovado_generalidade', label: 'Aprovado na generalidade' },
  { id: 'aprovado', label: 'Aprovado (votação final)' },
  { id: 'rejeitado', label: 'Rejeitado' },
  { id: 'retirado', label: 'Retirado' },
]

const nProcedimentos = computed(() => data.iniciativas.filter((i) => i.procedimento).length)

/** Data de referência: votação AR; se não houver, data de entrada (para “futuro” / calendário). */
function dataRefIniciativa(i) {
  return i.dataVotacao || i.dataEntrada || null
}

/** Lista base (sem período) — para calcular que chips de data fazem sentido. */
const baseFiltradas = computed(() => {
  const q = query.value.trim().toLowerCase()
  return data.iniciativas.filter((i) => {
    if (!mostrarProcedimentos.value && i.procedimento) return false
    if (detalhe.value === 'com_partidos' && !hasPartyVotes(i.resultadoPartidos)) return false
    if (detalhe.value === 'com_votacao' && !i.dataVotacao) return false
    if (tema.value !== 'Todos' && i.tema !== tema.value) return false
    if (estado.value !== 'todos' && i.estado !== estado.value) return false
    if (!q) return true
    return (
      i.titulo.toLowerCase().includes(q) ||
      i.idOficial.toLowerCase().includes(q) ||
      i.tema.toLowerCase().includes(q) ||
      i.tipo.toLowerCase().includes(q) ||
      (i.autores || []).some((a) => a.toLowerCase().includes(q))
    )
  })
})

const periodoOpts = computed(() =>
  optionsForContext(
    'iniciativas',
    baseFiltradas.value.map((i) => dataRefIniciativa(i)),
  ),
)

const filtradasSemGrupo = computed(() =>
  baseFiltradas.value.filter((i) => matchesDateRange(dataRefIniciativa(i), periodo.value)),
)

/** Nº de iniciativas (já filtradas) por dossiê. */
const dossieCounts = computed(() => {
  const out = {}
  for (const i of filtradasSemGrupo.value) if (i.dossieId) out[i.dossieId] = (out[i.dossieId] || 0) + 1
  return out
})

/**
 * Agrupado: um cartão por dossiê — a primeira iniciativa na ordem da lista
 * (votação AR mais recente). As restantes aparecem na ficha, em “Mesmo dossiê”.
 */
const filtradas = computed(() => {
  if (!agrupar.value) return filtradasSemGrupo.value
  const seen = new Set()
  return filtradasSemGrupo.value.filter((i) => {
    if (!i.dossieId) return true
    if (seen.has(i.dossieId)) return false
    seen.add(i.dossieId)
    return true
  })
})

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

watch([query, tema, estado, detalhe, periodo, agrupar, mostrarProcedimentos], () => resetPage())
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
.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--pt-muted);
  cursor: pointer;
  input {
    accent-color: var(--pt-green);
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
