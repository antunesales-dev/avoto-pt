<template>
  <div class="page-shell">
    <!-- Sem sessão: não mostra perfil -->
    <template v-if="!auth.isLoggedIn">
      <h1 class="page-title">Perfil</h1>
      <p class="page-subtitle">
        Precisa de entrar para ver o seu perfil, histórico de votos e alinhamento pessoal.
      </p>
      <div class="av-card av-card-pad">
        <p style="margin: 0 0 1rem; color: var(--pt-muted)">
          Nesta demonstração, «Entrar» cria uma sessão fictícia (sem email nem palavra-passe).
        </p>
        <button type="button" class="btn btn--primary" @click="onEntrar">Entrar (demo)</button>
      </div>
    </template>

    <template v-else>
      <div class="row-between" style="margin-bottom: 0.5rem">
        <div>
          <h1 class="page-title">Perfil</h1>
          <p class="page-subtitle" style="margin-bottom: 0">
            Área pessoal. Dados de demonstração.
          </p>
        </div>
        <button type="button" class="btn btn--outline btn--sm" @click="onSair">Sair</button>
      </div>

      <div class="profile-grid">
        <section class="av-card">
          <div class="flag-stripe" aria-hidden="true">
            <span class="flag-stripe__green" />
            <span class="flag-stripe__red" />
          </div>
          <div class="av-card-pad">
            <div class="profile-head">
              <div class="avatar" aria-hidden="true">A</div>
              <div>
                <div class="cid-chip">{{ perfilDemo.id }}</div>
                <p class="pref">
                  Partido com que me identifico (opcional):
                  <strong>{{ perfilDemo.partidoPreferencia || '—' }}</strong>
                </p>
                <p class="muted">{{ perfilDemo.totalVotos }} votos emitidos (demo)</p>
              </div>
            </div>
            <div class="notice" style="margin-top: 1rem">
              Campo de preferência partidária nunca é verificado nem cruzado com fontes externas.
            </div>
          </div>
        </section>

        <section class="av-card">
          <div class="av-card-pad">
            <h2 class="section-title">Alinhamento pessoal</h2>
            <p class="muted" style="margin: 0 0 0.85rem">
              Com base nos seus votos, percentagem de coincidência com cada partido.
            </p>
            <div class="align-list">
              <div v-for="a in alinhamentos" :key="a.partidoId" class="align-row">
                <div class="align-row__head">
                  <span class="party-cell">
                    <span class="party-dot" :style="{ background: a.cor }" />
                    {{ a.sigla }}
                  </span>
                  <span class="pct">{{ a.percentagem }}%</span>
                </div>
                <div class="mini-bar">
                  <div
                    class="mini-bar__fill"
                    :style="{ width: a.percentagem + '%', background: a.cor }"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section class="av-card" style="margin-top: 1rem">
        <div class="av-card-pad">
          <h2 class="section-title">Histórico de votos</h2>
          <div class="av-table-wrap" style="border: none">
            <table class="av-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Iniciativa</th>
                  <th>O seu voto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="h in historico" :key="h.iniciativaId + h.data">
                  <td>{{ formatDate(h.data) }}</td>
                  <td>
                    <router-link
                      v-if="h.titulo"
                      :to="`/iniciativas/${h.iniciativaId}`"
                      class="link"
                    >
                      {{ h.titulo }}
                    </router-link>
                    <span v-else>{{ h.iniciativaId }}</span>
                  </td>
                  <td>
                    <span class="badge" :class="votoClass(h.voto)">{{ votoLabel[h.voto] }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  perfilDemo,
  getPartido,
  getIniciativa,
  formatDate,
  votoLabel,
} from '@/data/mock'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const alinhamentos = computed(() =>
  perfilDemo.alinhamentos.map((a) => {
    const p = getPartido(a.partidoId)
    return {
      ...a,
      sigla: p?.sigla || a.partidoId,
      cor: p?.cor || '#999',
    }
  }),
)

const historico = computed(() =>
  perfilDemo.historico.map((h) => {
    const ini = getIniciativa(h.iniciativaId)
    return {
      ...h,
      titulo: ini?.titulo,
    }
  }),
)

function votoClass(v) {
  if (v === 'favor') return 'badge--green'
  if (v === 'contra') return 'badge--red'
  return 'badge--muted'
}

function onEntrar() {
  auth.loginDemo()
}

function onSair() {
  auth.logout()
  router.push('/')
}
</script>

<style scoped lang="scss">
.profile-grid {
  display: grid;
  gap: 1rem;

  @media (min-width: 900px) {
    grid-template-columns: 1fr 1.1fr;
    align-items: start;
  }
}

.profile-head {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, var(--pt-green), var(--pt-red));
  flex-shrink: 0;
}

.pref {
  margin: 0.5rem 0 0.25rem;
  font-size: 0.95rem;
}

.muted {
  margin: 0;
  color: var(--pt-muted);
  font-size: 0.9rem;
}

.align-list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.align-row__head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  font-weight: 600;
}

.party-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.pct {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--pt-navy);
}

.mini-bar {
  height: 8px;
  background: #f5f5f4;
  border-radius: 99px;
  overflow: hidden;

  &__fill {
    height: 100%;
    border-radius: 99px;
    opacity: 0.9;
  }
}

.link {
  text-decoration: none;
  font-weight: 600;
  color: var(--pt-green-dark);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  max-width: 28rem;

  &:hover {
    color: var(--pt-red);
  }
}
</style>
