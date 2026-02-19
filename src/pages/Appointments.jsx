import React, { useState, useEffect } from "react";
import api from '@/api/firebaseClient';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "../components/shared/PageHeader";
import PetSelector from "../components/pet/PetSelector";
import EmptyState from "../components/shared/EmptyState";
import AppointmentForm from "../components/appointments/AppointmentForm";
import AppointmentCard from "../components/appointments/AppointmentCard";

export default function Appointments() {
  const [selectedPet, setSelectedPet] = useState("all");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showForm, setShowForm] = useState(false);
  const [editAppt, setEditAppt] = useState(null);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: pets = [] } = useQuery({
    queryKey: ["pets"],
    queryFn: () => user ? api.entities.Pet.filter({ created_by: user.email }) : [],
    enabled: !!user,
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => user ? api.entities.Appointment.filter({ created_by: user.email }, "-date") : [],
    enabled: !!user,
  });

  const petMap = {};
  pets.forEach(p => { petMap[p.id] = p; });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const filtered = appointments
    .filter(a => selectedPet === "all" || a.pet_id === selectedPet)
    .filter(a => {
      const apptDate = new Date(a.date + "T" + (a.time || "00:00"));
      if (activeTab === "upcoming") return a.status === "scheduled" && apptDate > now;
      if (activeTab === "past") return a.status === "completed" || apptDate <= now;
      if (activeTab === "follow_up") return a.status === "follow_up_needed";
      return true;
    });

  const handleDelete = async (appt) => {
    await api.entities.Appointment.delete(appt.id);
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditAppt(null);
    // Force refetch after a small delay to ensure data is persisted
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    }, 500);
  };

  return (
    <div className="overflow-x-hidden">
      {/* Hero Image */}
      <div className="w-full h-48 overflow-hidden relative mb-6">
        <img 
          src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1200&h=400&fit=crop" 
          alt="Vet Appointments" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80"></div>
      </div>

      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <PageHeader
          title="Appointments"
          description="Track vet visits and follow-ups"
        actionLabel="New Appointment"
        onAction={() => { setEditAppt(null); setShowForm(true); }}
      >
        <PetSelector pets={pets} selectedPetId={selectedPet} onSelect={setSelectedPet} />
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border border-orange-100 w-full flex-wrap h-auto gap-1.5 p-1.5 justify-center">
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-[#F97066]/10 data-[state=active]:text-[#F97066] font-bold px-3">
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="past" className="data-[state=active]:bg-[#F97066]/10 data-[state=active]:text-[#F97066] font-bold px-3">
            Past
          </TabsTrigger>
          <TabsTrigger value="follow_up" className="data-[state=active]:bg-[#F97066]/10 data-[state=active]:text-[#F97066] font-bold px-3">
            Follow-ups
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-[#F97066]/10 data-[state=active]:text-[#F97066] font-bold px-3">
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white rounded-xl border border-orange-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No appointments"
              description="Schedule a vet visit to keep your pet's health on track."
              actionLabel="New Appointment"
              onAction={() => { setEditAppt(null); setShowForm(true); }}
            />
          ) : (
            filtered.map(appt => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                petName={petMap[appt.pet_id]?.name}
                onEdit={(a) => { setEditAppt(a); setShowForm(true); }}
                onDelete={handleDelete}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {showForm && (
        <AppointmentForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditAppt(null); }}
          petId={selectedPet !== "all" ? selectedPet : undefined}
          pets={pets}
          appointment={editAppt}
          onSaved={handleSaved}
          user={user}
        />
      )}
      </div>
    </div>
  );
}