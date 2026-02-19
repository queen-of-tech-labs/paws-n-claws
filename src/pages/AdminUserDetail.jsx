import React, { useState, useEffect } from "react";
import api from '@/api/firebaseClient';
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils/index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Edit2, Save, X, Shield, Clock, Mail, User, AlertCircle, Trash2, Key } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminUserDetail() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [editData, setEditData] = useState({
    full_name: "",
    email: "",
    subscription_status: "free",
    account_status: "active"
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [showPremiumConfirm, setShowPremiumConfirm] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Get user ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("id");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const adminUser = await api.auth.me();
        if (adminUser?.role !== "admin") {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setIsAdmin(true);
        setCurrentUser(adminUser);

        if (userId) {
          const users = await api.entities.User.filter({ id: userId });
          if (users && users.length > 0) {
            const userData = users[0];
            setUser(userData);
            setEditData({
              full_name: userData.full_name || "",
              email: userData.email || "",
              subscription_status: userData.subscription_status || "free",
              account_status: userData.account_status || "active"
            });
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  const handleSave = async () => {
    if (!editData.email.trim() || !editData.email.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        full_name: editData.full_name,
        email: editData.email,
        subscription_status: editData.subscription_status,
        account_status: editData.account_status
      };

      await api.entities.User.update(userId, updateData);
      setUser({ ...user, ...updateData });
      setEditing(false);
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Failed to save user. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.entities.User.delete({ id: userId });
      navigate(createPageUrl("AdminUsers"));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user. Please try again.");
    }
  };

  const handleChangeRole = async () => {
    setActionLoading(true);
    try {
      await api.entities.User.update(userId, { role: selectedRole });
      setUser({ ...user, role: selectedRole });
      setShowRoleConfirm(false);
    } catch (error) {
      console.error("Error changing role:", error);
      alert("Failed to change role.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpgradePremium = async () => {
    setActionLoading(true);
    try {
      await api.entities.User.update(userId, { subscription_status: "premium" });
      setUser({ ...user, subscription_status: "premium" });
      setEditData({ ...editData, subscription_status: "premium" });
      setShowPremiumConfirm(false);
    } catch (error) {
      console.error("Error upgrading to premium:", error);
      alert("Failed to upgrade to premium.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendUser = async () => {
    setActionLoading(true);
    try {
      await api.entities.User.update(userId, { account_status: "suspended" });
      setUser({ ...user, account_status: "suspended" });
      setEditData({ ...editData, account_status: "suspended" });
      setShowSuspendConfirm(false);
    } catch (error) {
      console.error("Error suspending user:", error);
      alert("Failed to suspend user.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setActionLoading(true);
    try {
      // Password reset would typically be handled by a backend function
      // that sends a reset email
      await api.functions.invoke('sendPasswordResetEmail', { userEmail: user.email });
      alert("Password reset email sent to " + user.email);
      setShowResetConfirm(false);
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("Failed to send password reset email.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <Card className="border-red-900 bg-red-950">
          <CardContent className="pt-6">
            <p className="text-red-400 font-medium">Access Denied</p>
            <p className="text-red-300 text-sm">You must be an admin to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="pt-6">
            <p className="text-slate-400 font-medium">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("AdminUsers"))}
            className="border-slate-700 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">User Details</h1>
            <p className="text-slate-400">Manage user account and settings</p>
          </div>
        </div>

        {/* User Info Card */}
        <Card className="shadow-lg border-slate-800 bg-slate-900 mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 border-b border-slate-800">
            <CardTitle className="text-white">User Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Name</p>
                  <p className="text-lg font-medium text-white">{user.full_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Email</p>
                  <p className="text-lg font-medium text-white">{user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Role</p>
                  <Badge className={user.role === "admin" ? "bg-purple-600 text-white" : "bg-blue-600 text-white"}>
                    {user.role}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Subscription Status</p>
                  <Badge className={user.subscription_status === "premium" ? "bg-amber-600 text-white" : "bg-slate-700 text-slate-200"}>
                    {user.subscription_status || "free"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Account Status</p>
                  <Badge className={
                    user.account_status === "active" ? "bg-green-600 text-white" :
                    user.account_status === "suspended" ? "bg-yellow-600 text-white" :
                    "bg-red-600 text-white"
                  }>
                    {user.account_status || "active"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Created Date</p>
                  <p className="text-sm font-medium text-white">
                    {user.created_date ? format(new Date(user.created_date), 'MMM d, yyyy') : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Last Login</p>
                  <p className="text-sm font-medium text-white">
                    {user.last_login ? format(new Date(user.last_login), 'MMM d, yyyy') : "Never"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card className="shadow-lg border-slate-800 bg-slate-900 mb-6">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-white">Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  setSelectedRole(user.role === "admin" ? "user" : "admin");
                  setShowRoleConfirm(true);
                }}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Shield className="w-4 h-4 mr-2" />
                Change Role
              </Button>

              {user.subscription_status !== "premium" && (
                <Button
                  onClick={() => setShowPremiumConfirm(true)}
                  disabled={actionLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Upgrade to Premium
                </Button>
              )}

              {user.account_status !== "suspended" && (
                <Button
                  onClick={() => setShowSuspendConfirm(true)}
                  disabled={actionLoading}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Suspend User
                </Button>
              )}

              <Button
                onClick={() => setShowResetConfirm(true)}
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Key className="w-4 h-4 mr-2" />
                Reset Password
              </Button>

              <Button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white md:col-span-2"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>


      </div>

      {/* Change Role Confirmation */}
      <AlertDialog open={showRoleConfirm} onOpenChange={setShowRoleConfirm}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Change Role</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Change {user.full_name}'s role from <span className="font-semibold text-white">{user.role}</span> to <span className="font-semibold text-white">{selectedRole}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleChangeRole}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Change"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upgrade to Premium Confirmation */}
      <AlertDialog open={showPremiumConfirm} onOpenChange={setShowPremiumConfirm}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Upgrade to Premium</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Grant premium access to {user.email}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpgradePremium}
              disabled={actionLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upgrade"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend User Confirmation */}
      <AlertDialog open={showSuspendConfirm} onOpenChange={setShowSuspendConfirm}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Suspend User</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Suspend {user.email}? They will no longer be able to access the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendUser}
              disabled={actionLoading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Suspend"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Reset Password</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Send password reset email to {user.email}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              disabled={actionLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Account</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. All user data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-red-950 border border-red-800 rounded-lg p-3 my-4">
            <p className="text-sm text-red-300">
              Deleting: <span className="font-semibold">{user.email}</span>
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}