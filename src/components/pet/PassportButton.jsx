// src/components/pet/PassportButton.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PassportButton({ petId, isPremium }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  function handleView() {
    navigate(`/passport/${petId}`);
  }

  function handleCopy() {
    const url = `${window.location.origin}/#/passport/${petId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (!isPremium) {
    return (
      <div className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[#F97066]/10 border border-[#F97066]/30 mb-3">
        <span className="text-lg">🐾</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#3D2E24]">Digital Health Passport</p>
          <p className="text-xs text-[#6B5B50]/70">Share your pet's medical history with vets &amp; sitters</p>
        </div>
        <button
          onClick={() => navigate("/premium")}
          className="text-xs font-semibold text-[#F97066] whitespace-nowrap"
        >
          Unlock →
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <button
        onClick={handleView}
        className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-[#2a7c6f]/10 border border-[#2a7c6f]/30 text-[#2a7c6f] hover:bg-[#2a7c6f]/20 transition-colors text-sm font-medium mb-1"
      >
        📋 View Health Passport
      </button>
      <button
        onClick={handleCopy}
        className="flex items-center justify-center gap-1 w-full text-xs text-[#6B5B50]/60 hover:text-[#2a7c6f] transition-colors py-1"
      >
        🔗 {copied ? "✓ Link copied to clipboard!" : "Copy shareable link"}
      </button>
    </div>
  );
}

