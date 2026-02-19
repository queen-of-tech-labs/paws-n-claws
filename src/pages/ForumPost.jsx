import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { createPageUrl } from "@/utils/index";
import { useEffect as useLayoutEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Loader, Flag, Eye, MessageCircle, Edit2, X, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReplyForm from "@/components/forum/ReplyForm";
import ReplyItem from "@/components/forum/ReplyItem";
import ReportPostModal from "@/components/forum/ReportPostModal";

export default function ForumPost() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const postId = searchParams.get("id");
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch post
  const { data: post, isLoading: postLoading, error: postError } = useQuery({
    queryKey: ["forumPost", postId],
    queryFn: () => postId ? api.entities.ForumPost.filter({ id: postId }) : Promise.resolve([]),
    enabled: !!postId,
    select: (data) => data[0] || null,
  });

  // Fetch pet if post has pet_id
  const { data: pet } = useQuery({
    queryKey: ["pet", post?.pet_id],
    queryFn: () => api.entities.Pet.get(post.pet_id),
    enabled: !!post?.pet_id,
  });

  // Fetch post creator
  const { data: postCreator } = useQuery({
    queryKey: ["postCreator", post?.user_id],
    queryFn: () => api.entities.User.get(post.user_id),
    enabled: !!post?.user_id,
  });

  // Update post mutation
  const updatePostMutation = useMutation({
    mutationFn: ({ title, content }) =>
      api.entities.ForumPost.update(postId, { title, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forumPost", postId] });
      setEditMode(false);
    },
  });

  // Fetch replies
  const { data: replies = [], isLoading: repliesLoading } = useQuery({
    queryKey: ["forumReplies", postId],
    queryFn: () => postId ? api.entities.ForumReply.filter({ post_id: postId }, "-created_date") : [],
    enabled: !!postId,
  });

  // Create reply mutation
  const createReplyMutation = useMutation({
    mutationFn: (content) =>
      api.entities.ForumReply.create({
        post_id: postId,
        user_id: user.id,
        content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forumReplies", postId] });
    },
  });

  // Update reply mutation
  const updateReplyMutation = useMutation({
    mutationFn: ({ replyId, content }) =>
      api.entities.ForumReply.update(replyId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forumReplies", postId] });
    },
  });

  // Delete reply mutation
  const deleteReplyMutation = useMutation({
    mutationFn: (replyId) => api.entities.ForumReply.delete(replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forumReplies", postId] });
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: () => api.entities.ForumPost.delete(postId),
    onSuccess: () => {
      navigate(createPageUrl("PetCommunity"));
    },
  });

  // Report post mutation
  const reportPostMutation = useMutation({
    mutationFn: (reportData) =>
      api.entities.ForumReport.create({
        ...reportData,
        reported_by: user.email,
      }),
    onSuccess: () => {
      setReportModalOpen(false);
    },
  });

  const canDeletePost = user && (user.role === "admin" || user.role === "moderator" || user.id === post?.user_id);
  const canEditPost = user && (user.role === "admin" || user.role === "moderator" || user.id === post?.user_id);
  const canDeleteReply = (reply, userId) => userId && (user.role === "admin" || user.role === "moderator" || userId === reply.created_by);

  const handleEditPost = () => {
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditMode(true);
  };

  const handleSavePost = () => {
    if (!editTitle.trim() || !editContent.trim()) {
      alert("Title and content cannot be empty");
      return;
    }
    updatePostMutation.mutate({ title: editTitle, content: editContent });
  };

  if (!postId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Post Not Found</h1>
          <Button onClick={() => navigate(createPageUrl("PetCommunity"))} className="mt-4">
            Back to Forum
          </Button>
        </div>
      </div>
    );
  }

  if (postLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Post Not Found</h1>
          <Button onClick={() => navigate(createPageUrl("PetCommunity"))} className="mt-4">
            Back to Forum
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(createPageUrl("PetCommunity"))}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Forum
        </button>

        {/* Post */}
        <Card className="border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 mb-8">
          <CardHeader>
            <div className="flex-1">
              {pet && (
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-700">
                  {pet.photo_url && (
                    <img
                      src={pet.photo_url}
                      alt={pet.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-slate-400">About <span className="text-slate-300 font-medium">{pet.name}</span></p>
                    <p className="text-xs text-slate-500 capitalize">{pet.species}</p>
                  </div>
                </div>
              )}
              {editMode ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded text-white px-3 py-2 text-2xl font-bold"
                  />
                </div>
              ) : (
                <>
                  <CardTitle className="text-white text-2xl mb-2">{post.title}</CardTitle>
                  {postCreator && (
                    <p className="text-sm text-slate-400">
                      By <span className="font-medium text-slate-300">
                        {postCreator.username || postCreator.full_name}
                      </span>
                    </p>
                  )}
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded text-white px-3 py-2 h-32 font-mono text-sm"
              />
            ) : (
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>
            )}
            <div className="flex gap-2 mt-6 pt-4 border-t border-slate-700">
              {editMode ? (
                <>
                  <Button
                    size="sm"
                    onClick={handleSavePost}
                    disabled={updatePostMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {updatePostMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditMode(false)}
                    className="border-slate-600"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  {user && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReportModalOpen(true)}
                      className="border-slate-600 text-slate-400 hover:text-yellow-400"
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Report
                    </Button>
                  )}
                  {canEditPost && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEditPost}
                      className="border-blue-600 text-blue-400 hover:bg-blue-600/20"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {canDeletePost && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deletePostMutation.mutate()}
                      disabled={deletePostMutation.isPending}
                      className="border-red-600/30 text-red-400 hover:bg-red-600/20"
                    >
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
          </Card>

        {/* Veterinary Advice Disclaimer */}
        {post.category_id && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-300 mb-1">Medical Advice Disclaimer</p>
                <p className="text-xs text-blue-200/80">
                  This community forum is not a substitute for professional veterinary advice. 
                  Always consult with a licensed veterinarian for medical concerns about your pet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Report Modal */}
        <ReportPostModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          postId={postId}
          onSubmit={(data) => reportPostMutation.mutate(data)}
          isLoading={reportPostMutation.isPending}
        />

        {/* Replies Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              Replies ({replies.length})
            </h2>

            {/* Reply Form */}
            {user && (
              <div className="mb-8">
                <ReplyForm
                  onSubmit={(content) => createReplyMutation.mutate(content)}
                  isLoading={createReplyMutation.isPending}
                  submitLabel="Post Reply"
                />
                {createReplyMutation.isError && (
                  <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-300 text-sm">Failed to post reply. Please try again.</p>
                  </div>
                )}
              </div>
            )}

            {!user && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 mb-8 text-center">
                <p className="text-blue-300 text-sm mb-3">Log in to reply to this post</p>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
                >
                  Log In
                </button>
              </div>
            )}

            {/* Replies List */}
            {repliesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
            ) : replies.length > 0 ? (
              <div className="space-y-4">
                {replies.map((reply) => (
                  <ReplyItem
                    key={reply.id}
                    reply={reply}
                    currentUserId={user?.id}
                    userRole={user?.role}
                    onUpdate={(replyId, content) =>
                      updateReplyMutation.mutate({ replyId, content })
                    }
                    onDelete={(replyId) => deleteReplyMutation.mutate(replyId)}
                    onReport={(replyId) => {
                      reportPostMutation.mutate({
                        reply_id: replyId,
                        reason: "medical_misinformation",
                      });
                    }}
                    isUpdating={updateReplyMutation.isPending}
                    isDeleting={deleteReplyMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-8 text-center">
                <p className="text-slate-400">No replies yet. Be the first to reply!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}