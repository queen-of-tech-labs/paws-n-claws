// src/components/lostpet/CreateAlertForm.jsx
import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db, fbFunctions } from "@/api/firebaseClient";
import { httpsCallable } from "firebase/functions";
import { X, MapPin } from "lucide-react";

export default function CreateAlertForm({ user, onClose, onSaved, prefillPet = null }) {
  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(prefillPet?.id || "");
  const [coords, setCoords] = useState(null); // { lat, lng } captured when GPS is used
  const [form, setForm] = useState({
    petName: prefillPet?.name || "",
    species: prefillPet?.species || "",
    breed: prefillPet?.breed || "",
    description: prefillPet?.medical_history || "",
    petPhoto: prefillPet?.photo_url || "",
    lastSeenAddress: "",
    ownerName: user?.full_name || "",
    ownerPhone: "",
    ownerEmail: user?.email || "",
    reward: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [locating, setLocating] = useState(false);

  // Load user's pets to pre-fill
  useEffect(() => {
    async function loadPets() {
      if (!user?.email) return;
      try {
        const snap = await getDocs(
          query(collection(db, "pets"), where("created_by", "==", user.email))
        );
        setPets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Load pets error:", err);
      }
    }
    loadPets();
  }, [user]);

  function handlePetSelect(petId) {
    setSelectedPetId(petId);
    if (!petId) return;
    const pet = pets.find(p => p.id === petId);
    if (pet) {
      setForm(prev => ({
        ...prev,
        petName: pet.name || "",
        species: pet.species || "",
        breed: pet.breed || "",
        petPhoto: pet.photo_url || "",
        description: pet.medical_history || "",
      }));
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleGetLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude }); // save for notification
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const address = data.display_name?.split(",").slice(0, 3).join(", ") || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setForm(prev => ({ ...prev, lastSeenAddress: address }));
        } catch {
          setForm(prev => ({ ...prev, lastSeenAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Could not get location. Please enter it manually.");
      }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.petName) { setError("Pet name is required."); return; }
    if (!form.ownerEmail) { setError("Contact email is required."); return; }

    try {
      setSaving(true);
      const docRef = await addDoc(collection(db, "lostPetAlerts"), {
        ...form,
        status: "active",
        createdBy: user.email,
        createdAt: serverTimestamp(),
        sightingCount: 0,
      });

      // Notify nearby users (non-blocking — won't break form if it fails)
      try {
        const notify = httpsCallable(fbFunctions, "notifyLostPet");
        await notify({
          alertId: docRef.id,
          petName: form.petName,
          lastSeenAddress: form.lastSeenAddress,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
          radiusMiles: 25,
        });
      } catch (notifErr) {
        console.warn("Push notification failed (non-critical):", notifErr);
      }

      onSaved();
    } catch (err) {
      console.error("Create alert error:", err);
      if (err.code === "permission-denied") {
        setError("Permission denied. Make sure you are logged in and have updated your Firestore rules.");
      } else {
        setError(`Failed to post alert: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-lg font-bold text-white">🚨 Report Lost Pet</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Select from my pets */}
          {pets.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
                Select one of your pets (optional)
              </label>
              <select
                value={selectedPetId}
                onChange={e => handlePetSelect(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm"
              >
                <option value="">— Enter manually —</option>
                {pets.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                ))}
              </select>
            </div>
          )}

          {/* Pet info */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pet Name *" name="petName" value={form.petName} onChange={handleChange} placeholder="e.g. Buddy" />
            <Field label="Species" name="species" value={form.species} onChange={handleChange} placeholder="dog / cat / etc" />
            <Field label="Breed" name="breed" value={form.breed} onChange={handleChange} placeholder="e.g. Golden Retriever" />
            <Field label="Reward (optional)" name="reward" value={form.reward} onChange={handleChange} placeholder="e.g. $100" />
          </div>

          {/* Photo URL */}
          <Field label="Pet Photo URL" name="petPhoto" value={form.petPhoto} onChange={handleChange} placeholder="https://..." />

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
              Description / distinguishing features
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-500"
              placeholder="Color, markings, collar, any special features..."
            />
          </div>

          {/* Last seen */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
              Last seen location
            </label>
            <div className="flex gap-2">
              <input
                name="lastSeenAddress"
                value={form.lastSeenAddress}
                onChange={handleChange}
                className="flex-1 bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Street, neighborhood or intersection"
              />
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                {locating ? "..." : "Use GPS"}
              </button>
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Your Name" name="ownerName" value={form.ownerName} onChange={handleChange} />
            <Field label="Phone" name="ownerPhone" value={form.ownerPhone} onChange={handleChange} placeholder="(555) 000-0000" />
            <div className="col-span-2">
              <Field label="Email *" name="ownerEmail" value={form.ownerEmail} onChange={handleChange} type="email" />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {saving ? "Posting Alert..." : "🚨 Post Alert"}
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

function Field({ label, name, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
        {label}
      </label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
