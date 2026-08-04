<template>
  <div class="page-shell">
    <h1 class="page-title">Investimentos</h1>
    <p class="page-subtitle">
      <strong>Contratos de valor elevado</strong> (≥&nbsp;100&nbsp;000&nbsp;€), retirados da
      mesma fonte oficial de despesa, onde os cidadãos registados podem
      <strong>aprovar</strong>, <strong>rejeitar</strong> ou <strong>abster-se</strong> — um voto
      por item, definitivo. Não é uma lista diferente de “outra despesa”: é o subconjunto em
      que há voto. Não é vinculativo.
    </p>

    <div class="notice notice-info" style="margin-bottom: 1.25rem">
      Lista completa de contratos (incluindo valores menores):
      <router-link to="/despesa">Despesa pública</router-link>.
      Boletim diário (sem repetir tudo):
      <router-link to="/digest">Resumo do dia</router-link>.
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
      unit="investimentos"
      aria-label="Paginação de investimentos"
      @go="goPage"
      @update:page-size="setPageSize"
    />

    <p v-if="loading" class="muted">A carregar investimentos…</p>

    <div v-else-if="pageItems.length" class="init-grid">
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
          <p class="inv-card__src">
            Fonte: {{ sourceLabel(inv.source) }}
            <template v-if="primarySourceUrl(inv)">
              ·
              <a
                :href="primarySourceUrl(inv)"
                target="_blank"
                rel="noopener noreferrer"
                class="inv-card__ext"
                @click.stop
              >
                portal oficial ↗
              </a>
            </template>
          </p>
          <VoteBar :votos="inv.votosCidadaos" :show-counts="false" />
          <div class="inv-card__foot">Ver detalhe e votar →</div>
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
      aria-label="Paginação de investimentos (rodapé)"
      @go="goPage"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import ListPager from '@/components/ListPager.vue'
import VoteBar from '@/components/VoteBar.vue'
import { usePagination } from '@/composables/usePagination'
import { resolveSourceLinks, sourceBadgeClass, sourceLabel } from '@/lib/sources'
import { useFinanceStore } from '@/stores/finance'

const finance = useFinanceStore()
const { investimentos } = storeToRefs(finance)
const loading = ref(true)

// toRef/storeToRefs garante reactividade da lista no usePagination
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
} = usePagination(investimentos, {
  defaultSize: 12,
  sizes: [12, 24, 48],
  queryPrefix: 'inv',
})

function setPageSize(n) {
  pageSize.value = Number(n) || 12
}

function formatMoney(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(n))
}

function primarySourceUrl(inv) {
  return resolveSourceLinks(inv)[0]?.url || null
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

onMounted(async () => {
  loading.value = true
  try {
    await finance.loadInvestimentos()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.muted {
  color: var(--pt-muted);
  font-weight: 600;
  margin: 0 0 1rem;
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
