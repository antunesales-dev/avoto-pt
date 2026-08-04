<template>
  <div v-if="data.loadingDetail && !item" class="page-shell">
    <p class="muted">A carregar iniciativa…</p>
  </div>
  <div class="page-shell" v-else-if="item">
    <router-link to="/iniciativas" class="back-link">← Voltar às iniciativas</router-link>

    <div class="av-card detail-hero">
      <div class="flag-stripe" aria-hidden="true">
        <span class="flag-stripe__green" />
        <span class="flag-stripe__red" />
      </div>
      <div class="av-card-pad">
        <div class="meta-row">
          <span class="badge" :class="estadoClass">{{ estadosLabel[item.estado] }}</span>
          <span class="badge badge--navy">{{ item.tipo }}</span>
          <span class="badge badge--muted">{{ item.tema }}</span>
          <span class="badge badge--gold">{{ item.idOficial }}</span>
        </div>
        <h1 class="page-title" style="margin-top: 0.75rem">{{ item.titulo }}</h1>
        <p class="page-subtitle" style="margin-bottom: 0.5rem">
          Legislatura {{ item.legislatura }} · Entrada {{ formatDate(item.dataEntrada) }}
          <template v-if="item.dataVotacao">
            · Votação AR {{ formatDate(item.dataVotacao) }}
          </template>
        </p>
        <p class="authors">
          <strong>Autores / proponentes:</strong>
          {{ item.autores.join(', ') }}
        </p>
      </div>
    </div>

    <div class="detail-grid">
      <section class="av-card">
        <div class="av-card-pad stack">
          <h2 class="section-title">Descrição oficial</h2>
          <p class="body-text">{{ item.descricaoOficial }}</p>
          <h2 class="section-title">O que está em causa</h2>
          <p class="body-text">{{ item.explicacao }}</p>
          <h2 class="section-title">Ligações oficiais</h2>
          <ul class="links">
            <li v-for="l in item.links" :key="l.url + l.label">
              <a :href="l.url" target="_blank" rel="noopener noreferrer">{{ l.label }} ↗</a>
            </li>
          </ul>
        </div>
      </section>

      <section class="stack">
        <div class="av-card">
          <div class="av-card-pad">
            <h2 class="section-title">Voto dos cidadãos</h2>
            <VoteBar :votos="item.votosCidadaos" />
            <div class="vote-actions">
              <template v-if="meuVoto">
                <div class="vote-locked">
                  <span class="badge badge--green">O seu voto está registado</span>
                  <p class="vote-locked__text">
                    Votou <strong>{{ votoLabel[meuVoto] }}</strong>.
                    <span class="vote-locked__warn">Não pode ser alterado.</span>
                  </p>
                </div>
              </template>
              <template v-else-if="!auth.isLoggedIn">
                <p class="hint">Entre para votar. Um voto por conta — definitivo após confirmação.</p>
                <router-link
                  class="btn btn--primary btn--sm"
                  :to="{ name: 'entrar', query: { redirect: route.fullPath } }"
                >
                  Entrar para votar
                </router-link>
              </template>
              <template v-else>
                <p class="hint">
                  Escolha o sentido. Será pedida <strong>confirmação</strong>; depois
                  <strong>não poderá alterar</strong>.
                </p>
                <div class="vote-btns">
                  <button type="button" class="btn btn--primary btn--sm" @click="pedirConfirmacao('favor')">
                    A favor
                  </button>
                  <button type="button" class="btn btn--secondary btn--sm" @click="pedirConfirmacao('contra')">
                    Contra
                  </button>
                  <button type="button" class="btn btn--outline btn--sm" @click="pedirConfirmacao('abstencao')">
                    Abstenção
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="av-card">
          <div class="av-card-pad">
            <h2 class="section-title">Voto dos partidos na AR</h2>
            <p class="hint" style="margin-bottom: 0.75rem">
              Sentido de voto do grupo parlamentar. Lista em
              <strong>ordem alfabética por sigla</strong> (anti-enviesamento). O número a seguir à
              sigla é a <strong>bancada</strong> (deputados) — peso no hemiciclo, não “quanto deve
              o cidadão votar”. Ver
              <router-link to="/como-funciona">Como funciona</router-link>.
            </p>
            <p v-if="!hasPartidos" class="hint">
              O registo oficial desta iniciativa ainda não tem detalhe de voto por grupo
              parlamentar (ou a votação não ocorreu). Sem inventar dados.
            </p>
            <div v-else class="party-list">
              <PartyVoteBadge
                v-for="p in partidosComVoto"
                :key="p.id"
                :partido="p"
                :voto="item.resultadoPartidos[p.id]"
                :assentos="assentosDe(p.id)"
              />
            </div>
          </div>
        </div>
      </section>
    </div>

    <section v-if="hasPartidos" class="av-card" style="margin-top: 1rem">
      <div class="av-card-pad">
        <PartyWeightPanel
          :resultado-partidos="item.resultadoPartidos"
          :legislatura="item.legislatura"
          :estado="item.estado"
        />
      </div>
    </section>

    <section class="av-card" style="margin-top: 1rem">
      <div class="av-card-pad">
        <h2 class="section-title">Alinhamento cidadãos ↔ partidos</h2>
        <p class="hint" style="margin: -0.35rem 0 0.85rem">
          Com votos de cidadãos: ordenado por % de alinhamento (métrica). Sem votos ou em empate:
          <strong>ordem alfabética por sigla</strong>.
        </p>
        <div class="av-table-wrap">
          <table class="av-table">
            <thead>
              <tr>
                <th>Partido</th>
                <th>Voto AR</th>
                <th>Alinhamento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in alinhamentos" :key="row.id">
                <td>
                  <span class="party-cell">
                    <span class="party-dot" :style="{ background: row.cor }" />
                    {{ row.sigla }}
                  </span>
                </td>
                <td>{{ votoLabel[row.voto] }}</td>
                <td>
                  <template v-if="row.alinhamento == null">—</template>
                  <template v-else>{{ row.alinhamento }}%</template>
                </td>
                <td style="min-width: 140px">
                  <div v-if="row.alinhamento != null" class="mini-bar">
                    <div class="mini-bar__fill" :style="{ width: row.alinhamento + '%' }" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>

  <div v-else class="page-shell">
    <h1 class="page-title">Iniciativa não encontrada</h1>
    <router-link to="/iniciativas" class="btn btn--primary">Voltar às iniciativas</router-link>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import VoteBar from '@/components/VoteBar.vue'
