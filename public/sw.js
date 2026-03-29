/**
 * Service Worker minimal — **aucune interception `fetch`**.
 * Les versions précédentes mettaient en cache navigation / images et pouvaient provoquer
 * placeholders à la place des photos Cloudinary. Ici le réseau est 100 % géré par le navigateur.
 *
 * Conservé : cycle de vie PWA (install / activate / SKIP_WAITING) pour les mises à jour.
 * v10 : bump nom de cache pour forcer reprise du nouveau bundle côté clients.
 */
const CACHE_NAME = 'mayombe-v10-no-intercept'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Supprime tous les caches SW historiques (mayombe-v*, poison possible).
      const keys = await caches.keys()
      await Promise.all(keys.map((name) => caches.delete(name)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
