<template>
  <div class="page-shell">
    <div class="row-between" style="margin-bottom: 0.5rem">
      <div>
        <h1 class="page-title">Perfil</h1>
        <p class="page-subtitle" style="margin-bottom: 0">Área pessoal — só visível para si.</p>
      </div>
      <button type="button" class="btn btn--outline btn--sm" :disabled="auth.loading" @click="onSair">
        Sair
      </button>
    </div>

    <div class="profile-grid">
      <section class="av-card">
        <div class="flag-stripe" aria-hidden="true">
          <span class="flag-stripe__green" />
          <span class="flag-stripe__red" />
        </div>
        <div class="av-card-pad">
          <div class="profile-head">
            <div class="avatar" aria-hidden="true">{{ initial }}</div>
            <div>
              <div class="cid-chip">{{ auth.cid || '…' }}</div>
              <p class="pref">{{ auth.email }}</p>
              <p class="muted">{{ historico.length }} voto(s) registado(s)</p>
            </div>
          </div>

          <label class="field" style="margin-top: 1rem">
            <span>Partido com que me identifico (opcional)</span>
            <div class="field-row">
              <input v-model="partido" type="text" maxlength="80" />
              <button type="button" class="btn btn--ghost btn--sm" @click="savePartido">Guardar</button>
            </div>
          </label>
          <div class="notice" style="margin-top: 1rem">
            Preferência partidária nunca é verificada nem cruzada com fontes externas.
          </div>
        </div>
      </section>

      <section class="av-card">
        <div class="av-card-pad">
          <h2 class="section-title">Histórico de votos</h2>
          <p v-if="!historico.length" class="muted">Ainda não votou em nenhuma iniciativa.</p>
          <div v-else class="av-table-wrap" style="border: none">
            <table class="av-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Iniciativa</th>
                  <th>Voto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="h in historico" :key="h.iniciativa_id + h.created_at">
                  <td>{{ formatDate(h.created_at) }}</td>
                  <td>
                    <router-link :to="`/iniciativas/${h.iniciativa_id}`" class="link">
                      {{ tituloDe(h.iniciativa_id) }}
                    </router-link>
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
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { formatDate, votoLabel } from '@/data/partidos'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'

const auth = useAuthStore()
const data = useDataStore()
const router = useRouter()
const $q = useQuasar()

const historico = ref([])
const partido = ref(auth.profile?.partido_preferencia || '')

const initial = computed(() => (auth.email || 'A').charAt(0).toUpperCase())

function tituloDe(id) {
  return data.getIniciativa(id)?.titulo || id
}

function votoClass(v) {
  if (v === 'favor') return 'badge--green'
  if (v === 'contra') return 'badge--red'
  return 'badge--muted'
}

async function onSair() {
  await auth.sair()
  router.push('/')
}

async function savePartido() {
  try {
    await auth.updatePartido(partido.value)
    $q.notify({ type: 'positive', message: 'Preferência actualizada.', position: 'top' })
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'Erro ao guardar.', position: 'top' })
  }
}

onMounted(async () => {
  partido.value = auth.profile?.partido_preferencia || ''
  historico.value = await auth.listMeusVotos()
})
</script>

<style scoped lang="scss">
.profile-grid {
  display: grid;
  gap: 1rem;
  @media (min-width: 900px) {
    grid-template-columns: 1fr 1.2fr;
    align-items: start;
  }
}
.profile-head {
  display: flex;
  gap: 1rem;
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
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--pt-navy);
  input {
    flex: 1;
    font-family: var(--font-body);
    font-size: 0.95rem;
    font-weight: 500;
    padding: 0.5rem 0.65rem;
    border: 1px solid var(--pt-border);
    border-radius: 8px;
    background: var(--pt-cream);
  }
}
.field-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
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
}
</style>
