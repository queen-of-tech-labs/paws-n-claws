import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Syringe, Pill, Weight, Scissors, GraduationCap, PartyPopper, Star, Pencil, Trash2 } from "lucide-react";
import { format, parse } from "date-fns";

// Format date string without timezone conversion
const formatDateString = (dateString) => {
  const [year, month, day] = dateString.split('-');
  const date = new Date(year, parseInt(month) - 1, day);
  return format(date, "MMM d, yyyy");
};

const typeConfig = {
  vaccination: { icon: Syringe, color: "bg-blue-50 text-blue-600", label: "Vaccination" },
  medication: { icon: Pill, color: "bg-purple-50 text-purple-600", label: "Medication" },
  weight: { icon: Weight, color: "bg-green-50 text-green-600", label: "Weight" },
  grooming: { icon: Scissors, color: "bg-pink-50 text-pink-600", label: "Grooming" },
  training: { icon: GraduationCap, color: "bg-amber-50 text-amber-600", label: "Training" },
  milestone: { icon: Star, color: "bg-orange-50 text-orange-600", label: "Milestone" },
  birthday: { icon: PartyPopper, color: "bg-red-50 text-red-600", label: "Birthday" },
};

const statusColors = {
  completed: "bg-green-100 text-green-700",
  upcoming: "bg-blue-100 text-blue-700",
  overdue: "bg-red-100 text-red-700",
};

export default function CareLogItem({ entry, petName, onEdit, onDelete }) {
  const config = typeConfig[entry.type] || typeConfig.milestone;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-orange-100 hover:border-orange-200 transition-colors group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-[#3D2E24] text-sm">{entry.title}</h4>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <Badge variant="secondary" className={`text-xs border-0 ${statusColors[entry.status] || ""}`}>
            {entry.status}
          </Badge>
        </div>
        <p className="text-xs text-[#6B5B50]/60 mt-1">
          {formatDateString(entry.date)}
          {petName && ` · ${petName}`}
          {entry.type === "weight" && entry.weight_value && ` · ${entry.weight_value} lbs`}
          {entry.type === "medication" && entry.medication_dosage && ` · ${entry.medication_dosage}`}
        </p>
        {entry.description && (
          <p className="text-xs text-[#6B5B50]/80 mt-1 line-clamp-2">{entry.description}</p>
        )}
        {entry.next_due_date && (
          <p className="text-xs text-[#F97066] mt-1">
            Next due: {formatDateString(entry.next_due_date)}
          </p>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(entry)}>
          <Pencil className="w-3.5 h-3.5 text-[#6B5B50]" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(entry)}>
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </Button>
      </div>
    </div>
  );
}