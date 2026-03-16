// src/pages/PetPassport.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db, fbAuth } from "@/api/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";

export default function PetPassport() {
  const { petId } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [records, setRecords] = useState({ health: [], care: [], appointments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(fbAuth, (user) => setCurrentUser(user));
    return unsub;
  }, []);

  useEffect(() => {
    async function loadPassport() {
      try {
        setLoading(true);

        const petSnap = await getDoc(doc(db, "pets", petId));
        if (!petSnap.exists()) {
          setError("Pet not found. This passport may have been removed.");
          setLoading(false);
          return;
        }
        const petData = { id: petSnap.id, ...petSnap.data() };
        setPet(petData);

        const [healthSnap, careSnap, apptSnap] = await Promise.all([
          getDocs(query(collection(db, "healthRecords"), where("pet_id", "==", petId))),
          getDocs(query(collection(db, "careLogs"), where("pet_id", "==", petId))),
          getDocs(query(collection(db, "appointments"), where("pet_id", "==", petId))),
        ]);

        setRecords({
          health: healthSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)),
          care: careSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)),
          appointments: apptSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)),
        });

      } catch (err) {
        console.error("Passport load error:", err);
        setError("Unable to load passport. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    if (petId) loadPassport();
  }, [petId]);

  const isOwner = currentUser && pet && currentUser.email === pet.created_by;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#/passport/${petId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    const birth = new Date(dateOfBirth);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    if (years === 0) return months <= 0 ? "newborn" : `${months} month${months > 1 ? "s" : ""}`;
    if (years === 1 && months < 0) return `${12 + months} months`;
    return `${years} year${years > 1 ? "s" : ""} old`;
  }

  function formatDate(dateVal) {
    if (!dateVal) return "—";
    const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  if (loading) {
    return (
      <div className="passport-loading">
        <div className="paw-spinner">🐾</div>
        <p>Loading passport…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="passport-error">
        <div className="error-icon">🐾</div>
        <h2>Passport Not Found</h2>
        <p>{error}</p>
        <button onClick={() => navigate("/")}>Go Home</button>
      </div>
    );
  }

  const age = calculateAge(pet.date_of_birth);

  return (
    <div className="passport-page">
      <div className="print-header">
        <span>🐾 Paws &amp; Claws — Digital Pet Health Passport</span>
        <span>{new Date().toLocaleDateString()}</span>
      </div>

      <div className="passport-hero">
        <div className="passport-cover">
          <div className="passport-badge">
            <span className="badge-text">HEALTH PASSPORT</span>
          </div>

          <div className="pet-photo-wrapper">
            {pet.photo_url ? (
              <img src={pet.photo_url} alt={pet.name} className="pet-photo" />
            ) : (
              <div className="pet-photo-placeholder">
                {pet.species === "cat" ? "🐱" : pet.species === "dog" ? "🐶" : "🐾"}
              </div>
            )}
          </div>

          <div className="pet-identity">
            <h1 className="pet-name">{pet.name}</h1>
            <p className="pet-subtitle">
              {[pet.breed, pet.species].filter(Boolean).join(" · ")}
              {age && ` · ${age}`}
            </p>
          </div>

          <div className="pet-stats-row">
            {pet.weight && <StatPill label="Weight" value={`${pet.weight} lbs`} />}
            {pet.gender && <StatPill label="Sex" value={pet.gender} />}
            {pet.spayed_neutered && <StatPill label="Status" value="Spayed/Neutered" />}
            {pet.microchip_number && <StatPill label="Microchip" value={pet.microchip_number} />}
          </div>

          {pet.allergies && pet.allergies !== "None" && (
            <div className="passport-allergies">
              ⚠️ <strong>Allergies:</strong> {pet.allergies}
            </div>
          )}

          {isOwner && (
            <div className="passport-actions no-print">
              <button className="action-btn share-btn" onClick={handleCopyLink}>
                {copied ? "✓ Link Copied!" : "🔗 Share Passport"}
              </button>
              <button className="action-btn print-btn" onClick={() => window.print()}>
                🖨️ Print / Save PDF
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="passport-grid">

        <Section title="🏥 Health Records" className="section-vaccinations">
          {records.health.length === 0 ? (
            <EmptyState message="No health records added yet." />
          ) : (
            <div className="visits-list">
              {records.health.map((rec) => (
                <div key={rec.id} className="visit-card">
                  <div className="visit-date">{formatDate(rec.date)}</div>
                  <div className="visit-reason">{rec.title || rec.type || "Health Record"}</div>
                  {rec.description && <div className="visit-notes">{rec.description}</div>}
                  {rec.veterinarian && <div className="visit-vet">Dr. {rec.veterinarian}</div>}
                  {rec.next_due_date && <div className="visit-notes">Next due: {formatDate(rec.next_due_date)}</div>}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="📅 Appointments" className="section-visits">
          {records.appointments.length === 0 ? (
            <EmptyState message="No appointments recorded yet." />
          ) : (
            <div className="visits-list">
              {records.appointments.map((appt) => (
                <div key={appt.id} className="visit-card">
                  <div className="visit-date">{formatDate(appt.date)}</div>
                  <div className="visit-reason">{appt.title || appt.type || "Appointment"}</div>
                  {appt.veterinarian && <div className="visit-vet">Dr. {appt.veterinarian}</div>}
                  {appt.clinic && <div className="visit-clinic">{appt.clinic}</div>}
                  {appt.notes && <div className="visit-notes">{appt.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="🐾 Care Log" className="section-meds">
          {records.care.length === 0 ? (
            <EmptyState message="No care entries recorded yet." />
          ) : (
            <div className="visits-list">
              {records.care.map((entry) => (
                <div key={entry.id} className="visit-card">
                  <div className="visit-date">{formatDate(entry.date)}</div>
                  <div className="visit-reason">{entry.type || entry.title || "Care Entry"}</div>
                  {entry.notes && <div className="visit-notes">{entry.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </Section>

        {(pet.medical_history || pet.behavior_notes) && (
          <Section title="📋 Medical Notes" className="section-conditions">
            {pet.medical_history && (
              <div className="visit-card">
                <div className="visit-reason">Medical History</div>
                <div className="visit-notes">{pet.medical_history}</div>
              </div>
            )}
            {pet.behavior_notes && (
              <div className="visit-card">
                <div className="visit-reason">Behavior Notes</div>
                <div className="visit-notes">{pet.behavior_notes}</div>
              </div>
            )}
          </Section>
        )}

      </div>

      <div className="passport-footer no-print">
        <p>
          Generated by <strong>Paws &amp; Claws Pet Tracker</strong> ·{" "}
          <a href="/#/">paws-n-claws.vercel.app</a>
        </p>
        {!isOwner && (
          <p className="footer-cta">
            Want a passport for your pet? <a href="/#/">Create a free account →</a>
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ title, children, className }) {
  return (
    <div className={`passport-section ${className || ""}`}>
      <h2 className="section-title" dangerouslySetInnerHTML={{ __html: title }} />
      {children}
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="stat-pill">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function EmptyState({ message }) {
  return <p className="empty-state">{message}</p>;
}
