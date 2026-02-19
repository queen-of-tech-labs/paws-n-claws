import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { Card } from "@/components/ui/card";
import { MessageCircle, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/index";
import { formatDistanceToNow } from "date-fns";

export default function RecentDiscussions() {
  const navigate = useNavigate();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["recentPosts"],
    queryFn: async () => {
      return await api.entities.ForumPost.list("-created_date", 10);
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">Loading discussions...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-8 text-center">
        <p className="text-slate-400">No discussions yet. Be the first to start one!</p>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold text-white mb-4 text-center">Recent Discussions</h2>

      <div className="space-y-3">
        {posts.map((post) => (
          <Card
            key={post.id}
            onClick={() => navigate(createPageUrl("ForumPost") + `?id=${post.id}`)}
            className="cursor-pointer border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors p-4 sm:p-5"
          >
            <div className="space-y-2">
              <h3 className="font-medium text-white text-sm md:text-base line-clamp-2">{post.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-2">{post.content}</p>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span>By {post.created_by || "Anonymous"}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}</span>
                <div className="flex gap-3 ml-auto">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {post.view_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> {post.reply_count || 0}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}