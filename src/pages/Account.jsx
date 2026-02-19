import React, { useState, useEffect } from "react";
import api from '@/api/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { User, Lock, CreditCard, LogOut, Loader2, Check, Zap, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import PremiumUnlockedDialog from "../components/shared/PremiumUnlockedDialog";

export default function Account() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [addingPet, setAddingPet] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPremiumUnlocked, setShowPremiumUnlocked] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const authUser = await api.auth.me();
        setUser(authUser);
        setEditName(authUser.full_name || "");
        setEditUsername(authUser.username || "");
        setLoading(false);

        // Check if returning from successful checkout
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        
        if (sessionId && authUser?.notification_setup_pending && authUser?.isPremium) {
          console.log('Premium unlocked - showing onboarding');
          setShowPremiumUnlocked(true);
          
          // Clear session_id from URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (error) {
        console.error('Error initializing account:', error);
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const handleSaveName = async () => {
    setSaving(true);
    await api.auth.updateMe({ full_name: editName });
    setUser(prev => ({ ...prev, full_name: editName }));
    setEditing(false);
    setSaving(false);
  };

  const handleSaveUsername = async () => {
    setSaving(true);
    await api.auth.updateMe({ username: editUsername });
    setUser(prev => ({ ...prev, username: editUsername }));
    setEditingUsername(false);
    setSaving(false);
  };

  const handleUpgradeClick = async () => {
    // Check if running in iframe
    if (window.self !== window.top) {
      alert("Checkout only works from the published app. Please open it in a new tab.");
      return;
    }
    
    // Create checkout session
    try {
      const response = await api.functions.invoke('createCheckoutSession', {
        priceId: 'price_1T2GVUJKBH02BiIFrQGvTDlQ',
        mode: 'subscription',
        successUrl: window.location.origin + '/account?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: window.location.origin + '/account'
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        alert("Failed to start checkout. Please try again.");
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("Failed to start checkout. Please try again.");
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const response = await api.functions.invoke('cancelSubscription');
      if (response.data.success) {
        setUser(prev => ({ ...prev, premium_subscriber: false }));
        setShowCancelModal(false);
        alert("Subscription cancelled successfully. You'll retain access until the end of your billing period.");
      }
    } catch (error) {
      console.error("Cancel error:", error);
      alert(error.response?.data?.error || "Failed to cancel subscription. Please contact support.");
    }
    setCancelling(false);
  };

  const handleAddExtraPet = async () => {
    if (window.self !== window.top) {
      alert("Checkout only works from the published app. Please open it in a new tab.");
      return;
    }
    
    setAddingPet(true);
    try {
      const response = await api.functions.invoke('createCheckoutSession', {
        priceId: 'price_1T2GY3JKBH02BiIFFmzFXk1o',
        mode: 'payment',
        successUrl: window.location.origin + '/account',
        cancelUrl: window.location.origin + '/account'
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        alert("Failed to start checkout. Please try again.");
      }
    } catch (error) {
      console.error("Extra pet checkout error:", error);
      alert("Failed to start checkout. Please try again.");
    }
    setAddingPet(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await api.functions.invoke('deleteUserAccount', { confirmation: 'DELETE' });
      alert("Your account has been scheduled for deletion in 30 days. You will be logged out now.");
      await api.auth.logout('/');
    } catch (error) {
      console.error("Delete account error:", error);
      alert(error.response?.data?.error || "Failed to schedule account deletion. Please try again.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Account Settings</h1>
        <p className="text-slate-400 mt-2">Manage your profile and subscription</p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-white">Profile Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Full Name */}
              <div>
                <Label className="text-slate-300">Full Name</Label>
                {editing ? (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="Your name"
                    />
                    <Button
                      onClick={handleSaveName}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(false);
                        setEditName(user.full_name);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-white font-medium">{user?.full_name || "Not set"}</p>
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              {/* Username */}
              <div>
                <Label className="text-slate-300">Forum Username</Label>
                {editingUsername ? (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="Your forum username"
                    />
                    <Button
                      onClick={handleSaveUsername}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingUsername(false);
                        setEditUsername(user?.username || "");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-white font-medium">{user?.username || "Not set"}</p>
                    <Button variant="outline" size="sm" onClick={() => setEditingUsername(true)}>
                      Edit
                    </Button>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">This name will appear on your forum posts instead of your full name</p>
              </div>

              {/* Email */}
              <div>
                <Label className="text-slate-300">Email</Label>
                <p className="text-white font-medium mt-2">{user?.email}</p>
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>

              {/* Role */}
              <div>
                <Label className="text-slate-300">Account Type</Label>
                <Badge className={`mt-2 ${user?.role === 'admin' ? 'bg-purple-600' : 'bg-slate-700'}`}>
                  {user?.role === 'admin' ? 'Administrator' : 'User'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subscription Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-400" />
                <CardTitle className="text-white">Subscription Plan</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current Plan */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-300 text-sm">Current Plan</p>
                    <Badge className={user?.premium_subscriber ? "bg-blue-600" : "bg-slate-700"}>
                      {user?.premium_subscriber ? "Premium" : "Free"}
                    </Badge>
                  </div>
                  <p className="text-white font-semibold">
                    {user?.premium_subscriber ? "$6.99/month" : "Free Plan"}
                  </p>
                  {!user?.premium_subscriber && (
                    <p className="text-xs text-slate-400 mt-2">Up to 2 pets · Basic care tracking</p>
                  )}
                  {user?.premium_subscriber && (
                    <p className="text-xs text-slate-400 mt-2">Unlimited pets · Advanced features · AI assistant</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!user?.premium_subscriber ? (
                    <Button
                      onClick={handleUpgradeClick}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Upgrade to Premium
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelModal(true)}
                      className="border-red-600 text-red-600 hover:bg-red-600/10 flex-1"
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Premium Plan Details Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-blue-500/50 bg-gradient-to-b from-blue-500/10 to-slate-900/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-white">Premium Plan</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-white font-semibold">$6.99 <span className="text-sm text-slate-400 font-normal">/month</span></p>
              <ul className="space-y-3">
                {["Unlimited Pets", "Community Pet Parent Forum", "Detailed Pet Care Guides", "Vet Network", "24/7 AI Pet Assistant", "Symptom Checker"].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Extra Pet Profiles Card */}
        {!user?.premium_subscriber && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-slate-800 bg-slate-900">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-400" />
                  <CardTitle className="text-white">Add Extra Pet Profiles</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-400">
                  You're limited to 2 pet profiles on the Free plan. Add more pets for just $1.99 each.
                </p>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">Extra Pet Profile</p>
                      <p className="text-sm text-slate-400 mt-1">One additional pet profile</p>
                    </div>
                    <p className="text-2xl font-bold text-white">$1.99</p>
                  </div>
                </div>
                <Button
                  onClick={handleAddExtraPet}
                  disabled={addingPet}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {addingPet ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Pet Profile
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Logout Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-slate-800 bg-slate-900">
            <CardContent className="p-6 space-y-3">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 w-full"
                onClick={async () => { await api.auth.logout('/'); }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
              <Button
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-600/10 w-full"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Cancel Subscription Modal */}
      <AlertDialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              You'll lose access to Premium features and be downgraded to the Free plan. This action cannot be undone immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3 my-4">
            <p className="text-sm text-red-400">You will be limited to 2 pets and lose AI assistant access.</p>
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel Subscription"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Premium Unlocked Modal */}
      <PremiumUnlockedDialog 
        open={showPremiumUnlocked} 
        onOpenChange={(open) => {
          setShowPremiumUnlocked(open);
          if (!open) {
            api.auth.me().then(setUser).catch(() => {});
          }
        }} 
      />

      {/* Delete Account Modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Your Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="text-sm text-slate-300 ml-6 list-disc space-y-1 my-4">
            <li>Your pet profiles</li>
            <li>Health records</li>
            <li>Vet information</li>
            <li>Uploaded files</li>
            <li>All app data</li>
          </ul>
          <p className="text-sm text-slate-400 mb-4">This action cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete My Account"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
