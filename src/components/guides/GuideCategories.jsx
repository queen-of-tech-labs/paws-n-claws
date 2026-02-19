import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader } from "lucide-react";

export default function GuideCategories({ categories, isLoading, selectedCategoryId }) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  const handleCategoryClick = (categoryId) => {
    navigate(createPageUrl(`PetCareGuideCategory?category=${categoryId}`));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((category) => (
        <Card
          key={category.id}
          onClick={() => handleCategoryClick(category.id)}
          className={`border-slate-700 transition-all cursor-pointer group ${
            selectedCategoryId === category.id
              ? "bg-blue-600/20 border-blue-500/50"
              : "bg-slate-800/50 hover:bg-slate-700/50 hover:border-blue-500/50"
          }`}
        >
          <CardHeader className="p-4">
            <CardTitle className={`text-sm font-semibold transition-colors ${
              selectedCategoryId === category.id
                ? "text-blue-400"
                : "text-white group-hover:text-blue-400"
            }`}>
              {category.name}
            </CardTitle>
          </CardHeader>
          {category.description && (
            <CardContent className="p-4 pt-0">
              <p className="text-slate-500 text-xs line-clamp-2">{category.description}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}