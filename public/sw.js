const CACHE_NAME = 'mayombe-v4'
const OFFLINE_URL = '/'

// Routes that should NEVER be cached (auth-sensitive)
const NO_CACHE_ROUTES = [
  '/auth',
  '/reset-password',
  '/forgot-password',
  '/complete-profile',
  '/vendor/dashboard',
  '/logistician/dashboard',
  '/admin',
  '/checkout',
  '/cart',
  '/orders',
  '/account',
]

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/placeholder-image.svg',
]

// Install: precache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate: clean up ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Listen for SKIP_WAITING message from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Check if URL is an auth-sensitive route
function isProtectedRoute(url) {
  const path = new URL(url).pathname
  return NO_CACHE_ROUTES.some((route) => path.startsWith(route))
}

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip Supabase API calls and auth
  if (request.url.includes('supabase.co')) return

  // Skip Cloudinary images (le fetch échoue dans le SW → affiche le placeholder)
  if (request.url.includes('res.cloudinary.com')) return

  // Skip Chrome extensions
  if (request.url.startsWith('chrome-extension://')) return

  // NEVER cache auth-sensitive pages — always go to network
  if (isProtectedRoute(request.url)) return

  // For navigation requests (HTML pages): network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses for offline fallback
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => {
          // Offline: try to serve cached version, then fallback to home
          return caches.match(request)
            .then((cached) => cached || caches.match(OFFLINE_URL))
            .then((fallback) => fallback || new Response('Hors ligne — vérifiez votre connexion internet.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            }))
        })
    )
    return
  }

  // For images: cache-first
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        }).catch(() => caches.match('/placeholder-image.svg'))
      })
    )
    return
  }

  // For static assets (JS, CSS, fonts): stale-while-revalidate
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        }).catch(() => {
          // Network failed, return cached or nothing
          return cached || new Response('', { status: 503 })
        })
        return cached || fetchPromise
      })
    )
    return
  }
})
