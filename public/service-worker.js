// Paws & Claws - Minimal Service Worker
// This service worker intentionally does nothing except stay registered
// All network requests pass through directly to avoid any interference

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Do NOT intercept any fetch events - let everything go through natively
// This prevents interference with Firebase, OneSignal, and form submissions
