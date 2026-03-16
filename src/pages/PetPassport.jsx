// src/pages/PetPassport.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function PetPassport() {
  const { petId } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [healthData, setHealthData] = useState({
    vaccinations: [],
    vetVisits: [],
    medications: [],
    conditions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);

  // Track auth state to know if owner is viewing
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  // Load pet + health data
  useEffect(() => {
    async function loadPassport() {
      try {
        setLoading(true);

        // Load pet document
        const petRef = doc(db, "pets", petId);
        const petSnap = await getDoc(petRef);

        if (!petSnap.exists()) {
          setError("Pet not found. This passport may have been removed.");
          setLoading(false);
          return;
        }

        const petData = { id: petSnap.id, ...petSnap.data() };
        setPet(petData);

        // Load health sub-collections (stored under pets/{petId}/health/{type})
        const types = ["vaccinations", "vetVisits", "medications", "conditions"];
        const results = {};

        for (const type of types) {
          try {
            const colRef = collection(db, "pets", petId, type);
            const q = query(colRef, orderBy("date", "desc"));
            const snap = await getDocs(q);
            results[type] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          } catch {
            // Sub-collection may not exist yet — that's fine
            results[type] = [];
          }
        }

        setHealthData(results);

        // Check if the owner has premium (needed to show share button)
        if (petData.ownerId) {
          const ownerRef = doc(db, "users", petData.ownerId);
          const ownerSnap = await getDoc(ownerRef);
          if (ownerSnap.exists()) {
            setIsPremium(ownerSnap.data().isPremium === true);
          }
        }
      } catch (err) {
        console.error("Passport load error:", err);
        setError("Unable to load passport. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (petId) loadPassport();
  }, [petId]);

  const isOwner = currentUser && pet && currentUser.uid === pet.ownerId;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#/passport/${petId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => window.print();

  // ── Helpers ────────────────────────────────────────────────────────────────

  function ageDisplay(pet) {
    if (!pet) return "";
    if (pet.age) return pet.age;
    if (pet.birthday) {
      const birth = new Date(pet.birthday);
      const now = new Date();
      const years = now.getFullYear() - birth.getFullYear();
      const months = now.getMonth() - birth.getMonth();
      const totalMonths = years * 12 + months;
      if (totalMonths < 12) return `${totalMonths} month${totalMonths !== 1 ? "s" : ""}`;
      const y = Math.floor(totalMonths / 12);
      const m = totalMonths % 12;
      return m > 0 ? `${y}y ${m}mo` : `${y} year${y !== 1 ? "s" : ""}`;
    }
    return "Unknown";
  }

  function formatDate(dateVal) {
    if (!dateVal) return "—";
    const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function vaccinationStatus(vax) {
    if (!vax.nextDueDate) return "up-to-date";
    const due = vax.nextDueDate.toDate ? vax.nextDueDate.toDate() : new Date(vax.nextDueDate);
    const now = new Date();
    const daysUntil = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return "overdue";
    if (daysUntil <= 30) return "due-soon";
    return "up-to-date";
  }

  // ── Render states ──────────────────────────────────────────────────────────

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

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="passport-page">
      {/* Print-only header */}
      <div className="print-header">
        <span>🐾 Paws &amp; Claws — Digital Pet Health Passport</span>
        <span>{new Date().toLocaleDateString()}</span>
      </div>

      {/* ── Hero Card ── */}
      <div className="passport-hero">
        <div className="passport-cover">
          <div className="passport-badge">
            <span className="badge-text">HEALTH PASSPORT</span>
          </div>

          <div className="pet-photo-wrapper">
            {pet.photoURL ? (
              <img src={pet.photoURL} alt={pet.name} className="pet-photo" />
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
            </p>
          </div>

          <div className="pet-stats-row">
            <StatPill label="Age" value={ageDisplay(pet)} />
            <StatPill label="Weight" value={pet.weight ? `${pet.weight} lbs` : "—"} />
            <StatPill label="Color" value={pet.color || "—"} />
            <StatPill label="Sex" value={pet.sex || "—"} />
          </div>

          {/* Action buttons — only shown to the owner */}
          {isOwner && (
            <div className="passport-actions no-print">
              <button className="action-btn share-btn" onClick={handleCopyLink}>
                {copied ? "✓ Link Copied!" : "🔗 Share Passport"}
              </button>
              <button className="action-btn print-btn" onClick={handlePrint}>
                🖨️ Print / Save PDF
              </button>
              <button className="action-btn edit-btn" onClick={() => navigate(`/pet/${petId}`)}>
                ✏️ Edit Pet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Content Grid ── */}
      <div className="passport-grid">

        {/* Vaccinations */}
        <Section title="💉 Vaccinations" className="section-vaccinations">
          {healthData.vaccinations.length === 0 ? (
            <EmptyState message="No vaccination records added yet." />
          ) : (
            <div className="vax-list">
              {healthData.vaccinations.map((vax) => {
                const status = vaccinationStatus(vax);
                return (
                  <div key={vax.id} className={`vax-card status-${status}`}>
                    <div className="vax-name">{vax.name}</div>
                    <div className="vax-dates">
                      <span>Given: {formatDate(vax.date)}</span>
                      {vax.nextDueDate && (
                        <span>Next due: {formatDate(vax.nextDueDate)}</span>
                      )}
                    </div>
                    <div className={`vax-badge badge-${status}`}>
                      {status === "up-to-date" && "✓ Up to date"}
                      {status === "due-soon" && "⚠ Due soon"}
                      {status === "overdue" && "✕ Overdue"}
                    </div>
                    {vax.administeredBy && (
                      <div className="vax-vet">Dr. {vax.administeredBy}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Vet Visits */}
        <Section title="🏥 Vet Visit History" className="section-visits">
          {healthData.vetVisits.length === 0 ? (
            <EmptyState message="No vet visits recorded yet." />
          ) : (
            <div className="visits-list">
              {healthData.vetVisits.map((visit) => (
                <div key={visit.id} className="visit-card">
                  <div className="visit-date">{formatDate(visit.date)}</div>
                  <div className="visit-reason">{visit.reason || "General checkup"}</div>
                  {visit.vet && <div className="visit-vet">Dr. {visit.vet}</div>}
                  {visit.clinic && <div className="visit-clinic">{visit.clinic}</div>}
                  {visit.notes && <div className="visit-notes">{visit.notes}</div>}
                  {visit.weight && (
                    <div className="visit-weight">Weight: {visit.weight} lbs</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Medications */}
        <Section title="💊 Current Medications" className="section-meds">
          {healthData.medications.length === 0 ? (
            <EmptyState message="No medications on record." />
          ) : (
            <div className="meds-list">
              {healthData.medications.map((med) => (
                <div key={med.id} className="med-card">
                  <div className="med-name">{med.name}</div>
                  <div className="med-meta">
                    {med.dosage && <span>{med.dosage}</span>}
                    {med.frequency && <span>{med.frequency}</span>}
                  </div>
                  {med.startDate && (
                    <div className="med-dates">
                      Started: {formatDate(med.startDate)}
                      {med.endDate && ` · Until: ${formatDate(med.endDate)}`}
                    </div>
                  )}
                  {med.prescribedBy && (
                    <div className="med-vet">Prescribed by Dr. {med.prescribedBy}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Conditions & Allergies */}
        <Section title="⚕️ Conditions &amp; Allergies" className="section-conditions">
          {healthData.conditions.length === 0 ? (
            <EmptyState message="No conditions or allergies on record." />
          ) : (
            <div className="conditions-list">
              {healthData.conditions.map((cond) => (
                <div key={cond.id} className={`condition-card type-${cond.type || "condition"}`}>
                  <div className="condition-name">{cond.name}</div>
                  <div className={`condition-type-badge type-${cond.type || "condition"}`}>
                    {cond.type === "allergy" ? "⚠ Allergy" : "📋 Condition"}
                  </div>
                  {cond.severity && (
                    <div className={`condition-severity sev-${cond.severity}`}>
                      {cond.severity}
                    </div>
                  )}
                  {cond.notes && <div className="condition-notes">{cond.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </Section>

      </div>

      {/* Footer */}
      <div className="passport-footer no-print">
        <p>
          Generated by{" "}
          <strong>Paws &amp; Claws Pet Tracker</strong> ·{" "}
          <a href="/#/">pawsandclaws.app</a>
        </p>
        {!isOwner && (
          <p className="footer-cta">
            Want a passport for your pet?{" "}
            <a href="/#/register">Create a free account →</a>
          </p>
        )}
      </div>
    </div>
  );
}

// ── Small helper components ────────────────────────────────────────────────

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
