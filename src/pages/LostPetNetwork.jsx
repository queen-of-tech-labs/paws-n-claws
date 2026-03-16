// src/pages/LostPetNetwork.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/api/firebaseClient";
import { useAuth } from "@/lib/AuthContext";
import AlertCard from "@/components/lostpet/AlertCard";
import CreateAlertForm from "@/components/lostpet/CreateAlertForm";
import { MapPin, Plus, Radio } from "lucide-react";

export default function LostPetNetwork() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPremium = user?.premium_subscriber === true;

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState("active"); // "active" | "found" | "mine"
  const [distanceUnit, setDistanceUnit] = useState("miles");

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  async function loadAlerts() {
    try {
      setLoading(true);
      let q;
      if (filter === "mine") {
        q = query(
          collection(db, "lostPetAlerts"),
          where("createdBy", "==", user?.email),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(
          collection(db, "lostPetAlerts"),
          where("status", "==", filter === "found" ? "found" : "active"),
          orderBy("createdAt", "desc")
        );
      }
      const snap = await getDocs(q);
      setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Load alerts error:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }

  // Premium gate for non-premium users
  if (!isPremium) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <Radio className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Lost Pet Recovery Network</h1>
          <p className="text-slate-400 mb-2">Post live alerts, receive anonymous sightings, and get notified when someone spots your pet nearby.</p>
          <p className="text-slate-500 text-sm mb-8">This is a Premium feature.</p>
          <button
            onClick={() => navigate("/account")}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Upgrade to Premium →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radio className="w-6 h-6 text-red-400" />
            Lost Pet Network
          </h1>
          <p className="text-slate-400 text-sm mt-1">Community-powered pet recovery</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Report Lost Pet
        </button>
      </div>

      {/* Filter + distance toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
          {[
            { key: "active", label: "🔴 Active Alerts" },
            { key: "found", label: "✅ Found" },
            { key: "mine", label: "👤 My Alerts" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
          {["miles", "km"].map(unit => (
            <button
              key={unit}
              onClick={() => setDistanceUnit(unit)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                distanceUnit === unit
                  ? "bg-slate-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-600 border-t-red-400 rounded-full animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16">
          <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">
            {filter === "mine"
              ? "You haven't posted any alerts yet."
              : filter === "found"
              ? "No found pet reports yet."
              : "No active lost pet alerts in your area."}
          </p>
          {filter === "active" && (
            <p className="text-slate-500 text-sm mt-2">That's great news! 🐾</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {alerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              distanceUnit={distanceUnit}
              currentUserEmail={user?.email}
              onClick={() => navigate(`/lost-pet/${alert.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create Alert Form */}
      {showCreateForm && (
        <CreateAlertForm
          user={user}
          onClose={() => setShowCreateForm(false)}
          onSaved={() => {
            setShowCreateForm(false);
            loadAlerts();
          }}
        />
      )}
    </div>
  );
}
