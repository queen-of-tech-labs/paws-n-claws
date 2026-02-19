import { getSubscriptionId, requestPermission } from './oneSignalService';

/**
 * Check the current notification permission status
 * @returns {Promise<'granted' | 'denied' | 'default'>}
 */
export async function checkNotificationPermission() {
  try {
    if (!window.OneSignal) {
      console.warn('OneSignal not initialized');
      return 'default';
    }

    const permission = await window.OneSignal.Notifications.permission;
    console.log('Current notification permission:', permission);
    return permission; // 'granted', 'denied', or 'default'
  } catch (error) {
    console.error('Failed to check notification permission:', error);
    return 'default';
  }
}

/**
 * Request notification permission
 * @returns {Promise<boolean>} true if granted, false if denied
 */
export async function requestNotificationPermission() {
  try {
    if (!window.OneSignal) {
      console.warn('OneSignal not initialized');
      return false;
    }

    const permission = await window.OneSignal.Notifications.requestPermission();
    console.log('Permission request result:', permission);
    return permission === true;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

/**
 * Register device with OneSignal and backend
 * @param {string} userId - Current user ID
 * @returns {Promise<boolean>} true if successful
 */
export async function registerDevice(userId) {
  try {
    await new Promise(resolve => setTimeout(resolve, 500));

    const deviceToken = await getSubscriptionId();

    if (!deviceToken) {
      console.warn('Failed to get device token');
      return false;
    }

    console.log('Device token obtained:', deviceToken);

    if (window.OneSignal && userId) {
      window.OneSignal.login(userId);
      console.log('External user ID set:', userId);
    }

    return true;
  } catch (error) {
    console.error('Failed to register device:', error);
    return false;
  }
}

/**
 * Handle the complete notification permission recovery flow
 * @param {string} userId - Current user ID
 * @returns {Promise<{status: 'granted' | 'denied' | 'default', registered: boolean}>}
 */
export async function handleNotificationPermissionRecovery(userId) {
  try {
    const permission = await checkNotificationPermission();
    console.log('Permission status:', permission);

    if (permission === 'granted') {
      // Already granted - register device
      const registered = await registerDevice(userId);
      return { status: 'granted', registered };
    } else if (permission === 'denied') {
      // Previously denied - don't request again
      console.log('Notification permission previously denied');
      return { status: 'denied', registered: false };
    } else {
      // Not determined - don't request automatically
      // User should request manually through the UI
      console.log('Notification permission not yet determined');
      return { status: 'default', registered: false };
    }
  } catch (error) {
    console.error('Notification permission recovery failed:', error);
    return { status: 'default', registered: false };
  }
}

/**
 * Monitor permission changes and auto-register if permission becomes granted
 * @param {string} userId - Current user ID
 * @param {Function} onPermissionGranted - Callback when permission is granted
 * @returns {Function} Cleanup function to stop monitoring
 */
export function monitorPermissionChanges(userId, onPermissionGranted) {
  let lastPermission = null;
  let isMonitoring = true;

  const checkPermission = async () => {
    if (!isMonitoring) return;

    try {
      const permission = await checkNotificationPermission();

      // If permission changed from denied/default to granted
      if (permission === 'granted' && lastPermission !== 'granted') {
        console.log('Permission granted - auto-registering device');
        const registered = await registerDevice(userId);
        if (registered && onPermissionGranted) {
          onPermissionGranted();
        }
      }

      lastPermission = permission;
    } catch (error) {
      console.error('Error monitoring permission:', error);
    }

    // Check again in 5 seconds
    if (isMonitoring) {
      setTimeout(checkPermission, 5000);
    }
  };

  checkPermission();

  // Return cleanup function
  return () => {
    isMonitoring = false;
  };
}
