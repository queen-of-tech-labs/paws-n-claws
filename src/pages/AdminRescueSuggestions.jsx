import React, { useState } from "react";
import api from '@/api/firebaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, XCircle, Clock, MapPin, Globe,
  AlertCircle, Loader2, User, Trash2, Edit2
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function AdminRescueSuggestions() {
  const [user, setUser] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const queryClient = useQueryClient();

  React.useEffect(() => {
    api.auth.me().then(setUser);
  }, []);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["rescueSuggestions"],
    queryFn: () => api.entities.RescueSuggestion.list("-created_date"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.RescueSuggestion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["rescueSuggestions"]);
      setRejectingId(null);
      setRejectReason("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.RescueSuggestion.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["rescueSuggestions"]);
    },
  });

  const handleApprove = async (suggestion) => {
    await updateMutation.mutateAsync({
      id: suggestion.id,
      data: {
        status: "approved",
        reviewed_by: user?.email,
        reviewed_date: new Date().toISOString(),
      },
    });
  };

  const handleReject = async (suggestion) => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    await updateMutation.mutateAsync({
      id: suggestion.id,
      data: {
        status: "rejected",
        rejection_reason: rejectReason,
        reviewed_by: user?.email,
        reviewed_date: new Date().toISOString(),
      },
    });
  };

  const handleDelete = async (suggestion) => {
    if (window.confirm(`Are you sure you want to delete "${suggestion.name}"?`)) {
      await deleteMutation.mutateAsync(suggestion.id);
    }
  };

  const handleEdit = (suggestion) => {
    setEditingId(suggestion.id);
    setEditData({
      name: suggestion.name,
      address: suggestion.address,
      description: suggestion.description,
      website: suggestion.website || "",
      donation_link: suggestion.donation_link || "",
      accepts_volunteers: suggestion.accepts_volunteers || false,
      accepts_donations: suggestion.accepts_donations || false,
      animals_served: suggestion.animals_served || [],
    });
  };

  const handleSaveEdit = async (suggestion) => {
    await updateMutation.mutateAsync({
      id: suggestion.id,
      data: editData,
    });
    setEditingId(null);
    setEditData({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const animalOptions = [
    { value: "dogs", label: "Dogs" },
    { value: "cats", label: "Cats" },
    { value: "birds", label: "Birds" },
    { value: "rabbits", label: "Rabbits" },
    { value: "horses", label: "Horses" },
    { value: "wildlife", label: "Wildlife" },
    { value: "farm_animals", label: "Farm Animals" },
    { value: "reptiles", label: "Reptiles" },
    { value: "other", label: "Other" }
  ];

  const toggleAnimal = (animal) => {
    setEditData(prev => ({
      ...prev,
      animals_served: prev.animals_served?.includes(animal)
        ? prev.animals_served.filter(a => a !== animal)
        : [...(prev.animals_served || []), animal]
    }));
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600">You need admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pending = suggestions.filter((s) => s.status === "pending");
  const approved = suggestions.filter((s) => s.status === "approved");
  const rejected = suggestions.filter((s) => s.status === "rejected");

  const renderSuggestion = (suggestion) => (
    <motion.div
      key={suggestion.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-slate-200">
        <CardContent className="p-5">
          {editingId === suggestion.id ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Name</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Address</label>
                <input
                  type="text"
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Description</label>
                <Textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="h-20"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Website</label>
                <input
                  type="text"
                  value={editData.website}
                  onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Donation Link</label>
                <input
                  type="text"
                  value={editData.donation_link}
                  onChange={(e) => setEditData({ ...editData, donation_link: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-2 block">Types of Animals Served</label>
                <div className="grid grid-cols-3 gap-2">
                  {animalOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 p-2 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={editData.animals_served?.includes(option.value)}
                        onCheckedChange={() => toggleAnimal(option.value)}
                      />
                      <span className="text-xs text-slate-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 block">Additional Information</label>
                <label className="flex items-center gap-2 p-2 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer">
                  <Checkbox
                    checked={editData.accepts_volunteers}
                    onCheckedChange={(checked) => setEditData({ ...editData, accepts_volunteers: checked })}
                  />
                  <span className="text-xs text-slate-700">Accepts Volunteers</span>
                </label>
                <label className="flex items-center gap-2 p-2 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer">
                  <Checkbox
                    checked={editData.accepts_donations}
                    onCheckedChange={(checked) => setEditData({ ...editData, accepts_donations: checked })}
                  />
                  <span className="text-xs text-slate-700">Accepts Donations</span>
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveEdit(suggestion)}
                  disabled={updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{suggestion.name}</h3>
                    <Badge
                      variant="secondary"
                      className={
                        suggestion.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : suggestion.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {suggestion.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {suggestion.address}
                  </p>
                  </div>
                  <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(suggestion)}
                  className="text-slate-600 hover:text-slate-900"
                  >
                  <Edit2 className="w-4 h-4" />
                  </Button>
                  </div>

                  <p className="text-sm text-slate-700 mb-3">{suggestion.description}</p>

                  {suggestion.animals_served && suggestion.animals_served.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                  {suggestion.animals_served.map((animal, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-green-50 text-green-700 text-xs">
                      {animal.replace('_', ' ')}
                    </Badge>
                  ))}
                  </div>
                  )}

                  <div className="flex flex-wrap gap-2 mb-3">
                  {suggestion.accepts_volunteers && (
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                    Volunteers Welcome
                  </Badge>
                  )}
                  {suggestion.accepts_donations && (
                  <Badge className="bg-pink-100 text-pink-700 border-0 text-xs">
                    Accepts Donations
                  </Badge>
                  )}
                  </div>

              {suggestion.website && (
                <a
                  href={
                    suggestion.website.startsWith("http")
                      ? suggestion.website
                      : `https://${suggestion.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-3"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {suggestion.website}
                </a>
              )}

          <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
            <User className="w-3 h-3" />
            Submitted by {suggestion.created_by} on{" "}
            {format(new Date(suggestion.created_date), "MMM d, yyyy")}
          </div>

          {suggestion.reviewed_by && (
            <div className="text-xs text-slate-500 mb-3 border-t pt-2">
              Reviewed by {suggestion.reviewed_by} on{" "}
              {format(new Date(suggestion.reviewed_date), "MMM d, yyyy")}
            </div>
          )}

          {suggestion.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-xs font-medium text-red-800 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-700">{suggestion.rejection_reason}</p>
            </div>
          )}

          {suggestion.status === "pending" && (
            <div className="flex gap-2 pt-3 border-t">
              {rejectingId === suggestion.id ? (
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Enter reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="h-20"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReject(suggestion)}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-1" />
                          Confirm Reject
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
                    onClick={() => handleApprove(suggestion)}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => setRejectingId(suggestion.id)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          )}

          {suggestion.status === "approved" && (
            <div className="flex gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => handleDelete(suggestion)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          )}

          {suggestion.status === "rejected" && (
            <div className="flex gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="border-green-200 text-green-700 hover:bg-green-50"
                onClick={() => handleApprove(suggestion)}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Approve
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => handleDelete(suggestion)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          )}</>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Rescue Suggestions Review</h1>
        <p className="text-sm text-slate-400">Review and manage rescue organization submissions</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="bg-slate-800 border border-slate-700 mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="pending" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm">
              <Clock className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">Pending</span> ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm">
              <CheckCircle2 className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Approved</span>
              <span className="sm:hidden">Approved</span> ({approved.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm">
              <XCircle className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Rejected</span>
              <span className="sm:hidden">Rejected</span> ({rejected.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {pending.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No pending suggestions</p>
                </CardContent>
              </Card>
            ) : (
              pending.map(renderSuggestion)
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-3">
            {approved.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No approved suggestions</p>
                </CardContent>
              </Card>
            ) : (
              approved.map(renderSuggestion)
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-3">
            {rejected.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No rejected suggestions</p>
                </CardContent>
              </Card>
            ) : (
              rejected.map(renderSuggestion)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}