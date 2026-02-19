import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { createPageUrl } from "@/utils/index";
import GuideSearch from "@/components/guides/GuideSearch";
import PetTypeFilter from "@/components/guides/PetTypeFilter";
import FeaturedGuides from "@/components/guides/FeaturedGuides";
import GuideCategories from "@/components/guides/GuideCategories";
import GuideList from "@/components/guides/GuideList";
import PremiumFeatureLocked from "@/components/shared/PremiumFeatureLocked";

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
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      const userData = await api.auth.me();
      setUser(userData);
      setIsPremium(userData?.premium_subscriber === true);
      setLoading(false);
    };
    checkUser();
  }, []);

  useEffect(() => {
    const categoryFromUrl = searchParams.get("category");
    if (categoryFromUrl) {
      setSelectedCategoryId(categoryFromUrl);
    }
  }, [searchParams]);

  // Fetch guides
  const { data: guides = [], isLoading: guidesLoading } = useQuery({
    queryKey: ["petCareGuides"],
    queryFn: () => api.entities.PetCareGuide.list("-created_date", 100),
  });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["guideCategories"],
    queryFn: () => api.entities.GuideCategory.list(),
  });

  // Create category map for lookup
  const categoryMap = Object.fromEntries(
    categories.map((cat) => [cat.id, cat.name])
  );

  // Filter guides
  const filteredGuides = guides.filter((guide) => {
    const matchesPetType = selectedPetType === "all" || guide.pet_type === selectedPetType;
    const matchesCategory = !selectedCategoryId || guide.category_id === selectedCategoryId;
    const categoryName = categoryMap[guide.category_id] || "";
    const matchesSearch = guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPetType && matchesCategory && matchesSearch;
  });

  // Featured guides
  const featuredGuides = guides.filter((guide) => guide.is_featured).slice(0, 3);

  if (loading) return null;

  const isAdmin = user?.role === 'admin';
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
        <PetTypeFilter selectedPetType={selectedPetType} onPetTypeChange={setSelectedPetType} />

        {/* Featured Guides */}
        {!guidesLoading && featuredGuides.length > 0 && (
          <FeaturedGuides guides={featuredGuides} />
        )}

        {/* Categories Grid */}
        <div>
          <GuideCategories 
            categories={categories} 
            isLoading={categoriesLoading}
            selectedCategoryId={selectedCategoryId}
          />
        </div>
      </div>
    </div>
  );
}