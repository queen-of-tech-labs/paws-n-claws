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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(fbAuth, async (firebaseUser) => {
      if (firebaseUser) { await loadUser(firebaseUser); }
      else { setUser(null); setIsAuthenticated(false); setIsLoadingAuth(false); }
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
        profile = { id: firebaseUser.uid, email: firebaseUser.email, full_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0], role: 'user', premium_subscriber: false, pet_limit: 2, account_status: 'active', createdAt: serverTimestamp() };
        await setDoc(profileRef, profile);
      }
      const fullUser = { id: firebaseUser.uid, email: firebaseUser.email, full_name: firebaseUser.displayName || profile.full_name, photo_url: firebaseUser.photoURL, ...profile };
      setUser(fullUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
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
      await initializeOneSignal(fullUser.id);
      console.log('OneSignal initialized for user:', fullUser.id);
      let permissionGranted = false;
      if (isNative) {
        permissionGranted = await new Promise((resolve) => {
          try {
            const timer = setTimeout(() => resolve(false), 3000);
            window.plugins?.OneSignal?.Notifications?.getPermissionAsync?.((p) => {
              clearTimeout(timer);
              resolve(!!p);
            }) ?? resolve(false);
          } catch { resolve(false); }
        });
      } else {
        permissionGranted = Notification?.permission === 'granted';
      }
      console.log('Permission granted:', permissionGranted);
      if (!permissionGranted) {
        console.log('Dispatching show-notification-prompt event');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('show-notification-prompt', { detail: { userId: fullUser.id } }));
        }, 2000);
      } else {
        if (isNative) { window.plugins?.OneSignal?.login(fullUser.id); }
        else if (window.OneSignal) { window.OneSignal.login(fullUser.id).catch(() => {}); }
      }
    } catch (e) { console.warn('OneSignal init failed:', e); }
  };

  const logout = async (redirectTo) => { await authHelpers.logout(redirectTo); };
  const navigateToLogin = () => { window.location.href = '/login'; };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings: false, authError, appPublicSettings: null, logout, navigateToLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
