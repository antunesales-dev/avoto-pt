<template>
  <div v-if="loading" class="page-shell">
    <p class="muted">A carregar despesa…</p>
  </div>

  <div v-else-if="item" class="page-shell">
    <router-link to="/despesa" class="back">← Despesa pública</router-link>

    <div class="av-card">
      <div class="flag-stripe" aria-hidden="true">
        <span class="flag-stripe__green" />
        <span class="flag-stripe__red" />
      </div>
      <div class="av-card-pad">
        <div class="meta">
          <span class="badge badge--navy">{{ tipoLabel(item.tipo) }}</span>
          <span v-if="item.categoria" class="badge badge--muted">{{ item.categoria }}</span>
          <span class="badge" :class="sourceBadgeClass(item.source)">
            {{ sourceLabel(item.source) }}
          </span>
        </div>
        <h1 class="page-title" style="border: none; padding: 0; margin-top: 0.5rem">
          {{ item.titulo }}
        </h1>
        <p class="money font-display">{{ formatMoney(item.montante_eur) }}</p>
        <p class="ent">{{ item.entidade || '—' }}</p>
      </div>
    </div>

    <div class="two">
      <section class="av-card">
        <div class="av-card-pad">
          <h2 class="section-title">Detalhe</h2>
          <dl class="dl">
            <div>
              <dt>Data de publicação</dt>
              <dd>{{ formatDate(item.data_publicacao) }}</dd>
            </div>
            <div>
              <dt>Início do contrato</dt>
              <dd>{{ formatDate(item.data_inicio) }}</dd>
            </div>
            <div>
              <dt>Fim</dt>
              <dd>{{ formatDate(item.data_fim) }}</dd>
            </div>
            <div>
              <dt>Moeda</dt>
              <dd>{{ item.moeda || 'EUR' }}</dd>
            </div>
            <div v-if="meta.adjudicataria">
              <dt>Adjudicatária</dt>
              <dd>{{ meta.adjudicataria }}</dd>
            </div>
            <div v-if="meta.local">
              <dt>Local de execução</dt>
              <dd>{{ meta.local }}</dd>
            </div>
            <div v-if="item.source_id">
              <dt>ID na fonte</dt>
              <dd class="mono">{{ item.source_id }}</dd>
            </div>
          </dl>
          <p v-if="item.descricao" class="body">{{ item.descricao }}</p>
          <p v-else class="hint">Sem descrição adicional neste registo.</p>
        </div>
      </section>

      <section class="av-card">
        <div class="av-card-pad">
          <h2 class="section-title">Fontes e ligações</h2>
          <p class="hint" style="margin-bottom: 0.75rem">
            Dados oficiais importados. A A Voto não interpreta o contrato — consulta as ligações
            abaixo para o registo no portal de origem.
          </p>
          <ul v-if="links.length" class="links">
            <li v-for="(l, i) in links" :key="i">
              <a :href="l.url" target="_blank" rel="noopener noreferrer">
                {{ l.label || l.url }} ↗
              </a>
            </li>
          </ul>
          <p v-else class="hint">Sem URLs neste registo. Use os portais oficiais na lista de despesa.</p>

          <div v-if="investimentoId" class="vote-cta">
            <p class="hint">
              Este contrato tem valor elevado e está disponível para
              <strong>voto cidadão</strong> (aprovar / rejeitar / abster-se).
            </p>
            <router-link class="btn btn--primary btn--sm" :to="`/investimentos/${investimentoId}`">
              Ver em Investimentos e votar
            </router-link>
          </div>
          <p v-else class="hint" style="margin-top: 1rem">
            Contratos abaixo de 100&nbsp;000&nbsp;€ ficam só em Despesa (consulta). Os de valor
            elevado têm página em
            <router-link to="/investimentos">Investimentos</router-link>.
          </p>
        </div>
      </section>
    </div>
  </div>

  <div v-else class="page-shell">
    <h1 class="page-title">Despesa não encontrada</h1>
    <p class="page-subtitle">Este registo não existe ou ainda não foi sincronizado.</p>
    <router-link to="/despesa" class="btn btn--primary">Voltar à despesa</router-link>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { formatDate } from '@/data/partidos'
import { resolveSourceLinks, sourceBadgeClass, sourceLabel } from '@/lib/sources'
import { useFinanceStore } from '@/stores/finance'

const route = useRoute()
const finance = useFinanceStore()
const loading = ref(true)
const resolved = ref(null)

const item = computed(
  () => finance.getDespesa(route.params.id) || resolved.value || null,
)

const meta = computed(() => {
  const m = item.value?.meta
  return m && typeof m === 'object' ? m : {}
})

const links = computed(() => resolveSourceLinks(item.value))

const investimentoId = computed(() => {
  if (!item.value) return null
  const inv = finance.getInvestimento(`inv-${item.value.id}`)
  return inv?.id || null
})

const tipos = {
  contrato_publico: 'Contrato público',
  investimento_publico: 'Investimento público',
  orcamento_linha: 'Linha orçamental',
  outro: 'Outro',
}

function tipoLabel(t) {
  return tipos[t] || t || '—'
}

function formatMoney(n) {
  if (n == null || n === '') return '—'
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: item.value?.moeda || 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(n))
}

watch(
  () => route.params.id,
  async (id) => {
    loading.value = true
    resolved.value = null
    if (!id) {
      loading.value = false
      return
    }
    try {
      if (!finance.despesas.length) {
        await finance.loadDespesas()
      }
      if (!finance.investimentos.length) {
        await finance.loadInvestimentos().catch(() => {})
      }
      resolved.value = await finance.ensureDespesa(id)
    } catch (e) {
      console.error(e)
      resolved.value = null
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.back {
  display: inline-block;
  margin-bottom: 1rem;
  font-weight: 700;
  color: var(--pt-green-dark);
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.money {
  font-size: 1.85rem;
  color: var(--pt-navy);
  margin: 0.35rem 0 0.25rem;
}
.ent {
  margin: 0 0 0.5rem;
  color: var(--pt-muted);
  font-weight: 600;
}
.body {
  margin: 0.75rem 0 0;
  line-height: 1.55;
  color: var(--pt-ink);
}
.hint {
  margin: 0;
  font-size: 0.9rem;
  color: var(--pt-muted);
  font-weight: 600;
  line-height: 1.45;
}
.two {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
  @media (min-width: 860px) {
    grid-template-columns: 1.2fr 1fr;
  }
}
.dl {
  margin: 0 0 1rem;
  display: grid;
  gap: 0.65rem;
  div {
    display: grid;
    gap: 0.15rem;
  }
  dt {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--pt-muted);
  }
  dd {
    margin: 0;
    font-weight: 600;
    color: var(--pt-ink);
  }
}
.mono {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  word-break: break-all;
}
.links {
  margin: 0;
  padding-left: 1.15rem;
  li {
    margin: 0.4rem 0;
  }
  a {
    font-weight: 700;
    color: var(--pt-green-dark);
  }
}
.vote-cta {
  margin-top: 1.15rem;
  padding-top: 1rem;
  border-top: 1px solid var(--pt-line);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  align-items: flex-start;
}
.muted {
  color: var(--pt-muted);
  font-weight: 600;
}
</style>
