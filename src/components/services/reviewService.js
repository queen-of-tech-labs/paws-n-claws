/**
 * In-App Review Service
 *
 * Requests a Google Play in-app review using the Capacitor App plugin's
 * built-in ability to open URLs, with a direct market:// deep link as the
 * trigger. This approach requires no extra packages beyond what is already
 * installed (@capacitor/app).
 *
 * Rules enforced:
 * - Only on native Android
 * - Only after the user has been active 7+ days
 * - Only after 5+ care tasks completed
 * - Never more than once every 60 days
 */

const REVIEW_STORAGE_KEY = 'paws_review_last_prompted';
const REVIEW_INSTALL_KEY = 'paws_review_install_date';
const MIN_DAYS_SINCE_INSTALL = 7;
const MIN_DAYS_BETWEEN_PROMPTS = 60;
const MIN_CARE_TASKS_COMPLETED = 5;
const PLAY_STORE_PACKAGE = 'paws.claws.pet.tracker';

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
 * Attempts to prompt the user for a review if all conditions are met.
 * Opens the Play Store listing directly — the simplest reliable approach
 * that works with any Capacitor version.
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
    const { App } = await import('@capacitor/app');
    // Opens the Play Store page for the app — user can leave a review from there
    await App.openUrl({ url: `market://details?id=${PLAY_STORE_PACKAGE}` });
    localStorage.setItem(REVIEW_STORAGE_KEY, new Date().toISOString());
    console.log('✓ Play Store review page opened');
  } catch (err) {
    console.warn('Review prompt not available:', err?.message);
  }
}
