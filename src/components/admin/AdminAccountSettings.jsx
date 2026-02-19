import React, { useState } from "react";
import api from '@/api/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";

export default function AdminAccountSettings({ user, onUpdate }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Profile form state
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || ""
  });

  // Email form state
  const [emailData, setEmailData] = useState({
    new_email: user?.email || ""
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!profileData.full_name.trim()) {
      setMessage("Name is required");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await api.auth.updateMe({
        full_name: profileData.full_name
      });
      setMessage("Profile updated successfully!");
      onUpdate();
    } catch (error) {
      setMessage("Error updating profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    if (!emailData.new_email.includes("@")) {
      setMessage("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      // Note: Direct email change via SDK may not be available
      // This would typically require backend function
      setMessage("Email change requires admin verification. Contact support.");
    } catch (error) {
      setMessage("Error updating email: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!passwordData.new_password || !passwordData.confirm_password) {
      setMessage("Please fill in all password fields");
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage("Passwords do not match");
      return;
    }

    if (passwordData.new_password.length < 8) {
      setMessage("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await api.functions.invoke("changeAdminPassword", {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      if (response.data.success) {
        setMessage("Password changed successfully!");
        setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
      } else {
        setMessage(response.data.error || "Failed to change password");
      }
    } catch (error) {
      setMessage("Error changing password: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-slate-200 mt-8">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500">
        <CardTitle className="text-white">Admin Account Settings</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {["profile", "email", "password"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition-colors capitalize ${
                activeTab === tab
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${
            message.includes("success")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-yellow-50 text-yellow-700 border border-yellow-200"
          }`}>
            {message}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <Input
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Update Profile
            </Button>
          </form>
        )}

        {/* Email Tab */}
        {activeTab === "email" && (
          <form onSubmit={handleEmailUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Current Email
              </label>
              <Input disabled value={user?.email || ""} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                New Email
              </label>
              <Input
                type="email"
                value={emailData.new_email}
                onChange={(e) => setEmailData({ ...emailData, new_email: e.target.value })}
                placeholder="Enter new email"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Update Email
            </Button>
          </form>
        )}

        {/* Password Tab */}
        {activeTab === "password" && (
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Current Password
              </label>
              <Input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                New Password
              </label>
              <Input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                placeholder="Enter new password (min 8 characters)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirm Password
              </label>
              <Input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Change Password
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}