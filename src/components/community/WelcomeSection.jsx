import React from "react";
import { AlertCircle } from "lucide-react";

export default function WelcomeSection() {
  return (
    <div className="mb-12 space-y-4">
      {/* Welcome Card */}
      <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 md:p-8 text-center">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Welcome to Paws & Claws Community</h2>
        <p className="text-slate-300 leading-relaxed max-w-3xl mx-auto">
          Join thousands of pet parents sharing experiences, advice, and heartwarming stories. Whether you're looking 
          for tips, support, or just want to connect with fellow pet lovers, you're in the right place.
        </p>
      </div>

      {/* Medical Disclaimer */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-300 mb-1">Important Reminder</p>
          <p className="text-xs text-blue-200/80">
            This community forum is not a substitute for professional veterinary advice. 
            Always consult with a licensed veterinarian for medical concerns about your pet.
          </p>
        </div>
      </div>
    </div>
  );
}