// src/pages/LostPetAlertDetail.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc, getDoc, collection, getDocs, addDoc,
  updateDoc, serverTimestamp, query, orderBy
} from "firebase/firestore";
import { db, fbAuth } from "@/api/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import ReportSightingForm from "@/components/lostpet/ReportSightingForm";
import SightingItem from "@/components/lostpet/SightingItem";
import { ArrowLeft, MapPin, Phone, Mail, CheckCircle, Eye } from "lucide-react";

export default function LostPetAlertDetail() {
  const { alertId } = useParams();
  const navigate = useNavigate();

  const [alert, setAlert] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSightingForm, setShowSightingForm] = useState(false);
  const [markingFound, setMarkingFound] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(fbAuth, u => setCurrentUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (alertId) loadAlert();
  }, [alertId]);

  async function loadAlert() {
    try {
      setLoading(true);
      const alertSnap = await getDoc(doc(db, "lostPetAlerts", alertId));
      if (!alertSnap.exists()) { setError("Alert not found."); setLoading(false); return; }
      setAlert({ id: alertSnap.id, ...alertSnap.data() });

      const sightingsSnap = await getDocs(
        query(collection(db, "lostPetAlerts", alertId, "sightings"), orderBy("reportedAt", "desc"))
      );
      setSightings(sightingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Load alert error:", err);
      setError("Unable to load alert.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkFound() {
    if (!window.confirm(`Mark ${alert.petName} as found? This will close the alert.`)) return;
    try {
      setMarkingFound(true);
      await updateDoc(doc(db, "lostPetAlerts", alertId), {
        status: "found",
        foundAt: serverTimestamp(),
      });
      setAlert(prev => ({ ...prev, status: "found" }));
    } catch (err) {
      console.error("Mark found error:", err);
    } finally {
      setMarkingFound(false);
    }
  }

  function formatDate(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const isOwner = currentUser && alert && currentUser.email === alert.createdBy;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-slate-600 border-t-red-400 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-6 text-center">
      <p className="text-slate-400">{error}</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-blue-400 text-sm">← Go back</button>
    </div>
  );

  // Thank you screen shown after sighting submitted
  if (showThankYou) return (
    <div className="p-6 max-w-md mx-auto text-center py-20">
      <div className="text-6xl mb-4">🐾</div>
      <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
      <p className="text-slate-400 mb-2">Your sighting has been reported. The owner has been notified.</p>
      <p className="text-slate-500 text-sm mb-8">Every report helps bring {alert?.petName} home! 💙</p>
      <button
        onClick={() => setShowThankYou(false)}
        className="px-6 py-2 rounded-xl bg-slate-700 text-white text-sm font-medium"
      >
        Back to Alert
      </button>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Status banner */}
      {alert.status === "found" && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl px-4 py-3 mb-4 text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          🎉 {alert.petName} has been found! Thank you to everyone who helped.
        </div>
      )}

      {/* Pet card */}
      <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 mb-6">
        {/* Photo */}
        <div className="relative">
          {alert.petPhoto ? (
            <img src={alert.petPhoto} alt={alert.petName} className="w-full h-56 object-cover" />
          ) : (
            <div className="w-full h-56 bg-slate-700 flex items-center justify-center text-6xl">
              {alert.species === "cat" ? "🐱" : alert.species === "dog" ? "🐶" : "🐾"}
            </div>
          )}
          <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold ${
            alert.status === "found"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white animate-pulse"
          }`}>
            {alert.status === "found" ? "✅ FOUND" : "🔴 MISSING"}
          </div>
          {alert.reward && (
            <div className="absolute top-3 right-3 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold">
              💰 {alert.reward}
            </div>
          )}
        </div>

        <div className="p-5">
          <h1 className="text-2xl font-bold text-white mb-1">{alert.petName}</h1>
          <p className="text-slate-400 text-sm mb-4">
            {[alert.breed, alert.species].filter(Boolean).join(" · ")}
            {alert.createdAt && ` · Missing since ${formatDate(alert.createdAt)}`}
          </p>

          {alert.description && (
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">{alert.description}</p>
          )}

          {/* Last seen */}
          {alert.lastSeenAddress && (
            <div className="flex items-start gap-2 bg-slate-700/50 rounded-xl p-3 mb-4">
              <MapPin className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5">Last seen near</p>
                <p className="text-slate-200 text-sm">{alert.lastSeenAddress}</p>
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="border-t border-slate-700 pt-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-3">Contact Owner</p>
            <div className="flex flex-wrap gap-3">
              {alert.ownerName && (
                <span className="text-slate-300 text-sm font-medium">{alert.ownerName}</span>
              )}
              {alert.ownerPhone && (
                <a href={`tel:${alert.ownerPhone}`} className="flex items-center gap-1.5 text-blue-400 text-sm hover:text-blue-300">
                  <Phone className="w-3.5 h-3.5" /> {alert.ownerPhone}
                </a>
              )}
              {alert.ownerEmail && (
                <a href={`mailto:${alert.ownerEmail}`} className="flex items-center gap-1.5 text-blue-400 text-sm hover:text-blue-300">
                  <Mail className="w-3.5 h-3.5" /> {alert.ownerEmail}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {alert.status === "active" && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowSightingForm(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm font-semibold"
          >
            <Eye className="w-4 h-4" />
            I Saw This Pet
          </button>
          {isOwner && (
            <button
              onClick={handleMarkFound}
              disabled={markingFound}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors text-sm font-semibold"
            >
              <CheckCircle className="w-4 h-4" />
              {markingFound ? "Saving..." : "Mark as Found 🎉"}
            </button>
          )}
        </div>
      )}

      {/* Sightings */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-400" />
          Sightings ({sightings.length})
        </h2>
        {sightings.length === 0 ? (
          <div className="text-center py-8 bg-slate-800/50 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm">No sightings reported yet.</p>
            <p className="text-slate-500 text-xs mt-1">Be the first to report a sighting!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sightings.map(s => (
              <SightingItem key={s.id} sighting={s} />
            ))}
          </div>
        )}
      </div>

      {/* Sighting form modal */}
      {showSightingForm && (
        <ReportSightingForm
          alertId={alertId}
          petName={alert.petName}
          onClose={() => setShowSightingForm(false)}
          onSaved={() => {
            setShowSightingForm(false);
            setShowThankYou(true);
            loadAlert();
          }}
        />
      )}
    </div>
  );
}
