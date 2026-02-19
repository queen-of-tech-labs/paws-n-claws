import api from '@/api/firebaseClient';
import { initializeOneSignal, requestPermission, getSubscriptionId } from './oneSignalService';
import OneSignal from 'npm:onesignal-web-push-sdk@0.0.0';

/**
 * Handles post-purchase setup for premium subscriptions
 * - Refreshes user state
 * - Requests push notification permissions
 * - Registers device with OneSignal
 * - Sets premium tag
 */
export async function handlePostPurchaseSetup() {
  try {
    console.log('Starting post-purchase setup...');

    // 1. Refresh user state to get updated premium status
    const user = await api.auth.me();
    
    if (!user || !user.isPremium) {
      console.warn('User is not premium or not authenticated');
      return { success: false, message: 'User not premium' };
    }

    console.log('✓ User premium status confirmed');

    // 2. Initialize OneSignal if not already initialized
    await initializeOneSignal(user.id);

    // 3. Check if notification permission already granted
    const permissionState = await OneSignal.Notifications.permissionNative;
    
    if (permissionState === 'granted') {
      console.log('Push notifications already enabled');
      
      // Get subscription ID and register device
      const subscriptionId = await OneSignal.User.pushSubscription.id;
      if (subscriptionId) {
        await registerDeviceWithBackend(subscriptionId, 'Web Browser');
        
        // Set premium tag
        await OneSignal.User.addTag('premium', 'true');
        console.log('✓ Premium tag set');
      }
      
      return { success: true, message: 'Already configured' };
    }

    // 4. Request notification permission
    console.log('Requesting notification permission...');
    const subscriptionId = await requestNotificationPermission(user.id);

    if (subscriptionId) {
      console.log('✓ Notification permission granted');

      // 5. Register device with backend
      await registerDeviceWithBackend(subscriptionId, 'Web Browser');
      console.log('✓ Device registered');

      // 6. Set premium tag
      await OneSignal.User.addTag('premium', 'true');
      console.log('✓ Premium tag set');

      // 7. Clear notification_setup_pending flag
      await api.auth.updateMe({ notification_setup_pending: false });

      return { success: true, message: 'Setup complete' };
    } else {
      console.log('Notification permission denied or not available');
      return { success: false, message: 'Permission denied' };
    }
  } catch (error) {
    console.error('Post-purchase setup error:', error);
    return { success: false, message: error.message };
  }
}
