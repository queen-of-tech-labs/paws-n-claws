const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const ONESIGNAL_API_KEY = defineSecret('ONESIGNAL_API_KEY');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

const auth = getAuth();
const db = getFirestore();

async function assertAdmin(uid) {
  const profileSnap = await db.collection('profiles').doc(uid).get();
  if (!profileSnap.exists || profileSnap.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'You must be an admin to perform this action.');
  }
}

exports.changeUserRole = onCall(async (request) => {
  const { userId, newRole } = request.data;
  await assertAdmin(request.auth?.uid);
  if (!userId || !newRole) throw new HttpsError('invalid-argument', 'userId and newRole are required.');
  const validRoles = ['user', 'admin'];
  if (!validRoles.includes(newRole)) throw new HttpsError('invalid-argument', 'Invalid role.');
  await db.collection('profiles').doc(userId).update({ role: newRole, updatedAt: new Date() });
  return { success: true, userId, newRole };
});

exports.changeUserSubscription = onCall(async (request) => {
  const { userId, subscriptionStatus } = request.data;
  await assertAdmin(request.auth?.uid);
  if (!userId || !subscriptionStatus) throw new HttpsError('invalid-argument', 'userId and subscriptionStatus are required.');
  const validStatuses = ['free', 'premium'];
  if (!validStatuses.includes(subscriptionStatus)) throw new HttpsError('invalid-argument', 'Invalid status.');
  const isPremium = subscriptionStatus === 'premium';
  await db.collection('profiles').doc(userId).update({
    subscription_status: subscriptionStatus,
    premium_subscriber: isPremium,
    isPremium,
    pet_limit: isPremium ? 999 : 2,
    updatedAt: new Date(),
  });
  return { success: true, userId, subscriptionStatus };
});

exports.resetUserPassword = onCall(async (request) => {
  const { userEmail } = request.data;
  await assertAdmin(request.auth?.uid);
  if (!userEmail) throw new HttpsError('invalid-argument', 'userEmail is required.');
  try {
    await auth.generatePasswordResetLink(userEmail);
    return { success: true, message: 'This user signs in with a magic link or Google. No password reset needed.' };
  } catch (error) {
    if (error.code === 'auth/user-not-found') throw new HttpsError('not-found', 'No Firebase Auth account found for this email.');
    throw new HttpsError('internal', error.message);
  }
});

exports.adminDeleteUser = onCall(async (request) => {
  const { userId } = request.data;
  await assertAdmin(request.auth?.uid);
  if (!userId) throw new HttpsError('invalid-argument', 'userId is required.');
  if (userId === request.auth?.uid) throw new HttpsError('failed-precondition', 'You cannot delete your own account.');
  try {
    await auth.deleteUser(userId);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw new HttpsError('internal', `Failed to delete auth user: ${error.message}`);
  }
  await db.collection('profiles').doc(userId).delete();
  return { success: true, userId };
});

