import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/index.css'
import '@/globals.css'
import '@/styles/PetPassport.css'
import '@/styles/HealthDataManager.css'
import { Capacitor } from '@capacitor/core'

// test build 123

// ── TEMPORARY DIAGNOSTIC: iOS ONLY — shows startup errors on-screen AND
// reports them to a webhook URL for remote viewing, since on-device
// debugging tools have been unreliable on Windows. Scoped to iOS only so
// it's a complete no-op on Android and web, which don't need debugging
// right now. Safe to remove entirely once the iOS issue is resolved.
const DIAGNOSTIC_ENABLED = Capacitor.getPlatform() === 'ios';
const DIAGNOSTIC_WEBHOOK_URL = 'https://webhook.site/c03cc926-16ce-425e-9585-e32e54f233e2';

function reportToWebhook(title, err, consoleLog) {
  if (!DIAGNOSTIC_ENABLED) return;
  try {
    const payload = JSON.stringify({
      title,
      message: err && err.message ? err.message : String(err),
      stack: err && err.stack ? err.stack : 'no stack available',
      consoleLog: (consoleLog || []).map((e) => '[' + e.type + '] ' + e.args.join(' ')),
      timestamp: new Date().toISOString(),
    });

    // sendBeacon avoids the CORS preflight that was blocking fetch() in this
    // WebView, and is specifically designed to reliably deliver data even
    // when the page is crashing/unloading — exactly this situation.
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'text/plain' });
      navigator.sendBeacon(DIAGNOSTIC_WEBHOOK_URL, blob);
    } else {
      // Fallback: text/plain content-type avoids the preflight fetch()
      // would otherwise trigger with 'application/json'.
      fetch(DIAGNOSTIC_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: payload,
      }).catch(() => {});
    }
  } catch (e) {
    // Ignore — never let the diagnostic reporting itself crash the app.
  }
}

// Capture console.error/warn BEFORE anything else runs, so we don't miss
// early messages from third-party SDKs (like Google Maps) that log their
// real failure reason to console right before throwing a vague, sanitized
// "Script error." — which is all window.onerror can see for cross-origin
// scripts. Console messages aren't subject to that restriction, so this is
// often the only way to see what actually went wrong.
// Only active on iOS (see DIAGNOSTIC_ENABLED above) — console is left
// completely untouched on Android and web.
window.__consoleLog = [];
if (DIAGNOSTIC_ENABLED) {
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
}

// Tracks whether React has successfully rendered at least once. Errors
// that happen AFTER this point get reported but don't destroy the UI —
// window.onerror fires for ANY uncaught script error anywhere on the
// page, even harmless ones that don't actually stop the app from
// working. Wiping the screen on every single one of those was possibly
// hiding a working app behind a false "crash" screen.
window.__appHasRendered = false;

function showFatalError(title, err) {
  if (!DIAGNOSTIC_ENABLED) return;
  reportToWebhook(title, err, window.__consoleLog);

  if (window.__appHasRendered) {
    // App already rendered successfully — don't destroy it. Just show a
    // small non-blocking banner so we know an error happened without
    // hiding whatever is actually on screen.
    try {
      const banner = document.createElement('div');
      banner.textContent = '⚠️ ' + title + ': ' + (err && err.message ? err.message : String(err)) + ' (reported, app left visible)';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;padding:8px;font-size:11px;font-family:monospace;';
      document.body.appendChild(banner);
    } catch (e) {}
    return;
  }

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
      '<div style="margin-top:10px;color:#080;"><strong>This was also sent to the webhook for remote viewing.</strong></div>' +
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
    window.__appHasRendered = true;
    // If the app rendered successfully but something still logged an
    // error/warning in the background (e.g. Google Maps failing silently
    // on a page that doesn't crash the whole app), show a small tappable
    // indicator so it's not invisible.
    setTimeout(() => {
      if (window.__consoleLog && window.__consoleLog.length > 0) {
        reportToWebhook('Console Errors (app did not crash)', { message: 'See consoleLog field' }, window.__consoleLog);
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
