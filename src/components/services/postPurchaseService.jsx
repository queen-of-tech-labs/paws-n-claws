import api from '@/api/firebaseClient';
import { initializeOneSignal, requestPermission, getSubscriptionId } from './oneSignalService';

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
    const permissionState = Notification?.permission;
    
    if (permissionState === 'granted') {
      console.log('Push notifications already enabled');
      const subscriptionId = await getSubscriptionId();
      if (subscriptionId) {
        if (window.OneSignal && user.id) {
          await window.OneSignal.login(user.id);
        }
        await window.OneSignal?.User?.addTag('premium', 'true');
        console.log('✓ Premium tag set');
      }
      return { success: true, message: 'Already configured' };
    }
    // 4. Request notification permission
    console.log('Requesting notification permission...');
    const granted = await requestPermission(user.id);
    if (granted) {
      console.log('✓ Notification permission granted');
      const subscriptionId = await getSubscriptionId();
      if (subscriptionId) {
        await window.OneSignal?.User?.addTag('premium', 'true');
        console.log('✓ Premium tag set');
      }
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
