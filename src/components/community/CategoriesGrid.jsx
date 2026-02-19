import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/index";

const iconMap = {
  "💬": "💬",
  "❤️": "❤️",
  "🏥": "🏥",
  "📚": "📚",
  "🎓": "🎓",
  "🐾": "🐾",
};

export default function CategoriesGrid() {
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["forumCategories"],
    queryFn: () => api.entities.ForumCategory.list(),
  });

  if (isLoading) {
    return null;
  }

  if (categories.length === 0) {
    return null;
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