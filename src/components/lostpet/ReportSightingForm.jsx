// src/components/lostpet/ReportSightingForm.jsx
import { useState } from "react";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";
import { db, fbFunctions } from "@/api/firebaseClient";
import { httpsCallable } from "firebase/functions";
import { X, MapPin } from "lucide-react";

export default function ReportSightingForm({ alertId, petName, onClose, onSaved }) {
  const [form, setForm] = useState({ note: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleGetLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const address = data.display_name?.split(",").slice(0, 3).join(", ") || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setForm(prev => ({ ...prev, location: address }));
        } catch {
          setForm(prev => ({ ...prev, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Couldn't get location. Please type it in.");
      }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.note && !form.location) {
      setError("Please add a note or location.");
      return;
    }

    try {
      setSaving(true);

      // Add sighting to sub-collection
      await addDoc(collection(db, "lostPetAlerts", alertId, "sightings"), {
        note: form.note,
        location: form.location,
        reportedAt: serverTimestamp(),
      });

      // Increment sighting count on alert
      await updateDoc(doc(db, "lostPetAlerts", alertId), {
        sightingCount: increment(1),
      });

      // Notify the pet owner (non-blocking)
      try {
        const notify = httpsCallable(fbFunctions, "notifySighting");
        await notify({ alertId, petName, location: form.location, note: form.note });
      } catch (notifErr) {
        console.warn("Sighting notification failed (non-critical):", notifErr);
      }

      onSaved();
    } catch (err) {
      console.error("Report sighting error:", err);
      setError("Failed to submit. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h2 className="text-base font-bold text-white">👀 Report a Sighting</h2>
            <p className="text-slate-400 text-xs mt-0.5">This is anonymous — no account needed</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
              Where did you see {petName}?
            </label>
            <div className="flex gap-2">
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                className="flex-1 bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Street, park, neighborhood..."
              />
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                {locating ? "..." : "GPS"}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
              Additional details
            </label>
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              rows={3}
              className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-500"
              placeholder={`What was ${petName} doing? Direction they were heading? Any other details...`}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {saving ? "Submitting..." : "Submit Sighting"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl bg-slate-700 text-slate-300 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
