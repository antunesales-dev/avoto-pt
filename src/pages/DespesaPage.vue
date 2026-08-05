<template>
  <div class="page-shell">
    <h1 class="page-title">Despesa pública</h1>
    <p class="page-subtitle">
      <strong>Catálogo de consulta</strong> de contratos e despesa do Estado (Portal Base e
      fontes oficiais). Aqui <strong>não se vota</strong> — só se vê montantes, entidades e
      ligações oficiais.
    </p>

    <div class="notice notice-info" style="margin-bottom: 1.25rem">
      <strong>Data = publicação oficial</strong> no Portal Base (não a data em que a A Voto
      sincronizou). Contratos ≥&nbsp;100&nbsp;000&nbsp;€ estão também em
      <router-link to="/investimentos">Investimentos</router-link>
      (voto cidadão). O
      <router-link to="/digest">Resumo do dia</router-link>
      só lista contratos com publicação
      <em>nesse</em> dia. Estado das importações:
      <router-link to="/dados">Fontes de dados</router-link>.
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
      :options="periodoOpts"
      :count="filtradas.length"
      hint="Só períodos com contratos nesta lista. Despesa é retrospectiva — não há filtro “Futuro”."
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

    <p v-if="finance.loading" class="muted">A carregar contratos…</p>
    <div v-else-if="!finance.despesas.length" class="av-card av-card-pad empty-box">
      <p>
        Ainda <strong>não há despesas importadas</strong> nesta base. Quando o job
        <code>despesa-sync</code> correr com sucesso, aparecem aqui com fonte e data de
        publicação oficiais.
      </p>
      <router-link to="/dados" class="btn btn--ghost btn--sm">Ver estado das importações</router-link>
    </div>
    <div v-else-if="!filtradas.length" class="av-card av-card-pad empty-box">
      <p>
        Nenhum registo com o filtro actual (tipo / período). Os contratos existem na base
        ({{ formatNumber(finance.despesas.length) }}) — alargue o período ou escolha “Todos”.
      </p>
    </div>
    <div v-else class="init-grid">
      <router-link
        v-for="d in pageItems"
        :key="d.id"
        :to="`/despesa/${d.id}`"
        class="av-card link-card des-card"
      >
        <div class="flag-stripe" aria-hidden="true">
          <span class="flag-stripe__green" />
          <span class="flag-stripe__red" />
        </div>
        <div class="av-card-pad">
          <div class="meta">
            <span class="badge badge--muted">{{ tipoLabel(d.tipo) }}</span>
            <span v-if="d.categoria" class="badge badge--navy">{{ d.categoria }}</span>
            <span class="badge" :class="sourceBadgeClass(d.source)">
              {{ sourceLabel(d.source) }}
            </span>
          </div>
          <h2 class="des-card__title link-card__title">{{ d.titulo }}</h2>
          <p class="des-card__money font-display">{{ formatMoney(d.montante_eur) }}</p>
          <p class="des-card__ent">{{ d.entidade || '—' }}</p>
          <p class="des-card__src">
            Publicação: {{ formatDate(d.data_publicacao) }}
            · Fonte: {{ sourceLabel(d.source) }}
            <template v-if="primarySourceUrl(d)">
              ·
              <a
                :href="primarySourceUrl(d)"
                target="_blank"
                rel="noopener noreferrer"
                class="des-card__ext"
                @click.stop
              >
                portal oficial ↗
              </a>
            </template>
          </p>
          <div class="des-card__foot">Ver detalhe →</div>
        </div>
      </router-link>
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
import DateRangeFilter from '@/components/DateRangeFilter.vue'
import ListPager from '@/components/ListPager.vue'
import { usePagination } from '@/composables/usePagination'
import { formatDate, formatNumber } from '@/data/partidos'
import { matchesDateRange, optionsForContext } from '@/lib/dateRange'
import { resolveSourceLinks, sourceBadgeClass, sourceLabel } from '@/lib/sources'
import { useFinanceStore } from '@/stores/finance'

const finance = useFinanceStore()
const tipo = ref('todos')
const periodo = ref('todos')

function dataRefDespesa(d) {
  return d.data_publicacao || d.data_inicio || null
}

function primarySourceUrl(d) {
  const links = resolveSourceLinks(d)
  return links[0]?.url || null
}

const tipos = [
  { id: 'todos', label: 'Todos' },
  { id: 'contrato_publico', label: 'Contratos' },
  { id: 'investimento_publico', label: 'Investimentos' },
  { id: 'orcamento_linha', label: 'Orçamento' },
  { id: 'outro', label: 'Outro' },
]

const baseFiltradas = computed(() => {
  if (tipo.value === 'todos') return finance.despesas
  return finance.despesas.filter((d) => d.tipo === tipo.value)
})

const periodoOpts = computed(() =>
  optionsForContext(
    'despesa',
    baseFiltradas.value.map((d) => dataRefDespesa(d)),
  ),
)

const filtradas = computed(() =>
  baseFiltradas.value.filter((d) => matchesDateRange(dataRefDespesa(d), periodo.value)),
)

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
} = usePagination(filtradas, { defaultSize: 12, sizes: [12, 24, 48] })

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
.foot {
  margin-top: 1rem;
  font-size: 0.88rem;
  color: var(--pt-muted);
  a {
    font-weight: 700;
  }
}
.muted {
  color: var(--pt-muted);
  font-weight: 600;
}
.empty-box {
  p {
    margin: 0 0 0.65rem;
    line-height: 1.45;
    color: var(--pt-ink);
  }
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
.des-card__title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  margin: 0 0 0.35rem;
  color: var(--pt-navy);
  line-height: 1.3;
}
.des-card__money {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--pt-navy);
  margin: 0 0 0.25rem;
}
.des-card__ent {
  margin: 0 0 0.35rem;
  font-size: 0.9rem;
  color: var(--pt-muted);
}
.des-card__src {
  margin: 0 0 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--pt-muted);
}
.des-card__ext {
  color: var(--pt-green-dark);
  font-weight: 700;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}
.des-card__foot {
  margin-top: 0.75rem;
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--pt-green-dark);
}
</style>
