/**
 * Vercel Cron Job: /api/scheduler
 * Runs every hour via Vercel cron.
 * 
 * Handles all notification types:
 * - One-time reminders (fires on due_date)
 * - Medication reminders (fires at each time in medication_times array)
 * - Scheduled time reminders (fires at due_time on due_date)
 * - Advance notice reminders (fires day before due_date)
 * - Recurring reminders (fires on due_date, then updates next due_date)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ONESIGNAL_APP_ID = '83fd3bf4-a60e-4651-8a59-6141189b6831';
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

// Initialize Firebase Admin (only once)
function getDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

// Send a push notification via OneSignal
async function sendPush({ userId, title, body, url = '/' }) {
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!restApiKey) throw new Error('ONESIGNAL_REST_API_KEY not set');

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: title },
    contents: { en: body },
    url,
    include_aliases: { external_id: [userId] },
    target_channel: 'push',
  };

  const res = await fetch(ONESIGNAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${restApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.errors?.[0] || 'OneSignal error');
  return result;
}

// Calculate next due date for recurring reminders
function getNextDueDate(currentDueDate, recurrence, intervalDays = 1) {
  const date = new Date(currentDueDate);
  switch (recurrence) {
    case 'daily':    date.setDate(date.getDate() + 1); break;
    case 'weekly':   date.setDate(date.getDate() + 7); break;
    case 'monthly':  date.setMonth(date.getMonth() + 1); break;
    case 'yearly':   date.setFullYear(date.getFullYear() + 1); break;
    case 'custom':   date.setDate(date.getDate() + (intervalDays || 1)); break;
    default:         return null; // 'none' — no recurrence
  }
  return date.toISOString().split('T')[0];
}

export default async function handler(req, res) {
  // Verify this is called by Vercel cron (or allow GET for manual testing)
  const authHeader = req.headers['authorization'];
  if (req.method !== 'GET' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = getDb();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
  const currentHour = now.getUTCHours().toString().padStart(2, '0');
  const currentMinute = now.getUTCMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${currentHour}:${currentMinute}`;

  console.log(`Scheduler running at UTC ${currentTimeStr} on ${todayStr}`);

  let sent = 0;
  let errors = 0;

  try {
    // Get all pending/active reminders
    const remindersSnap = await db.collection('reminders')
      .where('status', 'in', ['pending', 'active'])
      .get();

    console.log(`Found ${remindersSnap.size} pending reminders`);

    for (const doc of remindersSnap.docs) {
      const reminder = { id: doc.id, ...doc.data() };

      try {
        // Get user profile to check premium status
        const profilesSnap = await db.collection('profiles')
          .where('email', '==', reminder.created_by)
          .limit(1)
          .get();

        if (profilesSnap.empty) continue;
        const profile = profilesSnap.docs[0].data();

        // Only send to premium users or admins
        if (!profile.premium_subscriber && profile.role !== 'admin') continue;

        const userId = profilesSnap.docs[0].id;
        const petName = reminder.pet_name || 'your pet';

        // Get pet name if we have pet_id
        let petDisplayName = petName;
        if (reminder.pet_id) {
          const petDoc = await db.collection('pets').doc(reminder.pet_id).get();
          if (petDoc.exists) petDisplayName = petDoc.data().name || petName;
        }

        const notifSentToday = reminder.last_notified_date === todayStr;

        // ── TYPE 1: MEDICATION reminders ──
        // Fire at each time in medication_times array
        if (reminder.type === 'medication' && Array.isArray(reminder.medication_times)) {
          for (const medTime of reminder.medication_times) {
            // Check if current time matches (within the current hour)
            const [medHour] = medTime.split(':');
            const notifKey = `notified_${todayStr}_${medTime.replace(':', '')}`;

            if (currentHour === medHour.padStart(2, '0') && !reminder[notifKey]) {
              await sendPush({
                userId,
                title: `💊 Medication Reminder`,
                body: `Time to give ${petDisplayName} their medication: ${reminder.title}`,
                url: '/reminders',
              });
              await doc.ref.update({ [notifKey]: true });
              sent++;
              console.log(`Sent medication reminder for ${reminder.title} at ${medTime}`);
            }
          }
          continue;
        }

        // ── TYPE 2: ADVANCE NOTICE reminders ──
        // Fire the day before due_date
        if (reminder.advance_notice === true || reminder.reminder_advance_days > 0) {
          const advanceDays = reminder.reminder_advance_days || 1;
          const advanceDate = new Date(reminder.due_date);
          advanceDate.setDate(advanceDate.getDate() - advanceDays);
          const advanceDateStr = advanceDate.toISOString().split('T')[0];

          if (advanceDateStr === todayStr && !notifSentToday) {
            await sendPush({
              userId,
              title: `🔔 Upcoming Reminder`,
              body: `${reminder.title} for ${petDisplayName} is due tomorrow!`,
              url: '/reminders',
            });
            await doc.ref.update({ last_notified_date: todayStr });
            sent++;
            console.log(`Sent advance notice for ${reminder.title}`);
            continue;
          }
        }

        // ── TYPE 3: SCHEDULED TIME reminders ──
        // Fire on due_date at due_time
        if (reminder.due_date === todayStr && reminder.due_time) {
          const [dueHour] = reminder.due_time.split(':');
          if (currentHour === dueHour.padStart(2, '0') && !notifSentToday) {
            await sendPush({
              userId,
              title: `⏰ ${reminder.title}`,
              body: `Scheduled reminder for ${petDisplayName}`,
              url: '/reminders',
            });
            await doc.ref.update({ last_notified_date: todayStr, notification_sent: true });
            sent++;
            console.log(`Sent scheduled time reminder for ${reminder.title}`);
            continue;
          }
        }

        // ── TYPE 4: ONE-TIME reminders ──
        // Fire on due_date (no specific time)
        if (reminder.due_date === todayStr && !reminder.due_time && !notifSentToday) {
          await sendPush({
            userId,
            title: `🐾 ${reminder.title}`,
            body: `${reminder.title} is due today for ${petDisplayName}`,
            url: '/reminders',
          });
          await doc.ref.update({ last_notified_date: todayStr, notification_sent: true });
          sent++;
          console.log(`Sent one-time reminder for ${reminder.title}`);
          continue;
        }

        // ── TYPE 5: OVERDUE reminders ──
        // Fire once per day if past due_date
        if (reminder.due_date < todayStr && !notifSentToday) {
          await sendPush({
            userId,
            title: `⚠️ Overdue: ${reminder.title}`,
            body: `${reminder.title} for ${petDisplayName} is overdue!`,
            url: '/reminders',
          });
          await doc.ref.update({ last_notified_date: todayStr });
          sent++;
          console.log(`Sent overdue reminder for ${reminder.title}`);
          continue;
        }

        // ── TYPE 6: RECURRING reminders ──
        // After firing, update due_date to next occurrence
        if (reminder.recurrence && reminder.recurrence !== 'none' && reminder.due_date <= todayStr) {
          const nextDue = getNextDueDate(reminder.due_date, reminder.recurrence, reminder.reminder_interval_days);
          if (nextDue) {
            await doc.ref.update({
              due_date: nextDue,
              notification_sent: false,
              last_notified_date: null,
              status: 'pending',
            });
            console.log(`Updated recurring reminder ${reminder.title} next due: ${nextDue}`);
          }
        }

      } catch (reminderErr) {
        console.error(`Error processing reminder ${reminder.id}:`, reminderErr.message);
        errors++;
      }
    }

    // Also check care logs for overdue items
    const careSnap = await db.collection('careLogs')
      .where('status', '!=', 'completed')
      .get();

    for (const doc of careSnap.docs) {
      const log = { id: doc.id, ...doc.data() };
      if (!log.next_due_date || log.next_due_date >= todayStr) continue;
      if (log.last_notified_date === todayStr) continue;

      try {
        const profilesSnap = await db.collection('profiles')
          .where('email', '==', log.created_by)
          .limit(1)
          .get();

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
        await doc.ref.update({ last_notified_date: todayStr });
        sent++;
      } catch (e) {
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
