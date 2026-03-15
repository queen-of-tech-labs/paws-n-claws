import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const isNative = () => !!(window.Capacitor?.isNativePlatform?.());

// Check permission using Capacitor's native bridge directly
// bypassing OneSignal's buggy getPermissionAsync on Samsung
async function checkNativePermission() {
  try {
    // Try Capacitor's local notifications plugin first
    if (window.Capacitor?.Plugins?.LocalNotifications) {
      const result = await window.Capacitor.Plugins.LocalNotifications.checkPermissions();
      console.log('LocalNotifications permission:', result?.display);
      return result?.display === 'granted';
    }
  } catch (e) {
    console.warn('LocalNotifications check failed:', e);
  }

  // Fallback: try OneSignal's own permission check
  try {
    const os = window.plugins?.OneSignal;
    if (os?.Notifications?.hasPermission) {
      const result = os.Notifications.hasPermission();
      console.log('OneSignal hasPermission (sync):', result);
      return !!result;
    }
  } catch (e) {
    console.warn('OneSignal hasPermission failed:', e);
  }

  return false;
}

export default function OnboardingNotificationDialog({ open, onOpenChange, userId }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleEnableNotifications = async () => {
    setLoading(true);
    setError(null);
    console.log('User clicked Enable Notifications');

    try {
      const os = window.plugins?.OneSignal;
      if (!os && isNative()) {
        setError('Notification service not available. Please restart the app.');
        setLoading(false);
        return;
      }

      // Check current permission status
      let granted = false;

      if (isNative()) {
        granted = await checkNativePermission();
        console.log('Native permission check result:', granted);

        if (!granted) {
          // Request permission
          console.log('Requesting native permission...');
          granted = await new Promise((resolve) => {
            const timer = setTimeout(async () => {
              console.log('Request timed out - re-checking permission status');
              const current = await checkNativePermission();
              resolve(current);
            }, 12000);

            try {
              os.Notifications.requestPermission(true, (accepted) => {
                clearTimeout(timer);
                console.log('requestPermission callback:', accepted);
                resolve(!!accepted);
              });
            } catch (e) {
              clearTimeout(timer);
              console.warn('requestPermission error:', e);
              // Still check actual status
              checkNativePermission().then(resolve);
            }
          });
        }
      } else {
        granted = Notification?.permission === 'granted';
        if (!granted && window.OneSignal) {
          const result = await window.OneSignal.Notifications.requestPermission();
          granted = result === true;
        }
      }

      console.log('Final permission status:', granted);

      if (!granted) {
        setError('Please go to Settings → Apps → Paws & Claws → Notifications, enable notifications, then tap Enable again.');
        setLoading(false);
        return;
      }

      // Register with OneSignal
      if (isNative()) {
        try {
          os.login(userId);
          console.log('Native OneSignal login:', userId);
        } catch (e) {
          console.warn('OneSignal login warning:', e);
        }
      } else if (window.OneSignal) {
        await window.OneSignal.login(userId).catch(() => {});
      }

      console.log('Notifications enabled successfully!');
      setSuccess(true);
      setTimeout(() => onOpenChange(false), 1500);

    } catch (err) {
      console.error('Notification setup failed:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border border-slate-800 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-400" />
            </div>
            <DialogTitle className="text-white">Enable Notifications</DialogTitle>
          </div>
          <DialogDescription className="text-slate-400">
            Get reminders for your pet's important dates and appointments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 my-6">
          <div className="space-y-3">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Never miss important dates</p>
                <p className="text-xs text-slate-400">Birthdays, vaccinations, and more</p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Appointment reminders</p>
                <p className="text-xs text-slate-400">Get alerted before vet visits</p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Customizable notifications</p>
                <p className="text-xs text-slate-400">Control timing and frequency</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-400">Notifications enabled! You'll receive pet reminders.</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button onClick={() => onOpenChange(false)} variant="outline"
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800" disabled={loading}>
            Skip for Now
          </Button>
          <Button onClick={handleEnableNotifications} disabled={loading || success}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting up...</>)
              : success ? (<><CheckCircle2 className="w-4 h-4 mr-2" />Enabled</>)
              : 'Enable Notifications'}
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center mt-4">
          You can change these settings anytime in your preferences
        </p>
      </DialogContent>
    </Dialog>
  );
}
