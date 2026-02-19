import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Edit2, Check, X, Flag } from "lucide-react";
import ReplyForm from "./ReplyForm";

export default function ReplyItem({ reply, currentUserId, userRole, onUpdate, onDelete, onReport, isUpdating, isDeleting }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const isOwnReply = reply.created_by === currentUserId;
  const canDelete = isOwnReply || userRole === "admin" || userRole === "moderator";
  const createdTime = formatDistanceToNow(new Date(reply.created_date), { addSuffix: true });

  const handleUpdateSubmit = (content) => {
    onUpdate(reply.id, content);
    setIsEditMode(false);
  };

  if (isEditMode) {
    return (
      <ReplyForm
        initialContent={reply.content}
        onSubmit={handleUpdateSubmit}
        isLoading={isUpdating}
        onCancel={() => setIsEditMode(false)}
        submitLabel="Save Reply"
      />
    );
  }

  return (
    <Card className="border-slate-700 bg-gradient-to-br from-slate-800/30 to-slate-900/30">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400">{createdTime}</p>
            </div>
            <div className="flex gap-2">
              {currentUserId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReport(reply.id)}
                  className="h-8 w-8 p-0 border-slate-600 text-slate-400 hover:text-yellow-400"
                >
                  <Flag className="w-4 h-4" />
                </Button>
              )}
              {isOwnReply && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditMode(true)}
                  disabled={isUpdating || isDeleting}
                  className="h-8 w-8 p-0 border-slate-600 text-slate-400 hover:text-slate-200"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(reply.id)}
                  disabled={isUpdating || isDeleting}
                  className="h-8 w-8 p-0 border-red-600/30 text-red-400 hover:bg-red-600/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <p className="text-slate-200 leading-relaxed">{reply.content}</p>
        </div>
      </CardContent>
    </Card>
  );
}