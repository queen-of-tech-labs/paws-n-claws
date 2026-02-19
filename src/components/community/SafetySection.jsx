import React from "react";
import { AlertTriangle, Phone, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function SafetySection() {
  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold text-white mb-4 text-center">Pet Safety & Emergency Help</h2>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Emergency Section */}
        <Card className="border-red-500/30 bg-red-500/10 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-300 mb-2">Emergencies</h3>
              <p className="text-sm text-red-200/80 mb-3">
                If your pet is in immediate danger, call your local emergency vet or animal poison control.
              </p>
              <div className="text-xs text-red-300 space-y-1">
                <p><strong>ASPCA Animal Poison Control:</strong> (888) 426-4435</p>
                <p><strong>Pet Poison Helpline:</strong> (855) 764-7661</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Resources Section */}
        <Card className="border-blue-500/30 bg-blue-500/10 p-6">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-300 mb-2">Resources</h3>
              <p className="text-sm text-blue-200/80 mb-3">
                Check out our pet care guides and expert articles for helpful information.
              </p>
              <div className="text-xs text-blue-300">
                <p>• Common pet emergencies and first aid</p>
                <p>• When to visit the vet</p>
                <p>• Pet wellness tips</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}