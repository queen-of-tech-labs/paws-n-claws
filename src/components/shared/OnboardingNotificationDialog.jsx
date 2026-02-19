import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '@/api/firebaseClient';
import { initializeOneSignal, getDeviceToken, registerDeviceWithBackend, isOneSignalReady } from '@/components/services/oneSignalService';

export default function OnboardingNotificationDialog({ open, onOpenChange, userId }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleEnableNotifications = async () => {
    setLoading(true);
    setError(null);
    console.log('🔔 User clicked Enable Notifications button');

    try {
      // Check if OneSignal is ready
      if (!isOneSignalReady()) {
        console.error('❌ OneSignal not ready');
        setError('OneSignal is not initialized. Please refresh the page and try again.');
        setLoading(false);
        return;
      }
      
      console.log('✅ OneSignal ready for permission request');

      // Step 1: Request notification permission
      if (!window.OneSignal) {
        console.error('❌ OneSignal SDK not available');
        setError('Notification service not ready. Please refresh and try again.');
        setLoading(false);
        return;
      }

      console.log('🔔 Requesting notification permission from browser...');
      const permission = await window.OneSignal.Notifications.requestPermission();

      if (!permission) {
        console.warn('❌ User denied notification permission');
        setError('Notification permission was denied. You can enable it later in your browser settings.');
        setLoading(false);
        return;
      }

      console.log('✓ Permission granted by user');

      // Step 2: Get device token
      console.log('📱 Getting device token from OneSignal...');
      const deviceToken = await getDeviceToken();

      if (!deviceToken) {
        console.warn('⚠️ Failed to get device token');
        setError('Device registration encountered an issue, but permission was granted.');
        setSuccess(true);
        setLoading(false);
        return;
      }

      console.log('✓ Device token obtained:', deviceToken);

      // Step 3: Register device with backend
      console.log('💾 Registering device with backend...');
      await registerDeviceWithBackend(deviceToken, 'Web Browser');
      console.log('✓ Device registered with backend');

      // Step 4: Link user to OneSignal
      if (userId) {
        console.log('👤 Linking user to OneSignal:', userId);
        await window.OneSignal.login(userId);
        console.log('✓ User linked to OneSignal');
      }

      // Step 5: Set premium tag if applicable
      try {
        const user = await api.auth.me();
        if (user?.premium_subscriber && window.OneSignal) {
          console.log('🏆 Setting premium tag on device');
          await window.OneSignal.User.addTag('premium', 'true');
          console.log('✓ Premium tag set');
        }
      } catch (tagError) {
        console.warn('⚠️ Failed to set premium tag:', tagError);
        // Don't fail the flow for this
      }

      console.log('✅ Notification setup complete!');
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

  React.useEffect(() => {
    if (open) {
      console.log('📋 Onboarding notification modal shown to user:', userId);
    }
  }, [open, userId]);

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