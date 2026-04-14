// Rands Wallet Service Worker for GitHub Pages
// Repository: https://github.com/mziwonkekabuyaphi/Rands
// Live URL: https://mziwonkekabuyaphi.github.io/Rands/

const CACHE_NAME = 'rands-wallet-v1.0.0';
const REPO_PATH = '/Rands';

// Assets to cache immediately on install
const PRECACHE_URLS = [
  REPO_PATH + '/',
  REPO_PATH + '/index.html',
  REPO_PATH + '/login.html',
  REPO_PATH + '/home.html',
  REPO_PATH + '/queue.html',
  REPO_PATH + '/transact.html',
  REPO_PATH + '/card.html',
  REPO_PATH + '/ticket-store.html',
  REPO_PATH + '/manifest.json',
  REPO_PATH + '/icons/icon-192x192.png',
  REPO_PATH + '/icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('[SW] Installing Rands Wallet...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_URLS);
      })
      .catch(err => {
        console.error('[SW] Cache failed:', err);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cached version and update in background
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, networkResponse);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request)
          .then(networkResponse => {
            // Don't cache non-successful responses
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(error => {
            console.error('[SW] Fetch failed:', error);
            // Try to return a fallback page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(REPO_PATH + '/index.html');
            }
            return new Response('Offline - Please check your connection', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Simple offline notification
self.addEventListener('sync', event => {
  console.log('[SW] Sync event:', event.tag);
  // You can implement background sync later when you have an API
});

// Push notification handler
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: REPO_PATH + '/icons/icon-192x192.png',
    badge: REPO_PATH + '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || REPO_PATH + '/home.html'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Rands Vibe Pass', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || REPO_PATH + '/home.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message handling for skipWaiting
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});