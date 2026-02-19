import React, { useState, useEffect } from "react";
import api from '@/api/firebaseClient';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "../components/shared/PageHeader";
import PetSelector from "../components/pet/PetSelector";
import EmptyState from "../components/shared/EmptyState";
import HealthRecordForm from "../components/health/HealthRecordForm";
import HealthRecordItem from "../components/health/HealthRecordItem";

const TABS = [
  { value: "all", label: "All" },
  { value: "vet_document", label: "Vet Docs" },
  { value: "lab_result", label: "Lab Results" },
  { value: "vaccine_record", label: "Vaccines" },
  { value: "xray", label: "X-Rays" },
  { value: "prescription", label: "Prescriptions" },
];

export default function HealthRecords() {
  const [selectedPet, setSelectedPet] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
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

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["healthRecords"],
    queryFn: () => user ? api.entities.HealthRecord.filter({ created_by: user.email }, "-date") : [],
    enabled: !!user,
  });

  const petMap = {};
  pets.forEach(p => { petMap[p.id] = p; });

  const filtered = records
    .filter(r => selectedPet === "all" || r.pet_id === selectedPet)
    .filter(r => activeTab === "all" || r.type === activeTab);

  const handleDelete = async (record) => {
    await api.entities.HealthRecord.delete(record.id);
    queryClient.invalidateQueries({ queryKey: ["healthRecords"] });
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["healthRecords"] });
    setShowForm(false);
    setEditRecord(null);
  };

  return (
    <div className="overflow-x-hidden">
      {/* Hero Image */}
      <div className="w-full h-48 overflow-hidden relative mb-6">
        <img 
          src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=1200&h=400&fit=crop" 
          alt="Pet Health" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80"></div>
      </div>

      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <PageHeader
          title="Health Records"
          description="Upload and manage vet documents, lab results, and more"
        actionLabel="Upload Record"
        onAction={() => { setEditRecord(null); setShowForm(true); }}
      >
        <PetSelector pets={pets} selectedPetId={selectedPet} onSelect={setSelectedPet} />
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border border-orange-100 flex-wrap h-auto gap-1.5 p-1.5 w-full justify-center">
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
              icon={FileText}
              title="No records yet"
              description="Upload your pet's health records to keep everything in one place."
              actionLabel="Upload Record"
              onAction={() => { setEditRecord(null); setShowForm(true); }}
            />
          ) : (
            filtered.map(record => (
              <HealthRecordItem
                key={record.id}
                record={record}
                petName={petMap[record.pet_id]?.name}
                onEdit={(r) => { setEditRecord(r); setShowForm(true); }}
                onDelete={handleDelete}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {showForm && (
        <HealthRecordForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditRecord(null); }}
          petId={selectedPet !== "all" ? selectedPet : (pets[0]?.id || "")}
          pets={pets}
          record={editRecord}
          onSaved={handleSaved}
        />
      )}
      </div>
    </div>
  );
}