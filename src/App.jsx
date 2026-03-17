import { Toaster } from "@/components/ui/toaster";
import { App as CapApp } from "@capacitor/app";

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import OnboardingNotificationDialog from '@/components/shared/OnboardingNotificationDialog';
import { useState, useEffect } from 'react';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import PetProfiles from './pages/PetProfiles';
import PetDetail from './pages/PetDetail';
import CareTracker from './pages/CareTracker';
import HealthRecords from './pages/HealthRecords';
import Appointments from './pages/Appointments';
import VetFinder from './pages/VetFinder';
import VetNetwork from './pages/VetNetwork';
import AnimalRescues from './pages/AnimalRescues';
import PetReminders from './pages/PetReminders';
import PetCommunity from './pages/PetCommunity';
import ForumCategoryPage from './pages/ForumCategoryPage';
import ForumPost from './pages/ForumPost';
import ForumCreatePost from './pages/ForumCreatePost';
import PetCareGuides from './pages/PetCareGuides';
import PetCareGuideCategory from './pages/PetCareGuideCategory';
import PetCareGuideDetail from './pages/PetCareGuideDetail';
import PetAssistant from './pages/PetAssistant';
import Account from './pages/Account';
import NotificationPreferences from './pages/NotificationPreferences';
import Feedback from './pages/Feedback';
import AdminUsers from './pages/AdminUsers';
import AdminUserDetail from './pages/AdminUserDetail';
import AdminRescueSuggestions from './pages/AdminRescueSuggestions';
import AdminGuideManagement from './pages/AdminGuideManagement';
import AdminFeedback from './pages/AdminFeedback';
import Layout from './Layout';
import LoginPage from './pages/Login';
import PetPassport from './pages/PetPassport';
import LostPetNetwork from './pages/LostPetNetwork';
import LostPetAlertDetail from './pages/LostPetAlertDetail';

const PageNotFound = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-slate-400 mb-6">Page not found</p>
      <a href="/" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition">Go Home</a>
    </div>
  </div>
);

const VerifyEmailScreen = () => {
  const { user, logout, resendVerificationEmail } = useAuth();
  const [sent, setSent] = React.useState(false);
  const [checking, setChecking] = React.useState(false);

  const handleResend = async () => {
    await resendVerificationEmail();
    setSent(true);
  };

  const handleCheckVerified = async () => {
    setChecking(true);
    // Reload the Firebase user to get the latest emailVerified status
    await import('@/api/firebaseClient').then(async ({ fbAuth }) => {
      await fbAuth.currentUser?.reload();
      // onAuthStateChanged will re-fire and update the context automatically
    });
    setChecking(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-6 mx-auto">
          <span className="text-2xl">🐾</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Verify your email</h1>
        <p className="text-slate-400 text-sm mb-2">
          We sent a verification link to
        </p>
        <p className="text-white font-medium mb-6">{user?.email}</p>
        <p className="text-slate-400 text-sm mb-8">
          Click the link in that email, then come back and tap the button below.
        </p>
        <div className="space-y-3">
          <button onClick={handleCheckVerified} disabled={checking}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition disabled:opacity-50">
            {checking ? 'Checking…' : "I've verified my email"}
          </button>
          <button onClick={handleResend}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition">
            {sent ? '✓ Email sent!' : 'Resend verification email'}
          </button>
          <button onClick={() => logout()}
            className="w-full py-3 text-slate-500 hover:text-slate-300 text-sm transition">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isEmailVerified, isLoadingAuth } = useAuth();
  // Always show spinner while auth is loading — never redirect during this time
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }
  // Not loading, not authenticated → go to login
  if (!isAuthenticated) {
    // But if emailVerified is false it means they're signed in but unverified
    if (isEmailVerified === false) return <VerifyEmailScreen />;
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

// Listens for the custom event fired from AuthContext
const NotificationPromptManager = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      console.log('show-notification-prompt event received', e.detail);
      setUserId(e.detail?.userId);
      setShowPrompt(true);
    };
    window.addEventListener('show-notification-prompt', handler);
    return () => window.removeEventListener('show-notification-prompt', handler);
  }, []);

  return (
    <OnboardingNotificationDialog
      open={showPrompt}
      onOpenChange={setShowPrompt}
      userId={userId}
    />
  );
};

