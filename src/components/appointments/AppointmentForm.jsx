import React, { useState } from "react";
import api from '@/api/firebaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";

function convertToUTC(localTime) {
  if (!localTime) return "00:00";
  
  // Create a date object with the local time
  const now = new Date();
  const [hours, minutes] = localTime.split(':').map(Number);
  const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  
  // Convert to UTC
  const utcHours = String(localDate.getUTCHours()).padStart(2, '0');
  const utcMinutes = String(localDate.getUTCMinutes()).padStart(2, '0');
  
  return `${utcHours}:${utcMinutes}`;
}

export default function AppointmentForm({ open, onClose, petId, pets, appointment, onSaved, user }) {
  const { data: veterinarians = [] } = useQuery({
    queryKey: ["veterinarians"],
    queryFn: async () => {
      const user = await api.auth.me();
      return api.entities.Veterinarian.filter({ created_by: user.email });
    },
  });

  const [form, setForm] = useState(appointment || {
    pet_id: petId || "",
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    vet_name: "",
    clinic_name: "",
    clinic_address: "",
    clinic_phone: "",
    status: "scheduled",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [createReminder, setCreateReminder] = useState(false);
  const [reminderDueDate, setReminderDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [existingReminderId, setExistingReminderId] = useState(null);

  // Load existing reminder when editing
  React.useEffect(() => {
    if (appointment?.id && open) {
      api.entities.Reminder.filter({
        related_entity_type: 'appointment',
        related_entity_id: appointment.id,
      }).then(reminders => {
        if (reminders.length > 0) {
          const reminder = reminders[0];
          setExistingReminderId(reminder.id);
          setCreateReminder(true);
          setReminderDueDate(reminder.due_date);
          setReminderTime(reminder.due_time || "09:00");
        }
      });
    }
  }, [appointment?.id, open]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.title || !form.date || !form.pet_id) {
      alert("Please fill in all required fields (Pet, Title, Date)");
      return;
    }
    
    setSaving(true);
    try {
      const data = { ...form };
      if (!data.pet_id && petId) data.pet_id = petId;

      if (appointment?.id) {
        await api.entities.Appointment.update(appointment.id, data);
      } else {
        await api.entities.Appointment.create(data);
      }

      // Handle reminder when editing
      if (appointment?.id && createReminder && reminderDueDate && form.pet_id) {
        const reminderData = {
          pet_id: form.pet_id,
          type: 'appointment',
          title: `${form.title} - Reminder`,
          description: `Appointment reminder: ${form.title}`,
          due_date: reminderDueDate,
          due_time: convertToUTC(reminderTime),
          notification_sent: false,
          status: 'pending',
          priority: 'medium',
          medication_times: reminderTime ? [reminderTime] : [],
          related_entity_type: 'appointment',
          related_entity_id: appointment.id,
        };

        if (existingReminderId) {
          // Update existing reminder
          await api.entities.Reminder.update(existingReminderId, reminderData);
        } else {
          // Create new reminder
          await api.entities.Reminder.create(reminderData);
        }
      }

      setSaving(false);
      onSaved();
    } catch (error) {
      setSaving(false);
      alert("Failed to save appointment. Please try again.");
      console.error("Appointment save error:", error);
    }
  };

  const handleVetSelect = (vetId) => {
    if (vetId === "manual") {
      setManualEntry(true);
      setForm(prev => ({ 
        ...prev, 
        vet_name: "", 
        clinic_name: "", 
        clinic_address: "", 
        clinic_phone: "" 
      }));
    } else {
      const selectedVet = veterinarians.find((vet) => vet.id === vetId);
      if (selectedVet) {
        setManualEntry(false);
        setForm(prev => ({
          ...prev,
          vet_name: selectedVet.veterinarian_name,
          clinic_name: selectedVet.clinic_name,
          clinic_address: selectedVet.address,
          clinic_phone: selectedVet.phone_number,
        }));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-[#3D2E24]">
            {appointment?.id ? "Edit Appointment" : "New Appointment"}
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

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => handleChange("title", e.target.value)} required placeholder="e.g. Annual Checkup" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input type="time" value={form.time} onChange={(e) => handleChange("time", e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox 
              id="create-reminder" 
              checked={createReminder} 
              onCheckedChange={setCreateReminder}
              disabled={!user?.premium_subscriber && user?.role !== 'admin'}
            />
            <Label 
              htmlFor="create-reminder" 
              className={`font-normal ${!user?.premium_subscriber && user?.role !== 'admin' ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              Create a reminder for this entry
            </Label>
            {user?.premium_subscriber !== true && user?.role !== 'admin' && (
              <Badge className="ml-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Premium
              </Badge>
            )}
          </div>

          {createReminder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reminder Due Date *</Label>
                  <Input 
                    type="date" 
                    value={reminderDueDate} 
                    onChange={(e) => setReminderDueDate(e.target.value)} 
                    required={createReminder}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time of Day *</Label>
                  <Input 
                    type="time" 
                    value={reminderTime} 
                    onChange={(e) => setReminderTime(e.target.value)} 
                    required={createReminder}
                  />
                </div>
              </div>
            </div>
          )}

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clinic Address</Label>
              <Input 
                value={form.clinic_address} 
                onChange={(e) => handleChange("clinic_address", e.target.value)} 
                readOnly={!manualEntry && veterinarians.length > 0 && form.clinic_address}
                className={!manualEntry && veterinarians.length > 0 && form.clinic_address ? "bg-slate-50" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Clinic Phone</Label>
              <Input 
                value={form.clinic_phone} 
                onChange={(e) => handleChange("clinic_phone", e.target.value)} 
                readOnly={!manualEntry && veterinarians.length > 0 && form.clinic_phone}
                className={!manualEntry && veterinarians.length > 0 && form.clinic_phone ? "bg-slate-50" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="follow_up_needed">Follow-up Needed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes || form.description} onChange={(e) => handleChange("notes", e.target.value)} rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#F97066] hover:bg-[#E5524A] text-white">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {appointment?.id ? "Save" : "Create Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}