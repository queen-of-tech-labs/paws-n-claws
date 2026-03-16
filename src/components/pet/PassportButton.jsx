// src/components/pet/PassportButton.jsx
// Drop this button anywhere on the Pet Detail page.
// - If the user is premium → opens their passport in a new tab + copy link
// - If NOT premium → shows upgrade prompt

import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PassportButton({ petId, isPremium }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  function handleView() {
    // Navigate to the passport page (opens in same tab)
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
      <div className="passport-upsell">
        <div className="upsell-icon">🐾</div>
        <div className="upsell-text">
          <strong>Digital Health Passport</strong>
          <p>Share {/* pet name handled by parent */}your pet's full medical history with vets, sitters &amp; groomers.</p>
        </div>
        <button
          className="upsell-btn"
          onClick={() => navigate("/premium")}
        >
          Unlock with Premium →
        </button>
      </div>
    );
  }

  return (
    <div className="passport-btn-group">
      <button className="passport-view-btn" onClick={handleView}>
        📋 View Health Passport
      </button>
      <button className="passport-share-btn" onClick={handleCopy}>
        {copied ? "✓ Copied!" : "🔗 Copy Link"}
      </button>
    </div>
  );
}
