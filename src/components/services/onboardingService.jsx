import api from '@/api/firebaseClient';
import { initializeOneSignal } from './oneSignalService';
import { requestNotificationPermission, registerDevice } from './notificationPermissionService';

/**
 * Start onboarding - returns true to show the onboarding dialog
 * The dialog will handle the permission request when user clicks the button
 */
export async function startOnboarding(userId) {
  try {
    console.log('🚀 Starting onboarding for user:', userId);

    // Initialize OneSignal if not already done
    if (!window.OneSignal) {
      console.log('📱 Initializing OneSignal...');
      await initializeOneSignal();
      console.log('✓ OneSignal initialized');
    } else {
      console.log('✓ OneSignal already initialized');
    }

    // Return true to show the dialog - user will click button to request permission
    console.log('📋 Ready to show onboarding dialog - waiting for user interaction');
    return true;
  } catch (error) {
    console.error('❌ Onboarding initialization failed:', error);
    return false;
  }
}

/**
 * Complete onboarding after user enables notifications
 * This is called from the OnboardingNotificationDialog when user clicks the button
 */
export async function completeOnboarding(userId) {
  try {
    console.log('🔔 Completing onboarding for user:', userId);

    // Request permission (with logs)
    console.log('⏳ Requesting notification permission...');
    const permitted = await requestNotificationPermission();

    if (!permitted) {
      console.warn('❌ Permission denied by user');
      return {
        success: false,
        message: 'Notification permission denied'
      };
    }

    console.log('✓ Permission granted');

    // Register device (with logs)
    console.log('📱 Registering device...');
    const registered = await registerDevice(userId);

    if (!registered) {
      console.warn('⚠️ Device registration incomplete');
      return {
        success: false,
        message: 'Device registration incomplete'
      };
    }

    console.log('✓ Device registered');

    // Set premium tag if applicable
    try {
      const user = await api.auth.me();
      if (user?.premium_subscriber && window.OneSignal) {
        console.log('🏆 Setting premium tag...');
        await window.OneSignal.User.addTag('premium', 'true'); // v16 API
        console.log('✓ Premium tag set');
      }
    } catch (tagError) {
      console.warn('⚠️ Failed to set premium tag:', tagError);
    }

    // Save subscription ID in database
    try {
      const deviceToken = await window.OneSignal.User.pushSubscription.id;
      console.log('💾 Saving subscription ID to database...');
      const response = await api.functions.invoke('onboardUserNotifications', {
        subscriptionId: deviceToken,
        deviceName: 'Web Browser'
      });
      console.log('✓ Subscription saved:', response.data);
    } catch (saveError) {
      console.warn('⚠️ Failed to save subscription ID:', saveError);
    }

    console.log('✅ Onboarding completed successfully');
    return {
      success: true,
      message: 'Onboarding completed successfully',
      userId
    };
  } catch (error) {
    console.error('❌ Onboarding completion failed:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}