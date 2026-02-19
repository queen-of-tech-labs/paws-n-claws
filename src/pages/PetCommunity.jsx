import React, { useEffect, useState } from "react";
import api from '@/api/firebaseClient';
import { createPageUrl } from "@/utils/index";
import CommunityHeader from "@/components/community/CommunityHeader";
import WelcomeSection from "@/components/community/WelcomeSection";
import TrendingDiscussions from "@/components/community/TrendingDiscussions";
import CategoriesGrid from "@/components/community/CategoriesGrid";
import RecentDiscussions from "@/components/community/RecentDiscussions";
import SafetySection from "@/components/community/SafetySection";
import PremiumFeatureLocked from "@/components/shared/PremiumFeatureLocked";

export default function PetCommunity() {
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const isAuthenticated = await api.auth.isAuthenticated();
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      const userData = await api.auth.me();
      setUser(userData);
      setIsPremium(userData?.premium_subscriber === true);
      setLoading(false);
    };
    checkUser();
  }, []);

  if (loading) return null;

  const isAdmin = user?.role === 'admin';
  if (!isPremium && !isAdmin) {
    return (
      <PremiumFeatureLocked
        featureName="Pet Community"
        onUpgrade={() => window.location.href = createPageUrl("Account")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Image */}
      <div className="w-full h-64 md:h-80 overflow-hidden relative">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699233bbcd7075c113f72710/357340f3b_ChatGPTImageFeb16202605_07_48PM.png" 
          alt="Community of pets" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80"></div>
      </div>

      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full">
        <CommunityHeader />
        <WelcomeSection />
        <TrendingDiscussions />
        <CategoriesGrid />
        <RecentDiscussions />
        <SafetySection />
      </div>
    </div>
  );
}