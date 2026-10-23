<template>
  <div class="page-shell">
    <h1 class="page-title">Contratos ≥&nbsp;100&nbsp;000&nbsp;€</h1>
    <p class="page-subtitle">
      Uma vista de <router-link to="/despesa">Despesa</router-link>: os mesmos contratos do
      Portal Base, só os de valor igual ou superior a 100&nbsp;000&nbsp;€. Não é outra fonte
      nem outra lista de investimentos. A data é a de publicação no portal.
    </p>

    <div class="stats-grid" style="margin-bottom: 1.25rem">
      <div class="stat-mini av-card av-card-pad">
        <div class="stat-mini__l">Contratos (filtro)</div>
        <div class="stat-mini__v font-display">{{ formatNumber(total) }}</div>
      </div>
      <div class="stat-mini av-card av-card-pad">
        <div class="stat-mini__l">Soma montantes (filtro)</div>
        <div class="stat-mini__v font-display">{{ formatMoney(totalMontante) }}</div>
      </div>
    </div>

    <DateRangeFilter
      v-model="periodo"
      label="Data de publicação"
      :options="periodoOpts"
      :count="filtrados.length"
      style="margin-bottom: 1rem"
    />
    <div class="filter-row ordem-row" role="group" aria-label="Ordenar contratos">
      <span class="ordem-row__l">Ordenar</span>
      <button
        v-for="o in ORDEM_OPCOES"
        :key="o.id"
        type="button"
        class="chip-btn"
        :class="{ 'is-active': ordem === o.id }"
        :aria-pressed="ordem === o.id"
        @click="ordem = o.id"
      >
        {{ o.label }}
      </button>
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
      unit="contratos"
      aria-label="Paginação de contratos"
      @go="goPage"
      @update:page-size="setPageSize"
    />

    <p v-if="loading" class="muted">A carregar contratos…</p>

    <div v-else-if="pageItems.length" class="init-grid">
      <router-link
        v-for="d in pageItems"
        :key="d.id"
        :to="`/despesa/${d.id}`"
        class="av-card link-card inv-card"
      >
        <div class="flag-stripe" aria-hidden="true">
          <span class="flag-stripe__green" />
          <span class="flag-stripe__red" />
        </div>
        <div class="av-card-pad">
          <div class="meta">
            <span class="badge badge--navy">{{ d.categoria || 'Contrato público' }}</span>
            <span class="badge" :class="sourceBadgeClass(d.source)">
              {{ sourceLabel(d.source) }}
            </span>
          </div>
          <h2 class="inv-card__title link-card__title">{{ d.titulo }}</h2>
          <p class="inv-card__money font-display">{{ formatMoney(d.montante_eur) }}</p>
          <p class="inv-card__ent">{{ d.entidade || '—' }}</p>
          <p class="inv-card__src">
            Publicado a {{ formatDate(d.data_publicacao) }}
            <template v-if="primarySourceUrl(d)">
              ·
              <a
                :href="primarySourceUrl(d)"
                target="_blank"
                rel="noopener noreferrer"
                class="inv-card__ext"
                @click.stop
              >
                portal oficial ↗
              </a>
            </template>
          </p>
          <div class="inv-card__foot">Ver contrato →</div>
        </div>
      </router-link>
    </div>
    <div v-else class="av-card av-card-pad empty-box">
      <p v-if="!contratos.length" style="margin: 0 0 0.65rem">
        Ainda <strong>não há contratos</strong> de 100&nbsp;000&nbsp;€ ou mais importados.
        Quando o sync de despesa trouxer contratos do Portal Base acima desse valor,
        aparecem aqui e em Despesa.
      </p>
      <p v-else style="margin: 0 0 0.65rem">
        Nenhum contrato neste período (há {{ formatNumber(contratos.length) }} no total).
        Alargue o filtro de datas.
      </p>
      <router-link to="/dados" class="btn btn--ghost btn--sm">Ver estado das importações</router-link>
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
      unit="contratos"
      aria-label="Paginação de contratos (rodapé)"
      @go="goPage"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import DateRangeFilter from '@/components/DateRangeFilter.vue'
import ListPager from '@/components/ListPager.vue'
import { usePagination } from '@/composables/usePagination'
import { formatDate } from '@/data/partidos'
import { isContratoGrande } from '@/lib/contratos'
import { matchesDateRange, optionsForContext } from '@/lib/dateRange'
import { ORDEM_DATA, ORDEM_OPCOES, ordenarPorDataOuValor } from '@/lib/ordenar'
import { resolveSourceLinks, sourceBadgeClass, sourceLabel } from '@/lib/sources'
import { useFinanceStore } from '@/stores/finance'

defineOptions({ name: 'ContratosPage' })

const finance = useFinanceStore()
const loading = ref(!finance.despesas.length)
const periodo = ref('todos')
const ordem = ref(ORDEM_DATA)

/** Vista de Despesa: mesmos registos, só montante ≥ limiar. */
const contratos = computed(() => (finance.despesas || []).filter(isContratoGrande))

const periodoOpts = computed(() =>
  optionsForContext(
    'investimentos',
    contratos.value.map((d) => d.data_publicacao),
  ),
)

const filtrados = computed(() =>
  contratos.value.filter((d) => matchesDateRange(d.data_publicacao, periodo.value)),
)

const totalMontante = computed(() =>
  filtrados.value.reduce((s, d) => s + (Number(d.montante_eur) || 0), 0),
)

/** Ordena antes de paginar; a data é a de publicação (a que o cartão mostra e o filtro usa). */
const ordenados = computed(() =>
  ordenarPorDataOuValor(filtrados.value, ordem.value, (d) => d.data_publicacao),
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
} = usePagination(ordenados, {
  defaultSize: 12,
  sizes: [12, 24, 48],
  queryPrefix: 'inv',
})

watch([periodo, ordem], () => resetPage())

function setPageSize(n) {
  pageSize.value = Number(n) || 12
}

function formatNumber(n) {
  return new Intl.NumberFormat('pt-PT').format(Number(n) || 0)
}

function formatMoney(n) {
  if (n == null || n === '') return '—'
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(n))
}

function primarySourceUrl(d) {
  return resolveSourceLinks(d)[0]?.url || null
}


onMounted(async () => {
  if (finance.despesas.length) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    await finance.loadDespesas()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
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
.ordem-row {
  align-items: center;
  margin-bottom: 1rem;
}
.ordem-row__l {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pt-muted);
  margin-right: 0.25rem;
}
.muted {
  color: var(--pt-muted);
  font-weight: 600;
  margin: 0 0 1rem;
}
.empty-box {
  code {
    font-family: var(--font-mono);
    font-size: 0.85rem;
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
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.65rem;
}
.inv-card__title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  margin: 0 0 0.35rem;
  color: var(--pt-navy);
}
.inv-card__money {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--pt-navy);
  margin: 0 0 0.25rem;
}
.inv-card__ent {
  margin: 0 0 0.35rem;
  font-size: 0.9rem;
  color: var(--pt-muted);
}
.inv-card__src {
  margin: 0 0 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--pt-muted);
}
.inv-card__ext {
  color: var(--pt-green-dark);
  font-weight: 700;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}
.inv-card__foot {
  margin-top: 0.75rem;
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--pt-green-dark);
}
</style>
