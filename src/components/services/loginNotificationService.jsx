import api from '@/api/firebaseClient';
import { initializeOneSignal, getSubscriptionId } from './oneSignalService';

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
    // Step 2: Check notification permission status
    const permission = Notification?.permission;
    console.log('Notification permission:', permission);
    if (permission === 'granted') {
      // Step 3: Get device token
      await new Promise(resolve => setTimeout(resolve, 500));
      const deviceToken = await getSubscriptionId();
      if (deviceToken) {
        console.log('✓ Device token obtained:', deviceToken);
        if (window.OneSignal && user.id) {
          await window.OneSignal.login(user.id);
          console.log('✓ Device registered with backend');
        }
      }
    } else {
      console.log('Notification permission not granted, skipping device registration');
    }
    // Step 4: Sync premium tag and clear pending flag if needed
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
          console.log('✓ Push sync pending flag cleared');
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