import PartyVoteBadge from '@/components/PartyVoteBadge.vue'
import PartyWeightPanel from '@/components/PartyWeightPanel.vue'
import { assentosPartido } from '@/data/composicaoAr'
import {
  partidos,
  estadosLabel,
  votoLabel,
  formatDate,
  alinhamentoCidadaosPartido,
} from '@/data/partidos'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'

const route = useRoute()
const $q = useQuasar()
const auth = useAuthStore()
const data = useDataStore()

const meuVoto = ref(null)
const resolved = ref(null)

const item = computed(
  () => data.getIniciativa(route.params.id) || resolved.value || null,
)

watch(
  () => route.params.id,
  async (id) => {
    resolved.value = null
    if (!id) return
    try {
      resolved.value = await data.ensureIniciativa(id)
    } catch (e) {
      console.error(e)
      resolved.value = null
    }
  },
  { immediate: true },
)

watch(
  () => [route.params.id, auth.isLoggedIn, auth.user?.id, item.value?.id],
  async () => {
    meuVoto.value = null
    if (auth.isLoggedIn && route.params.id && item.value) {
      try {
        meuVoto.value = await auth.getVoto(route.params.id)
      } catch (e) {
        console.error(e)
      }
    }
  },
  { immediate: true },
)

const estadoClass = computed(() => {
  const map = {
    aprovado: 'badge--green',
    rejeitado: 'badge--red',
    em_discussao: 'badge--gold',
    arquivado: 'badge--muted',
  }
  return map[item.value?.estado] || 'badge--muted'
})

const hasPartidos = computed(() => {
  const m = item.value?.resultadoPartidos
  if (!m) return false
  return Object.values(m).some((v) => v && v !== 'nao_participou')
})

const partidosComVoto = computed(() => {
  if (!item.value) return []
  const m = item.value.resultadoPartidos || {}
  // partidos[] já é alfabético por sigla — só filtramos quem votou
  return partidos.filter((p) => m[p.id] && m[p.id] !== 'nao_participou')
})

function assentosDe(partidoId) {
  return assentosPartido(partidoId, item.value?.legislatura)
}

