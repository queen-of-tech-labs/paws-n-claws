import React, { useEffect, useState } from "react";
import api from '@/api/firebaseClient';
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils/index";
import { openCheckoutUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  PawPrint, Heart, FileText, Calendar, MapPin, Zap,
  CheckCircle2, ArrowRight, Menu, X, Lock, ClipboardList, AlertTriangle, Radio
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { initializeOneSignal } from "@/components/services/oneSignalService";
import { useAuth } from '@/lib/AuthContext';
import { fbAuth } from '@/api/firebaseClient';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';

const features = [
  { icon: PawPrint, title: "Pet Profiles", description: "Create detailed profiles for all your pets with photos, medical info, and more" },
  { icon: Heart, title: "Care Tracking", description: "Never miss a vaccination, medication, or grooming appointment again" },
  { icon: FileText, title: "Health Records", description: "Keep all medical documents and vet records in one secure place" },
  { icon: Calendar, title: "Appointments", description: "Schedule and manage vet visits with automatic reminders" },
  { icon: MapPin, title: "Find Vets", description: "Discover local veterinarians and emergency clinics near you" },
  { icon: Zap, title: "AI Assistant", description: "Get 24/7 pet care advice from an intelligent AI companion" },
  { icon: AlertTriangle, title: "Lost Pet Flyer", description: "Generate a professional missing pet flyer in seconds directly from your pet's profile" },
  { icon: ClipboardList, title: "Health Passport", description: "Share a beautiful digital health record with vets, sitters, and groomers instantly" },
  { icon: Radio, title: "Lost Pet Network", description: "Post live alerts and receive community sightings when your pet goes missing" },
];

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

export default function Home() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountDisabled, setAccountDisabled] = useState(false);
  const [disabledReason, setDisabledReason] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => { try { await initializeOneSignal(); } catch (e) {} })();

    // Handle magic link callback — email links land on home page first
    if (isSignInWithEmailLink(fbAuth, window.location.href)) {
      let emailForSignIn = window.localStorage.getItem('emailForSignIn');
      if (!emailForSignIn) {
        emailForSignIn = window.prompt('Please provide your email for confirmation');
      }
      signInWithEmailLink(fbAuth, emailForSignIn, window.location.href)
        .then(() => {
          window.localStorage.removeItem('emailForSignIn');
          // Auth state change will trigger redirect in second useEffect
        })
        .catch((err) => {
          console.error('Magic link error:', err);
        });
    }
  }, []);

  useEffect(() => {
    if (!isLoadingAuth) {
      if (user) {
        if (user.account_status === 'suspended' || user.account_status === 'banned') {
          setAccountDisabled(true);
          setDisabledReason(user.account_status);
          return;
        }
        // User is logged in — check for pending action then go to dashboard
        const pending = window.localStorage.getItem('pendingAction');
        if (pending === 'upgrade') {
          window.localStorage.removeItem('pendingAction');
          navigate('/account');
        } else {
          navigate('/dashboard');
        }
      }
    }
  }, [user, isLoadingAuth, navigate]);

  const startCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const response = await api.functions.invoke('createCheckoutSession', {
        priceId: 'price_1T2GVUJKBH02BiIFrQGvTDlQ',
        mode: 'subscription',
        successUrl: 'https://paws-n-claws.vercel.app/#/dashboard',
        cancelUrl: 'https://paws-n-claws.vercel.app/#/'
      });
      if (response.data?.url) {
        openCheckoutUrl(response.data.url);
      } else {
        alert('Failed to start checkout. Please try again.');
      }
    } catch (error) {
      alert('Checkout error: ' + error.message);
    }
    setCheckoutLoading(false);
  };

  const handleUpgrade = () => {
    if (!user) {
      window.localStorage.setItem('pendingAction', 'upgrade');
      navigate('/login');
    } else {
      navigate('/account');
    }
  };

  if (accountDisabled) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <Card className="border-red-900 bg-red-950 max-w-md w-full">
          <CardContent className="pt-8">
            <div className="flex justify-center mb-4"><Lock className="w-12 h-12 text-red-400" /></div>
            <h1 className="text-2xl font-bold text-red-400 text-center mb-3">Account Disabled</h1>
            <p className="text-red-300 text-center mb-6">
              {disabledReason === 'banned' ? 'Your account has been banned.' : 'Your account has been suspended.'} Please contact support.
            </p>
            <Button onClick={() => navigate('/')} className="w-full bg-red-600 hover:bg-red-700">Logout</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-y-scroll">
      <style>{`html,body{scrollbar-width:none;-ms-overflow-style:none;}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none!important;}`}</style>

      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="Paws & Claws" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg">Paws & Claws</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('features')} className="text-sm text-slate-400 hover:text-white transition">Features</button>
            <button onClick={() => scrollTo('pricing')} className="text-sm text-slate-400 hover:text-white transition">Pricing</button>
            <button onClick={() => scrollTo('about')} className="text-sm text-slate-400 hover:text-white transition">About</button>
          </div>
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link to={createPageUrl("Dashboard")}><Button className="bg-blue-600 hover:bg-blue-700">Dashboard</Button></Link>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition">Sign In</button>
                <button onClick={() => navigate('/login')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition">Get Started Free</button>
              </>
            )}
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900">
            <div className="px-6 py-4 space-y-3">
              <button onClick={() => { scrollTo('features'); setMobileMenuOpen(false); }} className="block w-full text-left text-sm text-slate-400 hover:text-white py-2">Features</button>
              <button onClick={() => { scrollTo('pricing'); setMobileMenuOpen(false); }} className="block w-full text-left text-sm text-slate-400 hover:text-white py-2">Pricing</button>
              <button onClick={() => { scrollTo('about'); setMobileMenuOpen(false); }} className="block w-full text-left text-sm text-slate-400 hover:text-white py-2">About</button>
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <button onClick={() => navigate('/login')} className="w-full px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition">Sign In</button>
                <button onClick={() => navigate('/login')} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition">Get Started Free</button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <section className="relative overflow-hidden pt-20 pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-16">
            <img src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&h=600&fit=crop" alt="Happy pets" className="rounded-2xl shadow-2xl border border-slate-800" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Your Pet's Health & Wellness,
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> All in One Place</span>
            </h1>
            <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">Track health records, manage appointments, find local vets, and give your furry family the care they deserve.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => navigate('/login')} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition flex items-center justify-center gap-2">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => scrollTo('features')} className="px-8 py-3 border border-slate-700 hover:border-slate-600 rounded-lg font-medium transition">Learn More</button>
            </div>
          </motion.div>
        </div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl -z-10"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl -z-10"></div>
      </section>

      <section id="features" className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-center">Everything You Need</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-center">Comprehensive tools designed to make pet care simple, organized, and stress-free</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} viewport={{ once: true }}
                className="group p-8 rounded-2xl border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 transition-all">
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

      <section id="pricing" className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-slate-400">Start free, upgrade anytime for premium features</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-8 rounded-2xl border border-slate-800 bg-slate-900/50">
            <h3 className="text-2xl font-bold mb-2">Free</h3>
            <p className="text-4xl font-bold mb-6">$0<span className="text-lg text-slate-400">/month</span></p>
            <ul className="space-y-3 mb-8">
              {["Up to 2 pets", "Basic care tracking", "Health records storage", "Appointment reminders", "Find a Vet", "Community rescues access", "Lost Pet Flyer Generator"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-300"><CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />{item}</li>
              ))}
            </ul>
            <button onClick={() => navigate('/login')} className="w-full px-6 py-3 border border-slate-700 hover:border-slate-600 rounded-lg font-medium transition">Get Started</button>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="p-8 rounded-2xl border-2 border-blue-500/50 bg-gradient-to-b from-blue-500/10 to-slate-900/50 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">Most Popular</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">Premium</h3>
            <p className="text-4xl font-bold mb-6">$6.99<span className="text-lg text-slate-400">/month</span></p>
            <ul className="space-y-3 mb-8">
              {["Unlimited Pets", "Community Pet Parent Forum", "Detailed Pet Care Guides", "Vet Network", "24/7 AI Pet Assistant", "Symptom Checker", "Digital Pet Health Passport", "Lost Pet Recovery Network"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-300"><CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />{item}</li>
              ))}
            </ul>
            <button onClick={handleUpgrade} disabled={checkoutLoading} className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition disabled:opacity-50">
              {checkoutLoading ? 'Loading...' : 'Upgrade to Premium'}
            </button>
          </motion.div>
        </div>
      </section>

      <section id="about" className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl font-bold mb-6">Ready to give your pet the best care?</h2>
            <p className="text-slate-400 mb-8 text-lg">Join thousands of pet parents who trust Paws & Claws</p>
            <button onClick={() => navigate('/login')} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition inline-flex items-center gap-2">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="Paws & Claws" className="w-8 h-8 object-contain" />
              <span className="font-bold">Paws & Claws</span>
            </div>
            <p className="text-sm text-slate-500">© 2026 Paws & Claws. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
