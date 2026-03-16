// OneSignal Service Worker - place this at /public/OneSignalSDKWorker.js
// OneSignal requires this file to be at the root of your site

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Required by OneSignal v16 - must be on initial evaluation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
