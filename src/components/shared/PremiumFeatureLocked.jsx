import React, { useState } from "react";
import { Lock, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/api/firebaseClient";

export default function PremiumFeatureLocked({ featureName, onUpgrade }) {
  const [loading, setLoading] = useState(false);

  const handleUpgradeClick = async () => {
    setLoading(true);
    try {
      const response = await api.functions.invoke('createCheckoutSession', {
        priceId: 'price_1T2GVUJKBH02BiIFrQGvTDlQ',
        mode: 'subscription',
        successUrl: window.location.origin + '/#/account?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: window.location.origin + '/#/account'
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        alert("Failed to start checkout. Please try again.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("Failed to start checkout. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Premium Feature
          </h2>

          <p className="text-slate-600 mb-6">
            <span className="font-semibold text-slate-900">{featureName}</span> is only available for Premium subscribers.
          </p>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-600 mb-3">
              Upgrade to Premium for:
            </p>
            <ul className="text-left space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                {featureName}
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                All premium features
              </li>
            </ul>
          </div>

          <Button
            onClick={handleUpgradeClick}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg mb-3"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </span>
            ) : (
              "Upgrade to Premium"
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="w-full text-slate-600"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}