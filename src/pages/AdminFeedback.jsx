import React, { useState, useEffect } from "react";
import { db } from '@/api/firebaseClient';
import { collection, getDocs, orderBy, query, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Bug, Lightbulb, Trash2, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

function formatDate(val) {
  if (!val) return "Unknown date";
  if (val?.toDate) return val.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const d = new Date(val);
  if (!isNaN(d)) return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return "Unknown date";
}

const PRIORITY_COLORS = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'feedback'), orderBy('created_at', 'desc'));
      const snap = await getDocs(q);
      setFeedback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load feedback:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this feedback? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'feedback', id));
      setFeedback(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      await updateDoc(doc(db, 'feedback', id), { status: 'resolved' });
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: 'resolved' } : f));
    } catch (err) {
      console.error("Failed to resolve:", err);
    } finally {
      setResolvingId(null);
    }
  };

  const filtered = feedback.filter(f => {
    if (activeTab === "all") return true;
    if (activeTab === "open") return f.status !== 'resolved';
    if (activeTab === "resolved") return f.status === 'resolved';
    return f.type === activeTab;
  });

  const counts = {
    all: feedback.length,
    open: feedback.filter(f => f.status !== 'resolved').length,
    bug: feedback.filter(f => f.type === 'bug').length,
    feature_request: feedback.filter(f => f.type === 'feature_request').length,
    resolved: feedback.filter(f => f.status === 'resolved').length,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-400" />
          User Feedback
        </h1>
        <p className="text-slate-400 text-sm mt-1">Bug reports and feature requests from your users</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: counts.all, color: "text-white" },
          { label: "Open", value: counts.open, color: "text-amber-400" },
          { label: "Bugs", value: counts.bug, color: "text-red-400" },
          { label: "Features", value: counts.feature_request, color: "text-blue-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border border-slate-800 mb-6">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="open">Open ({counts.open})</TabsTrigger>
          <TabsTrigger value="bug">Bugs ({counts.bug})</TabsTrigger>
          <TabsTrigger value="feature_request">Features ({counts.feature_request})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No feedback in this category yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((item, idx) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                  <Card className={`border-slate-800 bg-slate-900 ${item.status === 'resolved' ? 'opacity-60' : ''}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Header row */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {item.type === 'bug' ? (
                              <Bug className="w-4 h-4 text-red-400 flex-shrink-0" />
                            ) : (
                              <Lightbulb className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            )}
                            <span className="font-semibold text-white truncate">{item.title}</span>
                            <Badge className={`text-xs border ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>
                              {item.priority || 'medium'}
                            </Badge>
                            {item.status === 'resolved' && (
                              <Badge className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
                                Resolved
                              </Badge>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-slate-300 text-sm mb-3 leading-relaxed">{item.description}</p>

                          {/* Meta */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>From: {item.submitted_by || 'anonymous'}</span>
                            <span>Submitted: {formatDate(item.created_at)}</span>
                            {item.browser_info && <span className="truncate max-w-xs">Browser: {item.browser_info}</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {item.status !== 'resolved' && (
                            <Button
                              size="sm"
                              onClick={() => handleResolve(item.id)}
                              disabled={resolvingId === item.id}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            >
                              {resolvingId === item.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <><CheckCircle2 className="w-3 h-3 mr-1" /> Resolve</>
                              }
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="border-red-800 text-red-400 hover:bg-red-900/20 text-xs"
                          >
                            {deletingId === item.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <><Trash2 className="w-3 h-3 mr-1" /> Delete</>
                            }
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
