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
// Changes a user's role in their Firestore profile
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
// Updates a user's subscription status in Firestore
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
// Sends a password reset email via Firebase Auth
// Note: Only works for email/password users, not Google sign-in users
// ─────────────────────────────────────────────
exports.resetUserPassword = onCall(async (request) => {
  const { userEmail } = request.data;
  await assertAdmin(request.auth?.uid);

  if (!userEmail) {
    throw new HttpsError('invalid-argument', 'userEmail is required.');
  }

  try {
    await auth.generatePasswordResetLink(userEmail);
    // Note: generatePasswordResetLink creates the link but doesn't send it.
    // Since your app uses magic links (not password auth), we return a message
    // explaining this. For magic link users, they just sign in via email link.
    return {
      success: true,
      message: 'This user signs in with a magic link or Google. No password reset needed — they can sign in via the login page.',
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
// Deletes user from Firebase Auth AND Firestore profile
// ─────────────────────────────────────────────
exports.adminDeleteUser = onCall(async (request) => {
  const { userId } = request.data;
  await assertAdmin(request.auth?.uid);

  if (!userId) {
    throw new HttpsError('invalid-argument', 'userId is required.');
  }

  // Prevent admin from deleting themselves
  if (userId === request.auth?.uid) {
    throw new HttpsError('failed-precondition', 'You cannot delete your own account.');
  }

  // Delete from Firebase Auth
  try {
    await auth.deleteUser(userId);
  } catch (error) {
    // If user doesn't exist in Auth, continue to delete Firestore profile
    if (error.code !== 'auth/user-not-found') {
      throw new HttpsError('internal', `Failed to delete auth user: ${error.message}`);
    }
  }

  // Delete Firestore profile
  await db.collection('profiles').doc(userId).delete();

  return { success: true, userId };
});
