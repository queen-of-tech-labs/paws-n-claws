// Service Worker Manager - Handles PWA registration and setup
import { injectServiceWorker } from './generateServiceWorker';

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('ℹ️ Service Workers not supported');
    return null;
  }

  try {
    console.log('📝 Registering service worker at /service-worker.js');
    
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
      updateViaCache: 'none'
    });
    
    console.log('✅ Service Worker registered:', registration);
    
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('📦 Service Worker update found');
      
      newWorker.addEventListener('statechange', () => {
        console.log('🔄 Service Worker state:', newWorker.state);
        if (newWorker.state === 'activated') {
          console.log('🚀 Service Worker activated');
        }
      });
    });
    
    if (registration.installing) {
      console.log('📦 Service Worker installing...');
    } else if (registration.waiting) {
      console.log('⏳ Service Worker waiting...');
    } else if (registration.active) {
      console.log('🚀 Service Worker active');
    }
    
    setInterval(() => registration.update(), 60000);

    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
}

export function setupInstallPrompt(callback) {
  let deferredPrompt;

  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (event) => {
    console.log('📲 Install prompt available');
    event.preventDefault();
    deferredPrompt = event;
    
    // Notify app that install prompt is available
    if (callback) {
      callback(deferredPrompt);
    }
  });

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    console.log('✅ App installed');
    deferredPrompt = null;
  });

  return {
    trigger: async () => {
      if (!deferredPrompt) {
        console.warn('⚠️ Install prompt not available');
        return false;
      }
      
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      deferredPrompt = null;
      return outcome === 'accepted';
    },
    isAvailable: () => !!deferredPrompt
  };
}

export function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('⚠️ Notifications not supported');
    return Promise.resolve('denied');
  }

  if (Notification.permission === 'granted') {
    return Promise.resolve('granted');
  }

  if (Notification.permission === 'denied') {
    return Promise.resolve('denied');
  }

  // Default: ask user
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