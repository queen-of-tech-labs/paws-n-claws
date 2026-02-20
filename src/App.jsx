import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

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
import Layout from './Layout';
import LoginPage from './pages/Login';

const PageNotFound = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-slate-400 mb-6">Page not found</p>
      <a href="/" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition">Go Home</a>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
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

const AppRoutes = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes wrapped in Layout */}
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

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
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
