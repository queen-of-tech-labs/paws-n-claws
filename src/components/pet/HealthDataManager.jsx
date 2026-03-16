// src/components/pet/HealthDataManager.jsx
// Renders inside the Pet Detail page — lets owners add/delete health records.

import { useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/api/firebaseClient";

// ── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
  { key: "vaccinations", label: "💉 Vaccines" },
  { key: "vetVisits",    label: "🏥 Vet Visits" },
  { key: "medications",  label: "💊 Medications" },
  { key: "conditions",   label: "⚕️ Conditions" },
];

// ── Form schemas ───────────────────────────────────────────────────────────
const FORMS = {
  vaccinations: [
    { name: "name",            label: "Vaccine Name",      type: "text",   required: true,  placeholder: "e.g. Rabies" },
    { name: "date",            label: "Date Given",         type: "date",   required: true  },
    { name: "nextDueDate",     label: "Next Due Date",      type: "date"   },
    { name: "administeredBy",  label: "Vet / Clinic Name",  type: "text",   placeholder: "e.g. Green Paws Vet" },
  ],
  vetVisits: [
    { name: "date",    label: "Visit Date",  type: "date", required: true  },
    { name: "reason",  label: "Reason",      type: "text", required: true,  placeholder: "e.g. Annual checkup" },
    { name: "vet",     label: "Vet Name",    type: "text", placeholder: "e.g. Dr. Smith" },
    { name: "clinic",  label: "Clinic Name", type: "text", placeholder: "e.g. Happy Paws Animal Hospital" },
    { name: "weight",  label: "Weight (lbs)",type: "number" },
    { name: "notes",   label: "Notes",       type: "textarea" },
  ],
  medications: [
    { name: "name",          label: "Medication Name", type: "text",   required: true, placeholder: "e.g. Apoquel" },
    { name: "dosage",        label: "Dosage",          type: "text",   placeholder: "e.g. 16mg" },
    { name: "frequency",     label: "Frequency",       type: "text",   placeholder: "e.g. Once daily with food" },
    { name: "startDate",     label: "Start Date",      type: "date" },
    { name: "endDate",       label: "End Date",         type: "date" },
    { name: "prescribedBy",  label: "Prescribed By",   type: "text",   placeholder: "e.g. Dr. Jones" },
  ],
  conditions: [
    { name: "name",     label: "Name",     type: "text", required: true, placeholder: "e.g. Seasonal allergies" },
    { name: "type",     label: "Type",     type: "select", options: ["condition", "allergy"] },
    { name: "severity", label: "Severity", type: "select", options: ["", "mild", "moderate", "severe"] },
    { name: "notes",    label: "Notes",    type: "textarea" },
  ],
};

// ── Main component ─────────────────────────────────────────────────────────
export default function HealthDataManager({ petId, healthData, onUpdate }) {
  const [activeTab, setActiveTab] = useState("vaccinations");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const fields = FORMS[activeTab];
  const records = healthData?.[activeTab] || [];

  function handleTabChange(key) {
    setActiveTab(key);
    setShowForm(false);
    setFormData({});
    setError(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);

    // Validate required fields
    for (const field of fields) {
      if (field.required && !formData[field.name]) {
        setError(`${field.label} is required.`);
        return;
      }
    }

    try {
      setSaving(true);
      const colRef = collection(db, "pets", petId, activeTab);

      // Convert date strings to Date objects for Firestore
      const payload = { ...formData, createdAt: serverTimestamp() };
      ["date", "nextDueDate", "startDate", "endDate"].forEach((key) => {
        if (payload[key]) payload[key] = new Date(payload[key]);
      });

      await addDoc(colRef, payload);
      setFormData({});
      setShowForm(false);
      onUpdate?.(); // tell parent to re-fetch
    } catch (err) {
      console.error("Save health record error:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(recordId) {
    if (!window.confirm("Delete this record?")) return;
    try {
      setDeletingId(recordId);
      await deleteDoc(doc(db, "pets", petId, activeTab, recordId));
      onUpdate?.();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(dateVal) {
    if (!dateVal) return "—";
    const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="hdm-wrapper">
      <div className="hdm-header">
        <h3 className="hdm-title">Health Records</h3>
        <p className="hdm-subtitle">This data powers the shareable Health Passport</p>
      </div>

      {/* Tab bar */}
      <div className="hdm-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`hdm-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Records list */}
      <div className="hdm-records">
        {records.length === 0 && !showForm && (
          <p className="hdm-empty">No {activeTab} recorded yet.</p>
        )}
        {records.map((rec) => (
          <RecordRow
            key={rec.id}
            tab={activeTab}
            rec={rec}
            onDelete={() => handleDelete(rec.id)}
            isDeleting={deletingId === rec.id}
            formatDate={formatDate}
          />
        ))}
      </div>

      {/* Add form */}
      {showForm ? (
        <form className="hdm-form" onSubmit={handleAdd}>
          {fields.map((field) => (
            <div key={field.name} className="hdm-field">
              <label htmlFor={field.name} className="hdm-label">
                {field.label}
                {field.required && <span className="required-star"> *</span>}
              </label>

              {field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  className="hdm-input hdm-textarea"
                  placeholder={field.placeholder}
                  rows={3}
                />
              ) : field.type === "select" ? (
                <select
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  className="hdm-input hdm-select"
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt ? opt.charAt(0).toUpperCase() + opt.slice(1) : "— Select —"}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  className="hdm-input"
                  placeholder={field.placeholder}
                  step={field.type === "number" ? "0.1" : undefined}
                />
              )}
            </div>
          ))}

          {error && <p className="hdm-error">{error}</p>}

          <div className="hdm-form-actions">
            <button type="submit" className="hdm-btn-save" disabled={saving}>
              {saving ? "Saving…" : "Save Record"}
            </button>
            <button
              type="button"
              className="hdm-btn-cancel"
              onClick={() => { setShowForm(false); setFormData({}); setError(null); }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="hdm-btn-add" onClick={() => setShowForm(true)}>
          + Add {TABS.find((t) => t.key === activeTab)?.label}
        </button>
      )}
    </div>
  );
}

// ── Record row ─────────────────────────────────────────────────────────────

function RecordRow({ tab, rec, onDelete, isDeleting, formatDate }) {
  let primary = "";
  let secondary = "";

  if (tab === "vaccinations") {
    primary = rec.name;
    secondary = `Given: ${formatDate(rec.date)}${rec.nextDueDate ? ` · Next due: ${formatDate(rec.nextDueDate)}` : ""}`;
  } else if (tab === "vetVisits") {
    primary = rec.reason || "Visit";
    secondary = formatDate(rec.date) + (rec.vet ? ` · Dr. ${rec.vet}` : "");
  } else if (tab === "medications") {
    primary = rec.name;
    secondary = [rec.dosage, rec.frequency].filter(Boolean).join(" · ");
  } else if (tab === "conditions") {
    primary = rec.name;
    secondary = [rec.type, rec.severity].filter(Boolean).join(" · ");
  }

  return (
    <div className="hdm-record-row">
      <div className="hdm-record-info">
        <span className="hdm-record-primary">{primary}</span>
        {secondary && <span className="hdm-record-secondary">{secondary}</span>}
      </div>
      <button
        className="hdm-btn-delete"
        onClick={onDelete}
        disabled={isDeleting}
        title="Delete"
      >
        {isDeleting ? "…" : "✕"}
      </button>
    </div>
  );
}
