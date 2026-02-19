import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Globe, Clock, Edit, Trash2 } from "lucide-react";

export default function VeterinarianCard({ veterinarian, pets = [], onEdit, onDelete }) {
  const linkedPetNames = pets
    .filter((pet) => veterinarian.linked_pets?.includes(pet.id))
    .map((pet) => pet.name);

  return (
    <Card className="border-slate-700 bg-slate-800/50 hover:border-blue-500/50 transition-all">
      <CardHeader>
        <div>
          <CardTitle className="text-white text-xl mb-1">{veterinarian.clinic_name}</CardTitle>
          <p className="text-slate-400 text-sm">Dr. {veterinarian.veterinarian_name}</p>
        </div>
        {veterinarian.emergency_hours && (
          <Badge className="bg-red-500/20 text-red-400 w-fit mt-2">
            <Clock className="w-3 h-3 mr-1" />
            Emergency Hours Available
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 text-slate-300">
          <Phone className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
          <a href={`tel:${veterinarian.phone_number}`} className="hover:text-blue-400">
            {veterinarian.phone_number}
          </a>
        </div>

        {veterinarian.email && (
          <div className="flex items-start gap-2 text-slate-300">
            <Mail className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
            <a href={`mailto:${veterinarian.email}`} className="hover:text-blue-400 break-all">
              {veterinarian.email}
            </a>
          </div>
        )}

        <div className="flex items-start gap-2 text-slate-300">
          <MapPin className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(veterinarian.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400 cursor-pointer"
          >
            {veterinarian.address}
          </a>
        </div>

        {veterinarian.website && (
          <div className="flex items-start gap-2 text-slate-300">
            <Globe className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
            <a
              href={veterinarian.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 break-all"
            >
              {veterinarian.website}
            </a>
          </div>
        )}

        {linkedPetNames.length > 0 && (
          <div className="pt-2 border-t border-slate-700">
            <p className="text-xs text-slate-500 mb-2">Linked Pets:</p>
            <div className="flex flex-wrap gap-2">
              {linkedPetNames.map((name, index) => (
                <Badge key={index} variant="outline" className="border-slate-600 text-slate-400">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-700 mt-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(veterinarian)}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(veterinarian)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}