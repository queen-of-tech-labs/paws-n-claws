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

// Capture console.error/warn BEFORE anything else runs, so we don't miss
// early messages from third-party SDKs (like Google Maps) that log their
// real failure reason to console right before throwing a vague, sanitized
// "Script error." — which is all window.onerror can see for cross-origin
// scripts. Console messages aren't subject to that restriction, so this is
// often the only way to see what actually went wrong.
window.__consoleLog = [];
const _origError = console.error.bind(console);
const _origWarn = console.warn.bind(console);
console.error = (...args) => {
  window.__consoleLog.push({ type: 'error', args: args.map(String) });
  _origError(...args);
};
console.warn = (...args) => {
  window.__consoleLog.push({ type: 'warn', args: args.map(String) });
  _origWarn(...args);
};

function showFatalError(title, err) {
  try {
    const root = document.getElementById('root') || document.body;
    const consoleHtml = (window.__consoleLog || [])
      .map((entry) => '[' + entry.type + '] ' + entry.args.join(' '))
      .join('\n') || '(no console errors/warnings captured)';
    root.innerHTML =
      '<div style="padding:20px;font-family:monospace;font-size:13px;color:#111;background:#fff;white-space:pre-wrap;word-break:break-word;">' +
      '<h2 style="color:#c00;">' + title + '</h2>' +
      '<div><strong>Message:</strong> ' + (err && err.message ? err.message : String(err)) + '</div>' +
      '<div style="margin-top:10px;"><strong>Stack:</strong></div>' +
      '<div>' + (err && err.stack ? err.stack : 'no stack available') + '</div>' +
      '<div style="margin-top:10px;"><strong>Console errors/warnings before crash:</strong></div>' +
      '<div>' + consoleHtml + '</div>' +
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
    // If the app rendered successfully but something still logged an
    // error/warning in the background (e.g. Google Maps failing silently
    // on a page that doesn't crash the whole app), show a small tappable
    // indicator so it's not invisible.
    setTimeout(() => {
      if (window.__consoleLog && window.__consoleLog.length > 0) {
        const btn = document.createElement('button');
        btn.textContent = '⚠️ ' + window.__consoleLog.length + ' console error(s) — tap to view';
        btn.style.cssText = 'position:fixed;bottom:10px;left:10px;right:10px;z-index:99999;background:#c00;color:#fff;padding:10px;border:none;border-radius:8px;font-size:13px;';
        btn.onclick = () => showFatalError('Captured Console Errors (app did not crash)', { message: 'See console log below', stack: '' });
        document.body.appendChild(btn);
      }
    }, 3000);
  })
  .catch((err) => {
    showFatalError('Startup Crash (failed to load App.jsx)', err);
  });
