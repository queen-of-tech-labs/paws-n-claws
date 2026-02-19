import React, { useState, useEffect } from "react";
import api from '@/api/firebaseClient';
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils/index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Eye, Trash2, Shield, Crown, Key, Ban } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import AdminBroadcastNotification from "@/components/admin/AdminBroadcastNotification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("admin");
  const [suspendUserId, setSuspendUserId] = useState(null);
  const [unsuspendUserId, setUnsuspendUserId] = useState(null);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [changeRoleUserId, setChangeRoleUserId] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [changeSubUserId, setChangeSubUserId] = useState(null);
  const [newSubStatus, setNewSubStatus] = useState("");
  const [resetPasswordUserId, setResetPasswordUserId] = useState(null);
  const [banUserId, setBanUserId] = useState(null);

  useEffect(() => {
    const checkAdminAndLoadUsers = async () => {
      try {
        const user = await api.auth.me();
        if (user?.role !== "admin") {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setIsAdmin(true);
        setCurrentUser(user);

        const userList = await api.entities.User.list();
        setUsers(userList);
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndLoadUsers();
  }, []);



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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

  const handleUserUpdate = async () => {
    // Reload current user
    const user = await api.auth.me();
    setCurrentUser(user);
  };

  const handleSuspendUser = async (userId) => {
    try {
      await api.entities.User.update(userId, {
        account_status: "suspended"
      });
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, account_status: "suspended" } : u));
      setSuspendUserId(null);
      toast.success("User suspended successfully");
    } catch (error) {
      console.error("Error suspending user:", error);
      toast.error(error.message || "Failed to suspend user");
    }
  };

  const handleUnsuspendUser = async (userId) => {
    try {
      await api.entities.User.update(userId, {
        account_status: "active"
      });
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, account_status: "active" } : u));
      setUnsuspendUserId(null);
      toast.success("User unsuspended successfully");
    } catch (error) {
      console.error("Error unsuspending user:", error);
      toast.error(error.message || "Failed to unsuspend user");
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.functions.invoke('adminDeleteUser', { userId });
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      setDeleteUserId(null);
      toast.success("User permanently deleted");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error.response?.data?.error || error.message || "Failed to delete user");
    }
  };

  const handleChangeRole = async (userId) => {
    if (!newRole) return;
    try {
      await api.functions.invoke('changeUserRole', { userId, newRole });
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setChangeRoleUserId(null);
      setNewRole("");
      toast.success("User role updated successfully");
    } catch (error) {
      console.error("Error changing role:", error);
      toast.error(error.response?.data?.error || error.message || "Failed to change role");
    }
  };

  const handleChangeSubscription = async (userId) => {
    if (!newSubStatus) return;
    try {
      await api.functions.invoke('changeUserSubscription', { userId, subscriptionStatus: newSubStatus });
      const isPremium = newSubStatus === 'premium';
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, subscription_status: newSubStatus, isPremium, premium_subscriber: isPremium } : u));
      setChangeSubUserId(null);
      setNewSubStatus("");
      toast.success("Subscription updated successfully");
    } catch (error) {
      console.error("Error changing subscription:", error);
      toast.error(error.response?.data?.error || error.message || "Failed to change subscription");
    }
  };

  const handleResetPassword = async (userId, userEmail) => {
    try {
      await api.functions.invoke('resetUserPassword', { userId, userEmail });
      setResetPasswordUserId(null);
      toast.success("Password reset email sent successfully");
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(error.response?.data?.error || error.message || "Failed to send reset email");
    }
  };

  const handleBanUser = async (userId) => {
    try {
      await api.entities.User.update(userId, {
        account_status: "banned"
      });
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, account_status: "banned" } : u));
      setBanUserId(null);
      toast.success("User banned successfully");
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error(error.message || "Failed to ban user");
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "premium" && user.subscription_status === "premium") ||
                         (filterStatus === "suspended" && user.account_status === "suspended");
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <Toaster />
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Control</h1>
          <p className="text-slate-400">Manage users, subscriptions, and system settings</p>
        </div>

        <Card className="shadow-lg border-slate-800 bg-slate-900">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 border-b border-slate-800">
            <CardTitle className="text-white">User Management ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Search and Filter */}
            <div className="flex flex-col gap-4 mb-6 md:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Search by name, email, or forum username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full md:w-40 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="User Type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="admin" className="text-white">Admin</SelectItem>
                  <SelectItem value="user" className="text-white">User</SelectItem>
                  <SelectItem value="all" className="text-white">All Types</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-40 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white">All Status</SelectItem>
                  <SelectItem value="premium" className="text-white">Premium</SelectItem>
                  <SelectItem value="suspended" className="text-white">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Users List */}
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No users found matching your filters.
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className="border border-slate-700 rounded-lg bg-slate-800/50 p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase">Name</p>
                        <p className="text-white font-medium">{user.full_name || "N/A"}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase">Email</p>
                        <p className="text-slate-300">{user.email}</p>
                      </div>

                      {user.username && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase">Forum Username</p>
                          <p className="text-slate-300">{user.username}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase">Role</p>
                          <Badge className="bg-blue-600 text-white mt-1">
                            {user.role || "user"}
                          </Badge>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase">Sub</p>
                          <Badge className={user.subscription_status === "premium" ? "bg-amber-600 text-white mt-1" : "bg-slate-700 text-slate-200 mt-1"}>
                            {user.subscription_status || "free"}
                          </Badge>
                        </div>
                        
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase">Status</p>
                          <Badge className={
                            user.account_status === "active" ? "bg-green-600 text-white mt-1" :
                            user.account_status === "suspended" ? "bg-yellow-600 text-white mt-1" :
                            "bg-red-600 text-white mt-1"
                          }>
                            {user.account_status || "active"}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase">Created</p>
                        <p className="text-slate-300 text-sm">{user.created_date ? format(new Date(user.created_date), 'MMM d, yyyy') : "N/A"}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-700">
                        <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Actions</p>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-600 hover:bg-blue-600 text-blue-400 hover:text-white"
                            onClick={() => setChangeRoleUserId(user.id)}
                            title="Change Role"
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-600 hover:bg-amber-600 text-amber-400 hover:text-white"
                            onClick={() => setChangeSubUserId(user.id)}
                            title="Change Subscription"
                          >
                            <Crown className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-purple-600 hover:bg-purple-600 text-purple-400 hover:text-white"
                            onClick={() => setResetPasswordUserId(user.id)}
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          {user.account_status === "suspended" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-600 hover:bg-green-600 text-green-400 hover:text-white"
                              onClick={() => setUnsuspendUserId(user.id)}
                              title="Unsuspend User"
                            >
                              <Loader2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-yellow-600 hover:bg-yellow-600 text-yellow-400 hover:text-white"
                              onClick={() => setSuspendUserId(user.id)}
                              title="Suspend User"
                            >
                              <Loader2 className="w-4 h-4" />
                            </Button>
                          )}
                          {user.account_status !== "banned" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-orange-600 hover:bg-orange-600 text-orange-400 hover:text-white"
                              onClick={() => setBanUserId(user.id)}
                              title="Ban User"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600 hover:bg-red-600 text-red-400 hover:text-white"
                            onClick={() => setDeleteUserId(user.id)}
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Suspend Confirmation */}
        <AlertDialog open={!!suspendUserId} onOpenChange={(open) => !open && setSuspendUserId(null)}>
          <AlertDialogContent className="bg-slate-900 border-slate-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Suspend User</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Are you sure you want to suspend this user? They will no longer be able to access the app.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => suspendUserId && handleSuspendUser(suspendUserId)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Suspend
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Unsuspend Confirmation */}
        <AlertDialog open={!!unsuspendUserId} onOpenChange={(open) => !open && setUnsuspendUserId(null)}>
          <AlertDialogContent className="bg-slate-900 border-slate-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Unsuspend User</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Are you sure you want to unsuspend this user? They will regain access to the app.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => unsuspendUserId && handleUnsuspendUser(unsuspendUserId)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Unsuspend
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
          <AlertDialogContent className="bg-slate-900 border-slate-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete User</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                This action cannot be undone. The user and all associated data will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteUserId && handleDeleteUser(deleteUserId)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Change Role Dialog */}
        <AlertDialog open={!!changeRoleUserId} onOpenChange={(open) => !open && setChangeRoleUserId(null)}>
          <AlertDialogContent className="bg-slate-900 border-slate-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Change User Role</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Select a new role for this user.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">New Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="user" className="text-white">User</SelectItem>
                    <SelectItem value="admin" className="text-white">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => changeRoleUserId && handleChangeRole(changeRoleUserId)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Change Role
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Change Subscription Dialog */}
        <AlertDialog open={!!changeSubUserId} onOpenChange={(open) => !open && setChangeSubUserId(null)}>
          <AlertDialogContent className="bg-slate-900 border-slate-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Change Subscription</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Select a new subscription level for this user.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">Subscription Status</Label>
                <Select value={newSubStatus} onValueChange={setNewSubStatus}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select subscription" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="free" className="text-white">Free</SelectItem>
                    <SelectItem value="premium" className="text-white">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => changeSubUserId && handleChangeSubscription(changeSubUserId)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Change Subscription
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reset Password Confirmation */}
         <AlertDialog open={!!resetPasswordUserId} onOpenChange={(open) => !open && setResetPasswordUserId(null)}>
           <AlertDialogContent className="bg-slate-900 border-slate-800">
             <AlertDialogHeader>
               <AlertDialogTitle className="text-white">Reset Password</AlertDialogTitle>
               <AlertDialogDescription className="text-slate-400">
                 Send a password reset email to this user?
               </AlertDialogDescription>
             </AlertDialogHeader>
             <div className="flex gap-3 justify-end">
               <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
               <AlertDialogAction
                 onClick={() => {
                   const user = users.find(u => u.id === resetPasswordUserId);
                   if (user) handleResetPassword(resetPasswordUserId, user.email);
                 }}
                 className="bg-purple-600 hover:bg-purple-700 text-white"
               >
                 Send Reset Email
               </AlertDialogAction>
             </div>
           </AlertDialogContent>
         </AlertDialog>

        {/* Ban User Confirmation */}
        <AlertDialog open={!!banUserId} onOpenChange={(open) => !open && setBanUserId(null)}>
          <AlertDialogContent className="bg-slate-900 border-slate-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Ban User</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Are you sure you want to ban this user? They will be permanently locked out of their account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => banUserId && handleBanUser(banUserId)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Ban User
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Push Notification Broadcast */}
        <div className="mt-8">
          <AdminBroadcastNotification />
        </div>
      </div>
    </div>
  );
}