exports.sendPasswordResetEmail = onCall(async (request) => {
  const { userEmail } = request.data;
  await assertAdmin(request.auth?.uid);
  if (!userEmail) throw new HttpsError('invalid-argument', 'userEmail is required.');
  try {
    await auth.generatePasswordResetLink(userEmail);
    return { success: true, message: 'Password reset link generated.' };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});

exports.deleteUserAccount = onCall(async (request) => {
  const { confirmation } = request.data;
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
  if (confirmation !== 'DELETE') throw new HttpsError('invalid-argument', 'You must confirm with "DELETE".');
  const batch = db.batch();
  batch.delete(db.collection('profiles').doc(uid));
  await batch.commit();
  await auth.deleteUser(uid);
  return { success: true };
});

exports.changeAdminPassword = onCall(async (request) => {
  const uid = request.auth?.uid;
  await assertAdmin(uid);
  return { success: true, message: 'Please use Firebase Auth to update your password directly.' };
});

exports.updateUserPremiumTag = onCall(async (request) => {
  const { userId, isPremium } = request.data;
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
  try {
    await db.collection('profiles').doc(uid).update({
      push_sync_pending: false,
      premium_tag_synced: true,
      updatedAt: new Date(),
    });
    return { success: true, isPremium: !!isPremium };
  } catch (error) {
    console.error('updateUserPremiumTag error:', error);
    return { success: false, error: error.message };
  }
});

exports.onboardUserNotifications = onCall(async (request) => {
  const { subscriptionId, deviceName } = request.data;
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
  try {
    await db.collection('profiles').doc(uid).update({
      onesignal_subscription_id: subscriptionId || null,
      device_name: deviceName || 'Web Browser',
      notifications_enabled: true,
      updatedAt: new Date(),
    });
    return { success: true, subscriptionId };
  } catch (error) {
    console.error('onboardUserNotifications error:', error);
    return { success: false, error: error.message };
  }
});

exports.searchVetClinics = onCall(async (request) => {
  const { query, location } = request.data;
  if (!query && !location) throw new HttpsError('invalid-argument', 'query or location is required.');
  return { success: true, results: [], message: 'Use /api/places-search for vet searches.' };
});

exports.getVetClinicDetails = onCall(async (request) => {
  const { placeId } = request.data;
  if (!placeId) throw new HttpsError('invalid-argument', 'placeId is required.');
  return { success: true, details: null, message: 'Use /api/places-search for place details.' };
});

exports.petHelperAI = onCall(
  { secrets: [ANTHROPIC_API_KEY] },
  async (request) => {
    const { prompt, message, petContext, mode } = request.data;
    const userInput = message || prompt;
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
    if (!userInput) throw new HttpsError('invalid-argument', 'A message or prompt is required.');
    const apiKey = ANTHROPIC_API_KEY.value();
    if (!apiKey) throw new HttpsError('internal', 'AI service is not configured.');
    const petName = petContext?.name || 'the pet';
    const petSpecies = petContext?.species || 'unknown species';
    const petBreed = petContext?.breed ? `, ${petContext.breed} breed` : '';
    const petAge = petContext?.age ? `, ${petContext.age} years old` : '';
    const petWeight = petContext?.weight ? `, weighing ${petContext.weight}` : '';
    const petAllergies = petContext?.allergies ? `. Known allergies: ${petContext.allergies}` : '';
    const petMedical = petContext?.medicalHistory ? `. Medical history: ${petContext.medicalHistory}` : '';
    const spayedNeutered = petContext?.spayedNeutered ? '. Spayed/neutered.' : '';
    const isSymptomCheck = mode === 'symptom_check';
    const systemPrompt = isSymptomCheck
      ? `You are a helpful pet health assistant for the Paws & Claws app. The user is describing symptoms for their ${petSpecies} named ${petName}${petBreed}${petAge}${petWeight}${petAllergies}${petMedical}${spayedNeutered}.\n\nAnalyze the symptoms described and provide:\n1. Possible causes (list the most likely ones)\n2. Urgency level (Can wait for regular vet appointment / Should see vet soon / Seek emergency care immediately)\n3. What to watch for at home\n4. Whether this needs immediate veterinary attention\n\nAlways end with a reminder that this is not a diagnosis and they should consult their veterinarian. Be caring, clear, and concise.`
      : `You are a knowledgeable, friendly pet care assistant for the Paws & Claws app. You are currently helping with questions about ${petName}, a ${petSpecies}${petBreed}${petAge}${petWeight}${petAllergies}${petMedical}${spayedNeutered}.\n\nAnswer the user's questions about pet health, nutrition, behavior, grooming, and general care. Be specific to this pet's species and details when relevant. Be warm, helpful, and concise. For serious medical concerns, always recommend consulting a veterinarian. Do not diagnose medical conditions.`;
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userInput }],
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        console.error('Anthropic API error:', err);
        throw new HttpsError('internal', 'AI service returned an error.');
      }
      const result = await response.json();
      const aiResponse = result.content?.[0]?.text || 'Sorry, I could not generate a response.';
      return { success: true, response: aiResponse, petContext: petContext || null };
    } catch (error) {
      console.error('petHelperAI error:', error);
      throw new HttpsError('internal', 'Failed to get AI response. Please try again.');
    }
  }
);

exports.createCheckoutSession = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
    const { priceId, successUrl, cancelUrl, mode } = request.data;
    if (!priceId) throw new HttpsError('invalid-argument', 'priceId is required.');
    const stripeKey = STRIPE_SECRET_KEY.value();
    if (!stripeKey) throw new HttpsError('internal', 'Stripe is not configured.');
    const stripe = require('stripe')(stripeKey);
    try {
      const profileSnap = await db.collection('profiles').doc(uid).get();
      const profile = profileSnap.exists ? profileSnap.data() : {};
      let customerId = profile.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: profile.email || '',
          metadata: { firebaseUID: uid },
        });
        customerId = customer.id;
        await db.collection('profiles').doc(uid).update({ stripe_customer_id: customerId });
      }
      const checkoutMode = mode || 'subscription';
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: checkoutMode,
        success_url: successUrl || 'https://paws-n-claws.vercel.app/#/account',
        cancel_url: cancelUrl || 'https://paws-n-claws.vercel.app/#/account',
        metadata: { firebaseUID: uid },
      });
      return { success: true, url: session.url };
    } catch (error) {
      console.error('Stripe error:', error);
      throw new HttpsError('internal', error.message);
    }
  }
);

