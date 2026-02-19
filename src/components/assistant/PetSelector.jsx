import React from "react";
import { Check } from "lucide-react";

export default function PetSelector({ pets, selectedPet, onSelectPet }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-300">Your Pets</p>
      <div className="space-y-2">
        {pets.map((pet) => (
          <button
            key={pet.id}
            onClick={() => onSelectPet(pet)}
            className={`w-full p-3 rounded-lg border transition-all text-left ${
              selectedPet?.id === pet.id
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-700 bg-slate-800 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{pet.name}</p>
                <p className="text-xs text-slate-400">
                  {pet.species}
                  {pet.breed && ` • ${pet.breed}`}
                </p>
              </div>
              {selectedPet?.id === pet.id && (
                <Check className="w-4 h-4 text-blue-400" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}