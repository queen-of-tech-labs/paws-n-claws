import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader } from "lucide-react";
import api from '@/api/firebaseClient';
import { useQuery } from "@tanstack/react-query";

export default function ForumPostForm({ categories, onSubmit, isLoading, onCancel, userEmail }) {
  const [formData, setFormData] = useState({
    category_id: "",
    pet_id: "",
    title: "",
    content: "",
  });
  const [errors, setErrors] = useState({});

  // Fetch user's pets
  const { data: pets = [] } = useQuery({
    queryKey: ["userPets", userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const allPets = await api.entities.Pet.list();
      return allPets.filter(pet => pet.created_by === userEmail);
    },
    enabled: !!userEmail,
  });

  const validateForm = () => {
    const newErrors = {};

    if (!formData.category_id) {
      newErrors.category_id = "Please select a category";
    }
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.trim().length < 5) {
      newErrors.title = "Title must be at least 5 characters";
    } else if (formData.title.trim().length > 200) {
      newErrors.title = "Title must be less than 200 characters";
    }
    if (!formData.content.trim()) {
      newErrors.content = "Content is required";
    } else if (formData.content.trim().length < 10) {
      newErrors.content = "Content must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const submitData = { ...formData };
      if (!submitData.pet_id) delete submitData.pet_id;
      onSubmit(submitData);
    }
  };

  const getCategoryName = (categoryId) => {
    return categories.find((cat) => cat.id === categoryId)?.name || "";
  };

  return (
    <Card className="border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
      <CardHeader>
        <CardTitle className="text-white">Create a New Post</CardTitle>
        <CardDescription>Share your thoughts with the community</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Category</label>
            <Select value={formData.category_id} onValueChange={(value) => {
              setFormData({ ...formData, category_id: value });
              if (errors.category_id) setErrors({ ...errors, category_id: "" });
            }}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {errors.category_id}
              </div>
            )}
            </div>

            {/* Pet Selection */}
            <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Tag your pet (optional)</label>
            <Select value={formData.pet_id} onValueChange={(value) => setFormData({...formData, pet_id: value})}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select a pet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name} ({pet.species})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            {/* Title */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Title</label>
            <Input
              type="text"
              placeholder="What's your post about?"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (errors.title) setErrors({ ...errors, title: "" });
              }}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-500"
              maxLength={200}
            />
            <div className="flex justify-between mt-2">
              <div>
                {errors.title && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.title}
                  </div>
                )}
              </div>
              <span className="text-xs text-slate-500">{formData.title.length}/200</span>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Content</label>
            <Textarea
              placeholder="Share your thoughts, questions, or advice..."
              value={formData.content}
              onChange={(e) => {
                setFormData({ ...formData, content: e.target.value });
                if (errors.content) setErrors({ ...errors, content: "" });
              }}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 min-h-40"
            />
            {errors.content && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {errors.content}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
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
                "Create Post"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}