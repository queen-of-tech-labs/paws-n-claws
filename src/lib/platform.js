/**
 * Centralized platform detection — the single source of truth for
 * "is this running inside the native app or a real web browser."
 *
 * This replaces ~16 scattered, duplicated checks of the form
 * `window.Capacitor?.isNativePlatform?.()` that were spread across the
 * codebase. That pattern depends entirely on Capacitor's native bridge
 * having correctly initialized its JS globals — if that ever silently
 * fails, every one of those checks would independently misreport "web"
 * while actually running inside the native app, which can cause
 * web-only code (like loading a remote SDK script) to run inside the
 * native WebView with hard-to-diagnose results.
 *
 * This version checks the URL protocol FIRST, which cannot be fooled by
 * a bridge failure — capacitor:// and ionic:// are never used by a real
 * website, full stop — and only falls back to the Capacitor API second.
 */
export function isNativePlatform() {
  try {
    const protocol = window.location.protocol;
    if (protocol === 'capacitor:' || protocol === 'ionic:') return true;
  } catch (e) {
    // ignore — fall through
  }
  try {
    if (window.Capacitor?.isNativePlatform?.()) return true;
  } catch (e) {
    // ignore
  }
  return false;
}

export function getPlatform() {
  try {
    if (window.Capacitor?.getPlatform) return window.Capacitor.getPlatform();
  } catch (e) {
    // ignore
  }
  if (isNativePlatform()) return 'native';
  return 'web';
}

export function isIOS() {
  try {
    return window.Capacitor?.getPlatform?.() === 'ios';
  } catch (e) {
    return false;
  }
}
