<template>
  <div class="page-shell">
    <h1 class="page-title">Investimentos</h1>
    <p class="page-subtitle">
      Grandes investimentos e despesas relevantes. Os cidadãos registados podem
      <strong>aprovar</strong>, <strong>rejeitar</strong> ou <strong>abster-se</strong> — um voto
      por item, definitivo. Comparação com a <strong>decisão oficial</strong> quando existir nos
      dados do Estado. Não é voto vinculativo.
    </p>

    <ListPager
      :page="page"
      :page-size="pageSize"
      :total="total"
      :total-pages="totalPages"
      :range-from="rangeFrom"
      :range-to="rangeTo"
      :page-window="pageWindow"
      :sizes="sizes"
      unit="investimentos"
      @go="goPage"
      @update:page-size="setPageSize"
    />

    <div v-if="pageItems.length" class="init-grid">
      <router-link
        v-for="inv in pageItems"
        :key="inv.id"
        :to="`/investimentos/${inv.id}`"
        class="av-card link-card inv-card"
      >
        <div class="flag-stripe" aria-hidden="true">
          <span class="flag-stripe__green" />
          <span class="flag-stripe__red" />
        </div>
        <div class="av-card-pad">
          <div class="meta">
            <span class="badge badge--navy">{{ inv.sector || 'Geral' }}</span>
            <span class="badge" :class="decisaoClass(inv.decisao_oficial)">
              Oficial: {{ decisaoLabel(inv.decisao_oficial) }}
            </span>
            <span class="badge" :class="sourceBadgeClass(inv.source)">
              {{ sourceLabel(inv.source) }}
            </span>
          </div>
          <h2 class="inv-card__title link-card__title">{{ inv.titulo }}</h2>
          <p class="inv-card__money font-display">{{ formatMoney(inv.montante_eur) }}</p>
          <p class="inv-card__ent">{{ inv.entidade }}</p>
          <VoteBar :votos="inv.votosCidadaos" :show-counts="false" />
          <div class="inv-card__foot">Ver e votar →</div>
        </div>
      </router-link>
    </div>
    <div v-else class="av-card av-card-pad">
      <p style="margin: 0; color: var(--pt-muted)">Ainda não há investimentos na base.</p>
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
      unit="investimentos"
      @go="goPage"
    />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import ListPager from '@/components/ListPager.vue'
import VoteBar from '@/components/VoteBar.vue'
import { usePagination } from '@/composables/usePagination'
import { sourceBadgeClass, sourceLabel } from '@/lib/sources'
import { useFinanceStore } from '@/stores/finance'

const finance = useFinanceStore()
const list = computed(() => finance.investimentos)

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
} = usePagination(list, { defaultSize: 12 })

function setPageSize(n) {
  pageSize.value = n
}

function formatMoney(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(n))
}

function decisaoLabel(d) {
  const m = {
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
    em_curso: 'Em curso',
    nao_aplicavel: 'N/A',
    desconhecido: 'Desconhecido',
  }
  return m[d] || d
}

function decisaoClass(d) {
  if (d === 'aprovado') return 'badge--green'
  if (d === 'rejeitado') return 'badge--red'
  if (d === 'em_curso') return 'badge--gold'
  return 'badge--muted'
}

onMounted(() => finance.loadInvestimentos().catch(console.error))
</script>

<style scoped lang="scss">
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
  margin: 0 0 0.85rem;
  font-size: 0.9rem;
  color: var(--pt-muted);
}
.inv-card__foot {
  margin-top: 0.75rem;
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--pt-green-dark);
}
</style>
