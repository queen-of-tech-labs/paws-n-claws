import React, { useState } from "react";
import api from '@/api/firebaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Loader2 } from "lucide-react";

export default function PetForm({ open, onClose, pet, onSaved }) {
  const [form, setForm] = useState(pet || {
    name: "", species: "dog", breed: "", date_of_birth: "", gender: "",
    weight: "", color: "", photo_url: "", microchip_number: "", microchip_company: "",
    behavior_notes: "", medical_history: "", allergies: "",
    spayed_neutered: false, insurance_provider: "", insurance_policy_number: ""
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await api.integrations.Core.UploadFile({ file });
    handleChange("photo_url", file_url);
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form };
    if (data.weight) {
      data.weight = parseFloat(data.weight);
    } else {
      delete data.weight;
    }

    if (pet?.id) {
      await api.entities.Pet.update(pet.id, data);
    } else {
      await api.entities.Pet.create(data);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#3D2E24]">
            {pet?.id ? "Edit Pet" : "Add New Pet"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo upload */}
          <div className="flex justify-center">
            <label className="relative cursor-pointer group">
              {form.photo_url ? (
                <img src={form.photo_url} alt="Pet" className="w-24 h-24 rounded-2xl object-cover ring-4 ring-orange-100" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#FDE8D8] to-[#FFF1E6] flex items-center justify-center ring-4 ring-orange-100">
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin text-[#F97066]" /> : <Camera className="w-6 h-6 text-[#F97066]" />}
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} required placeholder="Pet's name" />
            </div>
            <div className="space-y-2">
              <Label>Species *</Label>
              <Select value={form.species} onValueChange={(v) => handleChange("species", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["dog","cat","bird","rabbit","hamster","fish","reptile","other"].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Breed</Label>
              <Input value={form.breed} onChange={(e) => handleChange("breed", e.target.value)} placeholder="e.g. Golden Retriever" />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth} onChange={(e) => handleChange("date_of_birth", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => handleChange("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Weight (lbs)</Label>
              <Input type="number" value={form.weight} onChange={(e) => handleChange("weight", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Color / Markings</Label>
              <Input value={form.color} onChange={(e) => handleChange("color", e.target.value)} placeholder="e.g. Golden, white chest" />
            </div>
          </div>

          {/* Microchip */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Microchip Number</Label>
              <Input value={form.microchip_number} onChange={(e) => handleChange("microchip_number", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Microchip Company</Label>
              <Input value={form.microchip_company} onChange={(e) => handleChange("microchip_company", e.target.value)} />
            </div>
          </div>

          {/* Health */}
          <div className="flex items-center gap-3">
            <Switch checked={form.spayed_neutered} onCheckedChange={(v) => handleChange("spayed_neutered", v)} />
            <Label>Spayed / Neutered</Label>
          </div>

          <div className="space-y-2">
            <Label>Allergies</Label>
            <Input value={form.allergies} onChange={(e) => handleChange("allergies", e.target.value)} placeholder="Known allergies" />
          </div>

          <div className="space-y-2">
            <Label>Medical History</Label>
            <Textarea value={form.medical_history} onChange={(e) => handleChange("medical_history", e.target.value)} placeholder="General medical notes..." rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Behavior Notes</Label>
            <Textarea value={form.behavior_notes} onChange={(e) => handleChange("behavior_notes", e.target.value)} placeholder="Temperament, habits, etc." rows={3} />
          </div>

          {/* Insurance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Insurance Provider</Label>
              <Input value={form.insurance_provider} onChange={(e) => handleChange("insurance_provider", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Policy Number</Label>
              <Input value={form.insurance_policy_number} onChange={(e) => handleChange("insurance_policy_number", e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#F97066] hover:bg-[#E5524A] text-white">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {pet?.id ? "Save Changes" : "Add Pet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}