/**
 * In-App Review Service
 * Uses the Google Play In-App Review API via @capacitor-community/in-app-review
 *
 * Triggers a native review prompt at moments of user delight.
 * Google controls whether the dialog actually appears — it may be suppressed
 * if the user has already reviewed or if the quota has been exceeded.
 *
 * Rules we enforce:
 * - Only on native Android (never on web)
 * - Only after the user has been active for at least 7 days
 * - Only after a meaningful milestone (5+ care tasks completed)
 * - Never more than once every 60 days
 */

const REVIEW_STORAGE_KEY = 'paws_review_last_prompted';
const REVIEW_INSTALL_KEY = 'paws_review_install_date';
const MIN_DAYS_SINCE_INSTALL = 7;
const MIN_DAYS_BETWEEN_PROMPTS = 60;
const MIN_CARE_TASKS_COMPLETED = 5;

// Use a variable for the package name so Rollup/Vite does not statically
// analyze and try to bundle this native-only Capacitor plugin on web builds.
const IN_APP_REVIEW_PLUGIN = '@capacitor-community/in-app-review';

function isNativeAndroid() {
  return !!(window.Capacitor?.isNativePlatform?.());
}

function getDaysSince(isoDateString) {
  if (!isoDateString) return 999;
  const then = new Date(isoDateString);
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

/**
 * Records the install date the first time the app is launched.
 * Call this from Layout.jsx on startup.
 */
export function recordInstallDate() {
  if (!localStorage.getItem(REVIEW_INSTALL_KEY)) {
    localStorage.setItem(REVIEW_INSTALL_KEY, new Date().toISOString());
  }
}

/**
 * Attempts to show the in-app review prompt if all conditions are met.
 * Safe to call — silently exits if conditions are not satisfied.
 *
 * @param {number} careTasksCompleted - Total care tasks the user has completed
 */
export async function maybeRequestReview(careTasksCompleted = 0) {
  // Only on native Android
  if (!isNativeAndroid()) return;

  // Check milestone
  if (careTasksCompleted < MIN_CARE_TASKS_COMPLETED) return;

  // Check install age
  const installDate = localStorage.getItem(REVIEW_INSTALL_KEY);
  if (getDaysSince(installDate) < MIN_DAYS_SINCE_INSTALL) return;

  // Check time since last prompt
  const lastPrompted = localStorage.getItem(REVIEW_STORAGE_KEY);
  if (lastPrompted && getDaysSince(lastPrompted) < MIN_DAYS_BETWEEN_PROMPTS) return;

  try {
    // Dynamic import via variable prevents Rollup from bundling this
    // native-only plugin into the web build
    const { InAppReview } = await import(/* @vite-ignore */ IN_APP_REVIEW_PLUGIN);
    await InAppReview.requestReview();
    localStorage.setItem(REVIEW_STORAGE_KEY, new Date().toISOString());
    console.log('✓ In-app review prompt requested');
  } catch (err) {
    // Non-critical — silently fail if plugin is not available
    console.warn('In-app review not available:', err?.message);
  }
}
