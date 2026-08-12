<template>
  <div class="page-shell" v-if="item">
    <router-link to="/investimentos" class="back">← Investimentos</router-link>

    <div class="av-card">
      <div class="flag-stripe" aria-hidden="true">
        <span class="flag-stripe__green" />
        <span class="flag-stripe__red" />
      </div>
      <div class="av-card-pad">
        <div class="meta">
          <span class="badge badge--navy">{{ item.sector }}</span>
          <span class="badge" :class="decisaoClass(item.decisao_oficial)">
            Registo: {{ decisaoLabel(item.decisao_oficial) }}
          </span>
          <span class="badge badge--muted">Consulta — sem voto</span>
        </div>
        <h1 class="page-title" style="border: none; padding: 0; margin-top: 0.5rem">
          {{ item.titulo }}
        </h1>
        <p class="money font-display">{{ formatMoney(item.montante_eur) }}</p>
        <p class="ent">{{ item.entidade }} · {{ formatDate(item.data_referencia) }}</p>
        <p class="body">{{ item.descricao }}</p>
        <p v-if="item.decisao_detalhe" class="detalhe">
          <strong>Nota / dados:</strong> {{ item.decisao_detalhe }}
        </p>
        <p class="hint" style="margin-top: 0.85rem">
          Contrato de valor elevado (≥&nbsp;100&nbsp;000&nbsp;€) da mesma fonte que
          <router-link to="/despesa">Despesa</router-link>. O voto cidadão na A Voto é só nas
          <router-link to="/iniciativas">iniciativas da AR</router-link>.
        </p>
        <p v-if="item.despesa_id" class="hint" style="margin-top: 0.5rem">
          Mesmo registo em Despesa:
          <router-link :to="`/despesa/${item.despesa_id}`">abrir ficha de despesa</router-link>
        </p>
      </div>
    </div>

    <section class="av-card" style="margin-top: 1rem">
      <div class="av-card-pad">
        <h2 class="section-title">Fontes e ligações oficiais</h2>
        <p class="hint" style="margin-bottom: 0.75rem">
          Origem:
          <strong>{{ sourceLabel(item.source) }}</strong>.
          O feed do Portal Base (via SNS) não traz URL directa a cada contrato — usamos os portais
          oficiais de consulta.
        </p>
        <ul v-if="sourceLinks.length" class="source-links">
          <li v-for="(l, i) in sourceLinks" :key="i">
            <a :href="l.url" target="_blank" rel="noopener noreferrer">{{ l.label }} ↗</a>
          </li>
        </ul>
        <p v-if="item.despesa_id" class="hint" style="margin-top: 0.85rem">
          Ficha de despesa (mesmo contrato):
          <router-link :to="`/despesa/${item.despesa_id}`">abrir despesa relacionada</router-link>
        </p>
      </div>
    </section>
  </div>
  <div v-else class="page-shell">
    <h1 class="page-title">Investimento não encontrado</h1>
    <router-link to="/investimentos" class="btn btn--primary">Voltar</router-link>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { formatDate } from '@/data/partidos'
import { resolveSourceLinks, sourceLabel } from '@/lib/sources'
import { useFinanceStore } from '@/stores/finance'

const route = useRoute()
const finance = useFinanceStore()

const item = computed(() => finance.getInvestimento(route.params.id))

const sourceLinks = computed(() => {
  const inv = item.value
  if (!inv) return []
  const despesa = inv.despesa_id ? finance.getDespesa(inv.despesa_id) : null
  return resolveSourceLinks(inv, [despesa?.links])
})

watch(
  () => route.params.id,
  async () => {
    if (!finance.investimentos.length) {
      await finance.loadInvestimentos().catch(console.error)
    }
    if (!finance.despesas.length) {
      await finance.loadDespesas().catch(() => {})
    }
    const inv = finance.getInvestimento(route.params.id)
    if (inv?.despesa_id) {
      await finance.ensureDespesa(inv.despesa_id).catch(() => {})
    }
  },
  { immediate: true },
)

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
</script>

<style scoped lang="scss">
.back {
  display: inline-block;
  font-weight: 700;
  margin-bottom: 1rem;
  text-decoration: none;
  color: var(--pt-green-dark);
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.money {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--pt-navy);
  margin: 0.35rem 0;
}
.ent {
  color: var(--pt-muted);
  margin: 0 0 1rem;
}
.body {
  margin: 0 0 0.75rem;
  line-height: 1.55;
}
.detalhe {
  margin: 0;
  font-size: 0.92rem;
  color: var(--pt-muted);
}
.hint {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  color: var(--pt-muted);
  line-height: 1.45;
  a {
    font-weight: 700;
    color: var(--pt-green-dark);
  }
}
.source-links {
  margin: 0;
  padding-left: 1.15rem;
  li {
    margin: 0.4rem 0;
  }
  a {
    font-weight: 700;
    color: var(--pt-green-dark);
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
