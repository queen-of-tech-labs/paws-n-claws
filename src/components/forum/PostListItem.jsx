import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils/index";
import api from '@/api/firebaseClient';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Eye } from "lucide-react";

export default function PostListItem({ post, pet }) {
  const [creator, setCreator] = useState(null);

  useEffect(() => {
    if (post?.user_id) {
      api.entities.User.get(post.user_id)
        .then(setCreator)
        .catch(() => {});
    }
  }, [post?.user_id]);
  return (
    <Link to={createPageUrl(`ForumPost?id=${post.id}`)}>
      <Card className="border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {pet?.photo_url && (
              <div className="flex-shrink-0">
                <img
                  src={pet.photo_url}
                  alt={pet.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium break-words line-clamp-2">{post.title}</h3>
                  {(pet || creator) && (
                    <p className="text-sm text-slate-400 mt-1 break-words">
                      {pet && (
                        <>
                          About{" "}
                          <span className="font-medium text-slate-300">
                            {pet.name}
                          </span>
                          {" · "}
                          <Badge variant="outline" className="inline-flex ml-1 text-xs">
                            {pet.species}
                          </Badge>
                          {creator && " · "}
                        </>
                      )}
                      {creator && (
                        <>
                          By <span className="font-medium text-slate-300">{creator.username || creator.full_name}</span>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                <span className="truncate">{formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}</span>
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{post.view_count || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  <span>{post.reply_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}