// Paws & Claws Service Worker
const CACHE_NAME = 'paws-claws-v1';

// URLs that should NEVER be intercepted - let them go directly to the network
const BYPASS_URLS = [
  'firebasestorage.googleapis.com',
  'firebase.googleapis.com',
  'firebaseio.com',
  'googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'cloudfunctions.net',
  'onesignal.com',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Let Firebase, Google APIs, and OneSignal requests pass through directly
  // without any service worker interference
  const shouldBypass = BYPASS_URLS.some(bypassUrl => url.includes(bypassUrl));
  
  if (shouldBypass) {
    return; // Don't call event.respondWith - browser handles it natively
  }

  // For all other requests, just fetch normally
  event.respondWith(fetch(event.request));
});
