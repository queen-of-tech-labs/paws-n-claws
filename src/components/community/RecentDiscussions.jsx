import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { Card } from "@/components/ui/card";
import { MessageCircle, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/index";
import { formatDistanceToNow } from "date-fns";

function getDisplayAuthor(post) {
  // Use explicit author_name if set (used by seeded posts)
  if (post.author_name) return post.author_name;
  // Hide emails — show nothing if created_by looks like an email
  if (post.created_by && !post.created_by.includes("@")) return post.created_by;
  return null;
}

function getPostDate(post) {
  try {
    // Firestore Timestamp objects have a toDate() method
    if (post.created_date) return new Date(post.created_date);
    if (post.createdAt?.toDate) return post.createdAt.toDate();
    if (post.createdAt) return new Date(post.createdAt);
    return null;
  } catch {
    return null;
  }
}

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
        {posts.map((post) => {
          const author = getDisplayAuthor(post);
          const date = getPostDate(post);
          return (
            <Card
              key={post.id}
              onClick={() => navigate(createPageUrl("ForumPost") + `?id=${post.id}`)}
              className="cursor-pointer border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors p-4 sm:p-5"
            >
              <div className="space-y-2">
                <h3 className="font-medium text-white text-sm md:text-base line-clamp-2">{post.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{post.content}</p>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  {author && <span>By <span className="text-slate-400">{author}</span></span>}
                  {author && date && <span>•</span>}
                  {date && <span>{formatDistanceToNow(date, { addSuffix: true })}</span>}
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
          );
        })}
      </div>
    </div>
  );
}
