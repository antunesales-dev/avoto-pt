<template>
  <div class="page-shell">
    <h1 class="page-title">Perfil</h1>
    <p class="page-subtitle">Área pessoal — só visível para si.</p>

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
          <h2 class="section-title">Notificações</h2>
          <p class="muted" style="margin-bottom: 0.75rem">
            Avisos sobre o resumo diário da actividade pública, novas leis/votações e
            investimentos. Instale a app (PWA) no telemóvel ou desktop para um atalho e melhor
            experiência.
          </p>

          <div class="notif-permission">
            <span class="notif-status">Browser: <strong>{{ permLabel }}</strong></span>
            <button
              v-if="permission !== 'granted'"
              type="button"
              class="btn btn--primary btn--sm"
              :disabled="!canRequest || savingNotif"
              @click="onEnableNotif"
            >
              Activar notificações
            </button>
          </div>

          <div class="toggle-list">
            <label class="toggle">
              <input v-model="prefs.notify_digest" type="checkbox" @change="onSavePrefs" />
              <span>Resumo do dia (Parlamento, despesa e investimentos)</span>
            </label>
            <label class="toggle">
              <input v-model="prefs.notify_iniciativas" type="checkbox" @change="onSavePrefs" />
              <span>Novas leis / propostas a votar</span>
            </label>
            <label class="toggle">
              <input v-model="prefs.notify_investimentos" type="checkbox" @change="onSavePrefs" />
              <span>Novos investimentos públicos</span>
            </label>
            <label class="toggle">
              <input v-model="prefs.notify_despesa" type="checkbox" @change="onSavePrefs" />
              <span>Actualizações de despesa pública</span>
            </label>
          </div>
          <p class="muted" style="margin-top: 0.75rem; font-size: 0.82rem">
            Com a app aberta ou instalada, as notificações chegam em tempo quase real. Push com a
            app totalmente fechada (Web Push / VAPID) activa-se numa fase seguinte.
          </p>
        </div>
      </section>

      <section class="av-card">
        <div class="av-card-pad">
          <h2 class="section-title">Histórico de votos</h2>
          <p v-if="!historico.length" class="muted">Ainda não votou em nenhuma iniciativa.</p>
          <template v-else>
            <ListPager
              :page="page"
              :page-size="pageSize"
              :total="total"
              :total-pages="totalPages"
              :range-from="rangeFrom"
              :range-to="rangeTo"
              :page-window="pageWindow"
              :sizes="sizes"
              unit="votos"
              @go="goPage"
              @update:page-size="setPageSize"
            />
            <div class="av-table-wrap" style="border: none">
              <table class="av-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Iniciativa</th>
                    <th>Voto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="h in pageItems" :key="h.iniciativa_id + h.created_at">
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
          </template>
        </div>
      </section>

      <section class="av-card account-danger">
        <div class="av-card-pad">
          <h2 class="section-title">Sessão e conta</h2>
          <p class="muted" style="margin-bottom: 0.85rem">
            Um sítio só: terminar a sessão neste dispositivo, ou apagar a conta (RGPD — direito
            ao apagamento). Apagar remove o login, o perfil e os votos associados.
          </p>
          <div class="account-actions">
            <button
              type="button"
              class="btn btn--outline"
              :disabled="isBusy"
              @click="onSair"
            >
              {{ busy === 'sair' ? 'A sair…' : 'Sair da sessão' }}
            </button>
            <button
              type="button"
              class="btn btn--danger"
              :disabled="isBusy"
              @click="onApagarConta"
            >
              {{ busy === 'apagar' ? 'A apagar…' : 'Apagar a minha conta' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import ListPager from '@/components/ListPager.vue'
import { usePagination } from '@/composables/usePagination'
import { formatDate, votoLabel } from '@/data/partidos'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import {
  fetchNotificationPrefs,
  notificationPermission,
  notificationSupport,
  requestNotificationPermission,
  saveNotificationPrefs,
} from '@/lib/notifications'

const auth = useAuthStore()
const data = useDataStore()
const router = useRouter()
const $q = useQuasar()

const historico = ref([])
const partido = ref(auth.profile?.partido_preferencia || '')
const savingNotif = ref(false)
/** null | 'sair' | 'apagar' — nunca usar '' em :disabled (Vue trata string vazia como true) */
const busy = ref(null)
/** Boolean explícito: :disabled exige true/false, não strings. */
const isBusy = computed(() => busy.value != null)
const permission = ref(notificationPermission())
const prefs = reactive({
  notify_digest: true,
  notify_iniciativas: true,
  notify_investimentos: true,
  notify_despesa: false,
})

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
} = usePagination(historico, { defaultSize: 10, sizes: [10, 20, 50], queryPrefix: 'h' })

function setPageSize(n) {
  pageSize.value = n
}

const initial = computed(() => (auth.email || 'A').charAt(0).toUpperCase())
const canRequest = computed(
  () => notificationSupport() && permission.value !== 'denied' && permission.value !== 'unsupported',
)
const permLabel = computed(() => {
  if (permission.value === 'unsupported') return 'não suportado'
  if (permission.value === 'granted') return 'activas'
  if (permission.value === 'denied') return 'bloqueadas no browser'
  return 'ainda não pedidas'
})

function tituloDe(id) {
  return data.getIniciativa(id)?.titulo || id
}

function votoClass(v) {
  if (v === 'favor') return 'badge--green'
  if (v === 'contra') return 'badge--red'
  return 'badge--muted'
}

async function onSair() {
  if (busy.value != null) return
  busy.value = 'sair'
  try {
    await auth.sair()
    $q.notify({ type: 'positive', message: 'Sessão terminada.', position: 'top' })
    await router.replace('/')
  } catch (e) {
    // sair() limpa estado local mesmo com erro de rede
    $q.notify({
      type: 'warning',
      message: e.message || 'Sessão limpa neste dispositivo.',
      position: 'top',
    })
    await router.replace('/')
  } finally {
    busy.value = null
  }
}

function onApagarConta() {
  if (busy.value != null) return
  $q.dialog({
    title: 'Apagar a conta?',
    message:
      'Isto é <strong>definitivo</strong>. Remove o login, o perfil e os votos associados a esta conta. Não pode ser desfeito.',
    html: true,
    persistent: true,
    ok: { label: 'Sim, apagar a conta', color: 'negative', unelevated: true },
    cancel: { label: 'Cancelar', flat: true },
  }).onOk(() => confirmarApagar())
}

async function confirmarApagar() {
  busy.value = 'apagar'
  try {
    await auth.apagarConta()
    $q.notify({
      type: 'positive',
      message: 'Conta apagada.',
      position: 'top',
    })
    await router.replace('/')
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.message || 'Não foi possível apagar a conta.',
      position: 'top',
      timeout: 6000,
    })
  } finally {
    busy.value = null
  }
}

