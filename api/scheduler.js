/**
 * Vercel Cron Job: /api/scheduler
 * Runs every 5 minutes via Vercel cron.
 *
 * Handles all notification types with proper timezone support:
 * - Medication reminders (fires at each local time in medication_times)
 * - Scheduled time reminders (fires at due_time, timezone-aware)
 * - Advance notice reminders (fires day before due_date)
 * - One-time reminders (fires on due_date)
 * - Overdue reminders (fires once per day)
 * - Recurring reminders (auto-advances due_date after firing)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ONESIGNAL_APP_ID = '83fd3bf4-a60e-4651-8a59-6141189b6831';
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

function getDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

async function sendPush({ userId, title, body, url = '/' }) {
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!restApiKey) throw new Error('ONESIGNAL_REST_API_KEY not set');
  const res = await fetch(ONESIGNAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${restApiKey}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: body },
      url,
      include_aliases: { external_id: [userId] },
      target_channel: 'push',
    }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.errors?.[0] || 'OneSignal error');
  return result;
}

function getNextDueDate(currentDueDate, recurrence, intervalDays = 1) {
  const date = new Date(currentDueDate + 'T12:00:00Z');
  switch (recurrence) {
    case 'daily':      date.setUTCDate(date.getUTCDate() + 1); break;
    case '2x-daily':   date.setUTCDate(date.getUTCDate() + 1); break;
    case 'weekly':     date.setUTCDate(date.getUTCDate() + 7); break;
    case 'monthly':    date.setUTCMonth(date.getUTCMonth() + 1); break;
    case 'quarterly':  date.setUTCMonth(date.getUTCMonth() + 3); break;
    case 'semi-annual':date.setUTCMonth(date.getUTCMonth() + 6); break;
    case 'yearly':
    case 'annual':     date.setUTCFullYear(date.getUTCFullYear() + 1); break;
    case 'custom':     date.setUTCDate(date.getUTCDate() + (intervalDays || 1)); break;
    default:           return null;
  }
  return date.toISOString().split('T')[0];
}

/**
 * Convert a local time string + timezone offset to UTC time string
 * tzOffset = minutes behind UTC (EST = 300, PST = 480)
 * localTime = "HH:MM" in user's local time
 */
function localTimeToUTC(localTime, tzOffset) {
  if (!localTime) return null;
  const [h, m] = localTime.split(':').map(Number);
  const totalUTCMins = h * 60 + m + (tzOffset || 0);
  const utcH = Math.floor(((totalUTCMins % 1440) + 1440) % 1440 / 60);
  const utcM = ((totalUTCMins % 1440) + 1440) % 1440 % 60;
  return `${String(utcH).padStart(2,'0')}:${String(utcM).padStart(2,'0')}`;
}

/**
 * Convert a UTC date string to the user's local date string
 * This handles cases where it's e.g. still "yesterday" in UTC but "today" for the user
 */
function utcToLocalDateStr(utcNow, tzOffset) {
  const localMs = utcNow.getTime() - (tzOffset || 0) * 60 * 1000;
  return new Date(localMs).toISOString().split('T')[0];
}

/**
 * Check if current UTC time is within a 5-minute window of the target UTC time
 */
