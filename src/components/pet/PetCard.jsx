import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PawPrint, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const speciesEmoji = {
  dog: "🐕", cat: "🐈", bird: "🐦", rabbit: "🐇",
  hamster: "🐹", fish: "🐠", reptile: "🦎", other: "🐾"
};

export default function PetCard({ pet, index = 0 }) {
  const age = pet.date_of_birth ? calculateAge(pet.date_of_birth) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <Link to={createPageUrl(`PetDetail?id=${pet.id}`)}>
        <Card className="group overflow-hidden bg-slate-900 border-slate-800 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-4 p-4">
            <div className="relative">
              {pet.photo_url ? (
                <img
                  src={pet.photo_url}
                  alt={pet.name}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-700 group-hover:ring-blue-500/50 transition-all"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center ring-2 ring-slate-700">
                  <span className="text-2xl">{speciesEmoji[pet.species] || "🐾"}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white truncate">{pet.name}</h3>
                {pet.gender && (
                  <span className="text-xs">{pet.gender === "male" ? "♂️" : "♀️"}</span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                {pet.breed || pet.species}
                {age && ` · ${age}`}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {pet.weight && (
                  <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-xs border-0">
                    {pet.weight} lbs
                  </Badge>
                )}
                {pet.microchip_number && (
                  <Badge variant="secondary" className="bg-teal-500/20 text-teal-400 text-xs border-0">
                    Chipped
                  </Badge>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

function calculateAge(dateOfBirth) {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  
  if (years === 0) {
    return months <= 0 ? "newborn" : `${months}mo`;
  }
  if (years === 1 && months < 0) {
    return `${12 + months}mo`;
  }
  return `${years}yr${years > 1 ? "s" : ""}`;
}