// Service Worker generation and injection
// This creates and registers the service worker code for PWA offline support and push notifications

export function injectServiceWorker() {
  const serviceWorkerCode = `
// Service Worker for Paws & Claws PWA
// Handles offline caching, background sync, and push notifications

const CACHE_VERSION = 'paws-v2';
const STATIC_CACHE = 'paws-static-v2';
const DYNAMIC_CACHE = 'paws-dynamic-v2';
const IMAGE_CACHE = 'paws-images-v2';

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('📦 Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // It's okay if some assets fail to cache
        console.warn('⚠️ Some assets failed to cache');
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== IMAGE_CACHE) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker taking control');
      return self.clients.claim();
    })
  );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip OneSignal and external APIs
  if (request.url.includes('onesignal') || 
      request.url.includes('cdn.onesignal.com') ||
      url.hostname.includes('supabase') ||
      url.hostname.includes('base44.app') && url.pathname.includes('/api/')) {
    return;
  }
  
  // Images - Cache first
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#e2e8f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dominant-baseline="middle" fill="#64748b" font-size="40">🐾</text></svg>', 
            { headers: { 'Content-Type': 'image/svg+xml' } });
        });
      })
    );
    return;
  }

  // Network first strategy for everything else
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(request)
          .then((cached) => {
            if (cached) return cached;
            
            // Offline fallback page
            if (request.destination === 'document') {
              return caches.match('/').then(indexPage => {
                return indexPage || new Response(
                  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Offline - Paws & Claws</title></head><body style="margin:0;padding:0;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;background:#0F172A;color:white;text-align:center"><div><h1 style="font-size:4rem;margin:0">🐾</h1><h2 style="margin:1rem 0">You are offline</h2><p style="color:#94a3b8">Please check your internet connection</p></div></body></html>',
                  { headers: { 'Content-Type': 'text/html' } }
                );
              });
            }
            
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Push notification event - Compatible with OneSignal
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received');
  
  if (!event.data) {
    console.log('No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    const title = data.title || data.heading || 'Paws & Claws';
    const body = data.body || data.content || data.message || 'You have a new notification';
    const icon = data.icon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%233B82F6;stop-opacity:1" /><stop offset="100%" style="stop-color:%23A855F7;stop-opacity:1" /></linearGradient></defs><rect fill="url(%23grad)" width="192" height="192" rx="42"/><text x="50%" y="55%" font-size="100" text-anchor="middle" dominant-baseline="middle">🐾</text></svg>';
    
    const options = {
      body: body,
      icon: icon,
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%233B82F6" width="96" height="96" rx="21"/><text x="50%" y="55%" font-size="50" text-anchor="middle" dominant-baseline="middle">🐾</text></svg>',
      tag: data.tag || 'paws-notification',
      requireInteraction: data.requireInteraction || false,
      vibrate: [200, 100, 200],
      data: data.data || data.url || {},
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Paws & Claws', {
        body: 'You have a new notification',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%233B82F6" width="192" height="192" rx="42"/><text x="50%" y="55%" font-size="100" text-anchor="middle" dominant-baseline="middle">🐾</text></svg>'
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if app window is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for reminders
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync event:', event.tag);
  
  if (event.tag === 'sync-reminders') {
    event.waitUntil(
      fetch('/api/reminders/sync')
        .then(response => response.json())
        .then(data => {
          console.log('✅ Reminders synced');
          return data;
        })
        .catch(error => {
          console.error('❌ Sync failed:', error);
          throw error; // Retry sync
        })
    );
  }
});

console.log('✅ Service Worker loaded');
  `;

  // Create blob and register as service worker
  const blob = new Blob([serviceWorkerCode], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);

  // Create a data URL for the service worker
  return {
    code: serviceWorkerCode,
    blobUrl: url
  };
}

// Alternative: Load service worker from file
export async function loadServiceWorkerFile() {
  try {
    const response = await fetch('/service-worker.js');
    if (response.ok) {
      console.log('✅ Service Worker file loaded');
      return true;
    }
  } catch (error) {
    console.warn('⚠️ Service Worker file not found, will use dynamic registration');
    return false;
  }
}