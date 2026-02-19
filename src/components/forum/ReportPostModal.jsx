import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader } from "lucide-react";

const reportReasons = [
  { value: "profanity", label: "Profanity or abusive language" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "medical_misinformation", label: "Medical misinformation/dangerous advice" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

export default function ReportPostModal({ isOpen, onClose, postId, replyId, onSubmit, isLoading }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!reason) {
      setError("Please select a reason");
      return;
    }
    onSubmit({ reason, description, post_id: postId, reply_id: replyId });
    setReason("");
    setDescription("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-slate-700 bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-white">Report {replyId ? "Reply" : "Post"}</DialogTitle>
          <DialogDescription>
            Help us maintain a safe community by reporting problematic content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">
              Additional Details (optional)
            </label>
            <Textarea
              placeholder="Provide any additional context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 h-24"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Reporting...
                </>
              ) : (
                "Report"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}