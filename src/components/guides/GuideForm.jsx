import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Upload, X, Save } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import api from '@/api/firebaseClient';

const petTypes = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "bird", label: "Bird" },
  { value: "rabbit", label: "Rabbit" },
  { value: "hamster", label: "Hamster" },
  { value: "fish", label: "Fish" },
  { value: "reptile", label: "Reptile" },
  { value: "general", label: "General" },
];

const formatTime = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return "just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};

export default function GuideForm({
  guide,
  categories,
  onSubmit,
  onCancel,
  isLoading,
}) {
  const [formData, setFormData] = useState(() => {
    if (guide) {
      // Migrate old pet_type field to new pet_types array
      return {
        ...guide,
        pet_types: guide.pet_types || (guide.pet_type ? [guide.pet_type] : ["general"])
      };
    }
    return {
      title: "",
      overview: "",
      content: "",
      pet_types: ["general"],
      category_id: "",
      image_url: "",
      is_featured: false,
    };
  });
  const [errors, setErrors] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const draftKey = `guide_draft_${guide?.id || "new"}`;

  // Auto-save draft to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(formData));
      setLastSaved(new Date());
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData, draftKey]);

  // Load draft on mount
  useEffect(() => {
    if (!guide) {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setFormData(JSON.parse(savedDraft));
      }
    }
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.content.trim()) newErrors.content = "Content is required";
    if (!formData.category_id) newErrors.category_id = "Category is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrors({ ...errors, image: "Only JPG and PNG files are allowed" });
      return;
    }

    setUploadingImage(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
      setErrors({ ...errors, image: "" });
    } catch (err) {
      setErrors({ ...errors, image: "Failed to upload image" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      // Clear draft after successful save
      localStorage.removeItem(draftKey);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Title *
        </label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Guide title"
          className="bg-slate-700/50 border-slate-600 text-white"
        />
        {errors.title && (
          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.title}
          </p>
        )}
      </div>

      {/* Overview */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Overview
        </label>
        <Textarea
          value={formData.overview}
          onChange={(e) =>
            setFormData({
              ...formData,
              overview: e.target.value.slice(0, 500),
            })
          }
          placeholder="Brief description of the guide (max 500 characters)"
          className="bg-slate-700/50 border-slate-600 text-white h-20"
        />
        <p className="text-xs text-slate-500 mt-1">
          {formData.overview.length}/500
        </p>
      </div>

      {/* Guide Image */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Guide Image
        </label>
        <div className="space-y-2">
          {formData.image_url ? (
            <div className="relative w-full h-40 rounded-lg overflow-hidden border border-slate-600">
              <img
                src={formData.image_url}
                alt="Guide cover"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, image_url: "" })}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-1 rounded"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-lg hover:border-slate-500 cursor-pointer transition-colors bg-slate-700/20">
              <div className="text-center">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  {uploadingImage ? "Uploading..." : "Click to upload (JPG, PNG)"}
                </p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>
          )}
          {errors.image && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.image}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-300">
            Content *
          </label>
          {lastSaved && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Save className="w-3 h-3" />
              Draft saved {formatTime(lastSaved)}
            </div>
          )}
        </div>
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg overflow-hidden [&_.ql-editor_p]:mb-4">
          <ReactQuill
            value={formData.content}
            onChange={(value) => setFormData({ ...formData, content: value })}
            theme="snow"
            placeholder="Write your guide content here..."
            preserveWhitespace
            modules={{
              toolbar: [
                [{ header: [1, 2, 3, false] }],
                ["bold", "italic", "underline"],
                ["blockquote", "code-block"],
                [{ list: "ordered" }, { list: "bullet" }],
                ["link"],
              ],
              clipboard: {
                matchVisual: false,
                matchers: [
                  ['BR', () => ({ ops: [{ insert: '\n\n' }] })],
                ],
              },
            }}
            formats={[
              'header', 'bold', 'italic', 'underline',
              'blockquote', 'code-block', 'list', 'bullet',
              'link'
            ]}
            className="bg-slate-700/50 text-white [&_.ql-container]:border-0 [&_.ql-editor]:text-white [&_.ql-toolbar]:border-b-slate-600 [&_.ql-editor]:min-h-[300px]"
          />
        </div>
        {errors.content && (
          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.content}
          </p>
        )}
      </div>

      {/* Pet Types and Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Pet Types (select all that apply)
          </label>
          <div className="space-y-2 bg-slate-700/50 border border-slate-600 rounded-lg p-3 max-h-48 overflow-y-auto">
            {petTypes.map((type) => (
              <div key={type.value} className="flex items-center gap-2">
                <Checkbox
                  id={`pet-${type.value}`}
                  checked={(formData.pet_types || []).includes(type.value)}
                  onCheckedChange={(checked) => {
                    const currentTypes = formData.pet_types || ["general"];
                    const newTypes = checked
                      ? [...currentTypes, type.value]
                      : currentTypes.filter((t) => t !== type.value);
                    setFormData({ ...formData, pet_types: newTypes.length > 0 ? newTypes : ["general"] });
                  }}
                  className="border-slate-500"
                />
                <label
                  htmlFor={`pet-${type.value}`}
                  className="text-sm text-slate-300 cursor-pointer"
                >
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Category *
          </label>
          <Select
            value={formData.category_id}
            onValueChange={(value) =>
              setFormData({ ...formData, category_id: value })
            }
          >
            <SelectTrigger className="bg-slate-700/50 border-slate-600">
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
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.category_id}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="border-slate-600"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? "Saving..." : guide ? "Update Guide" : "Create Guide"}
        </Button>
      </div>
    </form>
  );
}