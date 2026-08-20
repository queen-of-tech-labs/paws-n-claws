import React, { useState, useEffect } from "react";
import { isNativePlatform } from '@/lib/platform';
import api from '@/api/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Loader2, Check, Crown, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const isNative = isNativePlatform;

// Get permission using the most reliable method available
function getNativePermission() {
  try {
    // Try synchronous permission check first
    const os = window.plugins?.OneSignal;
    if (!os) return null;
    // hasPermission is synchronous on Android
    if (typeof os.Notifications?.hasPermission === 'function') {
      return os.Notifications.hasPermission() ? 'granted' : 'denied';
    }
    if (typeof os.Notifications?.permission !== 'undefined') {
      return os.Notifications.permission ? 'granted' : 'denied';
    }
    return null;
  } catch {
    return null;
  }
}

export default function NotificationPreferences() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    notification_email: false,
    notification_push: true,
    reminder_advance_days: 1
  });
  const [saved, setSaved] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('unknown');

  useEffect(() => {
    const initialize = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
        const isPremium = u?.role === 'admin' || u?.premium_subscriber;
        let updatedPrefs = {
          notification_email: u.notification_email !== false,
          notification_push: u.notification_push !== false,
          reminder_advance_days: u.reminder_advance_days || 1
        };
        if (isPremium && u.notification_email === undefined && u.notification_push === undefined) {
          updatedPrefs = { notification_email: true, notification_push: true, reminder_advance_days: 1 };
          await api.auth.updateMe(updatedPrefs);
        }
        setPreferences(updatedPrefs);

        // Check permission after short delay to let plugins load
        setTimeout(() => {
          if (isNative()) {
            const status = getNativePermission();
            console.log('Native permission status:', status);
            setPermissionStatus(status || 'unknown');
          } else {
            setPermissionStatus(Notification?.permission || 'default');
          }
        }, 1000);

      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  const handleEnableNotifications = async () => {
    setSaving(true);
    try {
      const currentUser = await api.auth.me();

      if (isNative()) {
        // Re-check permission synchronously
        const status = getNativePermission();
        console.log('Permission check before enable:', status);

        if (status === 'granted' || status === null) {
          // Either granted or we can't check — try to register anyway
          try {
            await new Promise(r => setTimeout(r, 500));
            const subId = window.plugins?.OneSignal?.User?.pushSubscription?.id;
            console.log('Subscription ID:', subId);
            if (currentUser?.id) {
              window.plugins?.OneSignal?.login(currentUser.id);
            }
          } catch (e) {
            console.warn('Register error:', e);
          }
          setPreferences(p => ({ ...p, notification_push: true }));
          await api.auth.updateMe({ ...preferences, notification_push: true });
          setPermissionStatus('granted');
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        } else {
          // Truly denied — request it
          window.plugins?.OneSignal?.Notifications?.requestPermission(true, async (accepted) => {
            if (accepted) {
              if (currentUser?.id) window.plugins?.OneSignal?.login(currentUser.id);
              setPreferences(p => ({ ...p, notification_push: true }));
              await api.auth.updateMe({ ...preferences, notification_push: true });
              setPermissionStatus('granted');
              setSaved(true);
              setTimeout(() => setSaved(false), 3000);
            } else {
              setPermissionStatus('denied');
            }
            setSaving(false);
          });
          return; // exit early, setSaving handled in callback
        }
      } else {
        // Web browser
        if (!window.OneSignal) { setSaving(false); return; }
        const granted = await window.OneSignal.Notifications.requestPermission();
        if (granted) {
          setPreferences(p => ({ ...p, notification_push: true }));
          await api.auth.updateMe({ ...preferences, notification_push: true });
          setPermissionStatus('granted');
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        } else {
          setPermissionStatus('denied');
        }
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await api.auth.updateMe(preferences);
    setUser(prev => ({ ...prev, ...preferences }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const isPremium = user?.role === 'admin' || user?.premium_subscriber;
  const isGranted = permissionStatus === 'granted';
  const isDenied = permissionStatus === 'denied';

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">Notification Preferences</h1>
        <p className="text-slate-400 mt-2">Customize how you receive reminder notifications</p>
        <div className="flex items-center justify-center mt-3">
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Premium
          </Badge>
        </div>
        {!isPremium && (
          <p className="text-orange-400 text-sm mt-3 font-medium">Upgrade to Premium to enable notifications</p>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              <CardTitle className="text-white">Notification Channels</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">

            {/* Email Notifications */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
              <div className="flex-1">
                <Label className="text-white font-semibold block mb-2">Email Notifications</Label>
                <p className="text-sm text-slate-400">Receive email alerts for upcoming pet reminders</p>
              </div>
              <Switch
                checked={preferences.notification_email}
                onCheckedChange={(checked) => setPreferences({ ...preferences, notification_email: checked })}
                disabled={!isPremium}
                className="ml-4"
              />
            </div>

            {/* Push Notifications */}
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                <div className="flex-1">
                  <Label className="text-white font-semibold block mb-2">Push Notifications</Label>
                  <p className="text-sm text-slate-400">
                    {isNative()
                      ? 'Receive notifications on your phone even when the app is closed'
                      : 'Receive in-app notifications for upcoming pet reminders'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={preferences.notification_push}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, notification_push: checked })}
                    disabled={!isPremium}
                    className="ml-4"
                  />
                  {isPremium && preferences.notification_push && (
                    isGranted ? (
                      <div className="flex items-center gap-1 text-green-400 text-sm font-medium">
                        <Check className="w-4 h-4" />
                        Enabled
                      </div>
                    ) : (
                      <Button
                        onClick={handleEnableNotifications}
                        disabled={saving}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {saving ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enabling...</>
                        ) : (
                          'Enable Notifications'
                        )}
                      </Button>
                    )
                  )}
                </div>
              </div>
              {isDenied && (
                <div className="mt-2 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">
                    {isNative()
                      ? 'Please go to phone Settings → Apps → Paws & Claws → Notifications and enable them.'
                      : 'Please enable notifications in your browser settings.'}
                  </p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t border-slate-800">
              <Button
                onClick={handleSave}
                disabled={saving || !isPremium}
                className={`w-full font-semibold transition-all ${saved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : saved ? (
                  <><Check className="w-4 h-4 mr-2" />Preferences Saved</>
                ) : (
                  'Save Preferences'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
