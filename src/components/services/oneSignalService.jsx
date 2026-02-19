/**
 * OneSignal Push Notification Service
 * App ID: 83fd3bf4-a60e-4651-8a59-6141189b6831
 *
 * Notifications are sent via /api/send-notification (Vercel serverless function)
 * which keeps your OneSignal REST API Key secret on the server.
 */

export const ONESIGNAL_APP_ID = '83fd3bf4-a60e-4651-8a59-6141189b6831';

let initialized = false;
let initPromise = null;

// ─────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────

export async function initializeOneSignal(userId = null) {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
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

      if (userId) await window.OneSignal.login(userId);

      initialized = true;
      console.log('OneSignal initialized');
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
  if (!window.OneSignal) return Notification?.permission ?? 'default';
  try {
    const granted = window.OneSignal.Notifications.permission;
    return granted ? 'granted' : 'default';
  } catch {
    return Notification?.permission ?? 'default';
  }
}

export async function requestPermission(userId) {
  if (!window.OneSignal) return false;
  try {
    const granted = await window.OneSignal.Notifications.requestPermission();
    if (granted && userId) {
      await new Promise(r => setTimeout(r, 500));
      await window.OneSignal.login(userId);
    }
    return granted === true;
  } catch (err) {
    console.error('Permission request failed:', err);
    return false;
  }
}

export async function getSubscriptionId() {
  try {
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
  if (!window.OneSignal) return;
  try {
    await window.OneSignal.User.addTags({
      user_id: userId ?? '',
      email: email ?? '',
      is_premium: isPremium ? 'true' : 'false',
      role: role ?? 'user',
    });
  } catch (err) {
    console.error('Failed to set OneSignal tags:', err);
  }
}

// ─────────────────────────────────────────────
// SEND NOTIFICATIONS via Vercel serverless function
// ─────────────────────────────────────────────

async function callNotificationAPI(payload) {
  const response = await fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
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
// AUTO-CHECK ON LOGIN
// ─────────────────────────────────────────────

export async function checkAndNotifyDueReminders({ reminders = [], pets = [], userId }) {
  const permission = await getPermissionStatus();
  if (permission !== 'granted') return;

  const todayStr = new Date().toISOString().split('T')[0];
  const petMap = {};
  pets.forEach(p => { petMap[p.id] = p; });

  const due = reminders.filter(r =>
    r.due_date && r.due_date <= todayStr &&
    r.status !== 'completed' && r.status !== 'acknowledged'
  );

  for (const reminder of due.slice(0, 3)) {
    const pet = petMap[reminder.pet_id];
    const isOverdue = reminder.due_date < todayStr;
    if (isOverdue) {
      await sendCareAlertNotification({ petName: pet?.name ?? 'Your pet', careType: reminder.title, userId });
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
  const permission = await getPermissionStatus();
  if (permission !== 'granted') return;

  const todayStr = new Date().toISOString().split('T')[0];
  const petMap = {};
  pets.forEach(p => { petMap[p.id] = p; });

  const overdue = careLogs.filter(c =>
    c.next_due_date && c.next_due_date < todayStr && c.status !== 'completed'
  );

  for (const log of overdue.slice(0, 2)) {
    const pet = petMap[log.pet_id];
    await sendCareAlertNotification({ petName: pet?.name ?? 'Your pet', careType: log.title ?? log.type, userId });
  }
}
