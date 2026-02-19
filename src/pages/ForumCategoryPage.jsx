import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { createPageUrl } from "@/utils/index";
import PostListItem from "@/components/forum/PostListItem";

const iconMap = {
  "💬": "💬",
  "❤️": "❤️",
  "🏥": "🏥",
  "📚": "📚",
  "🎓": "🎓",
  "🐾": "🐾",
};

export default function ForumCategoryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryId = searchParams.get("category");

  // Fetch category details
  const { data: categories = [] } = useQuery({
    queryKey: ["forumCategories"],
    queryFn: () => api.entities.ForumCategory.list(),
  });

  const category = categories.find((cat) => cat.id === categoryId);

  // Fetch posts for this category
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["forumPosts", categoryId],
    queryFn: () =>
      api.entities.ForumPost.filter(
        { category_id: categoryId },
        "-created_date",
        100
      ),
    enabled: !!categoryId,
  });

  // Fetch all pets for display
  const { data: pets = [] } = useQuery({
    queryKey: ["pets"],
    queryFn: () => api.entities.Pet.list(),
  });

  // Create pet map for lookup
  const petMap = Object.fromEntries(pets.map((pet) => [pet.id, pet]));

  if (!categoryId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No category selected</p>
          <Button onClick={() => navigate(createPageUrl("PetCommunity"))}>
            Back to Community
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("PetCommunity"))}
            className="text-slate-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Community
          </Button>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  {category?.icon && (
                    <span className="text-3xl flex-shrink-0">{iconMap[category.icon] || "🐾"}</span>
                  )}
                  <h1 className="text-2xl sm:text-3xl font-bold text-white break-words">
                    {category?.name || "Category"}
                  </h1>
                </div>
                {category?.description && (
                  <p className="text-slate-400 break-words">{category.description}</p>
                )}
              </div>
              <Button
                onClick={() =>
                  navigate(
                    createPageUrl("ForumCreatePost") +
                      `?category=${categoryId}`
                  )
                }
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex-shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
            </div>
          </div>
        </div>

        {/* Posts List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-12 border border-slate-700/50 text-center">
            <p className="text-slate-400 mb-4">
              No posts in this category yet
            </p>
            <Button
              onClick={() =>
                navigate(
                  createPageUrl("ForumCreatePost") + `?category=${categoryId}`
                )
              }
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Post
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostListItem
                key={post.id}
                post={post}
                pet={petMap[post.pet_id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}