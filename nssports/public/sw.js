/**
 * Service Worker for NorthStar Sports PWA
 * 
 * Official Next.js PWA Best Practices:
 * - Cache static assets for offline access
 * - Network-first strategy for API calls
 * - Cache-first strategy for static assets
 * - Skip authentication requests to prevent redirect issues in Safari
 * 
 * Reference: https://nextjs.org/docs/app/guides/progressive-web-apps
 */

const CACHE_NAME = 'nssports-v2';
const STATIC_CACHE = [
  '/',
  '/manifest.webmanifest',
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip authentication and auth-related requests - let them go directly to network
  // This prevents Safari's "response served by service worker has redirections" error
  if (url.pathname.startsWith('/api/auth') || 
      url.pathname.startsWith('/auth/') ||
      url.pathname === '/auth' ||
      url.pathname.includes('callback') ||
      url.pathname.includes('signin') ||
      url.pathname.includes('signout')) {
    return;
  }

  // API requests - network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache redirects (Safari compatibility)
          if (response.type === 'opaqueredirect' || response.redirected) {
            return response;
          }
          
          // Clone and cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets - cache first, fall back to network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        // Don't cache redirects (Safari compatibility)
        if (response.type === 'opaqueredirect' || response.redirected) {
          return response;
        }
        
        // Cache new static assets
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