async function savePartido() {
  try {
    await auth.updatePartido(partido.value)
    $q.notify({ type: 'positive', message: 'Preferência actualizada.', position: 'top' })
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'Erro ao guardar.', position: 'top' })
  }
}

async function onEnableNotif() {
  savingNotif.value = true
  try {
    const result = await requestNotificationPermission()
    permission.value = result
    if (result === 'granted') {
      $q.notify({
        type: 'positive',
        message: 'Notificações activadas neste dispositivo.',
        position: 'top',
      })
    } else if (result === 'denied') {
      $q.notify({
        type: 'warning',
        message: 'Permissão recusada. Pode activar nas definições do browser.',
        position: 'top',
      })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'Erro.', position: 'top' })
  } finally {
    savingNotif.value = false
  }
}

async function onSavePrefs() {
  if (!auth.user?.id) return
  savingNotif.value = true
  try {
    await saveNotificationPrefs(auth.user.id, prefs)
    $q.notify({ type: 'positive', message: 'Preferências de notificação guardadas.', position: 'top' })
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'Erro ao guardar.', position: 'top' })
  } finally {
    savingNotif.value = false
  }
}

onMounted(async () => {
  partido.value = auth.profile?.partido_preferencia || ''
  historico.value = await auth.listMeusVotos()
  permission.value = notificationPermission()
  if (auth.user?.id) {
    try {
      const p = await fetchNotificationPrefs(auth.user.id)
      Object.assign(prefs, p)
    } catch (e) {
      console.error(e)
    }
  }
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
.notif-permission {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.85rem;
}
.notif-status {
  font-size: 0.9rem;
  color: var(--pt-navy);
}
.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.toggle {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--pt-ink);
  cursor: pointer;
  input {
    margin-top: 0.2rem;
    accent-color: var(--pt-green);
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
.account-danger {
  border-color: #e8a0a8;
}
.account-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}
.account-actions {
  .btn {
    min-height: 2.5rem;
  }
  .btn--outline:not(:disabled) {
    opacity: 1;
    cursor: pointer;
    border-color: var(--pt-navy);
    color: var(--pt-navy);
    background: #fff;
  }
  .btn--danger:not(:disabled) {
    opacity: 1;
    cursor: pointer;
    background: var(--pt-red);
    border-color: var(--pt-red);
    color: #fff;
  }
}
.btn--danger {
  appearance: none;
  border: 1.5px solid var(--pt-red);
  background: var(--pt-red);
  color: #fff;
  font-family: var(--font-body);
  font-size: 0.88rem;
  font-weight: 700;
  padding: 0.5rem 0.9rem;
  border-radius: 2px;
  cursor: pointer;
  line-height: 1.2;

  &:hover:not(:disabled) {
    background: var(--pt-red-dark);
    border-color: var(--pt-red-dark);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}
.account-actions .btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
