// Service Worker Manager
// NOTE: We do NOT register a custom service worker here because
// OneSignal registers its own (OneSignalSDKWorker.js) at scope '/'.
// Registering a second SW at the same scope causes 409 conflicts
// and breaks push notification delivery.

export async function registerServiceWorker() {
  // Intentionally disabled — OneSignal handles its own service worker.
  // Do not re-enable this without scoping to a different path (e.g. /sw/).
  return null;
}

export function setupInstallPrompt(callback) {
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (callback) callback(deferredPrompt);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });

  return {
    trigger: async () => {
      if (!deferredPrompt) return false;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      return outcome === 'accepted';
    },
    isAvailable: () => !!deferredPrompt,
  };
}

export function requestNotificationPermission() {
  if (!('Notification' in window)) return Promise.resolve('denied');
  if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
  return Notification.requestPermission();
}

export function isOnline() {
  return navigator.onLine;
}

export function onOnlineStatusChange(callback) {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
