import React from "react";
import { Button } from "@/components/ui/button";

const PET_TYPES = [
  { value: "all", label: "All Pets" },
  { value: "dog", label: "Dogs" },
  { value: "cat", label: "Cats" },
  { value: "bird", label: "Birds" },
  { value: "small_animals", label: "Small Animals" },
  { value: "reptile", label: "Reptiles" },
];

export default function PetTypeFilter({ selectedPetType, onPetTypeChange }) {
  return (
    <div className="mb-8">
      <div className="flex gap-2 flex-wrap">
        {PET_TYPES.map((type) => (
          <Button
            key={type.value}
            onClick={() => onPetTypeChange(type.value)}
            variant={selectedPetType === type.value ? "default" : "outline"}
            className={selectedPetType === type.value
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-white"
            }
          >
            {type.label}
          </Button>
        ))}
      </div>
    </div>
  );
}