import React, { useState } from "react";
import api from '@/api/firebaseClient';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, Activity } from "lucide-react";

export default function SymptomChecker({ selectedPet, disabled }) {
  const [symptoms, setSymptoms] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheckSymptoms = async () => {
    if (!symptoms.trim() || !selectedPet) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const petContext = {
        name: selectedPet.name,
        species: selectedPet.species,
        breed: selectedPet.breed,
        age: selectedPet.date_of_birth ? 
          new Date().getFullYear() - new Date(selectedPet.date_of_birth).getFullYear() : 
          null,
        weight: selectedPet.weight,
        allergies: selectedPet.allergies,
      };

      const { data } = await api.functions.invoke('petHelperAI', {
        message: symptoms,
        petContext,
        mode: 'symptom_check'
      });

      setResult(data.response);
      setSymptoms("");
    } catch (err) {
      setError("Failed to analyze symptoms. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-900">Symptom Checker</h3>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Disclaimer:</span> This tool cannot diagnose medical conditions. Always consult your veterinarian for professional diagnosis and treatment.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Describe your {selectedPet?.name}'s symptoms:
        </label>
        <Textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="e.g., Vomiting, lethargy, loss of appetite..."
          disabled={loading || disabled}
          className="min-h-24"
        />
        <Button
          onClick={handleCheckSymptoms}
          disabled={loading || disabled || !symptoms.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Analyzing...
            </>
          ) : (
            "Check Symptoms"
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <p className="text-sm font-semibold text-slate-900">Analysis:</p>
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{result}</div>
          <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-4">
            <p className="text-xs text-amber-900">
              <span className="font-semibold">Remember:</span> This is informational only. Contact your veterinarian immediately if your pet is in distress or showing severe symptoms.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}