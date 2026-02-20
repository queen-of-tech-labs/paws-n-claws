import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, Loader2 } from "lucide-react";
import api, { fbStorage } from '@/api/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function ReminderForm({ pets, onSubmit, isLoading, initialReminder, existingPetId }) {
  const [formData, setFormData] = useState({
    pet_id: existingPetId || initialReminder?.pet_id || "",
    type: initialReminder?.type || "checkup",
    title: initialReminder?.title || "",
    description: initialReminder?.description || "",
    due_date: initialReminder?.due_date || "",
    priority: initialReminder?.priority || "medium",
    recurrence: initialReminder?.recurrence || "none",
    custom_recurrence_interval: initialReminder?.custom_recurrence_interval || "",
    custom_recurrence_unit: initialReminder?.custom_recurrence_unit || "days",
    reminder_interval_days: initialReminder?.reminder_interval_days ?? 0,
    notes: initialReminder?.notes || "",
    file_urls: initialReminder?.file_urls || [],
    medication_length_days: initialReminder?.medication_length_days || "",
    medication_times: initialReminder?.medication_times || [],
  });

  const [fileUploadLoading, setFileUploadLoading] = useState(false);

  useEffect(() => {
    if (initialReminder) {
      setFormData({
        pet_id: initialReminder?.pet_id || "",
        type: initialReminder?.type || "checkup",
        title: initialReminder?.title || "",
        description: initialReminder?.description || "",
        due_date: initialReminder?.due_date || "",
        priority: initialReminder?.priority || "medium",
        recurrence: initialReminder?.recurrence || "none",
        custom_recurrence_interval: initialReminder?.custom_recurrence_interval || "",
        custom_recurrence_unit: initialReminder?.custom_recurrence_unit || "days",
        reminder_interval_days: initialReminder?.reminder_interval_days ?? 0,
        notes: initialReminder?.notes || "",
        file_urls: initialReminder?.file_urls || [],
        medication_length_days: initialReminder?.medication_length_days || "",
        medication_times: initialReminder?.medication_times || [],
      });
    }
  }, [initialReminder]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileUploadLoading(true);
    try {
      const storageRef = ref(fbStorage, `reminder-files/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const file_url = await getDownloadURL(uploadResult.ref);
      setFormData(prev => ({
        ...prev,
        file_urls: [...prev.file_urls, file_url],
      }));
    } catch (error) {
      console.error("File upload error:", error);
    }
    setFileUploadLoading(false);
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      file_urls: prev.file_urls.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.pet_id || !formData.title || !formData.due_date) {
      alert("Please fill in all required fields");
      return;
    }
    
    // Clean up form data before submission
    const cleanData = { ...formData };
    
    // Only include custom_recurrence_interval if recurrence is custom
    if (cleanData.recurrence !== "custom") {
      delete cleanData.custom_recurrence_interval;
      delete cleanData.custom_recurrence_unit;
    } else {
      // Ensure it's a number if custom recurrence is set
      cleanData.custom_recurrence_interval = parseInt(cleanData.custom_recurrence_interval) || null;
    }
    
    // Remove medication fields if not a medication reminder
    if (cleanData.type !== "medication") {
      delete cleanData.medication_times;
      delete cleanData.medication_length_days;
    }
    
    // Set notification_sent to false for new reminders
    if (!initialReminder) {
      cleanData.notification_sent = false;
    }
    
    onSubmit(cleanData);
    if (!initialReminder) {
      setFormData({
        pet_id: "",
        type: "checkup",
        title: "",
        description: "",
        due_date: "",
        priority: "medium",
        recurrence: "none",
        custom_recurrence_interval: "",
        custom_recurrence_unit: "days",
        reminder_interval_days: 0,
        notes: "",
        file_urls: [],
        medication_length_days: "",
        medication_times: [],
      });
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader>
        <CardTitle className="text-white">{initialReminder ? "Edit Reminder" : "Create New Reminder"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pet Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Pet *</label>
            <Select value={formData.pet_id} onValueChange={(value) => setFormData({ ...formData, pet_id: value })}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select a pet" />
              </SelectTrigger>
              <SelectContent>
                {pets.map(pet => (
                  <SelectItem key={pet.id} value={pet.id}>{pet.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type and Priority */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Type *</label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vaccination">Vaccination</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="checkup">Checkup</SelectItem>
                  <SelectItem value="grooming">Grooming</SelectItem>
                  <SelectItem value="treatment">Treatment</SelectItem>
                  <SelectItem value="appointment">Appointment</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title and Due Date */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Flea Treatment"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{formData.type === "medication" ? "Start Date" : "Due Date"} *</label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Description / Dosage */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{formData.type === "medication" ? "Dosage" : "Description"}</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={formData.type === "medication" ? "e.g., 250mg twice daily" : "Add details about this reminder..."}
              className="bg-slate-800 border-slate-700 text-white h-20"
            />
          </div>

          {/* Recurrence and Interval */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Recurrence</label>
              <Select value={formData.recurrence} onValueChange={(value) => setFormData({ ...formData, recurrence: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-time</SelectItem>
                  {formData.type === "medication" && (
                    <>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="2x-daily">2x Daily</SelectItem>
                    </>
                  )}
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly (3 months)</SelectItem>
                  <SelectItem value="semi-annual">Semi-annual (6 months)</SelectItem>
                  <SelectItem value="annual">Annual (yearly)</SelectItem>
                  <SelectItem value="custom">Custom Interval</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {formData.type === "medication" && (formData.recurrence === "daily" || formData.recurrence === "2x-daily")
                  ? "Remind me before dose"
                  : "Remind me (days before)"}
              </label>
              {formData.type === "medication" && (formData.recurrence === "daily" || formData.recurrence === "2x-daily") ? (
                  <Select 
                    value={String(formData.reminder_interval_days)}
                    onValueChange={(value) => setFormData({ ...formData, reminder_interval_days: parseInt(value) })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No reminder</SelectItem>
                      <SelectItem value="15">15 minutes before dose</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={formData.reminder_interval_days}
                  onChange={(e) => setFormData({ ...formData, reminder_interval_days: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 3"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              )}
            </div>
          </div>

          {/* Custom Recurrence Interval */}
          {formData.recurrence === "custom" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Every (interval)</label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.custom_recurrence_interval}
                  onChange={(e) => setFormData({ ...formData, custom_recurrence_interval: e.target.value })}
                  placeholder="e.g., 5"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Unit</label>
                <Select value={formData.custom_recurrence_unit} onValueChange={(value) => setFormData({ ...formData, custom_recurrence_unit: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Medication Time Fields */}
          {formData.type === "medication" && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Medication Times (HH:MM)</label>
              <div className="space-y-2">
                {formData.medication_times && formData.medication_times.map((time, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const newTimes = [...formData.medication_times];
                        newTimes[idx] = e.target.value;
                        setFormData({ ...formData, medication_times: newTimes });
                      }}
                      className="flex-1 bg-slate-800 border-slate-700 text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newTimes = formData.medication_times.filter((_, i) => i !== idx);
                        setFormData({ ...formData, medication_times: newTimes });
                      }}
                      className="px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, medication_times: [...(formData.medication_times || []), ""] })}
                  className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-sm"
                >
                  + Add Time
                </button>
              </div>
            </div>
          )}

          {/* Medication Length */}
          {formData.type === "medication" && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Length (days to give medication)</label>
              <Input
                type="number"
                min="1"
                value={formData.medication_length_days}
                onChange={(e) => setFormData({ ...formData, medication_length_days: e.target.value })}
                placeholder="e.g., 7"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              className="bg-slate-800 border-slate-700 text-white h-16"
            />
          </div>

          {/* File Uploads */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Attachments</label>
            <div className="space-y-3">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {fileUploadLoading ? (
                      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-sm text-slate-400">Click to upload files</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={fileUploadLoading}
                  />
                </label>
              </div>

              {/* File List */}
              {formData.file_urls.length > 0 && (
                <div className="space-y-2">
                  {formData.file_urls.map((url, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <p className="text-sm text-slate-300 truncate">{url.split("/").pop()}</p>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || fileUploadLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {initialReminder ? "Update Reminder" : "Create Reminder"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}