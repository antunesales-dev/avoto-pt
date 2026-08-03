<template>
  <div class="page-shell">
    <h1 class="page-title">Despesa pública</h1>
    <p class="page-subtitle">
      Transparência de <strong>spending</strong> do Estado: contratos, linhas orçamentais e
      investimentos registados a partir de fontes oficiais (Base.gov.pt, dados.gov.pt, DGO). A A
      Voto não interpreta nem recomenda — mostra montantes e ligações oficiais.
    </p>

    <div class="notice notice-info" style="margin-bottom: 1.25rem">
      Dados sincronizados de fontes oficiais (<code>despesa-sync</code>). Cada linha indica a
      origem.
    </div>

    <div class="stats-grid" style="margin-bottom: 1.25rem">
      <div class="stat-mini av-card av-card-pad">
        <div class="stat-mini__l">Registos</div>
        <div class="stat-mini__v font-display">{{ formatNumber(finance.despesas.length) }}</div>
      </div>
      <div class="stat-mini av-card av-card-pad">
        <div class="stat-mini__l">Soma montantes (listados)</div>
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

    <div class="av-table-wrap">
      <table class="av-table">
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
          <tr v-for="d in filtradas" :key="d.id">
            <td class="wrap">
              <strong>{{ d.titulo }}</strong>
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
import { computed, onMounted, ref } from 'vue'
import { formatDate, formatNumber } from '@/data/partidos'
import { sourceBadgeClass, sourceLabel } from '@/lib/sources'
import { useFinanceStore } from '@/stores/finance'

const finance = useFinanceStore()
const tipo = ref('todos')

const tipos = [
  { id: 'todos', label: 'Todos' },
  { id: 'contrato_publico', label: 'Contratos' },
  { id: 'investimento_publico', label: 'Investimentos' },
  { id: 'orcamento_linha', label: 'Orçamento' },
  { id: 'outro', label: 'Outro' },
]

const filtradas = computed(() => {
  if (tipo.value === 'todos') return finance.despesas
  return finance.despesas.filter((d) => d.tipo === tipo.value)
})

const totalMontante = computed(() =>
  filtradas.value.reduce((s, d) => s + (Number(d.montante_eur) || 0), 0),
)

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
</style>
