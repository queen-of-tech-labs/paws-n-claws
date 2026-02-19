import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "./utils/index";
import api from '@/api/firebaseClient';
import {
  PawPrint, Home, Dog, Heart, FileText, Calendar,
  MapPin, HandHeart, Menu, X, ChevronDown, LogOut, User, CreditCard, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { registerDeviceOnLogin } from "@/components/services/loginNotificationService";
import { registerServiceWorker } from "@/components/services/serviceWorkerManager";
import {
  initializeOneSignal,
  setUserTags,
  checkAndNotifyDueReminders,
  checkAndNotifyOverdueCare,
} from "@/components/services/oneSignalService";
import PremiumUnlockedDialog from "@/components/shared/PremiumUnlockedDialog";
import NotificationPermissionDeniedModal from "@/components/shared/NotificationPermissionDeniedModal";
import InstallPrompt from "@/components/shared/InstallPrompt";

const navItems = [
  { name: "Dashboard", icon: Home, page: "Dashboard" },
  { name: "My Pets", icon: Dog, page: "PetProfiles" },
  { name: "Care Tracker", icon: Heart, page: "CareTracker" },
  { name: "Health Records", icon: FileText, page: "HealthRecords" },
  { name: "Appointments", icon: Calendar, page: "Appointments" },
  { name: "Find a Vet", icon: MapPin, page: "VetFinder" },
  { name: "Rescues", icon: HandHeart, page: "AnimalRescues" },
];

const premiumNavItems = [
  { name: "Reminders", icon: Heart, page: "PetReminders" },
  { name: "Community", icon: HandHeart, page: "PetCommunity" },
  { name: "Care Guides", icon: FileText, page: "PetCareGuides" },
  { name: "Vet Network", icon: MapPin, page: "VetNetwork" },
  { name: "AI Assistant", icon: Home, page: "PetAssistant" },
];

const otherNavItems = [
  { name: "Account", icon: User, page: "Account" },
  { name: "Notifications", icon: Heart, page: "NotificationPreferences" },
  { name: "Feedback", icon: MessageSquare, page: "Feedback" },
];

const adminNavItems = [
  { name: "Admin Control", icon: User, page: "AdminUsers" },
  { name: "Review Suggestions", icon: User, page: "AdminRescueSuggestions" },
  { name: "Manage Guides", icon: FileText, page: "AdminGuideManagement" },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showPremiumUnlocked, setShowPremiumUnlocked] = useState(false);
  const [showPermissionDeniedModal, setShowPermissionDeniedModal] = useState(false);
  const navigate = useNavigate();

  // Initialize PWA and handle user authentication
  useEffect(() => {
    // Register service worker after page load
    if (document.readyState === 'complete') {
      registerServiceWorker().catch(err => console.error('SW registration error:', err));
    } else {
      window.addEventListener('load', () => {
        registerServiceWorker().catch(err => console.error('SW registration error:', err));
      });
    }

    api.auth.me().then(async (authUser) => {
      setUser(authUser);

      // Check if account is disabled
      if (authUser && (authUser.account_status === 'suspended' || authUser.account_status === 'banned')) {
        { await api.auth.logout('/'); });
        return;
      }

      // Register device on every login
      if (authUser) {
        try {
          await registerDeviceOnLogin(authUser);
        } catch (error) {
          console.error('Device registration error:', error);
        }

        // Initialize OneSignal and tag user for segmentation
        try {
          await initializeOneSignal(authUser.id || authUser.uid);
          await setUserTags({
            userId:    authUser.id || authUser.uid,
            email:     authUser.email,
            isPremium: authUser.premium_subscriber,
            role:      authUser.role,
          });
        } catch (err) {
          console.error('OneSignal init error:', err);
        }

        // Check for due reminders and overdue care after login
        // Small delay to let queries settle
        setTimeout(async () => {
          try {
            const [reminders, careLogs, pets] = await Promise.all([
              (authUser.premium_subscriber || authUser.role === 'admin')
                ? api.entities.Reminder.filter({ created_by: authUser.email })
                : Promise.resolve([]),
              api.entities.CareLog.filter({ created_by: authUser.email }),
              api.entities.Pet.filter({ created_by: authUser.email }),
            ]);
            const uid = authUser.id || authUser.uid;
            await checkAndNotifyDueReminders({ reminders, pets, userId: uid });
            await checkAndNotifyOverdueCare({ careLogs, pets, userId: uid });
          } catch (err) {
            console.error('Notification check error:', err);
          }
        }, 3000);
      }

      // Check if notification setup is pending (admin upgraded to premium)
      // Only trigger on non-Account pages to avoid conflicts with post-purchase flow
      const currentPath = window.location.pathname;
      if (authUser.notification_setup_pending && authUser.isPremium && !currentPath.includes('Account')) {
        setShowPremiumUnlocked(true);
        // Update local state immediately to prevent re-showing
        setUser({ ...authUser, notification_setup_pending: false });
        // Clear flag in backend
        api.auth.updateMe({ notification_setup_pending: false }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  // Skip layout for public Home page
  if (currentPageName === "Home") {
    return children;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <style>{`
        :root {
          --color-primary: #3B82F6;
          --color-primary-dark: #2563EB;
          --color-accent: #1E293B;
          --color-warm-gray: #94A3B8;
          --color-cream: #0F172A;
          --color-sage: #14B8A6;
          --color-purple: #A855F7;
        }
        
        /* Hide scrollbars */
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        *::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-slate-900 border-r border-slate-800
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        flex flex-col
      `}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Paws & Claws</h1>
              <p className="text-xs text-slate-400">Pet Parent Hub</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-blue-400" : ""}`} />
                {item.name}
              </Link>
            );
          })}

          <div className="border-t border-slate-800 my-3 mx-2" />
          <div className="px-2 mb-2 flex items-center gap-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Premium Features</p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold">
              <Crown className="w-3 h-3" />
              Premium
            </span>
          </div>
          {premiumNavItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-blue-400" : ""}`} />
                {item.name}
              </Link>
            );
          })}
          
          {user?.role === 'admin' && (
            <>
              <div className="border-t border-slate-800 my-3 mx-2" />
              <div className="px-2 mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</p>
              </div>
              {adminNavItems.map((item) => {
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                      ${isActive
                        ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 shadow-sm"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      }
                    `}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? "text-blue-400" : ""}`} />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}

          <div className="border-t border-slate-800 my-3 mx-2" />
          {otherNavItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-blue-400" : ""}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.full_name?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => { await api.auth.logout('/'); })}>
                  <LogOut className="w-4 h-4 mr-2" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 w-full px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" /> Login
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top bar - mobile */}
        <header className="lg:hidden sticky top-0 z-30 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <PawPrint className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-white">Paws & Claws</span>
            </div>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>

      <PremiumUnlockedDialog 
        open={showPremiumUnlocked} 
        onOpenChange={(open) => {
          setShowPremiumUnlocked(open);
          if (!open) {
            // Refresh user state after closing
            api.auth.me().then(setUser).catch(() => {});
          }
        }} 
      />

      <NotificationPermissionDeniedModal 
        open={showPermissionDeniedModal}
        onOpenChange={setShowPermissionDeniedModal}
      />

      <InstallPrompt />
    </div>
  );
}