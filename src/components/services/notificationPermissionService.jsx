import { getSubscriptionId, requestPermission } from './oneSignalService';

const isNative = () => !!(window.Capacitor?.isNativePlatform?.());

/**
 * Check the current notification permission status
 */
export async function checkNotificationPermission() {
  try {
    if (isNative()) {
      return new Promise((resolve) => {
        if (!window.plugins?.OneSignal) { resolve('default'); return; }
        try {
          window.plugins.OneSignal.Notifications.getPermissionAsync((permission) => {
            resolve(permission ? 'granted' : 'default');
          });
        } catch {
          resolve('default');
        }
      });
    }
    if (!window.OneSignal) return 'default';
    return window.OneSignal.Notifications.permission ? 'granted' : 'default';
  } catch (error) {
    console.error('Failed to check notification permission:', error);
    return 'default';
  }
}

/**
 * Request notification permission — with timeout fallback
 */
export async function requestNotificationPermission() {
  try {
    if (isNative()) {
      return new Promise((resolve) => {
        if (!window.plugins?.OneSignal) { resolve(false); return; }

        // Timeout after 15 seconds in case callback never fires
        const timer = setTimeout(() => {
          console.warn('Permission request timed out — checking current status');
          // Check if permission was actually granted even if callback didn't fire
          try {
            window.plugins.OneSignal.Notifications.getPermissionAsync((permission) => {
              resolve(permission === true);
            });
          } catch {
            resolve(false);
          }
        }, 15000);

        try {
          window.plugins.OneSignal.Notifications.requestPermission(true, (accepted) => {
            clearTimeout(timer);
            console.log('Native permission result:', accepted);
            resolve(accepted === true);
          });
        } catch (e) {
          clearTimeout(timer);
          console.error('requestPermission error:', e);
          resolve(false);
        }
      });
    }
    if (!window.OneSignal) return false;
    const permission = await window.OneSignal.Notifications.requestPermission();
    return permission === true;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

/**
 * Register device with OneSignal and backend
 */
export async function registerDevice(userId) {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const deviceToken = await getSubscriptionId();
    if (!deviceToken) {
      console.warn('Failed to get device token');
      return false;
    }
    console.log('Device token obtained:', deviceToken);
    if (userId) {
      if (isNative()) {
        window.plugins?.OneSignal?.login(userId);
      } else if (window.OneSignal) {
        window.OneSignal.login(userId);
      }
    }
    return true;
  } catch (error) {
    console.error('Failed to register device:', error);
    return false;
  }
}

/**
 * Handle the complete notification permission recovery flow
 */
export async function handleNotificationPermissionRecovery(userId) {
  try {
    const permission = await checkNotificationPermission();
    if (permission === 'granted') {
      const registered = await registerDevice(userId);
      return { status: 'granted', registered };
    } else if (permission === 'denied') {
      return { status: 'denied', registered: false };
    } else {
      return { status: 'default', registered: false };
    }
  } catch (error) {
    console.error('Notification permission recovery failed:', error);
    return { status: 'default', registered: false };
  }
}

/**
 * Monitor permission changes and auto-register if permission becomes granted
 */
export function monitorPermissionChanges(userId, onPermissionGranted) {
  let lastPermission = null;
  let isMonitoring = true;

  const checkPermission = async () => {
    if (!isMonitoring) return;
    try {
      const permission = await checkNotificationPermission();
      if (permission === 'granted' && lastPermission !== 'granted') {
        const registered = await registerDevice(userId);
        if (registered && onPermissionGranted) onPermissionGranted();
      }
      lastPermission = permission;
    } catch (error) {
      console.error('Error monitoring permission:', error);
    }
    if (isMonitoring) setTimeout(checkPermission, 5000);
  };

  checkPermission();
  return () => { isMonitoring = false; };
}
