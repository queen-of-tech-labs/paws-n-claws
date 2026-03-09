import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { createPageUrl } from "@/utils/index";
import GuideSearch from "@/components/guides/GuideSearch";
import FeaturedGuides from "@/components/guides/FeaturedGuides";
import GuideCategories from "@/components/guides/GuideCategories";
import GuideList from "@/components/guides/GuideList";
import PremiumFeatureLocked from "@/components/shared/PremiumFeatureLocked";

const PET_TYPES = ["all", "dog", "cat", "bird", "rabbit", "hamster", "fish", "reptile", "general"];

export default function PetCareGuidesPage() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPetType, setSelectedPetType] = useState("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState(searchParams.get("category") || null);
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const isAuthenticated = await api.auth.isAuthenticated();
      if (!isAuthenticated) { window.location.href = createPageUrl("Login"); return; }
      const userData = await api.auth.me();
      setUser(userData);
      setIsPremium(userData?.premium_subscriber === true);
      setLoading(false);
    };
    checkUser();
  }, []);

  useEffect(() => {
    const categoryFromUrl = searchParams.get("category");
    if (categoryFromUrl) setSelectedCategoryId(categoryFromUrl);
  }, [searchParams]);

  // Fetch guides
  const { data: guides = [], isLoading: guidesLoading } = useQuery({
    queryKey: ["petCareGuides"],
    queryFn: () => api.entities.PetCareGuide.list("-createdAt", 100),
    enabled: !loading,
  });

  // Fetch categories — correct entity name
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["guideCategories"],
    queryFn: () => api.entities.PetCareCategory.list(),
    enabled: !loading,
  });

  // Category map for lookup
  const categoryMap = Object.fromEntries(categories.map((cat) => [cat.id, cat.name]));

  // Filter guides — handle both pet_types (array) and legacy pet_type (string)
  const filteredGuides = guides.filter((guide) => {
    const petTypes = guide.pet_types || (guide.pet_type ? [guide.pet_type] : ["general"]);
    const matchesPetType = selectedPetType === "all" || petTypes.includes(selectedPetType);
    const matchesCategory = !selectedCategoryId || guide.category_id === selectedCategoryId;
    const categoryName = categoryMap[guide.category_id] || "";
    const searchText = (guide.title + " " + (guide.overview || "") + " " + categoryName).toLowerCase();
    const matchesSearch = !searchQuery || searchText.includes(searchQuery.toLowerCase());
    return matchesPetType && matchesCategory && matchesSearch;
  });

  const featuredGuides = guides.filter((g) => g.is_featured).slice(0, 3);

  if (loading) return null;

  const isAdmin = user?.role === "admin";
  if (!isPremium && !isAdmin) {
    return (
      <PremiumFeatureLocked
        featureName="Pet Care Guides"
        onUpgrade={() => window.location.href = createPageUrl("Account")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Pet Care Guides</h1>
          <p className="text-slate-400">Learn everything you need to know about caring for your pet</p>
        </div>

        {/* Search */}
        <GuideSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* Pet Type Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PET_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedPetType(type)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                selectedPetType === type
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
              }`}
            >
              {type === "all" ? "All Pets" : type}
            </button>
          ))}
        </div>

        {/* Featured Guides */}
        {!guidesLoading && featuredGuides.length > 0 && !selectedCategoryId && !searchQuery && (
          <FeaturedGuides guides={featuredGuides} />
        )}

        {/* Category Filter active — show guides for that category */}
        {selectedCategoryId ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                {categoryMap[selectedCategoryId] || "Category"}
              </h2>
              <button
                onClick={() => setSelectedCategoryId(null)}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                ← All Categories
              </button>
            </div>
            <GuideList guides={filteredGuides} isLoading={guidesLoading} />
          </div>
        ) : searchQuery ? (
          // Search results
          <div>
            <h2 className="text-lg font-semibold text-slate-300 mb-4">
              {filteredGuides.length} result{filteredGuides.length !== 1 ? "s" : ""} for "{searchQuery}"
            </h2>
            <GuideList guides={filteredGuides} isLoading={guidesLoading} />
          </div>
        ) : (
          // Default: show categories grid
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Browse by Category</h2>
            <GuideCategories
              categories={categories}
              isLoading={categoriesLoading}
              selectedCategoryId={selectedCategoryId}
              onCategoryClick={setSelectedCategoryId}
            />
            {/* Show all guides below categories */}
            {!guidesLoading && guides.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-bold text-white mb-4">All Guides</h2>
                <GuideList guides={filteredGuides} isLoading={guidesLoading} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
