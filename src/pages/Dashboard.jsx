import React, { useState, useEffect } from "react";
import api from '@/api/firebaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils/index";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dog, Heart, FileText, Calendar, AlertCircle,
  ChevronRight, PawPrint, Syringe, Clock, PartyPopper
} from "lucide-react";
import { motion } from "framer-motion";
import { format, isToday, isTomorrow, isBefore, addDays, differenceInDays } from "date-fns";
import UpcomingReminders from "@/components/dashboard/UpcomingReminders";

function calculateAge(dateOfBirth) {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  if (years === 0) return months <= 0 ? "Newborn" : `${months} month${months > 1 ? "s" : ""} old`;
  if (years === 1 && months < 0) return `${12 + months} months old`;
  return `${years} year${years > 1 ? "s" : ""} old`;
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: pets = [] } = useQuery({
    queryKey: ["pets"],
    queryFn: () => user ? api.entities.Pet.filter({ created_by: user.email }, "-created_date") : [],
    enabled: !!user,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => user ? api.entities.Appointment.filter({ created_by: user.email, status: "scheduled" }, "-date") : [],
    enabled: !!user,
  });

  const { data: careLogs = [] } = useQuery({
    queryKey: ["careLogs"],
    queryFn: () => user ? api.entities.CareLog.filter({ created_by: user.email }, "-date", 20) : [],
    enabled: !!user,
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => user?.premium_subscriber || user?.role === 'admin' ? api.entities.Reminder.filter({ created_by: user.email }, "-due_date") : [],
    enabled: !!user && (user?.premium_subscriber || user?.role === 'admin'),
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

  const now = new Date();
  const upcomingAppointments = appointments
    .filter(a => {
      const apptDate = new Date(a.date + "T" + (a.time || "00:00"));
      return apptDate > now;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date + "T" + (a.time || "00:00"));
      const dateB = new Date(b.date + "T" + (b.time || "00:00"));
      return dateA - dateB;
    })
    .slice(0, 5);

  const overdueItems = careLogs.filter(c => c.status === "overdue" || 
    (c.next_due_date && isBefore(new Date(c.next_due_date), new Date())));

  const upcomingBirthdays = pets.filter(p => {
    if (!p.date_of_birth) return false;
    const bday = new Date(p.date_of_birth);
    const nextBday = new Date(new Date().getFullYear(), bday.getMonth(), bday.getDate());
    if (nextBday < new Date()) nextBday.setFullYear(nextBday.getFullYear() + 1);
    return differenceInDays(nextBday, new Date()) <= 30;
  });

  const petMap = {};
  pets.forEach(p => { petMap[p.id] = p; });

  const stats = [
    { label: "My Pets", value: pets.length, icon: Dog, color: "from-[#F97066] to-[#FCA5A1]", link: "PetProfiles" },
    { label: "Upcoming Visits", value: upcomingAppointments.length, icon: Calendar, color: "from-blue-500 to-blue-400", link: "Appointments" },
    { label: "Health Records", value: 0, icon: FileText, color: "from-emerald-500 to-emerald-400", link: "HealthRecords" },
    { label: "Care Entries", value: careLogs.length, icon: Heart, color: "from-purple-500 to-purple-400", link: "CareTracker" },
  ];

  return (
    <div className="overflow-x-hidden">
      {/* Hero Image */}
      <div className="w-full h-48 overflow-hidden relative mb-6">
        <img 
          src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&h=400&fit=crop" 
          alt="Pets" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80"></div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
        {/* Header with compact stats */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-3 text-center">
            Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""} 👋
          </h1>
        <p className="text-slate-400 mb-4 text-center">
          Here's what's happening with your furry family.
        </p>
        {/* Compact stats */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {stats.map((stat) => (
            <Link key={stat.label} to={createPageUrl(stat.link)}>
              <Badge className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-white px-3 py-1.5 text-sm cursor-pointer transition-all">
                <stat.icon className="w-3.5 h-3.5 mr-1.5" />
                {stat.label}
              </Badge>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Single column layout */}
      <div className="space-y-6">
        {/* My Pets - Most Prominent */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-slate-800 bg-slate-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <PawPrint className="w-5 h-5 text-blue-400" />
                  My Pets
                </h2>
                <Link to={createPageUrl("PetProfiles")} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  View All <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {pets.length === 0 ? (
                <div className="text-center py-12">
                  <PawPrint className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-sm text-slate-400 mb-4">No pets added yet</p>
                  <Link to={createPageUrl("PetProfiles")}>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">Add Your First Pet</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {pets.map(pet => (
                    <Link key={pet.id} to={createPageUrl(`PetDetail?id=${pet.id}`)}>
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer">
                        {pet.photo_url ? (
                          <img src={pet.photo_url} alt={pet.name} className="w-16 h-16 rounded-xl object-cover ring-2 ring-slate-700" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center ring-2 ring-slate-700">
                            <PawPrint className="w-7 h-7 text-blue-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white mb-1 flex items-center gap-2">
                            {pet.name}
                            {pet.gender === "male" ? "♂️" : pet.gender === "female" ? "♀️" : ""}
                          </p>
                          <p className="text-sm text-slate-400">{pet.breed || pet.species}</p>
                          {pet.date_of_birth && (
                            <p className="text-xs text-slate-500 mt-1">
                              {calculateAge(pet.date_of_birth)}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Appointments */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-slate-800 bg-slate-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Upcoming Visits
                </h2>
                <Link to={createPageUrl("Appointments")} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  View All <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No upcoming appointments</p>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map(apt => (
                    <div key={apt.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800 border border-slate-700">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{apt.title}</p>
                        <p className="text-sm text-slate-400 mt-1">
                          {isToday(new Date(apt.date)) ? "Today" : isTomorrow(new Date(apt.date)) ? "Tomorrow" : format(new Date(apt.date), "MMM d, yyyy")}
                          {apt.time && ` at ${apt.time}`}
                        </p>
                        {petMap[apt.pet_id] && (
                          <Badge className="mt-2 bg-slate-700 text-slate-300 border-0 text-xs">
                            {petMap[apt.pet_id].name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Premium: Upcoming Reminders */}
        {(user?.premium_subscriber || user?.role === 'admin') && reminders.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-slate-800 bg-slate-900">
              <CardContent className="p-6">
                <UpcomingReminders
                   reminders={reminders}
                   pets={pets}
                   onAcknowledge={acknowledgeMutation.mutate}
                   onComplete={completeMutation.mutate}
                   onDelete={deleteMutation.mutate}
                   onUpdate={(reminderId, data) => updateMutation.mutate({ reminderId, data })}
                 />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Alerts & Care Reminders */}
        {(overdueItems.length > 0 || upcomingBirthdays.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="border-slate-800 bg-slate-900">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  Care Alerts
                </h2>
                <div className="space-y-3">
                  {overdueItems.map(item => (
                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                        <Syringe className="w-5 h-5 text-red-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="text-sm text-red-400 mt-1">Overdue · {petMap[item.pet_id]?.name || ""}</p>
                      </div>
                    </div>
                  ))}
                  {upcomingBirthdays.map(pet => (
                    <div key={pet.id} className="flex items-center gap-4 p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                      <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center flex-shrink-0">
                        <PartyPopper className="w-5 h-5 text-pink-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{pet.name}'s birthday is coming up!</p>
                        <p className="text-sm text-pink-400 mt-1">{format(new Date(pet.date_of_birth), "MMMM d")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
      </div>
    </div>
  );
}