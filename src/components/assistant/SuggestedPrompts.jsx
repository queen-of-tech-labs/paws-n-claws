import React from "react";
import { Button } from "@/components/ui/button";

const SUGGESTED_PROMPTS = [
  "Is this behavior normal?",
  "Diet recommendations",
  "Training advice",
  "Health concerns",
  "Medication reminders",
  "When should I see a vet?"
];

export default function SuggestedPrompts({ onSelectPrompt, disabled }) {
  return (
    <div className="bg-white p-4 rounded-lg space-y-3">
      <p className="text-sm font-medium text-slate-700">Suggested questions:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelectPrompt(prompt)}
            disabled={disabled}
            className="text-left p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-sm text-slate-700 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}