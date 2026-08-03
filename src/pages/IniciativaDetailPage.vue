<template>
  <div class="page-shell" v-if="item">
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

          <div class="notice notice-info">
            Texto factual e neutro, baseado apenas em documentos oficiais (em produção). Nesta
            demo o conteúdo é ilustrativo.
          </div>

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
            <VoteBar :votos="votosExibidos" />
            <div class="vote-actions">
              <!-- Já votou: só leitura -->
              <template v-if="meuVoto">
                <div class="vote-locked">
                  <span class="badge badge--green">O seu voto está registado</span>
                  <p class="vote-locked__text">
                    Votou
                    <strong>{{ votoLabel[meuVoto] }}</strong>
                    nesta iniciativa.
                    <span class="vote-locked__warn">Não pode ser alterado.</span>
                  </p>
                </div>
              </template>

              <!-- Sem sessão -->
              <template v-else-if="!auth.isLoggedIn">
                <p class="hint">
                  Entre com a sua conta para votar. Um voto por cidadão — sem alterações depois de
                  confirmar.
                </p>
                <button type="button" class="btn btn--primary btn--sm" @click="onEntrarParaVotar">
                  Entrar para votar
                </button>
              </template>

              <!-- Pode votar: confirmação obrigatória -->
              <template v-else>
                <p class="hint">
                  Escolha o sentido de voto. Será pedida confirmação — depois do registo
                  <strong>não poderá alterar</strong>.
                </p>
                <div class="vote-btns">
                  <button
                    type="button"
                    class="btn btn--primary btn--sm"
                    @click="pedirConfirmacao('favor')"
                  >
                    A favor
                  </button>
                  <button
                    type="button"
                    class="btn btn--secondary btn--sm"
                    @click="pedirConfirmacao('contra')"
                  >
                    Contra
                  </button>
                  <button
                    type="button"
                    class="btn btn--outline btn--sm"
                    @click="pedirConfirmacao('abstencao')"
                  >
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
            <div class="party-list">
              <PartyVoteBadge
                v-for="p in partidos"
                :key="p.id"
                :partido="p"
                :voto="item.resultadoPartidos[p.id]"
              />
            </div>
          </div>
        </div>
      </section>
    </div>

    <section class="av-card" style="margin-top: 1rem">
      <div class="av-card-pad">
        <h2 class="section-title">Alinhamento cidadãos ↔ partidos</h2>
        <p class="page-subtitle" style="margin-bottom: 1rem">
          Percentagem de cidadãos que votaram no <em>mesmo sentido</em> que cada partido nesta
          iniciativa. Não é um ranking político — é coincidência de sentido de voto.
        </p>
        <div class="av-table-wrap">
          <table class="av-table">
            <thead>
              <tr>
                <th>Partido</th>
                <th>Voto AR</th>
                <th>Alinhamento com cidadãos</th>
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
    <p class="page-subtitle">O identificador pedido não existe nos dados de demonstração.</p>
    <router-link to="/iniciativas" class="btn btn--primary">Voltar às iniciativas</router-link>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import VoteBar from '@/components/VoteBar.vue'
import PartyVoteBadge from '@/components/PartyVoteBadge.vue'
import {
  getIniciativa,
  partidos,
  estadosLabel,
  votoLabel,
  formatDate,
  alinhamentoCidadaosPartido,
} from '@/data/mock'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const $q = useQuasar()
const auth = useAuthStore()

const item = computed(() => getIniciativa(route.params.id))

const meuVoto = computed(() => {
  if (!item.value || !auth.isLoggedIn) return null
  return auth.getVoto(item.value.id)
})

/** Agregado demo: se o utilizador votou, soma 1 ao contador local (só visual) */
const votosExibidos = computed(() => {
  if (!item.value) return { favor: 0, contra: 0, abstencao: 0 }
  const base = { ...item.value.votosCidadaos }
  const v = meuVoto.value
  if (v) base[v] = (base[v] || 0) + 1
  return base
})

const estadoClass = computed(() => {
  const map = {
    aprovado: 'badge--green',
    rejeitado: 'badge--red',
    em_discussao: 'badge--gold',
    arquivado: 'badge--muted',
  }
  return map[item.value?.estado] || 'badge--muted'
})

const alinhamentos = computed(() => {
  if (!item.value) return []
  return partidos
    .map((p) => ({
      id: p.id,
      sigla: p.sigla,
      cor: p.cor,
      voto: item.value.resultadoPartidos[p.id],
      alinhamento: alinhamentoCidadaosPartido(
        { ...item.value, votosCidadaos: votosExibidos.value },
        p.id,
      ),
    }))
    .sort((a, b) => (b.alinhamento ?? -1) - (a.alinhamento ?? -1))
})

function onEntrarParaVotar() {
  auth.loginDemo()
  $q.notify({
    type: 'info',
    message: 'Sessão demo iniciada. Pode votar — com confirmação e sem alteração posterior.',
    position: 'top',
  })
}

function pedirConfirmacao(voto) {
  if (!item.value) return
  if (auth.jaVotou(item.value.id)) {
    $q.notify({
      type: 'warning',
      message: 'Já votou nesta iniciativa. O voto não pode ser alterado.',
      position: 'top',
    })
    return
  }

  const label = votoLabel[voto]
  $q.dialog({
    title: 'Confirmar voto',
    message:
      `Vai registar o voto <strong>${label}</strong> nesta iniciativa.<br><br>` +
      `<strong>Atenção:</strong> depois de confirmar, o voto fica definitivo e ` +
      `<strong>não pode ser alterado</strong>.`,
    html: true,
    persistent: true,
    ok: {
      label: `Confirmar: ${label}`,
      color: voto === 'contra' ? 'secondary' : 'primary',
      unelevated: true,
    },
    cancel: {
      label: 'Cancelar',
      flat: true,
      color: 'grey-8',
    },
  }).onOk(() => {
    confirmarVoto(voto)
  })
}

function confirmarVoto(voto) {
  if (!item.value) return
  const result = auth.castVoto(item.value.id, voto)
  if (!result.ok) {
    const msgs = {
      not_logged_in: 'Tem de entrar para votar.',
      already_voted: 'Já votou nesta iniciativa. O voto não pode ser alterado.',
      invalid: 'Opção de voto inválida.',
    }
    $q.notify({
      type: 'negative',
      message: msgs[result.reason] || 'Não foi possível registar o voto.',
      position: 'top',
    })
    return
  }
  $q.notify({
    type: 'positive',
    message: `Voto registado: ${votoLabel[voto]}. Não pode ser alterado.`,
    position: 'top',
  })
}
</script>

<style scoped lang="scss">
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
  color: var(--pt-ink);
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
  color: var(--pt-ink);
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
