import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, FlaskConical, Syringe, ScanLine, Pill, File, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

const typeConfig = {
  vet_document: { icon: FileText, color: "bg-blue-50 text-blue-600", label: "Vet Document" },
  lab_result: { icon: FlaskConical, color: "bg-purple-50 text-purple-600", label: "Lab Result" },
  vaccine_record: { icon: Syringe, color: "bg-green-50 text-green-600", label: "Vaccine Record" },
  xray: { icon: ScanLine, color: "bg-amber-50 text-amber-600", label: "X-Ray" },
  prescription: { icon: Pill, color: "bg-pink-50 text-pink-600", label: "Prescription" },
  other: { icon: File, color: "bg-gray-50 text-gray-600", label: "Other" },
};

export default function HealthRecordItem({ record, petName, onEdit, onDelete }) {
  const config = typeConfig[record.type] || typeConfig.other;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-orange-100 hover:border-orange-200 transition-colors group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-[#3D2E24] text-sm">{record.title}</h4>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <Badge variant="secondary" className={`text-xs border-0 ${config.color}`}>
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-[#6B5B50]/60 mt-1">
          {format(new Date(record.date), "MMM d, yyyy")}
          {petName && ` · ${petName}`}
          {record.vet_name && ` · Dr. ${record.vet_name}`}
          {record.clinic_name && ` · ${record.clinic_name}`}
        </p>
        {record.description && (
          <p className="text-xs text-[#6B5B50]/80 mt-1 line-clamp-2">{record.description}</p>
        )}
      </div>
      <div className="flex gap-1">
        {record.file_url && (
          <a href={record.file_url} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="w-3.5 h-3.5 text-[#F97066]" />
            </Button>
          </a>
        )}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(record)}>
            <Pencil className="w-3.5 h-3.5 text-[#6B5B50]" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(record)}>
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </Button>
        </div>
      </div>
    </div>
  );
}