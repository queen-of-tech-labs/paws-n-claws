import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { createPageUrl } from "@/utils/index";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader } from "lucide-react";
import GuideList from "@/components/guides/GuideList";

export default function PetCareGuideCategory() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryId = searchParams.get("category");

  // Fetch category details
  const { data: categories = [] } = useQuery({
    queryKey: ["guideCategories"],
    queryFn: () => api.entities.GuideCategory.list(),
  });

  const category = categories.find((cat) => cat.id === categoryId);

  // Fetch guides for this category
  const { data: guides = [], isLoading } = useQuery({
    queryKey: ["petCareGuides", categoryId],
    queryFn: () =>
      api.entities.PetCareGuide.filter(
        { category_id: categoryId },
        "-created_date",
        100
      ),
    enabled: !!categoryId,
  });

  // Fetch all categories for guide display
  const { data: allCategories = [] } = useQuery({
    queryKey: ["allGuideCategories"],
    queryFn: () => api.entities.GuideCategory.list(),
  });

  if (!categoryId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No category selected</p>
          <Button onClick={() => navigate(createPageUrl("PetCareGuides"))}>
            Back to Guides
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("PetCareGuides"))}
            className="text-slate-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Guides
          </Button>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {category?.name || "Category"}
            </h1>
            {category?.description && (
              <p className="text-slate-400">{category.description}</p>
            )}
          </div>
        </div>

        {/* Guides List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : guides.length === 0 ? (
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-12 border border-slate-700/50 text-center">
            <p className="text-slate-400 mb-4">
              No guides in this category yet
            </p>
            <Button
              onClick={() => navigate(createPageUrl("PetCareGuides"))}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Browse All Guides
            </Button>
          </div>
        ) : (
          <GuideList
            guides={guides}
            categories={allCategories}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}