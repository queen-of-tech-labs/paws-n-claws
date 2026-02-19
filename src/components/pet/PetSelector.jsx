import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PawPrint } from "lucide-react";

export default function PetSelector({ pets, selectedPetId, onSelect, className = "" }) {
  if (!pets || pets.length === 0) return null;

  return (
    <Select value={selectedPetId || ""} onValueChange={onSelect}>
      <SelectTrigger className={`w-[220px] bg-slate-900 border-slate-700 text-white ${className}`}>
        <div className="flex items-center gap-2">
          <PawPrint className="w-4 h-4 text-blue-400" />
          <SelectValue placeholder="Select a pet" />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-slate-900 border-slate-700">
        <SelectItem value="all" className="text-white">All Pets</SelectItem>
        {pets.map((pet) => (
          <SelectItem key={pet.id} value={pet.id} className="text-white">
            <div className="flex items-center gap-2">
              {pet.photo_url ? (
                <img src={pet.photo_url} alt={pet.name} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center">
                  <PawPrint className="w-3 h-3 text-blue-400" />
                </div>
              )}
              {pet.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}