const alinhamentos = computed(() => {
  if (!item.value || !hasPartidos.value) return []
  return partidosComVoto.value
    .map((p) => ({
      id: p.id,
      sigla: p.sigla,
      cor: p.cor,
      voto: item.value.resultadoPartidos[p.id],
      alinhamento: alinhamentoCidadaosPartido(item.value, p.id),
    }))
    // Com cidadãos a votar: ordenar por % alinhamento; senão / empate → alfabético
    .sort((a, b) => {
      const aa = a.alinhamento
      const bb = b.alinhamento
      if (aa == null && bb == null) {
        return a.sigla.localeCompare(b.sigla, 'pt', { sensitivity: 'base' })
      }
      if (aa == null) return 1
      if (bb == null) return -1
      if (bb !== aa) return bb - aa
      return a.sigla.localeCompare(b.sigla, 'pt', { sensitivity: 'base' })
    })
})

function pedirConfirmacao(voto) {
  if (!item.value) return
  const label = votoLabel[voto]
  $q.dialog({
    title: 'Confirmar voto',
    message:
      `Vai registar o voto <strong>${label}</strong> nesta iniciativa.<br><br>` +
      `<strong>Atenção:</strong> depois de confirmar fica definitivo e ` +
      `<strong>não pode ser alterado</strong>.`,
    html: true,
    persistent: true,
    ok: {
      label: `Confirmar: ${label}`,
      color: voto === 'contra' ? 'secondary' : 'primary',
      unelevated: true,
    },
    cancel: { label: 'Cancelar', flat: true, color: 'grey-8' },
  }).onOk(() => confirmarVoto(voto))
}

async function confirmarVoto(voto) {
  if (!item.value) return
  try {
    await auth.castVoto(item.value.id, voto)
    meuVoto.value = voto
    await data.refreshAgg(item.value.id)
    $q.notify({
      type: 'positive',
      message: `Voto registado: ${votoLabel[voto]}. Não pode ser alterado.`,
      position: 'top',
    })
  } catch (e) {
    const code = e.code || e.message
    if (code === 'ALREADY_VOTED' || String(e.message).includes('ALREADY_VOTED')) {
      meuVoto.value = await auth.getVoto(item.value.id)
      $q.notify({
        type: 'warning',
        message: 'Já votou nesta iniciativa. O voto não pode ser alterado.',
        position: 'top',
      })
      return
    }
    if (code === 'RATE_LIMITED' || String(e.message).includes('RATE_LIMITED')) {
      $q.notify({
        type: 'warning',
        message: 'Demasiados pedidos. Espere um minuto e tente de novo.',
        position: 'top',
      })
      return
    }
    $q.notify({
      type: 'negative',
      message: e.message || 'Não foi possível registar o voto.',
      position: 'top',
    })
  }
}
</script>

<style scoped lang="scss">
.muted {
  color: var(--pt-muted);
  font-weight: 600;
}
.back-link {
  display: inline-block;
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: none;
  color: var(--pt-green-dark);
  margin-bottom: 1rem;
  &:hover {
    color: var(--pt-red);
  }
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.authors {
  margin: 0.75rem 0 0;
  font-size: 0.95rem;
  color: var(--pt-muted);
}
.detail-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
  @media (min-width: 960px) {
    grid-template-columns: 1.2fr 1fr;
    align-items: start;
  }
}
.body-text {
  margin: 0;
  line-height: 1.6;
}
.links {
  margin: 0;
  padding-left: 1.1rem;
  a {
    font-weight: 600;
    text-decoration: none;
  }
}
.vote-actions {
  margin-top: 1.1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--pt-border);
}
.vote-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0 0;
}
.vote-locked {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.vote-locked__text {
  margin: 0;
  font-size: 0.95rem;
}
.vote-locked__warn {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--pt-red-dark);
}
.hint {
  margin: 0 0 0.65rem;
  font-size: 0.85rem;
  color: var(--pt-muted);
}
.party-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.party-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 700;
}
.mini-bar {
  height: 8px;
  background: #f5f5f4;
  border-radius: 99px;
  overflow: hidden;
  border: 1px solid var(--pt-border);
  &__fill {
    height: 100%;
    background: linear-gradient(90deg, var(--pt-green), var(--pt-gold));
    border-radius: 99px;
  }
}
</style>
