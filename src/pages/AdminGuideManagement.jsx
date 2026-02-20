import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { fbStorage } from '@/api/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  Loader,
  Plus,
  Edit,
  Trash2,
  Star,
  Upload,
} from "lucide-react";
import GuideForm from "@/components/guides/GuideForm";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

export default function AdminGuideManagement() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGuide, setEditingGuide] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch guides
  const { data: guides = [], isLoading: guidesLoading } = useQuery({
    queryKey: ["adminGuides"],
    queryFn: () => api.entities.PetCareGuide.list(),
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["guideCategories"],
    queryFn: () => api.entities.GuideCategory.list(),
  });

  // Create guide mutation
  const createGuideMutation = useMutation({
    mutationFn: (guideData) => api.entities.PetCareGuide.create(guideData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminGuides"] });
      setShowForm(false);
    },
  });

  // Update guide mutation
  const updateGuideMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.PetCareGuide.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminGuides"] });
      setEditingGuide(null);
      setShowForm(false);
    },
  });

  // Delete guide mutation
  const deleteGuideMutation = useMutation({
    mutationFn: (guideId) => api.entities.PetCareGuide.delete(guideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminGuides"] });
    },
  });

  // Toggle featured mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: ({ id, is_featured }) =>
      api.entities.PetCareGuide.update(id, { is_featured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminGuides"] });
    },
  });

  // Import guides from JSON
  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setImporting(true);
      try {
        const storageRef = ref(fbStorage, `guide-imports/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const file_url = await getDownloadURL(storageRef);
        const response = await api.functions.invoke('importPetGuides', { file_url });
        
        if (response.data.success) {
          alert(`✅ ${response.data.message}`);
          queryClient.invalidateQueries({ queryKey: ["adminGuides"] });
          queryClient.invalidateQueries({ queryKey: ["guideCategories"] });
        } else {
          alert('Import failed: ' + response.data.error);
        }
      } catch (error) {
        alert('Import failed: ' + error.message);
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  // Access check
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-4">
            Only administrators can access this page.
          </p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Back Home
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = (formData) => {
    if (editingGuide) {
      updateGuideMutation.mutate({ id: editingGuide.id, data: formData });
    } else {
      createGuideMutation.mutate(formData);
    }
  };

  const filteredGuides = guides.filter(
    (guide) =>
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (guidesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Manage Guides</h1>
          <p className="text-slate-400">Create, edit, and manage pet care guides</p>
        </div>

        {/* Action buttons */}
        {!showForm && (
          <div className="flex gap-3 mb-6">
            <Button
              onClick={() => {
                setEditingGuide(null);
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" /> Create New Guide
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {importing ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Import Guides
            </Button>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <Card className="border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 mb-8">
            <CardHeader>
              <CardTitle className="text-white">
                {editingGuide ? "Edit Guide" : "Create New Guide"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GuideForm
                guide={editingGuide}
                categories={categories}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingGuide(null);
                }}
                isLoading={
                  createGuideMutation.isPending ||
                  updateGuideMutation.isPending
                }
              />
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search guides by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-700/50 border-slate-600 text-white"
          />
        </div>

        {/* Guides List */}
        <div className="space-y-4">
          {filteredGuides.length > 0 ? (
            filteredGuides.map((guide) => (
              <Card
                key={guide.id}
                className="border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50"
              >
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-white">{guide.title}</CardTitle>
                      {guide.is_featured && (
                        <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-500/20 text-blue-400 capitalize">
                        {guide.pet_type}
                      </Badge>
                      <Badge variant="outline" className="border-slate-600 text-slate-400">
                        {categories.find((c) => c.id === guide.category_id)?.name ||
                          "Unknown"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        toggleFeaturedMutation.mutate({
                          id: guide.id,
                          is_featured: !guide.is_featured,
                        })
                      }
                      disabled={toggleFeaturedMutation.isPending}
                      className="border-yellow-600/30 text-yellow-400 hover:bg-yellow-600/20"
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingGuide(guide);
                        setShowForm(true);
                      }}
                      className="border-blue-600/30 text-blue-400 hover:bg-blue-600/20"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteGuideMutation.mutate(guide.id)}
                      disabled={deleteGuideMutation.isPending}
                      className="border-red-600/30 text-red-400 hover:bg-red-600/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-slate-400 text-sm line-clamp-2 prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{guide.overview || guide.content}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-slate-700 bg-slate-800/30">
              <CardContent className="pt-6 text-center">
                <p className="text-slate-400">
                  {guides.length === 0 ? "No guides created yet." : "No guides match your search."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}