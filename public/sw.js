/**
 * Service Worker minimal — **aucune interception `fetch`**.
 * Les versions précédentes mettaient en cache navigation / images et pouvaient provoquer
 * placeholders à la place des photos Cloudinary. Ici le réseau est 100 % géré par le navigateur.
 *
 * Conservé : cycle de vie PWA (install / activate / SKIP_WAITING) pour les mises à jour.
 * v13 : suppression de `clients.claim()` — causait un reload complet de la page au premier
 * visit (controllerchange déclenchait `window.location.reload()` côté client), doublant
 * le LCP sur PageSpeed. Comme le SW n'intercepte pas `fetch`, claim() ne sert à rien.
 */
const CACHE_NAME = 'mayombe-v13-no-claim'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Supprime tous les caches SW historiques (mayombe-v*, poison possible).
      const keys = await caches.keys()
      await Promise.all(keys.map((name) => caches.delete(name)))
    })()
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try { data = event.data.json() } catch { return }

  const title   = data.title || 'Mayombe Market'
  const options = {
    body:              data.body || 'Nouvelle activité sur votre boutique',
    icon:              data.icon  || '/favicon.ico',
    badge:             '/favicon.ico',
    vibrate:           [400, 100, 400, 100, 400, 100, 600],  // sonnerie longue
    requireInteraction: true,   // reste affiché jusqu'à interaction du vendeur
    renotify:          true,
    tag:               'new-order',
    data:              { url: data.url || '/vendor/dashboard' },
    actions: [
      { action: 'open',    title: '📦 Voir la commande' },
      { action: 'dismiss', title: 'Plus tard' },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/vendor/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si un onglet du site est déjà ouvert → focus + navigation
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          client.postMessage({ type: 'PUSH_NAVIGATE', url })
          return
        }
      }
      // Sinon → ouvrir un nouvel onglet
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
