import React, { useState, useEffect } from "react";
import api from '@/api/firebaseClient';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils/index";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Pencil, Trash2, PawPrint, Heart, FileText, Calendar,
  Syringe, Pill, Weight, Scissors, GraduationCap
} from "lucide-react";
import { format } from "date-fns";
import PetForm from "../components/pet/PetForm";
import CareLogForm from "../components/care/CareLogForm";
import CareLogItem from "../components/care/CareLogItem";
import HealthRecordForm from "../components/health/HealthRecordForm";
import HealthRecordItem from "../components/health/HealthRecordItem";
import AppointmentForm from "../components/appointments/AppointmentForm";
import AppointmentCard from "../components/appointments/AppointmentCard";

export default function PetDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const petId = urlParams.get("id");
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  const [editPet, setEditPet] = useState(false);
  const [showCareForm, setShowCareForm] = useState(false);
  const [editCare, setEditCare] = useState(null);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [editHealth, setEditHealth] = useState(null);
  const [showApptForm, setShowApptForm] = useState(false);
  const [editAppt, setEditAppt] = useState(null);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: pets = [] } = useQuery({
    queryKey: ["pets"],
    queryFn: () => user ? api.entities.Pet.filter({ created_by: user.email }) : [],
    enabled: !!user,
  });
  const pet = pets.find(p => p.id === petId);

  const { data: careLogs = [] } = useQuery({
    queryKey: ["careLogs", petId],
    queryFn: () => user && petId ? api.entities.CareLog.filter({ pet_id: petId, created_by: user.email }, "-date") : [],
    enabled: !!petId && !!user,
  });

  const { data: healthRecords = [] } = useQuery({
    queryKey: ["healthRecords", petId],
    queryFn: () => user && petId ? api.entities.HealthRecord.filter({ pet_id: petId, created_by: user.email }, "-date") : [],
    enabled: !!petId && !!user,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", petId],
    queryFn: () => user && petId ? api.entities.Appointment.filter({ pet_id: petId, created_by: user.email }, "-date") : [],
    enabled: !!petId && !!user,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["pets"] });
    queryClient.invalidateQueries({ queryKey: ["careLogs", petId] });
    queryClient.invalidateQueries({ queryKey: ["healthRecords", petId] });
    queryClient.invalidateQueries({ queryKey: ["appointments", petId] });
  };

  const handleDeleteCare = async (entry) => {
    await api.entities.CareLog.delete(entry.id);
    refreshAll();
  };

  const handleDeleteHealth = async (record) => {
    await api.entities.HealthRecord.delete(record.id);
    refreshAll();
  };

  const handleDeleteAppt = async (appt) => {
    await api.entities.Appointment.delete(appt.id);
    refreshAll();
  };

  const handleDeletePet = async () => {
    if (!confirm("Are you sure you want to delete this pet and all their records?")) return;
    await api.entities.Pet.delete(petId);
    window.location.href = createPageUrl("PetProfiles");
  };

  if (!pet) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="text-center py-16">
          <PawPrint className="w-12 h-12 text-[#6B5B50]/20 mx-auto mb-4" />
          <p className="text-[#6B5B50]/60">Pet not found</p>
          <Link to={createPageUrl("PetProfiles")}>
            <Button variant="outline" className="mt-4">Back to Pets</Button>
          </Link>
        </div>
      </div>
    );
  }

  const age = pet.date_of_birth ? calculateAge(pet.date_of_birth) : null;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back button */}
      <Link to={createPageUrl("PetProfiles")} className="inline-flex items-center gap-2 text-sm text-[#6B5B50]/60 hover:text-[#F97066] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Pets
      </Link>

      {/* Pet header */}
      <Card className="border-orange-100 mb-6 overflow-hidden">
        <CardContent className="p-6">
          {/* Photo - centered */}
          <div className="flex justify-center mb-6">
            {pet.photo_url ? (
              <img src={pet.photo_url} alt={pet.name} className="w-40 h-40 rounded-2xl object-cover ring-4 ring-orange-100" />
            ) : (
              <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-[#FDE8D8] to-[#FFF1E6] flex items-center justify-center ring-4 ring-orange-100">
                <PawPrint className="w-20 h-20 text-[#F97066]" />
              </div>
            )}
          </div>

          {/* Name and actions */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#3D2E24]">{pet.name} {pet.gender === "male" ? "♂️" : pet.gender === "female" ? "♀️" : ""}</h1>
              <p className="text-[#6B5B50]/70 mt-1">
                {pet.breed || pet.species}
                {age && ` · ${age}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setEditPet(true)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleDeletePet} className="text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {pet.weight && <Badge variant="secondary" className="bg-orange-50 text-[#6B5B50] border-0">{pet.weight} lbs</Badge>}
            {pet.spayed_neutered && <Badge variant="secondary" className="bg-green-50 text-green-700 border-0">Spayed/Neutered</Badge>}
            {pet.microchip_number && <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-0">Microchipped</Badge>}
          </div>

          {/* Quick info - single column */}
          <div className="space-y-2 text-sm">
            {pet.microchip_number && (
              <div>
                <span className="text-[#6B5B50]/50">Microchip:</span>
                <span className="ml-2 text-[#3D2E24]">{pet.microchip_number}</span>
              </div>
            )}
            {pet.allergies && (
              <div>
                <span className="text-[#6B5B50]/50">Allergies:</span>
                <span className="ml-2 text-[#3D2E24]">{pet.allergies}</span>
              </div>
            )}
            {pet.insurance_provider && (
              <div>
                <span className="text-[#6B5B50]/50">Insurance:</span>
                <span className="ml-2 text-[#3D2E24]">{pet.insurance_provider}</span>
              </div>
            )}
          </div>

          {/* Medical history and behavior notes */}
          {(pet.medical_history || pet.behavior_notes) && (
            <div className="space-y-4 mt-6 pt-6 border-t border-orange-100">
              {pet.medical_history && (
                <div>
                  <h4 className="text-xs font-medium text-[#6B5B50]/50 uppercase mb-1">Medical History</h4>
                  <p className="text-sm text-[#3D2E24]">{pet.medical_history}</p>
                </div>
              )}
              {pet.behavior_notes && (
                <div>
                  <h4 className="text-xs font-medium text-[#6B5B50]/50 uppercase mb-1">Behavior Notes</h4>
                  <p className="text-sm text-[#3D2E24]">{pet.behavior_notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="care" className="space-y-4">
        <TabsList className="bg-white border border-orange-100 w-full grid grid-cols-3">
          <TabsTrigger value="care" className="data-[state=active]:bg-[#F97066]/10 data-[state=active]:text-[#F97066]">
            <Heart className="w-4 h-4 mr-1.5" /> Care
          </TabsTrigger>
          <TabsTrigger value="health" className="data-[state=active]:bg-[#F97066]/10 data-[state=active]:text-[#F97066]">
            <FileText className="w-4 h-4 mr-1.5" /> Records
          </TabsTrigger>
          <TabsTrigger value="appointments" className="data-[state=active]:bg-[#F97066]/10 data-[state=active]:text-[#F97066]">
            <Calendar className="w-4 h-4 mr-1.5" /> Visits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="care" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => { setEditCare(null); setShowCareForm(true); }} className="bg-[#F97066] hover:bg-[#E5524A] text-white" size="sm">
              + Add Entry
            </Button>
          </div>
          {careLogs.length === 0 ? (
            <p className="text-center py-8 text-sm text-[#6B5B50]/50">No care entries yet</p>
          ) : (
            careLogs.map(entry => (
              <CareLogItem
                key={entry.id}
                entry={entry}
                onEdit={(e) => { setEditCare(e); setShowCareForm(true); }}
                onDelete={handleDeleteCare}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="health" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => { setEditHealth(null); setShowHealthForm(true); }} className="bg-[#F97066] hover:bg-[#E5524A] text-white" size="sm">
              + Upload Record
            </Button>
          </div>
          {healthRecords.length === 0 ? (
            <p className="text-center py-8 text-sm text-[#6B5B50]/50">No health records yet</p>
          ) : (
            healthRecords.map(record => (
              <HealthRecordItem
                key={record.id}
                record={record}
                onEdit={(r) => { setEditHealth(r); setShowHealthForm(true); }}
                onDelete={handleDeleteHealth}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="appointments" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => { setEditAppt(null); setShowApptForm(true); }} className="bg-[#F97066] hover:bg-[#E5524A] text-white" size="sm">
              + New Appointment
            </Button>
          </div>
          {appointments.length === 0 ? (
            <p className="text-center py-8 text-sm text-[#6B5B50]/50">No appointments yet</p>
          ) : (
            appointments.map(appt => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                onEdit={(a) => { setEditAppt(a); setShowApptForm(true); }}
                onDelete={handleDeleteAppt}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {editPet && <PetForm open={true} onClose={() => setEditPet(false)} pet={pet} onSaved={() => { refreshAll(); setEditPet(false); }} />}
      {showCareForm && <CareLogForm open={true} onClose={() => setShowCareForm(false)} petId={petId} entry={editCare} onSaved={() => { refreshAll(); setShowCareForm(false); }} />}
      {showHealthForm && <HealthRecordForm open={true} onClose={() => setShowHealthForm(false)} petId={petId} record={editHealth} onSaved={() => { refreshAll(); setShowHealthForm(false); }} />}
      {showApptForm && <AppointmentForm open={true} onClose={() => setShowApptForm(false)} petId={petId} appointment={editAppt} onSaved={() => { refreshAll(); setShowApptForm(false); }} />}
    </div>
  );
}

function calculateAge(dateOfBirth) {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  if (years === 0) return months <= 0 ? "newborn" : `${months} month${months > 1 ? "s" : ""}`;
  if (years === 1 && months < 0) return `${12 + months} months`;
  return `${years} year${years > 1 ? "s" : ""} old`;
}