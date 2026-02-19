import React, { useState, useEffect } from "react";
import api from '@/api/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Loader2, Check, Crown, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { requestNotificationPermission, registerDevice } from "@/components/services/notificationPermissionService";

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
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    api.auth.me().then(async (u) => {
      setUser(u);
      const isPremium = u?.role === 'admin' || u?.premium_subscriber;
      
      // Auto-enable notifications for premium users if not already set
      let updatedPrefs = {
        notification_email: u.notification_email !== false,
        notification_push: u.notification_push !== false,
        reminder_advance_days: u.reminder_advance_days || 1
      };

      // If user is premium and notifications are not explicitly set, enable them
      if (isPremium && u.notification_email === undefined && u.notification_push === undefined) {
        updatedPrefs = {
          notification_email: true,
          notification_push: true,
          reminder_advance_days: u.reminder_advance_days || 1
        };
        // Save to backend
        await api.auth.updateMe(updatedPrefs);
      }
      
      setPreferences(updatedPrefs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleEnableNotifications = async () => {
    setSaving(true);
    setPermissionDenied(false);
    try {
      const currentUser = await api.auth.me();
      
      // Request notification permission
      const permitted = await requestNotificationPermission();
      
      if (permitted) {
        // Permission granted - register device
        try {
          const registered = await registerDevice(currentUser.id);
          if (registered) {
            console.log('Device successfully registered');
          }
        } catch (deviceError) {
          console.error('Failed to register device:', deviceError);
        }
        
        // Save preference
        setPreferences({ ...preferences, notification_push: true });
        await api.auth.updateMe({ ...preferences, notification_push: true });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        // Permission denied
        console.log('Notification permission denied');
        setPermissionDenied(true);
        setPreferences({ ...preferences, notification_push: false });
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      setPermissionDenied(true);
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
                <p className="text-sm text-slate-400">
                  Receive email alerts for upcoming pet reminders
                </p>
              </div>
              <Switch
                checked={preferences.notification_email}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, notification_email: checked })
                }
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
                     Receive in-app notifications for upcoming pet reminders
                   </p>
                 </div>
                 <div className="flex items-center gap-3">
                   <Switch
                     checked={preferences.notification_push}
                     onCheckedChange={(checked) =>
                       setPreferences({ ...preferences, notification_push: checked })
                     }
                     disabled={!isPremium}
                     className="ml-4"
                   />
                   {isPremium && preferences.notification_push && (
                     <Button
                       onClick={handleEnableNotifications}
                       disabled={saving}
                       size="sm"
                       className="bg-blue-600 hover:bg-blue-700 text-white"
                     >
                       {saving ? (
                         <>
                           <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                           Requesting...
                         </>
                       ) : (
                         'Enable Notifications'
                       )}
                     </Button>
                   )}
                 </div>
               </div>
               {permissionDenied && (
                 <div className="mt-2 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                   <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                   <p className="text-sm text-red-400">Notification permission denied. Please enable notifications in your browser settings.</p>
                 </div>
               )}
             </div>



            {/* Save Button */}
            <div className="pt-6 border-t border-slate-800">
              <Button
                onClick={handleSave}
                disabled={saving || !isPremium}
                className={`w-full font-semibold transition-all ${
                  saved
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Preferences Saved
                  </>
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