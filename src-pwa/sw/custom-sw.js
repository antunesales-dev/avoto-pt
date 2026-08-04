/*
 * Service worker (InjectManifest): precache + push + HTML network-first.
 * Evita servir index.html antigo com hashes de chunks já inexistentes.
 */

import { clientsClaim } from 'workbox-core'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'

self.skipWaiting()
clientsClaim()

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Em activate: limpar caches + revalidar tabs (sai do shell com hashes mortos)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      await self.clients.claim()
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        // força reload com HTML da rede
        if (client.url && 'navigate' in client) {
          try {
            client.navigate(client.url)
          } catch {
            /* ignore */
          }
        }
      }
    })(),
  )
})

precacheAndRoute(self.__WB_MANIFEST, {
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
})
cleanupOutdatedCaches()

if (import.meta.env.QUASAR_PROD) {
  // HTML / navegação: rede primeiro para apanhar deploys novos
  registerRoute(
    ({ request }) => request.mode === 'navigate',
    new NetworkFirst({
      cacheName: 'avoto-pages',
      networkTimeoutSeconds: 4,
      plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
    }),
  )

  // SPA fallback offline (sem /assets/)
  registerRoute(
    new NavigationRoute(
      createHandlerBoundToURL(import.meta.env.QUASAR_PWA_FALLBACK_HTML),
      {
        denylist: [
          new RegExp(import.meta.env.QUASAR_PWA_SERVICE_WORKER_REGEX),
          /workbox-(.)*\.js$/,
          /\/assets\//,
        ],
      },
    ),
  )
}

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
