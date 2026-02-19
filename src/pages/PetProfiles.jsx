import React, { useState, useEffect } from "react";
import api from '@/api/firebaseClient';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dog, Lock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import PetCard from "../components/pet/PetCard";
import PetForm from "../components/pet/PetForm";

export default function PetProfiles() {
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [purchasingSlot, setPurchasingSlot] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: pets = [], isLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: () => user ? api.entities.Pet.filter({ created_by: user.email }, "-created_date") : [],
    enabled: !!user,
  });

  const isPremium = user?.premium_subscriber === true;
  const petLimit = user?.pet_limit || 2;
  const canAddPet = isPremium || pets.length < petLimit;

  const handleAddPetClick = () => {
    if (!canAddPet) {
      setShowUpgradeModal(true);
    } else {
      setShowForm(true);
    }
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["pets"] });
    setShowForm(false);
  };

  const handleUpgradeClick = async () => {
    // Check if running in iframe
    if (window.self !== window.top) {
      alert("Checkout only works from the published app. Please open it in a new tab.");
      return;
    }
    
    setUpgrading(true);
    try {
      const response = await api.functions.invoke('createCheckoutSession', {
        priceId: 'price_1T2GVUJKBH02BiIFrQGvTDlQ',
        mode: 'subscription',
        successUrl: window.location.origin + '/pets',
        cancelUrl: window.location.origin + '/pets'
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        alert("Failed to start checkout. Please try again.");
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("Failed to start checkout. Please try again.");
    }
    setUpgrading(false);
  };

  const handleBuySlotClick = async () => {
    if (window.self !== window.top) {
      alert("Checkout only works from the published app. Please open it in a new tab.");
      return;
    }
    
    setPurchasingSlot(true);
    try {
      const response = await api.functions.invoke('createCheckoutSession', {
        priceId: 'price_1T2GY3JKBH02BiIFFmzFXk1o',
        mode: 'payment',
        successUrl: window.location.origin + '/pets',
        cancelUrl: window.location.origin + '/pets'
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        alert("Failed to start checkout. Please try again.");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      alert("Failed to start checkout. Please try again.");
    }
    setPurchasingSlot(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="My Pets"
        description={`${pets.length}/${isPremium ? '∞' : petLimit} pet${pets.length !== 1 ? "s" : ""} in your family`}
        actionLabel="Add Pet"
        onAction={handleAddPetClick}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white rounded-xl border border-orange-100 animate-pulse" />
          ))}
        </div>
      ) : pets.length === 0 ? (
        <EmptyState
          icon={Dog}
          title="No pets yet"
          description="Add your first pet to start tracking their care, health records, and appointments."
          actionLabel="Add Your First Pet"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-3">
          {pets.map((pet, i) => (
            <PetCard key={pet.id} pet={pet} index={i} />
          ))}
        </div>
      )}

      {showForm && (
        <PetForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}

      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-amber-500" />
              <DialogTitle>Upgrade to Premium</DialogTitle>
            </div>
            <DialogDescription>
              You've reached your pet limit. Choose an option below to add more pets.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {/* Buy Single Slot */}
            <div className="bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
              <p className="text-sm font-semibold text-slate-900 mb-1">Add 1 Pet Slot</p>
              <p className="text-xs text-slate-600 mb-3">One-time purchase • Adds 1 additional pet</p>
              <Button 
                disabled={purchasingSlot}
                variant="outline"
                className="w-full" 
                onClick={handleBuySlotClick}
              >
                {purchasingSlot && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Purchase Slot
              </Button>
            </div>

            {/* Premium Subscription */}
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <p className="text-sm font-semibold text-slate-900 mb-1">Upgrade to Premium</p>
              <p className="text-xs text-slate-600 mb-2">Unlimited pets + all premium features</p>
              <ul className="text-xs text-slate-700 space-y-1 mb-3">
                <li>✓ Unlimited pets</li>
                <li>✓ 24/7 AI pet assistant</li>
                <li>✓ Advanced health tracking</li>
              </ul>
              <Button 
                disabled={upgrading}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full" 
                onClick={handleUpgradeClick}
              >
                {upgrading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Upgrade to Premium
              </Button>
            </div>
          </div>

          <Button variant="ghost" onClick={() => setShowUpgradeModal(false)} className="w-full mt-2">
            Not now
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}