import { register } from 'register-service-worker'

/**
 * Em deploys frequentes (GH Pages / CF), um SW desactualizado serve HTML/JS
 * com hashes antigos → 404 nos chunks. Ao detectar update, recarrega 1×.
 */
const RELOAD_KEY = 'avoto-sw-reloaded'

register(import.meta.env.QUASAR_SERVICE_WORKER_FILE, {
  ready () {
    try {
      sessionStorage.removeItem(RELOAD_KEY)
    } catch {
      /* ignore */
    }
  },

  registered (registration) {
    // verifica update periodicamente (tabs longas abertas)
    if (registration && typeof registration.update === 'function') {
      setInterval(() => {
        registration.update().catch(() => {})
      }, 60 * 60 * 1000)
    }
  },

  cached () {},

  updatefound () {},

  updated (registration) {
    // pede ao SW em waiting para activar (se não tiver skipWaiting)
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    try {
      if (sessionStorage.getItem(RELOAD_KEY) === '1') return
      sessionStorage.setItem(RELOAD_KEY, '1')
    } catch {
      /* ignore */
    }
    window.location.reload()
  },

  offline () {},

  error (/* err */) {},
})
