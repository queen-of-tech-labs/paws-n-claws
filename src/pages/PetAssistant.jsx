import React, { useEffect, useState } from "react";
import api from '@/api/firebaseClient';
import { createPageUrl } from "@/utils/index";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import PremiumFeatureLocked from "@/components/shared/PremiumFeatureLocked";
import PetHelperChat from "@/components/assistant/PetHelperChat.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PetAssistantPage() {
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkUser = async () => {
      const isAuthenticated = await api.auth.isAuthenticated();
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      const userData = await api.auth.me();
      setUser(userData);
      setIsPremium(userData?.premium_subscriber === true);
      setLoading(false);
    };
    checkUser();
  }, []);

  const { data: pets = [] } = useQuery({
    queryKey: ['pets', user?.email],
    queryFn: () => user ? api.entities.Pet.filter({ created_by: user.email }, 'name', 100) : Promise.resolve([]),
    enabled: !loading && !!user
  });

  if (loading) return null;

  const isAdmin = user?.role === 'admin';
  if (!isPremium && !isAdmin) {
    return (
      <PremiumFeatureLocked
        featureName="AI Pet Assistant"
        onUpgrade={() => window.location.href = createPageUrl("Account")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      {/* Hero Image */}
      <div className="w-full h-64 overflow-hidden">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699233bbcd7075c113f72710/13766ca7c_ChatGPTImageFeb17202612_01_10AM.png"
          alt="AI Pet Helper"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Disclaimer Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
        <p className="max-w-4xl mx-auto text-sm text-amber-900">
          <span className="font-semibold">⚠️ Important:</span> AI advice is not a substitute for veterinary care. Always consult your veterinarian for health concerns.
        </p>
      </div>

      <div className="p-6 max-w-4xl mx-auto h-[calc(100vh-256px-120px)] flex flex-col">
        {/* Centered Title and Tagline */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">AI Pet Assistant</h1>
          <p className="text-slate-400 mb-4">Get AI-powered insights and personalized recommendations for your pet</p>
          
          {/* Pet Selector Dropdown */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-400">Select your pet:</label>
            <Select 
              value={selectedPet?.id || ""} 
              onValueChange={(petId) => {
                const pet = pets.find(p => p.id === petId);
                setSelectedPet(pet);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Choose a pet" />
              </SelectTrigger>
              <SelectContent>
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name} ({pet.species})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {selectedPet ? (
            <PetHelperChat 
              selectedPet={selectedPet}
              onConversationCreated={() => queryClient.invalidateQueries({ queryKey: ['conversations', selectedPet.id] })}
            />
          ) : (
            <div className="flex items-center justify-center text-slate-400">
              <p>Select a pet to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}