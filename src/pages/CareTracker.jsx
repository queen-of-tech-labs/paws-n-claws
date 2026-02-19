import React, { useState, useEffect } from "react";
import api from '@/api/firebaseClient';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "../components/shared/PageHeader";
import PetSelector from "../components/pet/PetSelector";
import EmptyState from "../components/shared/EmptyState";
import CareLogForm from "../components/care/CareLogForm";
import CareLogItem from "../components/care/CareLogItem";

const TABS = [
  { value: "all", label: "All" },
  { value: "vaccination", label: "Vaccines" },
  { value: "medication", label: "Meds" },
  { value: "weight", label: "Weight" },
  { value: "grooming", label: "Grooming" },
  { value: "training", label: "Training" },
  { value: "milestone", label: "Milestones" },
];

export default function CareTracker() {
  const [selectedPet, setSelectedPet] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
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

  const { data: careLogs = [], isLoading } = useQuery({
    queryKey: ["careLogs"],
    queryFn: () => user ? api.entities.CareLog.filter({ created_by: user.email }, "-date") : [],
    enabled: !!user,
  });

  const petMap = {};
  pets.forEach(p => { petMap[p.id] = p; });

  const filtered = careLogs
    .filter(c => selectedPet === "all" || c.pet_id === selectedPet)
    .filter(c => activeTab === "all" || c.type === activeTab);

  const handleDelete = async (entry) => {
    await api.entities.CareLog.delete(entry.id);
    queryClient.invalidateQueries({ queryKey: ["careLogs"] });
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["careLogs"] });
    setShowForm(false);
    setEditEntry(null);
  };

  return (
    <div className="overflow-x-hidden">
      {/* Hero Image */}
      <div className="w-full h-48 overflow-hidden relative mb-6">
        <img 
          src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&h=400&fit=crop" 
          alt="Pet Care" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80"></div>
      </div>

      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <PageHeader
          title="Care Tracker"
          description="Track vaccinations, medications, milestones, and more"
        actionLabel="Add Entry"
        onAction={() => { setEditEntry(null); setShowForm(true); }}
      >
        <PetSelector pets={pets} selectedPetId={selectedPet} onSelect={setSelectedPet} />
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border border-orange-100 w-full flex-wrap h-auto gap-1.5 p-1.5 justify-center">
          {TABS.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-xs font-bold data-[state=active]:bg-[#F97066]/10 data-[state=active]:text-[#F97066] px-3"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-white rounded-xl border border-orange-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No entries yet"
              description="Start tracking your pet's care by adding a new entry."
              actionLabel="Add Entry"
              onAction={() => { setEditEntry(null); setShowForm(true); }}
            />
          ) : (
            filtered.map(entry => (
              <CareLogItem
                key={entry.id}
                entry={entry}
                petName={petMap[entry.pet_id]?.name}
                onEdit={(e) => { setEditEntry(e); setShowForm(true); }}
                onDelete={handleDelete}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {showForm && (
        <CareLogForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditEntry(null); }}
          petId={selectedPet !== "all" ? selectedPet : (pets[0]?.id || "")}
          pets={pets}
          entry={editEntry}
          onSaved={handleSaved}
          user={user}
        />
      )}
      </div>
    </div>
  );
}