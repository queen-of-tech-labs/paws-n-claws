import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const isNative = () => !!(window.Capacitor?.isNativePlatform?.());
const NOTIF_SETUP_KEY = 'paws_notif_setup_done';

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

      if (isNative()) {
        if (!os) {
          setError('Notification service not available. Please restart the app.');
          setLoading(false);
          return;
        }

        // Request permission — with timeout fallback that re-reads actual status
        const granted = await new Promise((resolve) => {
          const timer = setTimeout(async () => {
            console.log('Request timed out - checking actual permission status');
            // Use hasPermission (sync) as fallback — more reliable on Samsung
            try {
              const has = os.Notifications.hasPermission?.();
              console.log('hasPermission fallback:', has);
              resolve(!!has);
            } catch {
              resolve(false);
            }
          }, 10000);

          try {
            os.Notifications.requestPermission(true, (accepted) => {
              clearTimeout(timer);
              console.log('requestPermission result:', accepted);
              // Even if callback says false, double-check with hasPermission
              // Samsung sometimes fires false even when user allowed
              try {
                const has = os.Notifications.hasPermission?.();
                console.log('hasPermission after request:', has);
                resolve(!!has || !!accepted);
              } catch {
                resolve(!!accepted);
              }
            });
          } catch (e) {
            clearTimeout(timer);
            try { resolve(!!os.Notifications.hasPermission?.()); } catch { resolve(false); }
          }
        });

        console.log('Final granted status:', granted);

        if (!granted) {
          setError('Notifications are blocked. Go to Settings → Apps → Paws & Claws → Notifications and enable them, then tap Enable again.');
          setLoading(false);
          return;
        }

        // Register user with OneSignal
        try {
          os.login(userId);
          console.log('Native OneSignal login:', userId);
        } catch (e) {
          console.warn('OneSignal login warning:', e);
        }

      } else {
        // Web browser
        let granted = Notification?.permission === 'granted';
        if (!granted && window.OneSignal) {
          granted = await window.OneSignal.Notifications.requestPermission();
        }
        if (!granted) {
          setError('Please allow notifications in your browser settings.');
          setLoading(false);
          return;
        }
        if (window.OneSignal) {
          await window.OneSignal.login(userId).catch(() => {});
        }
      }

      // Mark as set up in localStorage so we never ask again
      localStorage.setItem(NOTIF_SETUP_KEY + '_' + userId, 'true');
      console.log('Notifications enabled and saved to localStorage');

      setSuccess(true);
      setTimeout(() => onOpenChange(false), 1500);

    } catch (err) {
      console.error('Notification setup failed:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Also save skip so we don't ask every time
    if (userId) {
      localStorage.setItem(NOTIF_SETUP_KEY + '_' + userId, 'skipped');
    }
    onOpenChange(false);
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
              <p className="text-xs text-green-400">Notifications enabled!</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSkip} variant="outline"
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
