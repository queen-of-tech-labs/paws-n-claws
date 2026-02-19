import React, { useState } from "react";
import api from '@/api/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

export default function Feedback() {
  const [formData, setFormData] = useState({
    type: "bug",
    title: "",
    description: "",
    priority: "medium"
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        browser_info: typeof navigator !== 'undefined' 
          ? `${navigator.userAgent.substring(0, 100)}`
          : "Unknown"
      };
      
      await api.entities.Feedback.create(data);
      setSubmitted(true);
      setFormData({ type: "bug", title: "", description: "", priority: "medium" });
      
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Send Feedback</h1>
          <p className="text-slate-600">Help us improve by reporting bugs or suggesting features</p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500">
            <CardTitle className="text-white">Feedback Form</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Thank you!</h2>
                <p className="text-slate-600">Your feedback has been received and will help us improve Paws & Claws.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Feedback Type *
                  </label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">🐛 Bug Report</SelectItem>
                      <SelectItem value="feature_request">💡 Feature Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Title *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief summary of your feedback"
                    className="w-full"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description *
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={formData.type === "bug" 
                      ? "Describe the issue, steps to reproduce, and what you expected to happen..."
                      : "Describe the feature you'd like to see and how it would help you..."}
                    className="w-full h-32"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Priority
                  </label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Feedback
                    </>
                  )}
                </Button>

                <p className="text-xs text-slate-500 text-center">
                  Your feedback is valuable to us. We review all submissions and use them to improve the app.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}