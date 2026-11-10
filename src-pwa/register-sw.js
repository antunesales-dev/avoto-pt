import { register } from 'register-service-worker'

/**
 * GitHub Pages (dev): NÃO registar Service Worker.
 * Deploys frequentes + SW a precachear hashes antigos = 404 em chunks
 * (index-BvvdLX0y.js a pedir DespesaPage-CWgDI8f5.js que já não existe).
 *
 * Produção (Cloudflare / avoto.pt): PWA com update + reload.
 */

function nukeServiceWorkers() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve()
  }
  return navigator.serviceWorker
    .getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .then(() => {
      if (!window.caches) return undefined
      return caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    })
    .catch(() => {})
}

const isGitHubPages =
  typeof location !== 'undefined' &&
  (location.hostname.endsWith('github.io') ||
    location.hostname === 'localhost' ||
    // build GH Pages usa PUBLIC_PATH=/avoto-pt/
    String(import.meta.env.BASE_URL || '/').includes('/avoto-pt'))

if (isGitHubPages) {
  // limpa SW legados e não volta a registar
  nukeServiceWorkers().then(() => {
    // se havia controller, um reload garante HTML/JS frescos da rede
    if (navigator.serviceWorker?.controller) {
      try {
        if (sessionStorage.getItem('avoto-sw-nuked') !== '1') {
          sessionStorage.setItem('avoto-sw-nuked', '1')
          window.location.reload()
        }
      } catch {
        window.location.reload()
      }
    }
  })
} else {
  // Recarregar 1× quando um SW novo assume o controlo (atualização).
  // Na 1.ª visita não havia controller: o clientsClaim não deve recarregar.
  const hadController = !!navigator.serviceWorker?.controller
  let refreshing = false
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return
    refreshing = true
    window.location.reload()
  })

  register(import.meta.env.QUASAR_SERVICE_WORKER_FILE, {
    ready () {},

    registered (registration) {
      if (registration && typeof registration.update === 'function') {
        setInterval(() => {
          registration.update().catch(() => {})
        }, 60 * 60 * 1000)
      }
    },

    cached () {},
    updatefound () {},

    updated (registration) {
      // o reload acontece no controllerchange (uma vez)
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    },

    offline () {},
    error () {},
  })
}
