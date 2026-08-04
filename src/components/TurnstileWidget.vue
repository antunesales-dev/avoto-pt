<template>
  <div class="turnstile-wrap">
    <div v-if="!siteKey" class="turnstile-skip muted">
      <!-- Dev sem chave: sem widget -->
    </div>
    <div v-else ref="host" class="turnstile-host" />
    <p v-if="error" class="form-error">{{ error }}</p>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  /** reset quando o pai quiser um token novo (ex. após erro) */
  resetKey: { type: [Number, String], default: 0 },
})

const emit = defineEmits(['token', 'error', 'expired'])

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
const host = ref(null)
const error = ref('')
let widgetId = null
let scriptPromise = null

function loadScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Não foi possível carregar o Turnstile.'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

function renderWidget() {
  if (!siteKey || !host.value || !window.turnstile) return
  if (widgetId != null) {
    try {
      window.turnstile.remove(widgetId)
    } catch {
      /* ignore */
    }
    widgetId = null
  }
  host.value.innerHTML = ''
  widgetId = window.turnstile.render(host.value, {
    sitekey: siteKey,
    theme: 'light',
    language: 'pt-pt',
    callback: (token) => {
      error.value = ''
      emit('token', token)
    },
    'error-callback': () => {
      error.value = 'Verificação anti-bot falhou. Actualize a página.'
      emit('error')
      emit('token', '')
    },
    'expired-callback': () => {
      emit('expired')
      emit('token', '')
    },
  })
}

function reset() {
  emit('token', '')
  if (widgetId != null && window.turnstile) {
    try {
      window.turnstile.reset(widgetId)
      return
    } catch {
      /* re-render */
    }
  }
  renderWidget()
}

defineExpose({ reset, siteKey: () => siteKey })

onMounted(async () => {
  if (!siteKey) {
    // modo dev: token vazio; edge só exige se tiver secret
    emit('token', '')
    return
  }
  try {
    await loadScript()
    renderWidget()
  } catch (e) {
    error.value = e.message || 'Turnstile indisponível.'
    emit('error')
  }
})

watch(
  () => props.resetKey,
  () => {
    if (siteKey) reset()
  },
)

onBeforeUnmount(() => {
  if (widgetId != null && window.turnstile) {
    try {
      window.turnstile.remove(widgetId)
    } catch {
      /* ignore */
    }
  }
})
</script>

<style scoped lang="scss">
.turnstile-wrap {
  min-height: 1px;
}
.turnstile-host {
  display: flex;
  justify-content: flex-start;
  margin: 0.15rem 0;
}
.muted {
  font-size: 0.8rem;
  color: var(--pt-muted);
}
.form-error {
  margin: 0.35rem 0 0;
  color: var(--pt-red-dark);
  font-size: 0.9rem;
  font-weight: 600;
}
</style>
