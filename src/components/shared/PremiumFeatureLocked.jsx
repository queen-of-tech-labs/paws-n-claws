import React from "react";
import { Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PremiumFeatureLocked({ featureName, onUpgrade }) {
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
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg mb-3"
          >
            Upgrade to Premium
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