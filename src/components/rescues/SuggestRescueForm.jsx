import React, { useState } from "react";
import api from '@/api/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export default function SuggestRescueForm({ onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    address: "",
    description: "",
    accepts_volunteers: false,
    accepts_donations: false,
    animals_served: []
  });
  const [loading, setLoading] = useState(false);

  const animalOptions = [
    { value: "dogs", label: "Dogs" },
    { value: "cats", label: "Cats" },
    { value: "birds", label: "Birds" },
    { value: "rabbits", label: "Rabbits" },
    { value: "horses", label: "Horses" },
    { value: "wildlife", label: "Wildlife" },
    { value: "farm_animals", label: "Farm Animals" },
    { value: "reptiles", label: "Reptiles" },
    { value: "other", label: "Other" }
  ];

  const toggleAnimal = (animal) => {
    setFormData(prev => ({
      ...prev,
      animals_served: prev.animals_served.includes(animal)
        ? prev.animals_served.filter(a => a !== animal)
        : [...prev.animals_served, animal]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.entities.RescueSuggestion.create({
        ...formData,
        status: "pending",  // Always start as pending for admin review
      });
      toast.success("Thank you! Your suggestion has been submitted for review.");
      onClose();
    } catch (err) {
      console.error("Failed to submit suggestion:", err);
      toast.error("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-slate-900">Suggest a Rescue Organization</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-900"
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Rescue Name *
            </label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Happy Paws Rescue"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Website
            </label>
            <Input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Address *
            </label>
            <Input
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main St, City, State 12345"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Description *
            </label>
            <Textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell us about this rescue organization..."
              className="h-24"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Types of Animals Served
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {animalOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 p-2 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  <Checkbox
                    checked={formData.animals_served.includes(option.value)}
                    onCheckedChange={() => toggleAnimal(option.value)}
                  />
                  <span className="text-sm text-slate-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 block">
              Additional Information
            </label>
            <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer">
              <Checkbox
                checked={formData.accepts_volunteers}
                onCheckedChange={(checked) => setFormData({ ...formData, accepts_volunteers: checked })}
              />
              <span className="text-sm text-slate-700">Accepts Volunteers</span>
            </label>
            <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer">
              <Checkbox
                checked={formData.accepts_donations}
                onCheckedChange={(checked) => setFormData({ ...formData, accepts_donations: checked })}
              />
              <span className="text-sm text-slate-700">Accepts Donations</span>
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#F97066] hover:bg-[#E5524A]"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Suggestion
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
