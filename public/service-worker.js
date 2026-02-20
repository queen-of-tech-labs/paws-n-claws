// Paws & Claws Service Worker
const CACHE_NAME = 'paws-claws-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let all requests pass through normally
  event.respondWith(fetch(event.request));
});
