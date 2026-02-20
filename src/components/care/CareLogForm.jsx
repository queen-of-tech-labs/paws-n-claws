import React, { useState } from "react";
import api from '@/api/firebaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CARE_TYPES = [
  { value: "vaccination", label: "Vaccination" },
  { value: "medication", label: "Medication" },
  { value: "weight", label: "Weight Log" },
  { value: "grooming", label: "Grooming" },
  { value: "training", label: "Training" },
  { value: "milestone", label: "Milestone" },
  { value: "birthday", label: "Birthday" },
];

const typeMapping = {
  vaccination: 'vaccination', medication: 'medication', weight: 'checkup',
  grooming: 'grooming', training: 'other', milestone: 'other', birthday: 'birthday',
};

function convertToUTC(localTime) {
  if (!localTime) return "00:00";
  const now = new Date();
  const [hours, minutes] = localTime.split(':').map(Number);
  const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  const utcHours = String(localDate.getUTCHours()).padStart(2, '0');
  const utcMinutes = String(localDate.getUTCMinutes()).padStart(2, '0');
  return `${utcHours}:${utcMinutes}`;
}

export default function CareLogForm({ open, onClose, petId, pets, entry, onSaved, user }) {
  const [form, setForm] = useState(() => {
    if (entry) return entry;
    return {
      pet_id: petId || "",
      type: "vaccination",
      title: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      next_due_date: "",
      status: "completed",
      medication_dosage: "",
      medication_frequency: "",
      medication_times: [],
      recurrence: "none",
      custom_recurrence_interval: "",
      custom_recurrence_unit: "days",
      reminder_interval_days: 0,
    };
  });
  const [saving, setSaving] = useState(false);
  const [createReminder, setCreateReminder] = useState(false);
  const [reminderDueDate, setReminderDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [existingReminderId, setExistingReminderId] = useState(null);

  React.useEffect(() => {
    if (entry?.id && open) {
      api.entities.Reminder.filter({
        related_entity_type: 'care_log',
        related_entity_id: entry.id,
      }).then(reminders => {
        if (reminders.length > 0) {
          const reminder = reminders[0];
          setExistingReminderId(reminder.id);
          setCreateReminder(true);
          setReminderDueDate(reminder.due_date);
          setReminderTime(reminder.due_time || "09:00");
        }
      }).catch(() => {});
    }
  }, [entry?.id, open]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form };
      delete data.next_due_date;

      if (form.type !== "weight") {
        delete data.weight_value;
      } else if (data.weight_value) {
        data.weight_value = parseFloat(data.weight_value);
      } else {
        delete data.weight_value;
      }

      if (form.type !== "medication") {
        delete data.medication_dosage;
        delete data.medication_frequency;
        delete data.medication_times;
        delete data.recurrence;
        delete data.custom_recurrence_interval;
        delete data.custom_recurrence_unit;
        delete data.reminder_interval_days;
      } else {
        data.medication_times = (data.medication_times || []).filter(t => t);
      }

      if (!data.pet_id && petId) data.pet_id = petId;

      let savedId = entry?.id;
      if (entry?.id) {
        await api.entities.CareLog.update(entry.id, data);
      } else {
        const created = await api.entities.CareLog.create(data);
        savedId = created.id;
      }

      if (createReminder && reminderDueDate && savedId) {
        const reminderData = {
          pet_id: data.pet_id,
          type: typeMapping[data.type] || 'other',
          title: `${data.title} - Reminder`,
          description: `Reminder for: ${data.title}`,
          due_date: reminderDueDate,
          due_time: convertToUTC(reminderTime),
          notification_sent: false,
          status: 'pending',
          priority: 'medium',
          medication_times: reminderTime ? [reminderTime] : [],
          related_entity_type: 'care_log',
          related_entity_id: savedId,
        };
        if (existingReminderId) {
          await api.entities.Reminder.update(existingReminderId, reminderData);
        } else {
          await api.entities.Reminder.create(reminderData);
        }
      }

      onSaved();
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save entry. Please try again.");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#3D2E24]">
            {entry?.id ? "Edit Entry" : "New Care Entry"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {pets && pets.length > 0 && (
            <div className="space-y-2">
              <Label>Pet</Label>
              <Select value={form.pet_id} onValueChange={(v) => handleChange("pet_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select pet" /></SelectTrigger>
                <SelectContent>
                  {pets.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => handleChange("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CARE_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => handleChange("title", e.target.value)} required placeholder="e.g. Rabies Vaccine" />
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required />
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reminder Date *</Label>
                <Input type="date" value={reminderDueDate} onChange={(e) => setReminderDueDate(e.target.value)} required={createReminder} />
              </div>
              <div className="space-y-2">
                <Label>Time of Day *</Label>
                <Input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} required={createReminder} />
              </div>
            </div>
          )}

          {form.type === "weight" && (
            <div className="space-y-2">
              <Label>Weight (lbs)</Label>
              <Input type="number" value={form.weight_value} onChange={(e) => handleChange("weight_value", e.target.value)} placeholder="0" />
            </div>
          )}

          {form.type === "medication" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dosage</Label>
                  <Input value={form.medication_dosage} onChange={(e) => handleChange("medication_dosage", e.target.value)} placeholder="e.g. 10mg" />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Input value={form.medication_frequency} onChange={(e) => handleChange("medication_frequency", e.target.value)} placeholder="e.g. Twice daily" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Recurrence</Label>
                <Select value={form.recurrence} onValueChange={(v) => handleChange("recurrence", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="2x-daily">2x Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Every 3 months</SelectItem>
                    <SelectItem value="semi-annual">Every 6 months</SelectItem>
                    <SelectItem value="annual">Yearly</SelectItem>
                    <SelectItem value="custom">Custom Interval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.recurrence === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Every (interval)</Label>
                    <Input type="number" min="1" max="365" value={form.custom_recurrence_interval} onChange={(e) => handleChange("custom_recurrence_interval", e.target.value)} placeholder="e.g. 5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={form.custom_recurrence_unit} onValueChange={(v) => handleChange("custom_recurrence_unit", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Medication Times</Label>
                <div className="space-y-2">
                  {form.medication_times && form.medication_times.map((time, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input type="time" value={time} onChange={(e) => { const t = [...form.medication_times]; t[idx] = e.target.value; handleChange("medication_times", t); }} className="flex-1" />
                      <Button type="button" variant="outline" size="sm" onClick={() => handleChange("medication_times", form.medication_times.filter((_, i) => i !== idx))}>Remove</Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => handleChange("medication_times", [...(form.medication_times || []), ""])}>+ Add Time</Button>
                </div>
              </div>
              {(form.recurrence === "daily" || form.recurrence === "2x-daily") && (
                <div className="space-y-2">
                  <Label>Remind me before dose (minutes)</Label>
                  <Input type="number" min="0" max="30" value={form.reminder_interval_days} onChange={(e) => handleChange("reminder_interval_days", parseInt(e.target.value) || 0)} placeholder="e.g. 15" />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="Additional details..." rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#F97066] hover:bg-[#E5524A] text-white">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {entry?.id ? "Save" : "Add Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