const AppRoutes = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout currentPageName="Dashboard"><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/pets" element={<ProtectedRoute><Layout currentPageName="PetProfiles"><PetProfiles /></Layout></ProtectedRoute>} />
        <Route path="/pets/detail" element={<ProtectedRoute><Layout currentPageName="PetDetail"><PetDetail /></Layout></ProtectedRoute>} />
        <Route path="/care" element={<ProtectedRoute><Layout currentPageName="CareTracker"><CareTracker /></Layout></ProtectedRoute>} />
        <Route path="/health" element={<ProtectedRoute><Layout currentPageName="HealthRecords"><HealthRecords /></Layout></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute><Layout currentPageName="Appointments"><Appointments /></Layout></ProtectedRoute>} />
        <Route path="/vet-finder" element={<ProtectedRoute><Layout currentPageName="VetFinder"><VetFinder /></Layout></ProtectedRoute>} />
        <Route path="/vet-network" element={<ProtectedRoute><Layout currentPageName="VetNetwork"><VetNetwork /></Layout></ProtectedRoute>} />
        <Route path="/rescues" element={<ProtectedRoute><Layout currentPageName="AnimalRescues"><AnimalRescues /></Layout></ProtectedRoute>} />
        <Route path="/reminders" element={<ProtectedRoute><Layout currentPageName="PetReminders"><PetReminders /></Layout></ProtectedRoute>} />
        <Route path="/community" element={<ProtectedRoute><Layout currentPageName="PetCommunity"><PetCommunity /></Layout></ProtectedRoute>} />
        <Route path="/community/category" element={<ProtectedRoute><Layout currentPageName="ForumCategoryPage"><ForumCategoryPage /></Layout></ProtectedRoute>} />
        <Route path="/community/post" element={<ProtectedRoute><Layout currentPageName="ForumPost"><ForumPost /></Layout></ProtectedRoute>} />
        <Route path="/community/create-post" element={<ProtectedRoute><Layout currentPageName="ForumCreatePost"><ForumCreatePost /></Layout></ProtectedRoute>} />
        <Route path="/guides" element={<ProtectedRoute><Layout currentPageName="PetCareGuides"><PetCareGuides /></Layout></ProtectedRoute>} />
        <Route path="/guides/category" element={<ProtectedRoute><Layout currentPageName="PetCareGuideCategory"><PetCareGuideCategory /></Layout></ProtectedRoute>} />
        <Route path="/guides/detail" element={<ProtectedRoute><Layout currentPageName="PetCareGuideDetail"><PetCareGuideDetail /></Layout></ProtectedRoute>} />
        <Route path="/assistant" element={<ProtectedRoute><Layout currentPageName="PetAssistant"><PetAssistant /></Layout></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><Layout currentPageName="Account"><Account /></Layout></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Layout currentPageName="NotificationPreferences"><NotificationPreferences /></Layout></ProtectedRoute>} />
        <Route path="/feedback" element={<ProtectedRoute><Layout currentPageName="Feedback"><Feedback /></Layout></ProtectedRoute>} />
        <Route path="/admin/users" element={<AdminRoute><Layout currentPageName="AdminUsers"><AdminUsers /></Layout></AdminRoute>} />
        <Route path="/admin/user" element={<AdminRoute><Layout currentPageName="AdminUserDetail"><AdminUserDetail /></Layout></AdminRoute>} />
        <Route path="/admin/rescue-suggestions" element={<AdminRoute><Layout currentPageName="AdminRescueSuggestions"><AdminRescueSuggestions /></Layout></AdminRoute>} />
        <Route path="/admin/guides" element={<AdminRoute><Layout currentPageName="AdminGuideManagement"><AdminGuideManagement /></Layout></AdminRoute>} />
        <Route path="/admin/feedback" element={<AdminRoute><Layout currentPageName="AdminFeedback"><AdminFeedback /></Layout></AdminRoute>} />
        <Route path="/passport/:petId" element={<PetPassport />} />
        <Route path="/lost-pet-network" element={<ProtectedRoute><Layout currentPageName="LostPetNetwork"><LostPetNetwork /></Layout></ProtectedRoute>} />
        <Route path="/lost-pet/:alertId" element={<LostPetAlertDetail />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <NotificationPromptManager />
    </>
  );
};

function App() {
  useEffect(() => {
    // Handle Android hardware back button
    const handler = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.minimizeApp();
      }
    });
    return () => { handler.then(h => h.remove()); };
  }, []);

  useEffect(() => {
    // Handle deep links — fires when the app is opened via pawsclaws:// URI scheme.
    // The /auth-callback page on Vercel completes Firebase sign-in in the browser,
    // then redirects here via pawsclaws://login?email=xxx so the app knows the user
    // is already authenticated and can navigate to the dashboard.
    const urlHandler = CapApp.addListener('appUrlOpen', async (data) => {
      console.log('appUrlOpen received:', data.url);
      try {
        const url = new URL(data.url);
        // The auth-callback page already signed the user in via Firebase.
        // Firebase Auth state persists on device, so onAuthStateChanged in
        // AuthContext will fire and set isAuthenticated=true automatically.
        // We just need to make sure we're on the right page.
        const email = url.searchParams.get('email');
        if (email) {
          // Store email as a hint in case Login.jsx needs it
          window.localStorage.setItem('pendingAuthEmail', email);
        }
        // Navigate to dashboard — AuthContext will redirect to login if not authed
        window.location.hash = '#/dashboard';
      } catch (e) {
        console.warn('appUrlOpen parse error:', e);
      }
    });
    return () => { urlHandler.then(h => h.remove()); };
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