function isWithinWindow(currentUTCMins, targetTimeStr, windowMins = 5) {
  if (!targetTimeStr) return false;
  const [h, m] = targetTimeStr.split(':').map(Number);
  const targetUTCMins = h * 60 + m;
  const diff = Math.abs(currentUTCMins - targetUTCMins);
  // Handle midnight wraparound
  return diff <= windowMins || diff >= (1440 - windowMins);
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization'];
  if (req.method !== 'GET' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = getDb();
  const now = new Date();
  const utcTodayStr = now.toISOString().split('T')[0];
  const utcCurrentMins = now.getUTCHours() * 60 + now.getUTCMinutes();

  console.log(`Scheduler running at UTC ${now.toISOString()}`);

  let sent = 0;
  let errors = 0;

  try {
    const remindersSnap = await db.collection('reminders')
      .where('status', 'in', ['pending', 'active'])
      .get();

    console.log(`Found ${remindersSnap.size} pending reminders`);

    for (const doc of remindersSnap.docs) {
      const reminder = { id: doc.id, ...doc.data() };

      try {
        // Get user profile
        const profilesSnap = await db.collection('profiles')
          .where('email', '==', reminder.created_by)
          .limit(1)
          .get();
        if (profilesSnap.empty) continue;
        const profile = profilesSnap.docs[0].data();
        if (!profile.premium_subscriber && profile.role !== 'admin') continue;

        const userId = profilesSnap.docs[0].id;

        // Get pet name
        let petDisplayName = 'your pet';
        if (reminder.pet_id) {
          const petDoc = await db.collection('pets').doc(reminder.pet_id).get();
          if (petDoc.exists) petDisplayName = petDoc.data().name || petDisplayName;
        }

        // Get user's timezone offset (stored in reminder, default to 0/UTC)
        const tzOffset = reminder.timezone_offset || 0;

        // Calculate today's date in the USER'S local timezone
        const localTodayStr = utcToLocalDateStr(now, tzOffset);
        const localTomorrowStr = utcToLocalDateStr(new Date(now.getTime() + 86400000), tzOffset);

        const notifSentToday = reminder.last_notified_date === localTodayStr;

        // ── TYPE 1: MEDICATION reminders ──
        // medication_times stores LOCAL times (e.g. "05:45", "16:55")
        // Convert each to UTC and check if we're within 5-min window
        if (reminder.type === 'medication' && Array.isArray(reminder.medication_times) && reminder.medication_times.length > 0) {
          for (const localMedTime of reminder.medication_times) {
            if (!localMedTime) continue;
            const utcMedTime = localTimeToUTC(localMedTime, tzOffset);
            const notifKey = `notified_${localTodayStr}_${localMedTime.replace(':', '')}`;

            if (isWithinWindow(utcCurrentMins, utcMedTime) && !reminder[notifKey]) {
              await sendPush({
                userId,
                title: `💊 Medication Time`,
                body: `Time to give ${petDisplayName} their medication: ${reminder.title}`,
                url: '/reminders',
              });
              await doc.ref.update({ [notifKey]: true, last_notified_date: localTodayStr });
              sent++;
              console.log(`Sent medication reminder: ${reminder.title} at local ${localMedTime} (UTC ${utcMedTime})`);
            }
          }

          // Handle recurring medication — advance due_date if needed
          if (reminder.recurrence && reminder.recurrence !== 'none' && reminder.due_date <= localTodayStr) {
            const nextDue = getNextDueDate(reminder.due_date, reminder.recurrence, reminder.reminder_interval_days);
            if (nextDue && nextDue !== reminder.due_date) {
              // Clear today's notification keys so tomorrow works fresh
              const clearUpdate = { due_date: nextDue, status: 'pending' };
              await doc.ref.update(clearUpdate);
              console.log(`Advanced recurring medication ${reminder.title} to ${nextDue}`);
            }
          }
          continue;
        }

        // ── TYPE 2: ADVANCE NOTICE reminders ──
        if (reminder.reminder_advance_days > 0 && reminder.due_date) {
          const advanceDate = new Date(reminder.due_date + 'T12:00:00Z');
          advanceDate.setUTCDate(advanceDate.getUTCDate() - reminder.reminder_advance_days);
          const advanceDateStr = advanceDate.toISOString().split('T')[0];

          if (advanceDateStr === localTodayStr && !notifSentToday) {
            await sendPush({
              userId,
              title: `🔔 Upcoming Reminder`,
              body: `${reminder.title} for ${petDisplayName} is due in ${reminder.reminder_advance_days} day(s)!`,
              url: '/reminders',
            });
            await doc.ref.update({ last_notified_date: localTodayStr });
            sent++;
            console.log(`Sent advance notice: ${reminder.title}`);
            continue;
          }
        }

        // ── TYPE 3: SCHEDULED TIME reminders ──
        // due_time is stored as UTC ("HH:MM") — compare directly with current UTC
        if (reminder.due_date === localTodayStr && reminder.due_time && !notifSentToday) {
          if (isWithinWindow(utcCurrentMins, reminder.due_time)) {
            await sendPush({
              userId,
              title: `⏰ ${reminder.title}`,
              body: `Scheduled reminder for ${petDisplayName}`,
              url: '/reminders',
            });
            await doc.ref.update({ last_notified_date: localTodayStr, notification_sent: true });
            sent++;
            console.log(`Sent scheduled reminder: ${reminder.title}`);
            continue;
          }
        }

        // ── TYPE 4: ONE-TIME reminders (no specific time) ──
        if (reminder.due_date === localTodayStr && !reminder.due_time && !reminder.medication_times?.length && !notifSentToday) {
          await sendPush({
            userId,
            title: `🐾 ${reminder.title}`,
            body: `${reminder.title} is due today for ${petDisplayName}`,
            url: '/reminders',
          });
          await doc.ref.update({ last_notified_date: localTodayStr, notification_sent: true });
          sent++;
          console.log(`Sent one-time reminder: ${reminder.title}`);
          continue;
        }

        // ── TYPE 5: OVERDUE reminders ──
        if (reminder.due_date < localTodayStr && !notifSentToday) {
          await sendPush({
            userId,
            title: `⚠️ Overdue: ${reminder.title}`,
            body: `${reminder.title} for ${petDisplayName} is overdue!`,
            url: '/reminders',
          });
          await doc.ref.update({ last_notified_date: localTodayStr });
          sent++;
          console.log(`Sent overdue reminder: ${reminder.title}`);
          continue;
        }

        // ── TYPE 6: RECURRING non-medication reminders ──
        if (reminder.recurrence && reminder.recurrence !== 'none' && reminder.due_date <= localTodayStr) {
          const nextDue = getNextDueDate(reminder.due_date, reminder.recurrence, reminder.reminder_interval_days);
          if (nextDue && nextDue !== reminder.due_date) {
            await doc.ref.update({
              due_date: nextDue,
              notification_sent: false,
              last_notified_date: null,
              status: 'pending',
            });
            console.log(`Advanced recurring reminder ${reminder.title} to ${nextDue}`);
          }
        }

      } catch (reminderErr) {
        console.error(`Error on reminder ${reminder.id}:`, reminderErr.message);
        errors++;
      }
    }

    // Care log overdue check
    const careSnap = await db.collection('careLogs')
      .where('status', '!=', 'completed')
      .get();

    for (const doc of careSnap.docs) {
      const log = { id: doc.id, ...doc.data() };
      if (!log.next_due_date) continue;

      const tzOffset = log.timezone_offset || 0;
      const localTodayStr = utcToLocalDateStr(now, tzOffset);

      if (log.next_due_date >= localTodayStr) continue;
      if (log.last_notified_date === localTodayStr) continue;

      try {
        const profilesSnap = await db.collection('profiles')
          .where('email', '==', log.created_by).limit(1).get();
        if (profilesSnap.empty) continue;
        const profile = profilesSnap.docs[0].data();
        if (!profile.premium_subscriber && profile.role !== 'admin') continue;
        const userId = profilesSnap.docs[0].id;

        let petName = 'your pet';
        if (log.pet_id) {
          const petDoc = await db.collection('pets').doc(log.pet_id).get();
          if (petDoc.exists) petName = petDoc.data().name || petName;
        }

        await sendPush({
          userId,
          title: `⚠️ Overdue Care Alert`,
          body: `${petName}'s ${log.title || log.type} is overdue. Tap to review.`,
          url: '/care',
        });
        await doc.ref.update({ last_notified_date: localTodayStr });
        sent++;
      } catch (e) {
        console.error('Care log notification error:', e.message);
        errors++;
      }
    }

    console.log(`Scheduler complete. Sent: ${sent}, Errors: ${errors}`);
    return res.status(200).json({ success: true, sent, errors, timestamp: now.toISOString() });

  } catch (err) {
    console.error('Scheduler failed:', err);
    return res.status(500).json({ error: err.message });
  }
}
