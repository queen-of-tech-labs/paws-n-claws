import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Chrome, Globe } from 'lucide-react';

export default function NotificationPermissionDeniedModal({ open, onOpenChange }) {
  const [showChrome, setShowChrome] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border border-slate-800 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <DialogTitle className="text-white">Enable Notifications</DialogTitle>
          </div>
          <DialogDescription className="text-slate-400">
            You've blocked notifications. Here's how to enable them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Browser detection section */}
          <div className="space-y-4">
            <p className="text-sm text-slate-300 font-medium">Select Your Browser:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowChrome(true)}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  showChrome
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <Chrome className="w-4 h-4" />
                <span className="text-sm text-white">Chrome</span>
              </button>
              <button
                onClick={() => setShowChrome(false)}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  !showChrome
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm text-white">Safari/Other</span>
              </button>
            </div>
          </div>

          {/* Chrome instructions */}
          {showChrome && (
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-white text-sm">Chrome Instructions:</h3>
              <ol className="space-y-2 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="font-bold text-blue-400 flex-shrink-0">1.</span>
                  <span>Look for the lock icon in the address bar</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-400 flex-shrink-0">2.</span>
                  <span>Click the lock and select "Notifications"</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-400 flex-shrink-0">3.</span>
                  <span>Change from "Block" to "Allow"</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-400 flex-shrink-0">4.</span>
                  <span>Refresh the page and enable notifications again</span>
                </li>
              </ol>
            </div>
          )}

          {/* Safari/Other instructions */}
          {!showChrome && (
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-white text-sm">Safari/Firefox Instructions:</h3>
              <ol className="space-y-2 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="font-bold text-blue-400 flex-shrink-0">1.</span>
                  <span><strong>Safari:</strong> Click menu &rarr; Settings for This Website</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-400 flex-shrink-0">2.</span>
                  <span><strong>Firefox:</strong> Click shield icon &rarr; Permissions</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-400 flex-shrink-0">3.</span>
                  <span>Find "Notifications" and change to "Allow"</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-400 flex-shrink-0">4.</span>
                  <span>Refresh the page and enable notifications again</span>
                </li>
              </ol>
            </div>
          )}

          {/* Help text */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-xs text-blue-300">
              💡 <span className="font-medium">Tip:</span> Once you allow notifications, we'll automatically register your device for push reminders.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                // Refresh to see if permission was enabled
                window.location.reload();
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Refresh & Check
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}