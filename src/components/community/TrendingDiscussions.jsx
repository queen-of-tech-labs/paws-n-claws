import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { TrendingUp, MessageCircle, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/index";
import { formatDistanceToNow } from "date-fns";

export default function TrendingDiscussions() {
  const navigate = useNavigate();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["trendingPosts"],
    queryFn: async () => {
      const allPosts = await api.entities.ForumPost.list("-view_count", 10);
      return allPosts.slice(0, 5);
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["forumCategories"],
    queryFn: () => api.entities.ForumCategory.list(),
  });

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "";
  };

  if (isLoading) {
    return null;
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <div className="flex items-center justify-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-orange-400" />
        <h2 className="text-xl font-bold text-white">Trending Now</h2>
      </div>

      <div className="space-y-3">
        {posts.map((post) => (
          <Card
            key={post.id}
            onClick={() => navigate(createPageUrl("ForumPost") + `?id=${post.id}`)}
            className="cursor-pointer border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors p-4"
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="font-medium text-white text-sm md:text-base line-clamp-1">{post.title}</h3>
                <div className="flex gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {post.view_count || 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {post.reply_count || 0}
                  </div>
                </div>
              </div>
              {post.category_id && (
                <p className="text-xs text-slate-500">{getCategoryName(post.category_id)}</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}