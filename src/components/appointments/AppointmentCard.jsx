import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Phone, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
  follow_up_needed: "bg-orange-100 text-orange-700",
};

export default function AppointmentCard({ appointment, petName, onEdit, onDelete }) {
  const isPast = new Date(appointment.date) < new Date();

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-orange-100 hover:border-orange-200 transition-colors group">
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-[#3D2E24]">{appointment.title}</h4>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <Badge variant="secondary" className={`text-xs border-0 ${statusColors[appointment.status]}`}>
            {appointment.status?.replace(/_/g, " ")}
          </Badge>
        </div>

        {petName && (
          <p className="text-sm text-[#F97066] font-medium mt-1">{petName}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-[#6B5B50]/70">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(appointment.date), "MMM d, yyyy")}
          </span>
          {appointment.time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {appointment.time}
            </span>
          )}
          {appointment.clinic_name && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {appointment.clinic_name}
            </span>
          )}
          {appointment.clinic_phone && (
            <a href={`tel:${appointment.clinic_phone}`} className="flex items-center gap-1 hover:text-[#F97066]">
              <Phone className="w-3.5 h-3.5" />
              {appointment.clinic_phone}
            </a>
          )}
        </div>

        {appointment.vet_name && (
          <p className="text-xs text-[#6B5B50]/60 mt-2">Dr. {appointment.vet_name}</p>
        )}

        {appointment.notes && (
          <p className="text-xs text-[#6B5B50]/80 mt-2 line-clamp-2">{appointment.notes}</p>
        )}

        {appointment.follow_up_date && (
          <p className="text-xs text-[#F97066] mt-2">
            Follow-up: {format(new Date(appointment.follow_up_date), "MMM d, yyyy")}
          </p>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(appointment)}>
          <Pencil className="w-3.5 h-3.5 text-[#6B5B50]" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(appointment)}>
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </Button>
      </div>
    </div>
  );
}