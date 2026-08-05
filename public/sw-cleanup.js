/**
 * GitHub Pages: desregista service workers legados que servem chunks com hash antigo (404).
 * Ficheiro externo — o CSP não permite script inline (script-src 'self').
 */
(function () {
  try {
    var h = location.hostname || ''
    if (!h.endsWith('github.io') && h !== 'localhost' && h !== '127.0.0.1') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      if (!regs.length) return
      return Promise.all(
        regs.map(function (r) {
          return r.unregister()
        }),
      )
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
          try {
            if (sessionStorage.getItem('avoto-sw-nuked') === '1') return
            sessionStorage.setItem('avoto-sw-nuked', '1')
          } catch (e) {
            /* ignore */
          }
          location.reload()
        })
    })
  } catch (e) {
    /* ignore */
  }
})()
