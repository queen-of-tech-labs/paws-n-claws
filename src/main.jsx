import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/index.css'
import '@/globals.css'
import '@/styles/PetPassport.css'
import '@/styles/HealthDataManager.css'

// test build 123

// ── TEMPORARY DIAGNOSTIC: shows startup errors on-screen ──
// Since debugging a white screen on a real iPhone normally requires Safari's
// remote inspector (Mac-only), this catches any crash during startup and
// renders it as plain text so it's visible directly on the device.
// Safe to remove once the white-screen issue is resolved.
function showFatalError(title, err) {
  try {
    const root = document.getElementById('root') || document.body;
    root.innerHTML =
      '<div style="padding:20px;font-family:monospace;font-size:13px;color:#111;background:#fff;white-space:pre-wrap;word-break:break-word;">' +
      '<h2 style="color:#c00;">' + title + '</h2>' +
      '<div><strong>Message:</strong> ' + (err && err.message ? err.message : String(err)) + '</div>' +
      '<div style="margin-top:10px;"><strong>Stack:</strong></div>' +
      '<div>' + (err && err.stack ? err.stack : 'no stack available') + '</div>' +
      '</div>';
  } catch (displayErr) {
    document.title = 'CRASH: ' + (err && err.message ? err.message : String(err));
  }
}

window.addEventListener('error', (event) => {
  showFatalError('Uncaught Error', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  showFatalError('Unhandled Promise Rejection', event.reason);
});

import('@/App.jsx')
  .then(({ default: App }) => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <App />
    );
  })
  .catch((err) => {
    showFatalError('Startup Crash (failed to load App.jsx)', err);
  });
