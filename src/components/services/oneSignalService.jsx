/**
 * OneSignal Push Notification Service
 * App ID: 83fd3bf4-a60e-4651-8a59-6141189b6831
 * Native Android via onesignal-cordova-plugin
 * Web fallback via OneSignal Web SDK
 */

export const ONESIGNAL_APP_ID = '83fd3bf4-a60e-4651-8a59-6141189b6831';

let initialized = false;
let initPromise = null;

const isNative = () => !!(window.Capacitor?.isNativePlatform?.());

// ─────────────────────────────────────────────
// PERMISSION HELPERS
// ─────────────────────────────────────────────

// Fast synchronous check — never blocks, never hangs
function hasNotificationPermission() {
  // On native, always return true — Android controls permission at OS level
  // If user denied, notifications simply won't deliver (no harm done)
  if (isNative()) return true;
  try {
    if (isNative()) {
      const os = window.plugins?.OneSignal;
      if (!os) return true; // assume ok if plugin not ready yet
      if (typeof os.Notifications?.hasPermission === 'function') {
        return os.Notifications.hasPermission();
      }
      // Can't check — assume granted so notifications aren't silently skipped
      return true;
    }
    return Notification?.permission === 'granted';
  } catch {
    return true; // fail open so notifications aren't silently dropped
  }
}

// ─────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────

