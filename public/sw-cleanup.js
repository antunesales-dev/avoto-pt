/**
 * GitHub Pages: desregista service workers e limpa Cache API.
 * Builds antigos em PWA serviam index/chunks desactualizados (tabela em vez de cards).
 * CSP: ficheiro externo (script-src 'self').
 */
(function () {
  try {
    var h = location.hostname || ''
    if (!h.endsWith('github.io') && h !== 'localhost' && h !== '127.0.0.1') return
    if (!('serviceWorker' in navigator)) return

    var FLAG = 'avoto-sw-nuked-v3'
    var already = false
    try {
      already = sessionStorage.getItem(FLAG) === '1'
    } catch (e) {
      /* private mode */
    }

    navigator.serviceWorker.getRegistrations().then(function (regs) {
      var had = regs && regs.length > 0
      var p = had
        ? Promise.all(
            regs.map(function (r) {
              return r.unregister()
            }),
          )
        : Promise.resolve()

      return p
        .then(function () {
          if (!window.caches) return
          return caches.keys().then(function (keys) {
            return Promise.all(
              keys.map(function (k) {
                return caches.delete(k)
              }),
            )
          })
        })
        .then(function () {
          // Se havia SW ou ainda não marcámos esta sessão: recarregar uma vez
          if (!had && already) return
          try {
            sessionStorage.setItem(FLAG, '1')
          } catch (e2) {
            /* ignore */
          }
          if (had || !already) {
            location.reload()
          }
        })
    })
  } catch (e) {
    /* ignore */
  }
})()
