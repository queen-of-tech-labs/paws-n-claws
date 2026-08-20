import api from '@/api/firebaseClient';
import { isNativePlatform } from '@/lib/platform';
import { initializeOneSignal, getSubscriptionId } from './oneSignalService';

const isNative = isNativePlatform;

export async function registerDeviceOnLogin(user) {
  if (!user || !user.id) {
    console.warn('No user provided for device registration');
    return;
  }
  try {
    console.log('Starting device registration for user:', user.id);

    // Step 1: Initialize OneSignal
    await initializeOneSignal(user.id);
    console.log('✓ OneSignal initialized');

    // Step 2: Check permission — native vs web
    let permissionGranted = false;
    if (isNative()) {
      // On native, check synchronously
      const os = window.plugins?.OneSignal;
      if (os) {
        try {
          permissionGranted = os.Notifications?.hasPermission?.() ?? true;
        } catch {
          // If we can't check, assume granted and try anyway
          permissionGranted = true;
        }
      }
    } else {
      permissionGranted = Notification?.permission === 'granted';
    }

    console.log('Permission granted:', permissionGranted);

    // Step 3: Register device
    // Step 3: Register device
    if (permissionGranted || isNative()) {
      // Give OneSignal time to get a push subscription after permission is granted
      let deviceToken = null;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1000));
        deviceToken = await getSubscriptionId();
        if (deviceToken) break;
      }
      console.log('Device token:', deviceToken);

      // Login user to OneSignal with their Firebase UID — only on native
      // Web login is already handled inside initializeOneSignal to avoid 409 conflicts
      if (user.id && isNative()) {
        window.plugins?.OneSignal?.login(user.id);
        console.log('✓ Native device registered with OneSignal');
      } else if (!isNative()) {
        console.log('✓ Web device registered with OneSignal');
      }

      // Save subscription ID to Firestore if available
      if (deviceToken) {
        try {
          await api.functions.invoke('onboardUserNotifications', {
            subscriptionId: deviceToken,
            deviceName: isNative() ? 'Android App' : 'Web Browser',
          });
          console.log('✓ Subscription ID saved to Firestore');
        } catch (e) {
          console.warn('Could not save subscription ID:', e);
        }
      }
    } else {
      console.log('Notification permission not granted, skipping device registration');
    }

    // Step 4: Sync premium tag
    const isPremium = user.role === 'admin' || user.premium_subscriber;
    if (user.push_sync_pending || isPremium) {
      try {
        await api.functions.invoke('updateUserPremiumTag', {
          userId: user.id,
          isPremium: isPremium
        });
        console.log('✓ Premium tag synced');
        if (user.push_sync_pending) {
          await api.auth.updateMe({ push_sync_pending: false });
        }
      } catch (error) {
        console.error('Failed to sync premium tag:', error);
      }
    }

    console.log('Device registration completed successfully');
  } catch (error) {
    console.error('Device registration failed:', error);
  }
}
