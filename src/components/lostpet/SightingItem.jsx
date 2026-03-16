// src/components/lostpet/SightingItem.jsx
import { MapPin, Clock } from "lucide-react";

export default function SightingItem({ sighting }) {
  function timeAgo(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-1.5 text-blue-400 text-xs font-medium">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">
            👤
          </div>
          Anonymous report
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-xs">
          <Clock className="w-3 h-3" />
          {timeAgo(sighting.reportedAt)}
        </div>
      </div>

      {sighting.location && (
        <div className="flex items-center gap-1.5 text-slate-300 text-sm mb-2">
          <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          {sighting.location}
        </div>
      )}

      {sighting.note && (
        <p className="text-slate-400 text-sm leading-relaxed">{sighting.note}</p>
      )}
    </div>
  );
}
