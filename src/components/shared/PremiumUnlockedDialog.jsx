import React, { useState } from "react";
import api from '@/api/firebaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

export default function PremiumUnlockedDialog({ open, onOpenChange }) {
  const [enablingNotifications, setEnablingNotifications] = useState(false);

  const handleEnableNotifications = async () => {
    setEnablingNotifications(true);
    try {
      const { handlePostPurchaseSetup } = await import('../services/postPurchaseService');
      const result = await handlePostPurchaseSetup();
      
      if (result.success) {
        console.log('✓ Notifications enabled');
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      onOpenChange(false);
    }
    setEnablingNotifications(false);
  };

  const handleSkip = async () => {
    try {
      await api.auth.updateMe({ notification_setup_pending: false });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to clear notification flag:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Check className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-white text-center text-2xl">Premium Unlocked!</DialogTitle>
          <DialogDescription className="text-slate-400 text-center">
            Enable reminders for your pets?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-blue-300 text-center">
              Get push notifications for vaccinations, medications, and upcoming appointments
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1 border-slate-700 text-slate-300"
              disabled={enablingNotifications}
            >
              Skip
            </Button>
            <Button
              onClick={handleEnableNotifications}
              disabled={enablingNotifications}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {enablingNotifications ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enable Reminders"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}