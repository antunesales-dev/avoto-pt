<template>
  <div class="page-shell">
    <h1 class="page-title">Despesa pública</h1>
    <p class="page-subtitle">
      <strong>Catálogo de consulta</strong> de contratos e despesa do Estado (Portal Base e
      fontes oficiais). Aqui <strong>não se vota</strong> — só se vê montantes, entidades e
      ligações oficiais.
    </p>

    <div class="notice notice-info" style="margin-bottom: 1.25rem">
      Os contratos de valor elevado (≥&nbsp;100&nbsp;000&nbsp;€) aparecem também em
      <router-link to="/investimentos">Investimentos</router-link>, onde os cidadãos registados
      podem dar um sentido de voto. O
      <router-link to="/digest">Resumo do dia</router-link>
      só junta destaques do dia — não é uma terceira lista completa.
    </div>

    <div class="stats-grid" style="margin-bottom: 1.25rem">
      <div class="stat-mini av-card av-card-pad">
        <div class="stat-mini__l">Registos (filtro)</div>
        <div class="stat-mini__v font-display">{{ formatNumber(total) }}</div>
      </div>
      <div class="stat-mini av-card av-card-pad">
        <div class="stat-mini__l">Soma montantes (filtro)</div>
        <div class="stat-mini__v font-display">{{ formatMoney(totalMontante) }}</div>
      </div>
    </div>

    <div class="filter-row">
      <button
        v-for="t in tipos"
        :key="t.id"
        type="button"
        class="chip-btn"
        :class="{ 'is-active': tipo === t.id }"
        @click="tipo = t.id"
      >
        {{ t.label }}
      </button>
    </div>
    <DateRangeFilter
      v-model="periodo"
      label="Data de publicação"
      :count="filtradas.length"
      style="margin-bottom: 1rem"
    />

    <ListPager
      :page="page"
      :page-size="pageSize"
      :total="total"
      :total-pages="totalPages"
      :range-from="rangeFrom"
      :range-to="rangeTo"
      :page-window="pageWindow"
      :sizes="sizes"
      unit="despesas"
      @go="goPage"
      @update:page-size="setPageSize"
    />

    <p class="list-hint">Clique numa linha para ver o detalhe, ligações oficiais e, se aplicável, voto.</p>

    <div class="av-table-wrap">
      <table class="av-table av-table--clickable">
        <thead>
          <tr>
            <th>Título</th>
            <th>Entidade</th>
            <th>Tipo</th>
            <th>Montante</th>
            <th>Data</th>
            <th>Fonte</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="d in pageItems"
            :key="d.id"
            class="row-link"
            tabindex="0"
            role="link"
            :aria-label="`Ver detalhe: ${d.titulo}`"
            @click="goDetail(d.id)"
            @keydown.enter.prevent="goDetail(d.id)"
            @keydown.space.prevent="goDetail(d.id)"
          >
            <td class="wrap">
              <strong class="title-link">{{ d.titulo }}</strong>
              <div class="sub">{{ d.categoria }}</div>
            </td>
            <td class="wrap">{{ d.entidade }}</td>
            <td><span class="badge badge--muted">{{ tipoLabel(d.tipo) }}</span></td>
            <td>{{ formatMoney(d.montante_eur) }}</td>
            <td>{{ formatDate(d.data_publicacao) }}</td>
            <td>
              <span class="badge" :class="sourceBadgeClass(d.source)">
                {{ sourceLabel(d.source) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
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
      unit="despesas"
      @go="goPage"
    />

    <p class="foot">
      Fontes oficiais:
      <a href="https://www.base.gov.pt" target="_blank" rel="noopener noreferrer">Base.gov.pt</a>
      ·
      <a href="https://dados.gov.pt" target="_blank" rel="noopener noreferrer">dados.gov.pt</a>
      ·
      <a href="https://www.dgo.gov.pt" target="_blank" rel="noopener noreferrer">DGO</a>
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import DateRangeFilter from '@/components/DateRangeFilter.vue'
import ListPager from '@/components/ListPager.vue'
import { usePagination } from '@/composables/usePagination'
import { formatDate, formatNumber } from '@/data/partidos'
import { matchesDateRange } from '@/lib/dateRange'
import { sourceBadgeClass, sourceLabel } from '@/lib/sources'
import { useFinanceStore } from '@/stores/finance'

const finance = useFinanceStore()
const router = useRouter()
const tipo = ref('todos')
const periodo = ref('todos')

function goDetail(id) {
  if (!id) return
  router.push({ name: 'despesa-detalhe', params: { id } })
}

const tipos = [
  { id: 'todos', label: 'Todos' },
  { id: 'contrato_publico', label: 'Contratos' },
  { id: 'investimento_publico', label: 'Investimentos' },
  { id: 'orcamento_linha', label: 'Orçamento' },
  { id: 'outro', label: 'Outro' },
]

const filtradas = computed(() => {
  return finance.despesas.filter((d) => {
    if (tipo.value !== 'todos' && d.tipo !== tipo.value) return false
    if (!matchesDateRange(d.data_publicacao || d.data_inicio, periodo.value)) return false
    return true
  })
})

const totalMontante = computed(() =>
  filtradas.value.reduce((s, d) => s + (Number(d.montante_eur) || 0), 0),
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
} = usePagination(filtradas, { defaultSize: 20, sizes: [10, 20, 50] })

function setPageSize(n) {
  pageSize.value = n
}

function tipoLabel(t) {
  return tipos.find((x) => x.id === t)?.label || t
}

function formatMoney(n) {
  if (n == null || n === '') return '—'
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(n))
}

watch([tipo, periodo], () => resetPage())
onMounted(() => finance.loadDespesas().catch(console.error))
</script>

<style scoped lang="scss">
.stats-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr 1fr;
}
.stat-mini__l {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pt-muted);
}
.stat-mini__v {
  font-size: 1.35rem;
  margin-top: 0.25rem;
  color: var(--pt-navy);
}
.wrap {
  white-space: normal;
  max-width: 18rem;
}
.sub {
  font-size: 0.8rem;
  color: var(--pt-muted);
  font-weight: 500;
}
.foot {
  margin-top: 1rem;
  font-size: 0.88rem;
  color: var(--pt-muted);
  a {
    font-weight: 700;
  }
}
.list-hint {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--pt-muted);
}
.row-link {
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover,
  &:focus-visible {
    background: var(--pt-paper-2);
    outline: none;
  }

  .title-link {
    color: var(--pt-green-dark);
  }
}
</style>