export async function initializeOneSignal(userId = null) {
  if (initialized) {
    if (userId) {
      try {
        if (isNative()) {
          window.plugins?.OneSignal?.login(userId);
        } else if (window.OneSignal) {
          await window.OneSignal.login(userId);
        }
      } catch {}
    }
    return;
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (isNative()) {
        // ── NATIVE ANDROID ──
        await new Promise((resolve) => {
          const check = setInterval(() => {
            if (window.plugins?.OneSignal) {
              clearInterval(check);
              resolve();
            }
          }, 100);
          setTimeout(() => { clearInterval(check); resolve(); }, 5000);
        });

        if (!window.plugins?.OneSignal) throw new Error('OneSignal native plugin not found');

        window.plugins.OneSignal.initialize(ONESIGNAL_APP_ID);

        window.plugins.OneSignal.Notifications.addEventListener('click', (event) => {
          console.log('OneSignal notification clicked:', event);
        });

        if (userId) {
          try { window.plugins.OneSignal.login(userId); } catch (e) {
            console.warn('OneSignal native login warning:', e);
          }
        }

        console.log('OneSignal native initialized');
      } else {
        // ── WEB BROWSER FALLBACK ──
        if (!window.OneSignal) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });

          let attempts = 0;
          while (!window.OneSignal && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
          }
          if (!window.OneSignal) throw new Error('OneSignal SDK failed to load');
        }

        await window.OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/' },
          notifyButton: { enable: false },
          welcomeNotification: { disable: true },
        });

        // Wait up to 5 seconds for a push subscription token to become available
        // BEFORE calling login — login after an existing subscription causes 409
        let subWaitAttempts = 0;
        while (!window.OneSignal?.User?.pushSubscription?.id && subWaitAttempts < 50) {
          await new Promise(r => setTimeout(r, 100));
          subWaitAttempts++;
        }

        if (userId) {
          try {
            await window.OneSignal.login(userId);
          } catch (loginErr) {
            // 409 means this UID is already linked — safe to ignore, subscription still works
            if (loginErr?.message?.includes('409') || loginErr?.status === 409) {
              console.warn('OneSignal login 409 - user already linked, continuing');
            } else {
              console.warn('OneSignal login warning:', loginErr?.message);
            }
          }
        }

        console.log('OneSignal web initialized');
      }

      initialized = true;
    } catch (err) {
      console.error('OneSignal init failed:', err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

// ─────────────────────────────────────────────
// PERMISSION
// ─────────────────────────────────────────────

export async function getPermissionStatus() {
  try {
    if (isNative()) {
      return new Promise((resolve) => {
        window.plugins?.OneSignal?.Notifications?.getPermissionAsync((permission) => {
          resolve(permission ? 'granted' : 'default');
        });
      });
    }
    if (!window.OneSignal) return Notification?.permission ?? 'default';
    return window.OneSignal.Notifications.permission ? 'granted' : 'default';
  } catch {
    return Notification?.permission ?? 'default';
  }
}

export async function requestPermission(userId) {
  try {
    if (isNative()) {
      return new Promise((resolve) => {
        window.plugins?.OneSignal?.Notifications?.requestPermission(true, (accepted) => {
          if (accepted && userId) {
            try { window.plugins.OneSignal.login(userId); } catch {}
          }
          resolve(accepted);
        });
      });
    }
    if (!window.OneSignal) return false;
    const granted = await window.OneSignal.Notifications.requestPermission();
    if (granted && userId) {
      await new Promise(r => setTimeout(r, 500));
      try { await window.OneSignal.login(userId); } catch {}
    }
    return granted === true;
  } catch (err) {
    console.error('Permission request failed:', err);
    return false;
  }
}

export async function getSubscriptionId() {
  try {
    if (isNative()) {
      return new Promise((resolve) => {
        window.plugins?.OneSignal?.User?.pushSubscription?.getIdAsync?.((id) => {
          resolve(id ?? null);
        }) ?? resolve(null);
      });
    }
    return window.OneSignal?.User?.pushSubscription?.id ?? null;
  } catch {
    return null;
  }
}

export function isOneSignalReady() {
  return initialized;
}

// ─────────────────────────────────────────────
// USER TAGGING
// ─────────────────────────────────────────────

export async function setUserTags({ userId, email, isPremium, role }) {
  try {
    const tags = {
      user_id: userId ?? '',
      email: email ?? '',
      is_premium: isPremium ? 'true' : 'false',
      role: role ?? 'user',
    };
    if (isNative()) {
      window.plugins?.OneSignal?.User?.addTags(tags);
    } else if (window.OneSignal) {
      await window.OneSignal.User.addTags(tags);
    }
  } catch (err) {
    console.warn('Failed to set OneSignal tags:', err?.message);
  }
}

// ─────────────────────────────────────────────
// SEND NOTIFICATIONS via Vercel API
// ─────────────────────────────────────────────

async function callNotificationAPI(payload) {
  const apiUrl = window.Capacitor?.isNativePlatform?.() ? 'https://paws-n-claws.vercel.app/api/send-notification' : '/api/send-notification';
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Failed to send notification');
  }
  return response.json();
}

export async function sendReminderNotification({ title, body, petName, reminderType, userId }) {
  try {
    await callNotificationAPI({
      type: 'reminder',
      userId,
      notification: {
        title: `🐾 ${title}`,
        body: body || `Time to take care of ${petName}!`,
        data: { type: 'reminder', reminderType, petName },
        url: '/reminders',
      },
    });
  } catch (err) {
    console.error('Failed to send reminder notification:', err);
  }
}

export async function sendCareAlertNotification({ petName, careType, userId }) {
  try {
    await callNotificationAPI({
      type: 'care_alert',
      userId,
      notification: {
        title: `⚠️ Overdue Care Alert`,
        body: `${petName}'s ${careType} is overdue. Tap to review.`,
        data: { type: 'care_alert', petName, careType },
        url: '/care',
      },
    });
  } catch (err) {
    console.error('Failed to send care alert:', err);
  }
}

export async function sendAdminBroadcast({ title, body, url = '/' }) {
  await callNotificationAPI({
    type: 'broadcast',
    notification: { title, body, url, data: { type: 'broadcast' } },
  });
}

// ─────────────────────────────────────────────
// AUTO-CHECK ON APP OPEN
// Uses synchronous permission check — never hangs
// ─────────────────────────────────────────────

export async function checkAndNotifyDueReminders({ reminders = [], pets = [], userId }) {
  // Use fast synchronous check — no async callback that can hang
  if (!hasNotificationPermission()) {
    console.log('Skipping reminder notifications — permission not granted');
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const petMap = {};
  pets.forEach(p => { petMap[p.id] = p; });

  const due = reminders.filter(r =>
    r.due_date && r.due_date <= todayStr &&
    r.status !== 'completed' && r.status !== 'acknowledged'
  );

  console.log(`Found ${due.length} due reminders`);

  for (const reminder of due.slice(0, 3)) {
    const pet = petMap[reminder.pet_id];
    const isOverdue = reminder.due_date < todayStr;
    if (isOverdue) {
      await sendCareAlertNotification({
        petName: pet?.name ?? 'Your pet',
        careType: reminder.title,
        userId,
      });
    } else {
      await sendReminderNotification({
        title: reminder.title,
        body: `Due today for ${pet?.name ?? 'your pet'}`,
        petName: pet?.name ?? 'your pet',
        reminderType: reminder.type,
        userId,
      });
    }
  }
}

export async function checkAndNotifyOverdueCare({ careLogs = [], pets = [], userId }) {
  // Use fast synchronous check — no async callback that can hang
  if (!hasNotificationPermission()) {
    console.log('Skipping care notifications — permission not granted');
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const petMap = {};
  pets.forEach(p => { petMap[p.id] = p; });

  const overdue = careLogs.filter(c =>
    c.next_due_date && c.next_due_date < todayStr && c.status !== 'completed'
  );

  console.log(`Found ${overdue.length} overdue care logs`);

  for (const log of overdue.slice(0, 2)) {
    const pet = petMap[log.pet_id];
    await sendCareAlertNotification({
      petName: pet?.name ?? 'Your pet',
      careType: log.title ?? log.type,
      userId,
    });
  }
}
