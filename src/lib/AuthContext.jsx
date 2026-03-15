import React, { createContext, useState, useContext, useEffect } from 'react';
import { fbAuth, db, auth as authHelpers } from '@/api/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeOneSignal } from '@/components/services/oneSignalService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(fbAuth, async (firebaseUser) => {
      if (firebaseUser) {
        await loadUser(firebaseUser);
      } else {
        setUser(null);
        setIsAuthenticated(false);
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
      setIsLoadingAuth(false);

      // Initialize OneSignal for ALL users (not just premium)
      // Then check if we need to show the permission prompt
      initializeAndCheckPermission(fullUser);

    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser({ id: firebaseUser.uid, email: firebaseUser.email });
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    }
  };

  const initializeAndCheckPermission = async (fullUser) => {
    try {
      const isNative = !!(window.Capacitor?.isNativePlatform?.());

      // Initialize OneSignal for all users
      await initializeOneSignal(fullUser.id);
      console.log('✓ OneSignal initialized for user:', fullUser.id);

      // Check if permission is already granted
      let permissionGranted = false;
      if (isNative) {
        // On native Android, check via OneSignal plugin
        permissionGranted = await new Promise((resolve) => {
          try {
            window.plugins?.OneSignal?.Notifications?.getPermissionAsync?.((p) => resolve(!!p)) 
              ?? resolve(false);
          } catch {
            resolve(false);
          }
        });
      } else {
        permissionGranted = Notification?.permission === 'granted';
      }

      console.log('Notification permission status:', permissionGranted ? 'granted' : 'not granted');

      if (!permissionGranted) {
        // Show the permission prompt dialog after a short delay
        // so the app has time to fully load first
        setTimeout(() => {
          setShowNotificationPrompt(true);
        }, 2000);
      } else {
        // Already granted — just make sure device is registered with OneSignal
        if (isNative) {
          window.plugins?.OneSignal?.login(fullUser.id);
        } else if (window.OneSignal) {
          window.OneSignal.login(fullUser.id).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('OneSignal init/permission check failed:', e);
    }
  };

  const logout = async (redirectTo) => {
    await authHelpers.logout(redirectTo);
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      showNotificationPrompt,
      setShowNotificationPrompt,
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
