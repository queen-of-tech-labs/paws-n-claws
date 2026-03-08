/**
 * Vercel Serverless Function: /api/send-notification
 *
 * Handles all push notification sending via OneSignal REST API.
 * Your ONESIGNAL_REST_API_KEY is stored securely as a Vercel
 * environment variable — never exposed to the frontend.
 *
 * Notification types:
 *   - "reminder"   → sends to a specific user
 *   - "care_alert" → sends to a specific user
 *   - "broadcast"  → sends to ALL subscribed users (admin only)
 */

const ONESIGNAL_APP_ID = '83fd3bf4-a60e-4651-8a59-6141189b6831';
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

export default async function handler(req, res) {
  // CORS headers — allow your frontend to call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── KEY CHECK: friendly error if env var is missing ──────────
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!restApiKey) {
    console.error(
      '❌ ONESIGNAL_REST_API_KEY is not set!\n' +
      'Fix: Go to Vercel → your project → Settings → Environment Variables\n' +
      'Add key: ONESIGNAL_REST_API_KEY\n' +
      'Value: your REST API key from OneSignal → Settings → Keys & IDs\n' +
      'Then redeploy.'
    );
    return res.status(500).json({
      error: 'Server configuration error: ONESIGNAL_REST_API_KEY is not set in Vercel environment variables.',
      fix: 'Go to Vercel → Settings → Environment Variables and add ONESIGNAL_REST_API_KEY'
    });
  }

  const { type, userId, notification } = req.body;

  if (!notification?.title || !notification?.body) {
    return res.status(400).json({ error: 'notification.title and notification.body are required' });
  }

  const basePayload = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: notification.title },
    contents: { en: notification.body },
    url: notification.url || '/',
    data: notification.data || {},
  };

  let payload;

  if (type === 'broadcast') {
    payload = {
      ...basePayload,
      included_segments: ['Total Subscriptions'],
    };

  } else if (type === 'reminder' || type === 'care_alert') {
    if (!userId) {
      return res.status(400).json({ error: 'userId is required for reminder/care_alert notifications' });
    }
    payload = {
      ...basePayload,
      include_aliases: {
        external_id: [userId],
      },
      target_channel: 'push',
    };

  } else {
    return res.status(400).json({ error: `Unknown notification type: "${type}". Must be: reminder, care_alert, or broadcast` });
  }

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal API error:', JSON.stringify(result, null, 2));
      return res.status(502).json({
        error: result.errors?.[0] || 'OneSignal rejected the request',
        onesignal_errors: result.errors || [],
      });
    }

    console.log(`✅ Sent ${type} notification, id: ${result.id}`);
    return res.status(200).json({ success: true, notificationId: result.id });

  } catch (err) {
    console.error('Network error calling OneSignal:', err.message);
    return res.status(500).json({ error: `Network error: ${err.message}` });
  }
}
