/**
 * OneSignal Push Notification Service
 * App ID: 83fd3bf4-a60e-4651-8a59-6141189b6831
 * Native iOS/Android via @onesignal/capacitor-plugin
 * Web fallback via OneSignal Web SDK
 */

import OneSignal from '@onesignal/capacitor-plugin';
import { Capacitor } from '@capacitor/core';
import { isNativePlatform } from '@/lib/platform';

export const ONESIGNAL_APP_ID = '83fd3bf4-a60e-4651-8a59-6141189b6831';

let initialized = false;
let initPromise = null;

const isNative = isNativePlatform;

// ─────────────────────────────────────────────
// PERMISSION HELPERS
// ─────────────────────────────────────────────

// Fast synchronous check — never blocks, never hangs
function hasNotificationPermission() {
  // On native, always return true — the OS controls permission at the system level.
  // If the user denied it, notifications simply won't deliver (no harm done).
  if (isNative()) return true;
  try {
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
    return;
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (isNative()) {
        // ── NATIVE iOS / ANDROID ──
        console.warn('[OneSignal] Taking NATIVE path. protocol=' + window.location.protocol);
        // With the ES import there's no "wait for window.plugins to appear"
        // polling needed — the module is available as soon as it's imported.
        await OneSignal.initialize({ appId: ONESIGNAL_APP_ID });

        OneSignal.Notifications.addEventListener('click', (event) => {
          console.log('OneSignal notification clicked:', event);
        });

        if (userId) {
          try { await OneSignal.login(userId); } catch (e) {
            console.warn('OneSignal native login warning:', e);
          }
        }

        console.log('OneSignal native initialized');
      } else {
        // ── WEB BROWSER FALLBACK ── (unchanged)
        console.warn('[OneSignal] Taking WEB branch. protocol=' + window.location.protocol);
        // Extra safety net: never load a remote third-party script while
        // running inside the native app shell, even if isNative() is
        // somehow wrong. A failure in this branch on native would throw
        // an opaque cross-origin error that's hard to diagnose.
        if (isNativePlatform()) {
          console.warn('Skipping OneSignal web SDK load — running inside native app shell');
          return;
        }
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

        // Wait up to 5 seconds for push subscription token — NO login() call on web
        // login() is for native only and causes 409 conflicts on web
        let subWaitAttempts = 0;
        while (!window.OneSignal?.User?.pushSubscription?.id && subWaitAttempts < 50) {
          await new Promise(r => setTimeout(r, 100));
          subWaitAttempts++;
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
      const granted = OneSignal.Notifications.permission;
      return granted ? 'granted' : 'default';
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
      const accepted = await OneSignal.Notifications.requestPermission(true);
      if (accepted && userId) {
        try { await OneSignal.login(userId); } catch {}
      }
      return accepted === true;
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
      // Synchronous getter in the native Capacitor plugin — no callback needed.
      return OneSignal.User.pushSubscription.id ?? null;
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
      await OneSignal.User.addTags(tags);
    } else if (window.OneSignal) {
      await window.OneSignal.User.addTags(tags);
    }
  } catch (err) {
    console.warn('Failed to set OneSignal tags:', err?.message);
  }
}

// ─────────────────────────────────────────────
// SEND NOTIFICATIONS via Vercel API  (unchanged — server-side, not plugin-dependent)
// ─────────────────────────────────────────────

async function callNotificationAPI(payload) {
  const apiUrl = isNativePlatform() ? 'https://paws-n-claws.vercel.app/api/send-notification' : '/api/send-notification';
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
