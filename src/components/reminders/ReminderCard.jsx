import React, { useState } from "react";
import { Syringe, PartyPopper, Pill, Calendar, Heart, AlertCircle, FileText, ChevronDown, ChevronUp, Trash2, Check, X, Edit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format, isPast, isToday, isTomorrow } from "date-fns";

// Format date string without timezone conversion
const formatDateString = (dateString) => {
  const [year, month, day] = dateString.split('-');
  const date = new Date(year, parseInt(month) - 1, day);
  return date;
};

const reminderIcons = {
  vaccination: Syringe,
  medication: Pill,
  appointment: Calendar,
  birthday: PartyPopper,
  checkup: Heart,
  grooming: Heart,
  treatment: Pill,
  other: AlertCircle,
};

const reminderColors = {
  vaccination: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
  medication: "from-purple-500/10 to-purple-500/5 border-purple-500/20",
  appointment: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20",
  birthday: "from-pink-500/10 to-pink-500/5 border-pink-500/20",
  checkup: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
  grooming: "from-orange-500/10 to-orange-500/5 border-orange-500/20",
  treatment: "from-red-500/10 to-red-500/5 border-red-500/20",
  other: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
};

const badgeColors = {
  high: "bg-red-600",
  medium: "bg-amber-600",
  low: "bg-blue-600",
};

const recurrenceLabels = {
  none: "One-time",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Every 3 months",
  "semi-annual": "Every 6 months",
  annual: "Yearly",
  daily: "Daily",
  "2x-daily": "2x Daily",
};

const getRecurrenceDisplay = (recurrence, customInterval, customUnit) => {
  if (recurrence === "custom" && customInterval) {
    return `Every ${customInterval} ${customUnit}`;
  }
  return recurrenceLabels[recurrence] || recurrence;
};

const calculateReminderTimes = (medicationTimes, reminderIntervalMinutes) => {
  if (!medicationTimes || medicationTimes.length === 0) return [];
  
  return medicationTimes.map(time => {
    const [hours, minutes] = time.split(":").map(Number);
    let totalMinutes = hours * 60 + minutes - reminderIntervalMinutes;
    
    // Handle negative times (previous day)
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
    
    const reminderHours = Math.floor(totalMinutes / 60) % 24;
    const reminderMinutes = totalMinutes % 60;
    
    return `${String(reminderHours).padStart(2, "0")}:${String(reminderMinutes).padStart(2, "0")}`;
  });
};

