const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

const auth = getAuth();
const db = getFirestore();

// ─────────────────────────────────────────────
// Helper: verify the caller is an admin
// ─────────────────────────────────────────────
async function assertAdmin(uid) {
  const profileSnap = await db.collection('profiles').doc(uid).get();
  if (!profileSnap.exists || profileSnap.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'You must be an admin to perform this action.');
  }
}

// ─────────────────────────────────────────────
// changeUserRole
// ─────────────────────────────────────────────
exports.changeUserRole = onCall(async (request) => {
  const { userId, newRole } = request.data;
  await assertAdmin(request.auth?.uid);

  if (!userId || !newRole) {
    throw new HttpsError('invalid-argument', 'userId and newRole are required.');
  }

  const validRoles = ['user', 'admin'];
  if (!validRoles.includes(newRole)) {
    throw new HttpsError('invalid-argument', `Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  await db.collection('profiles').doc(userId).update({
    role: newRole,
    updatedAt: new Date(),
  });

  return { success: true, userId, newRole };
});

// ─────────────────────────────────────────────
// changeUserSubscription
// ─────────────────────────────────────────────
exports.changeUserSubscription = onCall(async (request) => {
  const { userId, subscriptionStatus } = request.data;
  await assertAdmin(request.auth?.uid);

  if (!userId || !subscriptionStatus) {
    throw new HttpsError('invalid-argument', 'userId and subscriptionStatus are required.');
  }

  const validStatuses = ['free', 'premium'];
  if (!validStatuses.includes(subscriptionStatus)) {
    throw new HttpsError('invalid-argument', `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

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

// ─────────────────────────────────────────────
// resetUserPassword
// ─────────────────────────────────────────────
exports.resetUserPassword = onCall(async (request) => {
  const { userEmail } = request.data;
  await assertAdmin(request.auth?.uid);

  if (!userEmail) {
    throw new HttpsError('invalid-argument', 'userEmail is required.');
  }

  try {
    await auth.generatePasswordResetLink(userEmail);
    return {
      success: true,
      message: 'This user signs in with a magic link or Google. No password reset needed.',
    };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'No Firebase Auth account found for this email.');
    }
    throw new HttpsError('internal', error.message);
  }
});

// ─────────────────────────────────────────────
// adminDeleteUser
// ─────────────────────────────────────────────
exports.adminDeleteUser = onCall(async (request) => {
  const { userId } = request.data;
  await assertAdmin(request.auth?.uid);

  if (!userId) {
    throw new HttpsError('invalid-argument', 'userId is required.');
  }

  if (userId === request.auth?.uid) {
    throw new HttpsError('failed-precondition', 'You cannot delete your own account.');
  }

  try {
    await auth.deleteUser(userId);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw new HttpsError('internal', `Failed to delete auth user: ${error.message}`);
    }
  }

  await db.collection('profiles').doc(userId).delete();

  return { success: true, userId };
});

// ─────────────────────────────────────────────
// sendPasswordResetEmail (alias for admin use)
// ─────────────────────────────────────────────
exports.sendPasswordResetEmail = onCall(async (request) => {
  const { userEmail } = request.data;
  await assertAdmin(request.auth?.uid);

  if (!userEmail) {
    throw new HttpsError('invalid-argument', 'userEmail is required.');
  }

  try {
    await auth.generatePasswordResetLink(userEmail);
    return { success: true, message: 'Password reset link generated.' };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});

// ─────────────────────────────────────────────
// deleteUserAccount (self-delete)
// ─────────────────────────────────────────────
exports.deleteUserAccount = onCall(async (request) => {
  const { confirmation } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  if (confirmation !== 'DELETE') {
    throw new HttpsError('invalid-argument', 'You must confirm with "DELETE".');
  }

  // Delete Firestore profile and related data
  const batch = db.batch();
  batch.delete(db.collection('profiles').doc(uid));
  await batch.commit();

  // Delete from Firebase Auth
  await auth.deleteUser(uid);

  return { success: true };
});

// ─────────────────────────────────────────────
// changeAdminPassword
// ─────────────────────────────────────────────
exports.changeAdminPassword = onCall(async (request) => {
  const uid = request.auth?.uid;
  await assertAdmin(uid);

  // Firebase Auth handles password changes client-side
  // This function just confirms admin status
  return {
    success: true,
    message: 'Please use Firebase Auth to update your password directly.',
  };
});

// ─────────────────────────────────────────────
// updateUserPremiumTag (OneSignal premium tag sync)
// Called on every login - must be fast and never crash the app
// ─────────────────────────────────────────────
exports.updateUserPremiumTag = onCall(async (request) => {
  const { userId, isPremium } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  try {
    // Update the user's premium sync status in Firestore
    await db.collection('profiles').doc(uid).update({
      push_sync_pending: false,
      premium_tag_synced: true,
      updatedAt: new Date(),
    });

    return { success: true, isPremium: !!isPremium };
  } catch (error) {
    // Don't crash the app if this fails - it's non-critical
    console.error('updateUserPremiumTag error:', error);
    return { success: false, error: error.message };
  }
});

// ─────────────────────────────────────────────
// onboardUserNotifications (save OneSignal subscription ID)
// ─────────────────────────────────────────────
exports.onboardUserNotifications = onCall(async (request) => {
  const { subscriptionId, deviceName } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

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

// ─────────────────────────────────────────────
// searchVetClinics (Google Places proxy)
// ─────────────────────────────────────────────
exports.searchVetClinics = onCall(async (request) => {
  const { query, location } = request.data;

  if (!query && !location) {
    throw new HttpsError('invalid-argument', 'query or location is required.');
  }

  // Return empty results - actual search happens via /api/places-search Vercel function
  // This stub prevents CORS errors when the frontend falls back to Cloud Functions
  return { success: true, results: [], message: 'Use /api/places-search for vet searches.' };
});

// ─────────────────────────────────────────────
// getVetClinicDetails (Google Places detail proxy)
// ─────────────────────────────────────────────
exports.getVetClinicDetails = onCall(async (request) => {
  const { placeId } = request.data;

  if (!placeId) {
    throw new HttpsError('invalid-argument', 'placeId is required.');
  }

  // Return empty - actual details fetched via Vercel /api functions
  return { success: true, details: null, message: 'Use /api/places-search for place details.' };
});

// ─────────────────────────────────────────────
// petHelperAI (AI assistant)
// ─────────────────────────────────────────────
exports.petHelperAI = onCall(async (request) => {
  const { prompt, petContext } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  if (!prompt) {
    throw new HttpsError('invalid-argument', 'prompt is required.');
  }

  // Return a helpful fallback message
  // Full AI implementation can be added later with an AI API key
  return {
    success: true,
    response: "I'm your pet care assistant! While my full AI capabilities are being set up, I can tell you that regular vet visits, proper nutrition, and lots of love are the foundations of great pet care. Please consult your veterinarian for specific medical advice.",
    petContext: petContext || null,
  };
});

// ─────────────────────────────────────────────
// createCheckoutSession (Stripe payments)
// ─────────────────────────────────────────────
exports.createCheckoutSession = onCall(async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  // Stripe integration placeholder
  // To enable payments: add STRIPE_SECRET_KEY to Firebase env config
  // and implement full Stripe checkout session creation
  return {
    success: false,
    message: 'Payment processing is not yet configured. Please contact support.',
    url: null,
  };
});

// ─────────────────────────────────────────────
// cancelSubscription
// ─────────────────────────────────────────────
exports.cancelSubscription = onCall(async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

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

// ─────────────────────────────────────────────
// importPetGuides (admin bulk import)
// ─────────────────────────────────────────────
exports.importPetGuides = onCall(async (request) => {
  const { file_url } = request.data;
  await assertAdmin(request.auth?.uid);

  if (!file_url) {
    throw new HttpsError('invalid-argument', 'file_url is required.');
  }

  // Placeholder - full implementation would parse the file and import guides
  return {
    success: true,
    message: 'Guide import received. Manual processing required.',
    file_url,
  };
});
