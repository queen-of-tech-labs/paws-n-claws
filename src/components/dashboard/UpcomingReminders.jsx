import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils/index";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ChevronRight } from "lucide-react";
import ReminderCard from "@/components/reminders/ReminderCard";

export default function UpcomingReminders({ reminders, pets, onAcknowledge, onComplete, onDelete, onUpdate }) {
  if (!reminders || reminders.length === 0) return null;

  const petMap = {};
  pets.forEach(p => { petMap[p.id] = p; });

  // Show only pending reminders, sorted by due date
  const pendingReminders = reminders
    .filter(r => r.status === "pending")
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 3);

  if (pendingReminders.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-400" />
          Upcoming Reminders
        </h2>
        <Link to={createPageUrl("PetReminders")} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
          View All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-3">
        {pendingReminders.map((reminder) => (
           <ReminderCard
             key={reminder.id}
             reminder={reminder}
             petName={petMap[reminder.pet_id]?.name || "Unknown Pet"}
             onAcknowledge={onAcknowledge}
             onComplete={onComplete}
             onDelete={onDelete}
             onUpdate={onUpdate}
           />
         ))}
      </div>
    </div>
  );
}