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
            Decisão oficial: {{ decisaoLabel(item.decisao_oficial) }}
          </span>
        </div>
        <h1 class="page-title" style="border: none; padding: 0; margin-top: 0.5rem">
          {{ item.titulo }}
        </h1>
        <p class="money font-display">{{ formatMoney(item.montante_eur) }}</p>
        <p class="ent">{{ item.entidade }} · {{ formatDate(item.data_referencia) }}</p>
        <p class="body">{{ item.descricao }}</p>
        <p v-if="item.decisao_detalhe" class="detalhe">
          <strong>Nota oficial / dados:</strong> {{ item.decisao_detalhe }}
        </p>
        <p v-if="item.despesa_id" class="hint" style="margin-top: 0.75rem">
          Ficha de consulta (sem voto):
          <router-link :to="`/despesa/${item.despesa_id}`">ver despesa relacionada</router-link>
        </p>
      </div>
    </div>

    <div class="two">
      <section class="av-card">
        <div class="av-card-pad">
          <h2 class="section-title">Voto dos cidadãos</h2>
          <VoteBar :votos="item.votosCidadaos" />
          <div class="vote-actions">
            <template v-if="meuVoto">
              <span class="badge badge--green">Voto registado: {{ votoLabel[meuVoto] }}</span>
              <p class="hint">Não pode ser alterado.</p>
            </template>
            <template v-else-if="!auth.isLoggedIn">
              <p class="hint">Entre para votar (aprovar / rejeitar / abster-se).</p>
              <router-link
                class="btn btn--primary btn--sm"
                :to="{ name: 'entrar', query: { redirect: route.fullPath } }"
              >
                Entrar para votar
              </router-link>
            </template>
            <template v-else>
              <p class="hint">Confirmação obrigatória · voto definitivo.</p>
              <div class="vote-btns">
                <button type="button" class="btn btn--primary btn--sm" @click="pedir('favor')">
                  Aprovar
                </button>
                <button type="button" class="btn btn--secondary btn--sm" @click="pedir('contra')">
                  Rejeitar
                </button>
                <button type="button" class="btn btn--outline btn--sm" @click="pedir('abstencao')">
                  Abster-se
                </button>
              </div>
            </template>
          </div>
        </div>
      </section>

      <section class="av-card">
        <div class="av-card-pad">
          <h2 class="section-title">Decisão oficial</h2>
          <p>
            <span class="badge" :class="decisaoClass(item.decisao_oficial)">
              {{ decisaoLabel(item.decisao_oficial) }}
            </span>
          </p>
          <p class="body">{{ item.decisao_detalhe || 'Sem detalhe oficial na base ainda.' }}</p>
          <p class="hint">
            Comparação informativa: cidadãos registados vs registo oficial — sem recomendações.
          </p>
        </div>
      </section>
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
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import VoteBar from '@/components/VoteBar.vue'
import { formatDate, votoLabel } from '@/data/partidos'
import { resolveSourceLinks, sourceLabel } from '@/lib/sources'
import { useAuthStore } from '@/stores/auth'
import { useFinanceStore } from '@/stores/finance'

const route = useRoute()
const $q = useQuasar()
const auth = useAuthStore()
const finance = useFinanceStore()
const meuVoto = ref(null)

const item = computed(() => finance.getInvestimento(route.params.id))

/** Links do investimento + da despesa irmã + fallbacks oficiais por source */
const sourceLinks = computed(() => {
  const inv = item.value
  if (!inv) return []
  const despesa = inv.despesa_id ? finance.getDespesa(inv.despesa_id) : null
  return resolveSourceLinks(inv, [despesa?.links])
})

watch(
  () => [route.params.id, auth.isLoggedIn],
  async () => {
    meuVoto.value = null
    if (!finance.investimentos.length) {
      await finance.loadInvestimentos().catch(console.error)
    }
    // despesa irmã para links / ficha de consulta
    if (!finance.despesas.length) {
      await finance.loadDespesas().catch(() => {})
    }
    const inv = finance.getInvestimento(route.params.id)
    if (inv?.despesa_id) {
      await finance.ensureDespesa(inv.despesa_id).catch(() => {})
    }
    if (auth.isLoggedIn && route.params.id) {
      meuVoto.value = await auth.getVotoInvestimento(route.params.id).catch(() => null)
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

function pedir(voto) {
  const labels = { favor: 'Aprovar', contra: 'Rejeitar', abstencao: 'Abster-se' }
  $q.dialog({
    title: 'Confirmar voto',
    message: `Vai registar <strong>${labels[voto]}</strong>. Depois de confirmar <strong>não pode alterar</strong>.`,
    html: true,
    persistent: true,
    ok: { label: `Confirmar: ${labels[voto]}`, color: 'primary', unelevated: true },
    cancel: { label: 'Cancelar', flat: true },
  }).onOk(() => confirmar(voto))
}

async function confirmar(voto) {
  try {
    await auth.castVotoInvestimento(item.value.id, voto)
    meuVoto.value = voto
    await finance.refreshInvestimentoVotes(item.value.id)
    $q.notify({ type: 'positive', message: 'Voto registado. Não pode ser alterado.', position: 'top' })
  } catch (e) {
    $q.notify({
      type: e.code === 'ALREADY_VOTED' ? 'warning' : 'negative',
      message:
        e.code === 'ALREADY_VOTED'
          ? 'Já votou neste investimento.'
          : e.message || 'Erro ao votar.',
      position: 'top',
    })
  }
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
.two {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
  @media (min-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }
}
.vote-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--pt-line);
}
.vote-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.65rem;
}
.hint {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  color: var(--pt-muted);
  line-height: 1.45;
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
