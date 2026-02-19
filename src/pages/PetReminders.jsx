import React, { useState, useEffect } from "react";
import api from '@/api/firebaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "../utils/index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import PremiumFeatureLocked from "@/components/shared/PremiumFeatureLocked";
import ReminderCard from "@/components/reminders/ReminderCard";
import ReminderForm from "@/components/reminders/ReminderForm";

export default function PetReminders() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "pending", type: "all" });
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then((u) => {
      setUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders", user?.email],
    queryFn: () => user ? api.entities.Reminder.filter({ created_by: user.email }, "-due_date") : [],
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: pets = [] } = useQuery({
    queryKey: ["pets"],
    queryFn: () => user ? api.entities.Pet.filter({ created_by: user.email }) : [],
    enabled: !!user,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (reminderId) => api.entities.Reminder.update(reminderId, { status: "acknowledged" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const completeMutation = useMutation({
    mutationFn: (reminderId) => api.entities.Reminder.update(reminderId, { status: "completed" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (reminderId) => api.entities.Reminder.delete(reminderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ reminderId, data }) => api.entities.Reminder.update(reminderId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const createMutation = useMutation({
    mutationFn: (formData) => api.entities.Reminder.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      setShowForm(false);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, formData }) => api.entities.Reminder.update(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      setEditingReminder(null);
      setShowForm(false);
    },
  });

  if (loading) return null;

  const isPremium = user?.premium_subscriber;
  const isAdmin = user?.role === 'admin';
  if (!isPremium && !isAdmin) {
    return (
      <PremiumFeatureLocked
        featureName="Pet Reminder Notifications"
        onUpgrade={() => window.location.href = createPageUrl("Account")}
      />
    );
  }

  const petMap = {};
  pets.forEach(p => { petMap[p.id] = p; });

  const filteredReminders = reminders.filter(r => {
    const statusMatch = filters.status === "all" || r.status === filters.status;
    const typeMatch = filters.type === "all" || r.type === filters.type;
    return statusMatch && typeMatch;
  });

  const stats = [
    { label: "Pending", count: reminders.filter(r => r.status === "pending").length, color: "bg-blue-600" },
    { label: "Acknowledged", count: reminders.filter(r => r.status === "acknowledged").length, color: "bg-yellow-600" },
    { label: "Completed", count: reminders.filter(r => r.status === "completed").length, color: "bg-green-600" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-3">Pet Reminders</h1>
        <p className="text-slate-400 mb-4">Stay on top of your pets' care with important reminders.</p>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white mx-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Reminder
        </Button>
      </motion.div>

      {/* Create/Edit Form */}
      {showForm && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-8"
          ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          <div className="space-y-4">
            <ReminderForm 
              pets={pets} 
              initialReminder={editingReminder}
              onSubmit={(formData) => {
                if (editingReminder) {
                  editMutation.mutate({ id: editingReminder.id, formData });
                } else {
                  createMutation.mutate(formData);
                }
              }} 
              isLoading={createMutation.isPending || editMutation.isPending}
            />
            {editingReminder && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingReminder(null);
                  setShowForm(false);
                }}
                className="w-full"
              >
                Cancel Edit
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-slate-800 bg-slate-900">
              <CardContent className="p-6 text-center">
                <p className="text-slate-400 text-sm mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-white">{stat.count}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-slate-400 mb-2 block">Status</label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-slate-400 mb-2 block">Type</label>
                <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="vaccination">Vaccination</SelectItem>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="appointment">Appointment</SelectItem>
                    <SelectItem value="checkup">Checkup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reminders List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {filteredReminders.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900">
            <CardContent className="p-12 text-center">
              <p className="text-slate-400 mb-4">No reminders to show</p>
              <p className="text-sm text-slate-500">Reminders will appear here for pet birthdays, vaccinations, medications, and appointments.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReminders.map((reminder, idx) => (
              <motion.div key={reminder.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <ReminderCard
                   reminder={reminder}
                   petName={petMap[reminder.pet_id]?.name || "Unknown Pet"}
                   onAcknowledge={acknowledgeMutation.mutate}
                   onComplete={completeMutation.mutate}
                   onDelete={deleteMutation.mutate}
                   onUpdate={(reminderId, data) => updateMutation.mutate({ reminderId, data })}
                   onEdit={(reminder) => {
                     setEditingReminder(reminder);
                     setShowForm(true);
                   }}
                 />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}