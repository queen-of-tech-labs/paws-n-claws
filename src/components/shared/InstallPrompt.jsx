import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { setupInstallPrompt } from '@/components/services/serviceWorkerManager';

export default function InstallPrompt() {
  const [installAvailable, setInstallAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       navigator.standalone === true;
    
    if (isInstalled) {
      console.log('✅ App is already installed');
      return;
    }

    // Setup install prompt
    const { trigger, isAvailable } = setupInstallPrompt((prompt) => {
      setInstallAvailable(true);
      setDeferredPrompt({ trigger, isAvailable });
    });

    // Check localStorage for dismissal
    const isDismissed = localStorage.getItem('install-prompt-dismissed');
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      const success = await deferredPrompt.trigger();
      if (success) {
        console.log('✅ Installation initiated');
        setDismissed(true);
        localStorage.removeItem('install-prompt-dismissed');
      }
    } catch (error) {
      console.error('❌ Installation failed:', error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('install-prompt-dismissed', 'true');
  };

  // Don't show if not available, dismissed, or already installed
  if (!installAvailable || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm z-40">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">Install Paws & Claws</h3>
          <p className="text-sm text-slate-400 mb-3">
            Add to your home screen for quick access and offline support
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              <Download className="w-4 h-4" />
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-400 hover:bg-slate-800"
            >
              Not Now
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-500 hover:text-slate-400 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}