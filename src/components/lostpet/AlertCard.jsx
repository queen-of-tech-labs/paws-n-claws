// src/components/lostpet/AlertCard.jsx
import { Eye, MapPin, Clock } from "lucide-react";

export default function AlertCard({ alert, distanceUnit, currentUserEmail, onClick }) {
  function timeAgo(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  const isOwner = alert.createdBy === currentUserEmail;
  const isFound = alert.status === "found";

  return (
    <div
      onClick={onClick}
      className={`bg-slate-800 rounded-xl border cursor-pointer transition-all hover:border-slate-500 hover:-translate-y-0.5 overflow-hidden ${
        isFound ? "border-green-500/30 opacity-75" : "border-slate-700"
      }`}
    >
      {/* Photo */}
      <div className="relative h-40">
        {alert.petPhoto ? (
          <img src={alert.petPhoto} alt={alert.petName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-slate-700 flex items-center justify-center text-4xl">
            {alert.species === "cat" ? "🐱" : alert.species === "dog" ? "🐶" : "🐾"}
          </div>
        )}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold ${
          isFound ? "bg-green-500 text-white" : "bg-red-500 text-white"
        }`}>
          {isFound ? "✅ FOUND" : "🔴 MISSING"}
        </div>
        {alert.reward && (
          <div className="absolute top-2 right-2 bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
            💰 {alert.reward}
          </div>
        )}
        {isOwner && (
          <div className="absolute bottom-2 right-2 bg-blue-500/80 text-white px-2 py-0.5 rounded-full text-xs">
            Your alert
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-bold text-white text-base mb-0.5">{alert.petName}</h3>
        <p className="text-slate-400 text-xs mb-2">
          {[alert.breed, alert.species].filter(Boolean).join(" · ")}
        </p>

        {alert.lastSeenAddress && (
          <div className="flex items-center gap-1 text-slate-400 text-xs mb-2">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{alert.lastSeenAddress}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(alert.createdAt)}
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {alert.sightingCount || 0} sighting{alert.sightingCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
