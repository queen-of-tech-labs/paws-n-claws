import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fbAuth, auth as authHelpers } from '@/api/firebaseClient';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { PawPrint, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Extract email from a URL string's query params
function extractEmailFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.searchParams.get('email');
  } catch (_) {
    return null;
  }
}

// Extract email from hash portion e.g. /#/login?email=foo@bar.com
function extractEmailFromHash(hash) {
  try {
    const hashContent = hash.replace(/^#\/?/, '');
    const queryStart = hashContent.indexOf('?');
    if (queryStart === -1) return null;
    const params = new URLSearchParams(hashContent.substring(queryStart + 1));
    return params.get('email');
  } catch (_) {
    return null;
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [needsEmail, setNeedsEmail] = useState(false);
  const [pendingUrl, setPendingUrl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fullUrl = window.location.href;
    let urlToCheck = null;

    // Check if the current URL is a Firebase magic link
    if (isSignInWithEmailLink(fbAuth, fullUrl)) {
      urlToCheck = fullUrl;
    } else if (window.location.hash) {
      // HashRouter puts the real path in the hash — reconstruct and check
      try {
        const hashPath = window.location.hash.replace('#/', '');
        const reconstructed = 'https://paws-n-claws.vercel.app/' + hashPath;
        if (isSignInWithEmailLink(fbAuth, reconstructed)) {
          urlToCheck = reconstructed;
        }
      } catch (_) {}
    }

    if (!urlToCheck) return; // Not a magic link — show normal login form

    // Try every possible source for the email, in order of reliability:
    // 1. Embedded in the URL itself (most reliable — survives app restarts)
    // 2. localStorage (set when the link was sent on this device)
    // 3. sessionStorage (backup)
    const emailFromUrl =
      extractEmailFromUrl(urlToCheck) ||
      extractEmailFromUrl(fullUrl) ||
      extractEmailFromHash(window.location.hash);

    const savedEmail =
      emailFromUrl ||
      window.localStorage.getItem('emailForSignIn') ||
      window.sessionStorage.getItem('emailForSignIn');

    if (savedEmail) {
      completeSignIn(savedEmail, urlToCheck);
    } else {
      // Last resort — show a clean input form (no ugly browser prompt)
      setNeedsEmail(true);
      setPendingUrl(urlToCheck);
    }
  }, []);

  const completeSignIn = (emailAddr, url) => {
    setLoading(true);
    setError('');
    signInWithEmailLink(fbAuth, emailAddr, url)
      .then(() => {
        window.localStorage.removeItem('emailForSignIn');
        window.sessionStorage.removeItem('emailForSignIn');
        // AuthContext picks up the signed-in user → App.jsx redirects to /dashboard
      })
      .catch((err) => {
        setError('Sign-in failed: ' + err.message);
        setLoading(false);
        setNeedsEmail(false);
        setPendingUrl(null);
      });
  };

  const handleConfirmEmail = (e) => {
    e.preventDefault();
    if (!email || !pendingUrl) return;
    completeSignIn(email, pendingUrl);
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await authHelpers.redirectToLogin();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      window.localStorage.setItem('emailForSignIn', email);
      window.sessionStorage.setItem('emailForSignIn', email);
      await authHelpers.sendMagicLink(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // ── Signing in automatically ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <PawPrint className="w-7 h-7 text-white" />
          </div>
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          <p className="text-slate-400 text-sm">Signing you in…</p>
        </div>
      </div>
    );
  }

  // ── Opened on a different device — need email confirmation ────────────────
  if (needsEmail) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4">
              <PawPrint className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Paws & Claws</h1>
            <p className="text-slate-400 text-sm mt-1">Confirm your email to continue</p>
          </div>
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
            <p className="text-slate-400 text-sm mb-4">
              It looks like you opened this link on a different device. Please enter your email to finish signing in.
            </p>
            <form onSubmit={handleConfirmEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" disabled={!email} className="w-full bg-blue-600 hover:bg-blue-700">
                <Mail className="w-4 h-4 mr-2" />
                Complete Sign In
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal login form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4">
            <PawPrint className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Paws & Claws</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
              <p className="text-slate-400 text-sm">
                We sent a magic link to <strong className="text-white">{email}</strong>. Tap it to sign in instantly — no password needed.
              </p>
              <button onClick={() => setSent(false)} className="mt-4 text-sm text-blue-400 hover:text-blue-300">
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <button onClick={handleGoogle} disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-medium transition mb-6 disabled:opacity-50">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-500">or sign in with email</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email address</label>
                  <Input type="email" placeholder="you@example.com" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" required />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button type="submit" disabled={loading || !email} className="w-full bg-blue-600 hover:bg-blue-700">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                  Send Magic Link
                </Button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-xs text-slate-500 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
