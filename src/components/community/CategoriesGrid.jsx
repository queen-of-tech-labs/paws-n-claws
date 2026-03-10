import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/index";
import { Loader2, FolderPlus } from "lucide-react";

const DEFAULT_CATEGORIES = [
  {
    name: "General Discussion",
    icon: "💬",
    description: "Chat about anything pet-related with fellow pet owners.",
    slug: "general-discussion",
  },
  {
    name: "Health & Wellness",
    icon: "🏥",
    description: "Questions and advice about pet health, vet visits, and medical care.",
    slug: "health-wellness",
  },
  {
    name: "Training & Behavior",
    icon: "🎓",
    description: "Tips and help for training your pets and understanding their behavior.",
    slug: "training-behavior",
  },
  {
    name: "Nutrition & Diet",
    icon: "📚",
    description: "Discuss food, treats, special diets, and nutrition for all pets.",
    slug: "nutrition-diet",
  },
  {
    name: "Adoption & Rescue",
    icon: "❤️",
    description: "Share adoption stories, rescue resources, and help find pets forever homes.",
    slug: "adoption-rescue",
  },
  {
    name: "Pet Care Tips",
    icon: "🐾",
    description: "Grooming, enrichment, toys, and everyday care advice from the community.",
    slug: "pet-care-tips",
  },
];

const iconMap = {
  "💬": "💬",
  "❤️": "❤️",
  "🏥": "🏥",
  "📚": "📚",
  "🎓": "🎓",
  "🐾": "🐾",
};

export default function CategoriesGrid({ isAdmin }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["forumCategories"],
    queryFn: () => api.entities.ForumCategory.list(),
  });

  const handleSeedCategories = async () => {
    setSeeding(true);
    setSeedError("");
    try {
      for (const cat of DEFAULT_CATEGORIES) {
        await api.entities.ForumCategory.create(cat);
      }
      await queryClient.invalidateQueries(["forumCategories"]);
    } catch (err) {
      console.error("Failed to seed categories:", err);
      setSeedError("Something went wrong. Please try again.");
    } finally {
      setSeeding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="mb-12">
        <h2 className="text-xl font-bold text-white mb-4 text-center">Forum Categories</h2>
        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-8 text-center">
          <FolderPlus className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 mb-2">No forum categories have been set up yet.</p>
          {isAdmin ? (
            <>
              <p className="text-slate-500 text-sm mb-5">
                As an admin, you can seed the default categories to get the forum started.
              </p>
              <Button
                onClick={handleSeedCategories}
                disabled={seeding}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {seeding ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Categories...</>
                ) : (
                  <><FolderPlus className="w-4 h-4 mr-2" /> Set Up Forum Categories</>
                )}
              </Button>
              {seedError && (
                <p className="text-red-400 text-sm mt-3">{seedError}</p>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-sm">Check back soon — categories are being set up!</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold text-white mb-4 text-center">Forum Categories</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card
            key={category.id}
            onClick={() => navigate(createPageUrl("ForumCategoryPage") + `?category=${category.id}`)}
            className="cursor-pointer border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:from-slate-800 hover:to-slate-800 transition-all p-6 text-center"
          >
            <div className="text-3xl mb-3">{iconMap[category.icon] || "🐾"}</div>
            <h3 className="font-semibold text-white mb-2">{category.name}</h3>
            <p className="text-xs text-slate-400 line-clamp-2">{category.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
