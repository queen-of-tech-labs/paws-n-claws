import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { createPageUrl } from "@/utils/index";
import ForumPostForm from "@/components/forum/ForumPostForm";
import { AlertCircle } from "lucide-react";

export default function ForumCreatePost() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Fetch current user
  useEffect(() => {
    api.auth
      .me()
      .then((userData) => {
        if (!userData) {
          setAccessDenied(true);
          return;
        }
        // Check if user has premium access (not admin-only check, assumes premium users exist)
        setUser(userData);
      })
      .catch(() => {
        setAccessDenied(true);
      });
  }, []);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["forumCategories"],
    queryFn: () => api.entities.ForumCategory.list(),
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      const forumPost = await api.entities.ForumPost.create({
        user_id: user.id,
        category_id: postData.category_id,
        pet_id: postData.pet_id,
        title: postData.title,
        content: postData.content,
      });
      return forumPost;
    },
    onSuccess: () => {
      navigate(createPageUrl("PetCommunity"));
    },
  });

  const handleSubmit = (formData) => {
    createPostMutation.mutate(formData);
  };

  // Access denied
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="max-w-md w-full rounded-xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">
            You must be logged in to create forum posts.
          </p>
          <button
            onClick={() => navigate('/login'))}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(createPageUrl("PetCommunity"))}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium mb-4"
          >
            ← Back to Categories
          </button>
          <h1 className="text-3xl font-bold text-white">Create Forum Post</h1>
          <p className="text-slate-400 mt-2">
            Share your thoughts and connect with the pet community
          </p>
        </div>

        {/* Form */}
        {user && (
          <ForumPostForm
            categories={categories}
            onSubmit={handleSubmit}
            isLoading={createPostMutation.isPending}
            onCancel={() => navigate(createPageUrl("PetCommunity"))}
            userEmail={user.email}
          />
        )}

        {/* Error Message */}
        {createPostMutation.isError && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-400">Error Creating Post</h3>
              <p className="text-sm text-red-300 mt-1">
                {createPostMutation.error?.message || "Something went wrong. Please try again."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}