import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { fbAuth, db, auth as authHelpers } from '@/api/firebaseClient';
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeOneSignal } from '@/components/services/oneSignalService';
import { queryClientInstance } from '@/lib/query-client';

const AuthContext = createContext();

// localStorage key to remember if user already enabled notifications
const NOTIF_SETUP_KEY = 'paws_notif_setup_done';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const previousUidRef = useRef(null);

  useEffect(() => {
    // Handle Google redirect result on page load (fires after Google redirects back)
    authHelpers.handleGoogleRedirectResult().catch(() => {});
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(fbAuth, async (firebaseUser) => {
      const newUid = firebaseUser?.uid || null;

      // If the user changed (including logout), clear all cached query data
      // so the previous user's pets/data never bleed into the new session
      if (previousUidRef.current !== newUid) {
        queryClientInstance.clear();
        previousUidRef.current = newUid;
      }

      if (firebaseUser) {
        // Google users are always verified. For email/password users,
        // block access until they verify their email address.
        const isGoogleUser = firebaseUser.providerData?.some(p => p.providerId === 'google.com');
        if (!isGoogleUser && !firebaseUser.emailVerified) {
          // Signed in but not verified — show the verify screen, don't load full profile
          setUser({ id: firebaseUser.uid, email: firebaseUser.email, emailVerified: false });
          setIsAuthenticated(false);
          setIsEmailVerified(false);
          setIsLoadingAuth(false);
          return;
        }
        await loadUser(firebaseUser);
      }
      else { setUser(null); setIsAuthenticated(false); setIsEmailVerified(false); setIsLoadingAuth(false); }
    });
    return () => unsubscribe();
  }, []);

  const loadUser = async (firebaseUser) => {
    try {
      const profileRef = doc(db, 'profiles', firebaseUser.uid);
      const profileSnap = await getDoc(profileRef);
      let profile = {};
      if (profileSnap.exists()) { profile = profileSnap.data(); }
      else {
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
      console.log('OneSignal initialized for user:', fullUser.id);

      // Only show the dialog if the user hasn't set up notifications yet
      const alreadySetup = localStorage.getItem(NOTIF_SETUP_KEY + '_' + fullUser.id);
      if (!alreadySetup) {
        setTimeout(() => {
          console.log('Showing notification prompt for first time');
          window.dispatchEvent(new CustomEvent('show-notification-prompt', {
            detail: { userId: fullUser.id }
          }));
        }, 2000);
      } else {
        // Already set up — just make sure device is registered silently
        console.log('Notifications already set up for user, skipping prompt');
        const isNative = !!(window.Capacitor?.isNativePlatform?.());
        if (isNative) {
          window.plugins?.OneSignal?.login(fullUser.id);
        }
        // Note: web login() removed — causes 409 conflicts on web SDK v16
      }
    } catch (e) {
      console.warn('OneSignal init failed:', e);
    }
  };

  const logout = async (redirectTo) => { await authHelpers.logout(redirectTo); };
  const navigateToLogin = () => { window.location.href = '/login'; };
  const resendVerificationEmail = async () => {
    if (fbAuth.currentUser) {
      await sendEmailVerification(fbAuth.currentUser);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isEmailVerified, isLoadingAuth,
      isLoadingPublicSettings: false,
      authError, appPublicSettings: null,
      logout, navigateToLogin, resendVerificationEmail,
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
