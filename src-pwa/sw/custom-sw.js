/*
 * Service worker (InjectManifest): precache + push/notificationclick.
 * Push Web com app fechada exige VAPID + edge a enviar (ver docs/AUTH-PWA.md).
 */

import { clientsClaim } from 'workbox-core'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

if (import.meta.env.QUASAR_PROD) {
  registerRoute(
    new NavigationRoute(
      createHandlerBoundToURL(import.meta.env.QUASAR_PWA_FALLBACK_HTML),
      {
        denylist: [
          new RegExp(import.meta.env.QUASAR_PWA_SERVICE_WORKER_REGEX),
          /workbox-(.)*\.js$/,
        ],
      },
    ),
  )
}

/** Abre / foca a app no path do payload (digest, iniciativa, …). */
function openApp(urlPath) {
  const base = self.registration.scope.replace(/\/$/, '')
  const path = urlPath && urlPath.startsWith('/') ? urlPath : `/${urlPath || ''}`
  const target = `${base}${path || '/'}`

  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      if ('focus' in client) {
        client.navigate(target)
        return client.focus()
      }
    }
    if (self.clients.openWindow) {
      return self.clients.openWindow(target)
    }
    return undefined
  })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification?.data?.url || '/'
  event.waitUntil(openApp(url))
})

/** Web Push (VAPID). Payload JSON: { title, body, url, tag } */
self.addEventListener('push', (event) => {
  let data = {
    title: 'A Voto',
    body: 'Há novidades no Parlamento.',
    url: '/',
    tag: 'avoto-push',
  }
  try {
    if (event.data) {
      const parsed = event.data.json()
      data = { ...data, ...parsed }
    }
  } catch {
    try {
      const text = event.data?.text()
      if (text) data.body = text
    } catch {
      /* ignore */
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icons/icon-192x192.png',
      badge: 'icons/icon-128x128.png',
      data: { url: data.url || '/' },
      tag: data.tag || 'avoto-push',
      renotify: true,
    }),
  )
})
