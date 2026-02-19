import React, { useEffect, useState } from "react";
import api from '@/api/firebaseClient';
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils/index";
import { Button } from "@/components/ui/button";
import {
  PawPrint, Heart, FileText, Calendar, MapPin, Zap,
  CheckCircle2, ArrowRight, Menu, X, ChevronDown, Lock
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { initializeOneSignal } from "@/components/services/oneSignalService";

const features = [
  {
    icon: PawPrint,
    title: "Pet Profiles",
    description: "Create detailed profiles for all your pets with photos, medical info, and more"
  },
  {
    icon: Heart,
    title: "Care Tracking",
    description: "Never miss a vaccination, medication, or grooming appointment again"
  },
  {
    icon: FileText,
    title: "Health Records",
    description: "Keep all medical documents and vet records in one secure place"
  },
  {
    icon: Calendar,
    title: "Appointments",
    description: "Schedule and manage vet visits with automatic reminders"
  },
  {
    icon: MapPin,
    title: "Find Vets",
    description: "Discover local veterinarians and emergency clinics near you"
  },
  {
    icon: Zap,
    title: "AI Assistant",
    description: "Get 24/7 pet care advice from an intelligent AI companion"
  }
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountDisabled, setAccountDisabled] = useState(false);
  const [disabledReason, setDisabledReason] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize OneSignal on app load (SDK loaded via CDN in index.html)
    console.log('🚀 App loaded - ensuring OneSignal is initialized');
    (async () => {
      try {
        await initializeOneSignal();
        console.log('✅ OneSignal initialization complete - safe to request permissions');
      } catch (error) {
        console.error('❌ OneSignal initialization failed:', error);
      }
    })();

    api.auth.me().then((u) => {
      setUser(u);
      // Check account status
      if (u) {
        if (u.account_status === 'suspended' || u.account_status === 'banned') {
          setAccountDisabled(true);
          setDisabledReason(u.account_status);
          return;
        }
        // If user is logged in (but not admin), redirect them to dashboard
        if (u.role !== 'admin') {
          navigate(createPageUrl("Dashboard"));
        }
      }
    }).catch(() => {});
  }, [navigate]);

  if (accountDisabled) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <Card className="border-red-900 bg-red-950 max-w-md w-full">
          <CardContent className="pt-8">
            <div className="flex justify-center mb-4">
              <Lock className="w-12 h-12 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-red-400 text-center mb-3">Account Disabled</h1>
            <p className="text-red-300 text-center mb-6">
              {disabledReason === 'banned' 
                ? 'Your account has been banned. Please contact support for more information.'
                : 'Your account has been suspended. Please contact support for more information.'}
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-y-scroll">
      <style>{`
        html {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        html::-webkit-scrollbar {
          display: none !important;
        }
        body {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        body::-webkit-scrollbar {
          display: none !important;
        }
      `}</style>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <PawPrint className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg">Paws & Claws</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition">Features</a>
            <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition">Pricing</a>
            <a href="#about" className="text-sm text-slate-400 hover:text-white transition">About</a>
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link to={createPageUrl("Dashboard")}>
                <Button className="bg-blue-600 hover:bg-blue-700">Dashboard</Button>
              </Link>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition"
                >
                  Get Started Free
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900">
            <div className="px-6 py-4 space-y-3">
              <a href="#features" className="block text-sm text-slate-400 hover:text-white py-2">Features</a>
              <a href="#pricing" className="block text-sm text-slate-400 hover:text-white py-2">Pricing</a>
              <a href="#about" className="block text-sm text-slate-400 hover:text-white py-2">About</a>
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition"
                >
                  Get Started Free
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <img
              src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&h=600&fit=crop"
              alt="Happy pets"
              className="rounded-2xl shadow-2xl border border-slate-800"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Your Pet's Health & Wellness,
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> All in One Place</span>
            </h1>

            <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
              Track health records, manage appointments, find local vets, and give your furry family the care they deserve—all from one easy-to-use app.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                Get Started Free <ArrowRight className="w-4 h-4" />
              </button>
              <a href="#features" className="px-8 py-3 border border-slate-700 hover:border-slate-600 rounded-lg font-medium transition">
                Learn More
              </a>
            </div>
          </motion.div>
        </div>

        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl -z-10"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl -z-10"></div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-center">Everything You Need</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-center">
              Comprehensive tools designed to make pet care simple, organized, and stress-free
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="group p-8 rounded-2xl border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-slate-400">Start free, upgrade anytime for premium features</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-2xl border border-slate-800 bg-slate-900/50"
          >
            <h3 className="text-2xl font-bold mb-2">Free</h3>
            <p className="text-4xl font-bold mb-6">$0<span className="text-lg text-slate-400">/month</span></p>
            <ul className="space-y-3 mb-8">
              {["Up to 2 pets", "Basic care tracking", "Health records storage", "Appointment reminders", "Find a Vet", "Community rescues access"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-3 border border-slate-700 hover:border-slate-600 rounded-lg font-medium transition"
            >
              Get Started
            </button>
          </motion.div>

          {/* Premium */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-8 rounded-2xl border-2 border-blue-500/50 bg-gradient-to-b from-blue-500/10 to-slate-900/50 relative"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">Most Popular</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">Premium</h3>
            <p className="text-4xl font-bold mb-6">$6.99<span className="text-lg text-slate-400">/month</span></p>
            <ul className="space-y-3 mb-8">
              {["Unlimited Pets", "Community Pet Parent Forum", "Detailed Pet Care Guides", "Vet Network", "24/7 AI Pet Assistant", "Symptom Checker"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={async () => {
                if (!user) {
                  navigate('/login');
                  return;
                }
                try {
                  const response = await api.functions.invoke('createCheckoutSession', {
                    priceId: 'price_1T2GVUJKBH02BiIFrQGvTDlQ',
                    mode: 'subscription',
                    successUrl: window.location.origin + createPageUrl("Dashboard"),
                    cancelUrl: window.location.origin + createPageUrl("Home")
                  });
                  if (response.data?.url) {
                    window.location.href = response.data.url;
                  } else {
                    alert('Failed to start checkout. Please try again.');
                  }
                } catch (error) {
                  console.error('Checkout error:', error);
                  alert('Failed to start checkout. Please try again.');
                }
              }}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
            >
              Upgrade to Premium
            </button>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-6">Ready to give your pet the best care?</h2>
            <p className="text-slate-400 mb-8 text-lg">Join thousands of pet parents who trust PawCare</p>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition inline-flex items-center gap-2"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <PawPrint className="w-5 h-5" />
              </div>
              <span className="font-bold">Paws & Claws</span>
            </div>
            <p className="text-sm text-slate-500">© 2026 Paws & Claws. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}