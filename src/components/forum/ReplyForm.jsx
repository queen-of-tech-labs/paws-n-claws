import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader } from "lucide-react";

export default function ReplyForm({ initialContent = "", onSubmit, isLoading, onCancel, submitLabel = "Post Reply" }) {
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState("");

  const validateForm = () => {
    if (!content.trim()) {
      setError("Reply cannot be empty");
      return false;
    }
    if (content.trim().length < 3) {
      setError("Reply must be at least 3 characters");
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(content);
      setContent("");
      setError("");
    }
  };

  return (
    <Card className="border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Textarea
              placeholder="Share your reply..."
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setError("");
              }}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 min-h-32"
            />
            {error && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}