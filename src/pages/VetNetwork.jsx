import React, { useEffect, useState } from "react";
import api from '@/api/firebaseClient';
import { createPageUrl } from "@/utils/index";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PremiumFeatureLocked from "@/components/shared/PremiumFeatureLocked";
import VeterinarianForm from "@/components/vet/VeterinarianForm";
import VeterinarianCard from "@/components/vet/VeterinarianCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function VetNetworkPage() {
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVet, setEditingVet] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkUser = async () => {
      const userData = await api.auth.me();
      setUser(userData);
      setIsPremium(userData?.premium_subscriber === true);
      setLoading(false);
    };
    checkUser();
  }, []);

  const { data: veterinarians = [], isLoading: vetsLoading } = useQuery({
    queryKey: ["veterinarians"],
    queryFn: async () => {
      const userData = await api.auth.me();
      return api.entities.Veterinarian.filter({ created_by: userData.email }, "-created_date");
    },
    enabled: !loading && (isPremium || user?.role === "admin"),
  });

  const { data: pets = [] } = useQuery({
    queryKey: ["userPets"],
    queryFn: async () => {
      const userData = await api.auth.me();
      return api.entities.Pet.filter({ created_by: userData.email });
    },
    enabled: !loading && (isPremium || user?.role === "admin"),
  });

  if (loading) return null;

  const isAdmin = user?.role === "admin";
  if (!isPremium && !isAdmin) {
    return (
      <PremiumFeatureLocked
        featureName="Vet Contact Information"
        onUpgrade={() => (window.location.href = createPageUrl("Account"))}
      />
    );
  }

  const filteredVets = veterinarians.filter((vet) => {
    const query = searchQuery.toLowerCase();
    return (
      vet.clinic_name.toLowerCase().includes(query) ||
      vet.veterinarian_name.toLowerCase().includes(query) ||
      vet.address.toLowerCase().includes(query)
    );
  });

  const handleEdit = (vet) => {
    setEditingVet(vet);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await api.entities.Veterinarian.delete(deleteConfirm.id);
    queryClient.invalidateQueries({ queryKey: ["veterinarians"] });
    setDeleteConfirm(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingVet(null);
    queryClient.invalidateQueries({ queryKey: ["veterinarians"] });
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingVet(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Vet Network</h1>
          <p className="text-slate-400">Manage your trusted veterinarian contacts</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by clinic name, veterinarian, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Veterinarian
          </Button>
        </div>

        {vetsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : filteredVets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">
              {searchQuery
                ? "No veterinarians found matching your search."
                : "No veterinarians added yet. Add your first veterinarian to get started."}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Veterinarian
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVets.map((vet) => (
              <VeterinarianCard
                key={vet.id}
                veterinarian={vet}
                pets={pets}
                onEdit={handleEdit}
                onDelete={(vet) => setDeleteConfirm(vet)}
              />
            ))}
          </div>
        )}

        {showForm && (
          <VeterinarianForm
            veterinarian={editingVet}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        )}

        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent className="bg-slate-800 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Veterinarian?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Are you sure you want to delete {deleteConfirm?.clinic_name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}