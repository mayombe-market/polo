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
