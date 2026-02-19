import React, { useState } from "react";
import api from '@/api/firebaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Loader2, FileText, Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const RECORD_TYPES = [
  { value: "vet_document", label: "Vet Document" },
  { value: "lab_result", label: "Lab Result" },
  { value: "vaccine_record", label: "Vaccine Record" },
  { value: "xray", label: "X-Ray" },
  { value: "prescription", label: "Prescription" },
  { value: "other", label: "Other" },
];

export default function HealthRecordForm({ open, onClose, petId, pets, record, onSaved }) {
  const { data: veterinarians = [] } = useQuery({
    queryKey: ["veterinarians"],
    queryFn: async () => {
      const user = await api.auth.me();
      return api.entities.Veterinarian.filter({ created_by: user.email });
    },
  });

  const [form, setForm] = useState(record || {
    pet_id: petId || "",
    type: "vet_document",
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    file_url: "",
    vet_name: "",
    clinic_name: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await api.integrations.Core.UploadFile({ file });
    handleChange("file_url", file_url);
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form };
    if (!data.pet_id && petId) data.pet_id = petId;

    if (record?.id) {
      await api.entities.HealthRecord.update(record.id, data);
    } else {
      await api.entities.HealthRecord.create(data);
    }
    setSaving(false);
    onSaved();
  };

  const handleVetSelect = (vetId) => {
    if (vetId === "manual") {
      setManualEntry(true);
      setForm(prev => ({ ...prev, vet_name: "", clinic_name: "" }));
    } else {
      const selectedVet = veterinarians.find((vet) => vet.id === vetId);
      if (selectedVet) {
        setManualEntry(false);
        setForm(prev => ({
          ...prev,
          vet_name: selectedVet.veterinarian_name,
          clinic_name: selectedVet.clinic_name,
        }));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-[#3D2E24]">
            {record?.id ? "Edit Record" : "Upload Health Record"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
          {pets && pets.length > 0 && (
            <div className="space-y-2">
              <Label>Pet</Label>
              <Select value={form.pet_id} onValueChange={(v) => handleChange("pet_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select pet" /></SelectTrigger>
                <SelectContent>
                  {pets.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Record Type</Label>
              <Select value={form.type} onValueChange={(v) => handleChange("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECORD_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => handleChange("title", e.target.value)} required placeholder="e.g. Annual checkup results" />
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label>File Upload</Label>
            {form.file_url ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700 flex-1 truncate">File uploaded</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleChange("file_url", "")}>
                  Remove
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-orange-200 rounded-xl cursor-pointer hover:border-[#F97066] hover:bg-orange-50/50 transition-colors">
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#F97066]" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-[#F97066]" />
                    <span className="text-sm text-[#6B5B50]">Click to upload a file</span>
                  </>
                )}
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
              </label>
            )}
          </div>

          {veterinarians.length > 0 && (
            <div className="space-y-2 min-w-0">
              <Label className="flex items-center gap-2">
                Veterinarian
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold">
                  <Crown className="w-3 h-3" />
                  Premium
                </span>
              </Label>
              <Select
                value={
                  manualEntry ? "manual" :
                  veterinarians.find(
                    (vet) =>
                      vet.veterinarian_name === form.vet_name &&
                      vet.clinic_name === form.clinic_name
                  )?.id || ""
                }
                onValueChange={handleVetSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a veterinarian or enter manually" />
                </SelectTrigger>
                <SelectContent>
                  {veterinarians.map((vet) => (
                    <SelectItem key={vet.id} value={vet.id}>
                      Dr. {vet.veterinarian_name} - {vet.clinic_name}
                    </SelectItem>
                  ))}
                  <SelectItem value="manual">Enter manually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vet Name</Label>
              <Input 
                value={form.vet_name} 
                onChange={(e) => handleChange("vet_name", e.target.value)} 
                readOnly={!manualEntry && veterinarians.length > 0 && form.vet_name}
                className={!manualEntry && veterinarians.length > 0 && form.vet_name ? "bg-slate-50" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Clinic Name</Label>
              <Input 
                value={form.clinic_name} 
                onChange={(e) => handleChange("clinic_name", e.target.value)} 
                readOnly={!manualEntry && veterinarians.length > 0 && form.clinic_name}
                className={!manualEntry && veterinarians.length > 0 && form.clinic_name ? "bg-slate-50" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#F97066] hover:bg-[#E5524A] text-white">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {record?.id ? "Save" : "Upload Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}