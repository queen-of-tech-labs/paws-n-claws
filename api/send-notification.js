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
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!restApiKey) {
    console.error('ONESIGNAL_REST_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error' });
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
    // Send to ALL subscribed users
    payload = {
      ...basePayload,
      included_segments: ['Total Subscriptions'],
    };

  } else if (type === 'reminder' || type === 'care_alert') {
    // Send to a specific user by their external_id
    if (!userId) {
      return res.status(400).json({ error: 'userId is required for reminder/care_alert' });
    }
    payload = {
      ...basePayload,
      include_aliases: {
        external_id: [userId],
      },
      target_channel: 'push',
    };

  } else {
    return res.status(400).json({ error: `Unknown notification type: ${type}` });
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
      console.error('OneSignal API error:', result);
      return res.status(500).json({ error: result.errors?.[0] || 'OneSignal API error' });
    }

    console.log(`Sent ${type} notification:`, result.id);
    return res.status(200).json({ success: true, notificationId: result.id });

  } catch (err) {
    console.error('Failed to send notification:', err);
    return res.status(500).json({ error: err.message });
  }
}