exports.cancelSubscription = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
  try {
    await db.collection('profiles').doc(uid).update({
      premium_subscriber: false,
      isPremium: false,
      subscription_status: 'free',
      pet_limit: 2,
      updatedAt: new Date(),
    });
    return { success: true, message: 'Subscription cancelled successfully.' };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});

// ── Lost Pet Network Notifications ────────────────────────────────────────────

const ONESIGNAL_APP_ID = '83fd3bf4-a60e-4651-8a59-6141189b6831';

// Notifies users within 25 miles/km of the lost pet's last known location
exports.notifyLostPet = onCall(
  { secrets: [ONESIGNAL_API_KEY] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'You must be logged in.');

    const { alertId, petName, lastSeenAddress, lat, lng, radiusMiles = 25 } = request.data;
    if (!alertId || !petName) throw new HttpsError('invalid-argument', 'alertId and petName are required.');

    const apiKey = ONESIGNAL_API_KEY.value();
    if (!apiKey) throw new HttpsError('internal', 'OneSignal is not configured.');

    const locationText = lastSeenAddress ? ` near ${lastSeenAddress}` : '';

    // Build the notification body
    const notifBody = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: '🚨 Lost Pet Alert' },
      contents: { en: `${petName} was reported missing${locationText}. Can you help?` },
      url: `https://paws-n-claws.vercel.app/#/lost-pet/${alertId}`,
      chrome_web_icon: 'https://paws-n-claws.vercel.app/logo192.png',
    };

    // If we have coordinates, use OneSignal location filters to target nearby users.
    // If no coordinates, do NOT send — we never notify all subscribers.
    if (!lat || !lng) {
      console.log('notifyLostPet: no coordinates provided, skipping notification.');
      return { success: true, recipients: 0, skipped: true };
    }

    const radiusKm = radiusMiles * 1.60934;
    notifBody.filters = [
      { field: 'location', radius: radiusKm, lat: lat, long: lng }
    ];

    try {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${apiKey}`,
        },
        body: JSON.stringify(notifBody),
      });
      const data = await response.json();
      console.log('notifyLostPet OneSignal response:', JSON.stringify(data));
      return { success: true, recipients: data.recipients || 0, usedLocation: !!(lat && lng) };
    } catch (error) {
      console.error('notifyLostPet error:', error);
      throw new HttpsError('internal', `Notification failed: ${error.message}`);
    }
  }
);

// Notifies the pet owner when someone reports a sighting
exports.notifySighting = onCall(
  { secrets: [ONESIGNAL_API_KEY] },
  async (request) => {
    // This is called anonymously so no auth check needed
    const { alertId, petName, location, ownerEmail } = request.data;
    if (!alertId || !petName) throw new HttpsError('invalid-argument', 'alertId and petName are required.');

    const apiKey = ONESIGNAL_API_KEY.value();
    if (!apiKey) throw new HttpsError('internal', 'OneSignal is not configured.');

    try {
      // Look up the owner's OneSignal subscription ID from their profile
      let targetSubscriptionId = null;
      if (ownerEmail) {
        const profilesSnap = await db.collection('profiles')
          .where('email', '==', ownerEmail)
          .limit(1)
          .get();
        if (!profilesSnap.empty) {
          targetSubscriptionId = profilesSnap.docs[0].data().onesignal_subscription_id;
        }
      }

      const locationText = location ? ` at ${location}` : '';
      const notifBody = {
        app_id: ONESIGNAL_APP_ID,
        headings: { en: '👀 Sighting Reported!' },
        contents: { en: `Someone reported seeing ${petName}${locationText}. Check the details!` },
        url: `https://paws-n-claws.vercel.app/#/lost-pet/${alertId}`,
        chrome_web_icon: 'https://paws-n-claws.vercel.app/logo192.png',
      };

      // If we have the owner's subscription ID, notify just them
      // Otherwise fall back to notifying all users
      if (targetSubscriptionId) {
        notifBody.include_subscription_ids = [targetSubscriptionId];
      } else {
        notifBody.included_segments = ['Subscribed Users'];
      }

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${apiKey}`,
        },
        body: JSON.stringify(notifBody),
      });
      const data = await response.json();
      console.log('notifySighting OneSignal response:', JSON.stringify(data));
      return { success: true };
    } catch (error) {
      console.error('notifySighting error:', error);
      throw new HttpsError('internal', `Notification failed: ${error.message}`);
    }
  }
);
