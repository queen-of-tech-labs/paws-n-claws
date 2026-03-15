import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const isNative = () => !!(window.Capacitor?.isNativePlatform?.());

export default function OnboardingNotificationDialog({ open, onOpenChange, userId }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleEnableNotifications = async () => {
    setLoading(true);
    setError(null);
    console.log('🔔 User clicked Enable Notifications');

    try {
      let granted = false;

      if (isNative()) {
        // ── NATIVE ANDROID ──
        // Use the Cordova OneSignal plugin to request permission
        granted = await new Promise((resolve) => {
          const os = window.plugins?.OneSignal;
          if (!os) {
            console.warn('OneSignal native plugin not available');
            resolve(false);
            return;
          }

          // Timeout fallback after 20 seconds
          const timer = setTimeout(async () => {
            console.warn('Permission request timed out — checking current status');
            try {
              os.Notifications.getPermissionAsync((p) => resolve(!!p));
            } catch {
              resolve(false);
            }
          }, 20000);

          try {
            os.Notifications.requestPermission(true, (accepted) => {
              clearTimeout(timer);
              console.log('Native permission result:', accepted);
              resolve(!!accepted);
            });
          } catch (e) {
            clearTimeout(timer);
            console.error('Native requestPermission error:', e);
            resolve(false);
          }
        });

        if (granted) {
          // Link user to OneSignal so we can target them
          try {
            window.plugins?.OneSignal?.login(userId);
            console.log('✓ Native user linked to OneSignal:', userId);
          } catch (e) {
            console.warn('OneSignal login warning:', e);
          }
        }

      } else {
        // ── WEB BROWSER ──
        if (!window.OneSignal) {
          setError('Notification service not ready. Please refresh and try again.');
          setLoading(false);
          return;
        }

        const permission = await window.OneSignal.Notifications.requestPermission();
        granted = permission === true;

        if (granted && userId) {
          await window.OneSignal.login(userId).catch(() => {});
          console.log('✓ Web user linked to OneSignal:', userId);
        }
      }

      if (!granted) {
        setError('Notification permission was denied. You can enable it later in your phone Settings → Apps → Paws & Claws → Notifications.');
        setLoading(false);
        return;
      }

      console.log('✅ Notifications enabled successfully!');
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);

    } catch (err) {
      console.error('❌ Notification setup failed:', err);
      setError(err.message || 'An error occurred while setting up notifications.');
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
          {/* Benefits */}
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

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-400">Notifications enabled! You'll receive pet reminders.</p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
            disabled={loading}
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleEnableNotifications}
            disabled={loading || success}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Enabled
              </>
            ) : (
              'Enable Notifications'
            )}
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center mt-4">
          You can change these settings anytime in your preferences
        </p>
      </DialogContent>
    </Dialog>
  );
}
