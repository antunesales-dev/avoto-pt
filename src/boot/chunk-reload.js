import { defineBoot } from '#q-app'

/**
 * Após deploy PWA, o SW antigo pode servir um shell cujo import map
 * aponta para chunks com hash que já não existem (404).
 * Um único hard-reload costuma resolver.
 */
const KEY = 'avoto-chunk-reload'

function shouldReload(msg) {
  return /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed|dynamically imported module/i.test(
    String(msg || ''),
  )
}

function reloadOnce() {
  try {
    if (sessionStorage.getItem(KEY) === '1') return
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* private mode */
  }
  window.location.reload()
}

export default defineBoot(() => {
  // boot ok → limpa o flag (evita loop se a falha for intermitente)
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault?.()
    reloadOnce()
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason
    const msg = reason?.message || reason
    if (shouldReload(msg)) {
      event.preventDefault?.()
      reloadOnce()
    }
  })
})
