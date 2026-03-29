import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { fbAuth, db, auth as authHelpers } from '@/api/firebaseClient';
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initializeOneSignal } from '@/components/services/oneSignalService';
import { queryClientInstance } from '@/lib/query-client';

const AuthContext = createContext();
const NOTIF_SETUP_KEY = 'paws_notif_setup_done';

/**
 * Checks whether the user has already completed (or skipped) the notification
 * setup prompt. We check BOTH localStorage (fast) AND Firestore (reliable across
 * devices / app reinstalls). Either one being set counts as "already done".
 */
const hasCompletedNotifSetup = async (uid) => {
  // 1. Fast local check first
  const local = localStorage.getItem(NOTIF_SETUP_KEY + '_' + uid);
  if (local) return true;

  // 2. Firestore fallback — survives reinstalls and localStorage clears
  try {
    const profileSnap = await getDoc(doc(db, 'profiles', uid));
    if (profileSnap.exists() && profileSnap.data()?.notif_setup_done) {
      // Mirror back to localStorage so future checks are instant
      localStorage.setItem(NOTIF_SETUP_KEY + '_' + uid, 'true');
      return true;
    }
  } catch (e) {
    console.warn('Firestore notif check failed:', e);
  }
  return false;
};

/**
 * Marks notification setup as complete in BOTH localStorage and Firestore.
 * Called after the user enables OR skips the prompt.
 */
export const markNotifSetupDone = async (uid) => {
  localStorage.setItem(NOTIF_SETUP_KEY + '_' + uid, 'true');
  try {
    await updateDoc(doc(db, 'profiles', uid), { notif_setup_done: true });
  } catch (e) {
    console.warn('Could not persist notif_setup_done to Firestore:', e);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const previousUidRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(fbAuth, async (firebaseUser) => {
      const newUid = firebaseUser?.uid || null;

      // Clear cached data when user changes (logout, switch account)
      if (previousUidRef.current !== newUid) {
        queryClientInstance.clear();
        previousUidRef.current = newUid;
      }

      if (firebaseUser) {
        // Google users are always verified (Google guarantees email ownership)
        const isGoogleUser = firebaseUser.providerData?.some(
          p => p.providerId === 'google.com'
        );
        const verified = isGoogleUser || firebaseUser.emailVerified;

        if (!verified) {
          // Email/password user who hasn't verified yet
          // Mark as authenticated (they have an account) but not verified
          // App.jsx ProtectedRoute will show the VerifyEmailScreen
          setUser({ id: firebaseUser.uid, email: firebaseUser.email });
          setIsAuthenticated(true);
          setIsEmailVerified(false);
          setIsLoadingAuth(false);
          return;
        }

        // Verified user — load full profile
        await loadUser(firebaseUser);
      } else {
        // Signed out
        setUser(null);
        setIsAuthenticated(false);
        setIsEmailVerified(false);
        setIsLoadingAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadUser = async (firebaseUser) => {
    try {
      const profileRef = doc(db, 'profiles', firebaseUser.uid);
      const profileSnap = await getDoc(profileRef);
      let profile = {};
      if (profileSnap.exists()) {
        profile = profileSnap.data();
      } else {
        profile = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          full_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          role: 'user',
          premium_subscriber: false,
          pet_limit: 2,
          account_status: 'active',
          createdAt: serverTimestamp(),
        };
        await setDoc(profileRef, profile);
      }
      const fullUser = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        full_name: firebaseUser.displayName || profile.full_name,
        photo_url: firebaseUser.photoURL,
        ...profile,
      };
      setUser(fullUser);
      setIsAuthenticated(true);
      setIsEmailVerified(true);
      setIsLoadingAuth(false);
      initializeAndPrompt(fullUser);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser({ id: firebaseUser.uid, email: firebaseUser.email });
      setIsAuthenticated(true);
      setIsEmailVerified(true);
      setIsLoadingAuth(false);
    }
  };

  const initializeAndPrompt = async (fullUser) => {
    try {
      await initializeOneSignal(fullUser.id);

      // Check both localStorage AND Firestore — survives reinstalls & localStorage clears
      const alreadySetup = await hasCompletedNotifSetup(fullUser.id);

      if (!alreadySetup) {
        // First time ever — show the prompt after a short delay
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('show-notification-prompt', {
            detail: { userId: fullUser.id }
          }));
        }, 2000);
      } else {
        // Already set up — silently re-login with OneSignal on native
        const isNative = !!(window.Capacitor?.isNativePlatform?.());
        if (isNative) {
          window.plugins?.OneSignal?.login(fullUser.id);
        }
      }
    } catch (e) {
      console.warn('OneSignal init failed:', e);
    }
  };

  const logout = async () => { await authHelpers.logout(); };
  const navigateToLogin = () => { window.location.href = '/login'; };
  const resendVerificationEmail = async () => {
    if (fbAuth.currentUser) await sendEmailVerification(fbAuth.currentUser);
  };

  // Called when user taps "I've verified my email" button.
  // reload() refreshes the Firebase token locally but does NOT trigger
  // onAuthStateChanged — so we manually check and call loadUser ourselves.
  const checkEmailVerified = async () => {
    const currentUser = fbAuth.currentUser;
    if (!currentUser) return false;
    try {
      await currentUser.reload();
      const refreshed = fbAuth.currentUser; // re-read after reload
      if (refreshed?.emailVerified) {
        await loadUser(refreshed);
        return true;
      }
    } catch (e) {
      console.warn('checkEmailVerified error:', e);
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isEmailVerified, isLoadingAuth,
      isLoadingPublicSettings: false,
      authError, appPublicSettings: null,
      logout, navigateToLogin, resendVerificationEmail, checkEmailVerified,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