export default function ReminderCard({ reminder, petName, onAcknowledge, onComplete, onDelete, onUpdate, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [editingInterval, setEditingInterval] = useState(false);
  const [intervalValue, setIntervalValue] = useState(reminder.reminder_interval_days || 0);
  const [isEditMode, setIsEditMode] = useState(false);
  const isAutoCreated = reminder.related_entity_type && ["appointment", "care_log"].includes(reminder.related_entity_type);
  const [editData, setEditData] = useState({
    title: reminder.title,
    description: reminder.description || "",
    due_date: reminder.due_date,
    priority: reminder.priority || "medium",
    recurrence: reminder.recurrence || "none",
    custom_recurrence_interval: reminder.custom_recurrence_interval || "",
    custom_recurrence_unit: reminder.custom_recurrence_unit || "days",
    reminder_interval_days: reminder.reminder_interval_days || 0,
    medication_times: reminder.medication_times || [],
    notes: reminder.notes || "",
  });
  const Icon = reminderIcons[reminder.type] || AlertCircle;
  const dueDate = formatDateString(reminder.due_date);
  const isDue = isToday(dueDate);
  const isOverdue = isPast(dueDate) && !isToday(dueDate);
  const dueDateText =
    isToday(dueDate)
      ? "Today"
      : isTomorrow(dueDate)
        ? "Tomorrow"
        : format(dueDate, "MMM d, yyyy");

  const hasDetails = reminder.notes || (reminder.file_urls && reminder.file_urls.length > 0) || reminder.recurrence !== "none" || reminder.reminder_interval_days > 0;

  return (
    <div
      className={`rounded-xl border bg-gradient-to-r ${reminderColors[reminder.type]} transition-all ${reminder.status === "pending" ? "ring-1 ring-offset-1 ring-offset-slate-900" : ""}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-slate-800/50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white break-words">{reminder.title}</h3>
                  <p className="text-sm text-slate-400 mt-1">{petName}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {reminder.priority && (
                  <Badge className={`${badgeColors[reminder.priority]} text-white text-xs flex-shrink-0`}>
                    {reminder.priority}
                  </Badge>
                )}
                {reminder.status === "pending" && (
                  <Badge className="bg-blue-600 text-white text-xs flex-shrink-0">Pending</Badge>
                )}
              </div>
            </div>

            {reminder.description && (
              <p className="text-sm text-slate-300 mb-3">{reminder.description}</p>
            )}

            {isEditMode ? (
              <div className="space-y-3 mt-4 pt-4 border-t border-slate-700/50">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Title</label>
                  <Input
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{reminder.type === "medication" ? "Dosage" : "Description"}</label>
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white text-sm h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">{reminder.type === "medication" ? "Start Date" : "Due Date"}</label>
                    <Input
                      type="date"
                      value={editData.due_date}
                      onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Priority</label>
                    <Select value={editData.priority} onValueChange={(value) => setEditData({ ...editData, priority: value })}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Recurrence</label>
                    <Select value={editData.recurrence} onValueChange={(value) => setEditData({ ...editData, recurrence: value })}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">One-time</SelectItem>
                        {reminder.type === "medication" && (
                          <>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="2x-daily">2x Daily</SelectItem>
                          </>
                        )}
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Every 3 months</SelectItem>
                        <SelectItem value="semi-annual">Every 6 months</SelectItem>
                        <SelectItem value="annual">Yearly</SelectItem>
                        <SelectItem value="custom">Custom Interval</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      {reminder.type === "medication" && (editData.recurrence === "daily" || editData.recurrence === "2x-daily")
                        ? "Remind me before dose"
                        : "Reminder Interval"}
                    </label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        min="0"
                        max={reminder.type === "medication" && (editData.recurrence === "daily" || editData.recurrence === "2x-daily") ? "30" : "30"}
                        value={editData.reminder_interval_days}
                        onChange={(e) => setEditData({ ...editData, reminder_interval_days: parseInt(e.target.value) || 0 })}
                        className="bg-slate-700 border-slate-600 text-white text-sm flex-1"
                      />
                      <span className="text-xs text-slate-400 self-center whitespace-nowrap">
                        {reminder.type === "medication" && (editData.recurrence === "daily" || editData.recurrence === "2x-daily")
                          ? "minutes"
                          : "days"}
                      </span>
                    </div>
                  </div>
                </div>
                {editData.recurrence === "custom" && (
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Interval</label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={editData.custom_recurrence_interval}
                        onChange={(e) => setEditData({ ...editData, custom_recurrence_interval: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Unit</label>
                      <Select value={editData.custom_recurrence_unit} onValueChange={(value) => setEditData({ ...editData, custom_recurrence_unit: value })}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="weeks">Weeks</SelectItem>
                          <SelectItem value="months">Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {reminder.type === "medication" && (
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Medication Times</label>
                    <div className="space-y-2">
                      {editData.medication_times && editData.medication_times.map((time, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            type="time"
                            value={time}
                            onChange={(e) => {
                              const newTimes = [...editData.medication_times];
                              newTimes[idx] = e.target.value;
                              setEditData({ ...editData, medication_times: newTimes });
                            }}
                            className="flex-1 bg-slate-700 border-slate-600 text-white text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newTimes = editData.medication_times.filter((_, i) => i !== idx);
                              setEditData({ ...editData, medication_times: newTimes });
                            }}
                            className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditData({ ...editData, medication_times: [...(editData.medication_times || []), ""] })}
                        className="w-full px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 rounded text-xs"
                      >
                        + Add Time
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Notes</label>
                  <Textarea
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white text-sm h-20"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span
                      className={`text-sm font-medium ${isOverdue ? "text-red-400" : isDue ? "text-yellow-400" : "text-slate-400"}`}
                    >
                      {isOverdue ? "Overdue" : isDue ? "Due today" : `Due ${dueDateText}`}
                      {reminder.type === "medication" && reminder.medication_times?.length > 0 && (
                        <span className="text-xs text-slate-400 ml-1">
                          ({reminder.medication_times.join(", ")})
                        </span>
                      )}
                    </span>
                  </div>

                  {hasDetails && (
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                
                <div className="text-xs text-slate-500">
                  <span className="inline-block">
                    Reminder Set For: {reminder.medication_times && reminder.medication_times.length > 0
                      ? reminder.type === "medication"
                        ? calculateReminderTimes(reminder.medication_times, reminder.reminder_interval_days || 0).join(", ")
                        : reminder.medication_times.join(", ")
                      : reminder.reminder_interval_days > 0 
                        ? `${reminder.reminder_interval_days} day${reminder.reminder_interval_days !== 1 ? "s" : ""} before`
                        : `${getRecurrenceDisplay(reminder.recurrence, reminder.custom_recurrence_interval, reminder.custom_recurrence_unit)}`}
                  </span>
                </div>
              </div>
            )}
            </div>
            </div>
            </div>

            {reminder.status === "pending" && !hasDetails && !isEditMode && (
            <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-700/50">
            <Button
             size="sm"
             variant="outline"
             className="text-xs h-8 flex-1 min-w-0"
             onClick={() => onAcknowledge(reminder.id)}
            >
             Acknowledge
            </Button>
            <Button
             size="sm"
             className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 flex-1 min-w-0"
             onClick={() => onComplete(reminder.id)}
            >
             Mark Done
            </Button>
            {onEdit && !isAutoCreated && (
             <Button
               size="sm"
               variant="outline"
               className="text-xs h-8 flex-shrink-0"
               onClick={() => setIsEditMode(true)}
             >
               <Edit2 className="w-4 h-4" />
             </Button>
            )}
            {onDelete && (
             <Button
               size="sm"
               variant="outline"
               className="text-red-400 hover:text-red-300 hover:bg-red-600/20 text-xs h-8 flex-shrink-0 border-red-600/30"
               onClick={() => onDelete(reminder.id)}
             >
               <Trash2 className="w-4 h-4" />
             </Button>
            )}
            </div>
            )}

            {isEditMode && (
            <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-slate-700/50">
            <Button
             size="sm"
             className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 flex-1 min-w-[80px]"
             onClick={() => {
               onUpdate(reminder.id, editData);
               setIsEditMode(false);
             }}
            >
             Save
            </Button>
            <Button
             size="sm"
             variant="outline"
             className="text-xs h-8 flex-1 min-w-[80px]"
             onClick={() => setIsEditMode(false)}
            >
             Cancel
            </Button>
            </div>
            )}

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-700/50 p-4 bg-slate-800/20 space-y-4">
          {/* Recurrence and Interval */}
          {(reminder.recurrence !== "none" || reminder.reminder_interval_days > 0) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {reminder.recurrence !== "none" && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Recurrence</p>
                  <Badge className="bg-slate-700 text-slate-200">{getRecurrenceDisplay(reminder.recurrence, reminder.custom_recurrence_interval, reminder.custom_recurrence_unit)}</Badge>
                </div>
              )}
              {reminder.reminder_interval_days >= 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Reminder Interval</p>
                  {editingInterval ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        value={intervalValue}
                        onChange={(e) => setIntervalValue(parseInt(e.target.value) || 0)}
                        className="bg-slate-700 border-slate-600 text-white w-16"
                      />
                      <span className="text-xs text-slate-400">
                        {reminder.type === "medication" && (reminder.recurrence === "daily" || reminder.recurrence === "2x-daily") 
                          ? "minutes before dose" 
                          : "days before"}
                      </span>
                      <button
                        onClick={() => {
                          onUpdate(reminder.id, { reminder_interval_days: intervalValue });
                          setEditingInterval(false);
                        }}
                        className="p-1 hover:bg-green-600/20 rounded"
                      >
                        <Check className="w-4 h-4 text-green-400" />
                      </button>
                      <button
                        onClick={() => {
                          setIntervalValue(reminder.reminder_interval_days);
                          setEditingInterval(false);
                        }}
                        className="p-1 hover:bg-red-600/20 rounded"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ) : (
                    <div
                       onClick={() => setEditingInterval(true)}
                       className="flex items-center gap-2 p-2 rounded bg-slate-700/50 hover:bg-slate-700 cursor-pointer transition-colors"
                     >
                       <Badge className="bg-slate-700 text-slate-200">
                         {reminder.type === "medication" && (reminder.recurrence === "daily" || reminder.recurrence === "2x-daily") 
                           ? `${intervalValue} minute${intervalValue > 1 ? "s" : ""} before dose`
                           : `${intervalValue} day${intervalValue > 1 ? "s" : ""} before`
                         }
                       </Badge>
                       <span className="text-xs text-slate-400">Click to edit</span>
                     </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {reminder.notes && (
            <div>
              <p className="text-xs text-slate-400 mb-2">Notes</p>
              <p className="text-sm text-slate-300 bg-slate-800/50 rounded p-3">{reminder.notes}</p>
            </div>
          )}

          {/* Attachments */}
          {reminder.file_urls && reminder.file_urls.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2">Attachments</p>
              <div className="space-y-2">
                {reminder.file_urls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors text-slate-300 hover:text-white text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="truncate">{url.split("/").pop()}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {reminder.status === "pending" && !isEditMode && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50 min-w-0">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 min-w-0 text-xs h-8"
                onClick={() => onAcknowledge(reminder.id)}
              >
                Acknowledge
              </Button>
              <Button
                size="sm"
                className="flex-1 min-w-0 bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                onClick={() => onComplete(reminder.id)}
              >
                Mark Done
              </Button>
              {onEdit && !isAutoCreated && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 flex-shrink-0"
                  onClick={() => setIsEditMode(true)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-400 hover:text-red-300 hover:bg-red-600/20 text-xs h-8 flex-shrink-0 border-red-600/30"
                  onClick={() => onDelete(reminder.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}

          {/* Delete Button for Completed Reminders */}
          {reminder.status === "completed" && onDelete && (
            <div className="flex pt-2 border-t border-slate-700/50">
              <Button
                size="sm"
                variant="outline"
                className="text-red-400 hover:text-red-300 hover:bg-red-600/20 text-xs h-8 px-2 border-red-600/30"
                onClick={() => onDelete(reminder.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}