// Vercel serverless function — /auth-callback
// Firebase sends the user here after validating the magic link.
// This page: 1) completes sign-in, 2) stores auth state, 3) opens the app via custom scheme.
export default function handler(req, res) {
  const config = {
    apiKey:            process.env.VITE_FIREBASE_API_KEY,
    projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.VITE_FIREBASE_APP_ID,
  };

  // Get email from query param if present (we embed it in continueUrl)
  const emailFromQuery = req.query.email || '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Signing you in — Paws & Claws</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f172a; color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; flex-direction: column; gap: 16px; padding: 24px;
      text-align: center;
    }
    .spinner {
      width: 48px; height: 48px;
      border: 4px solid #1e293b; border-top-color: #3b82f6;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 20px; font-weight: 600; }
    p { color: #94a3b8; font-size: 15px; max-width: 300px; line-height: 1.5; }
    .error { color: #f87171; }
    .btn {
      padding: 14px 28px; background: #3b82f6; color: white;
      border: none; border-radius: 12px; font-size: 16px; font-weight: 600;
      cursor: pointer; text-decoration: none; display: inline-block; margin-top: 8px;
    }
    .btn-secondary {
      padding: 12px 24px; background: transparent; color: #64748b;
      border: 1px solid #334155; border-radius: 12px; font-size: 14px;
      cursor: pointer; text-decoration: none; display: inline-block;
    }
    #actions { display: none; flex-direction: column; gap: 12px; align-items: center; margin-top: 8px; }
    #emailForm { display: none; flex-direction: column; gap: 12px; width: 100%; max-width: 320px; margin-top: 8px; }
    input {
      padding: 12px 16px; background: #1e293b; border: 1px solid #334155;
      border-radius: 10px; color: white; font-size: 15px; width: 100%;
    }
    input::placeholder { color: #475569; }
  </style>
</head>
<body>
  <div style="font-size:40px">🐾</div>
  <div class="spinner" id="spinner"></div>
  <h2 id="title">Signing you in…</h2>
  <p id="msg">Please wait a moment.</p>

  <div id="actions">
    <a class="btn" id="openAppBtn" href="pawsclaws://login">Open Paws &amp; Claws App</a>
    <a class="btn-secondary" id="webBtn" href="https://paws-n-claws.vercel.app/#/dashboard">Continue in browser instead</a>
  </div>

  <div id="emailForm">
    <p style="color:#94a3b8;font-size:14px;">Enter the email you used to request the sign-in link:</p>
    <input type="email" id="emailInput" placeholder="you@example.com" />
    <button class="btn" onclick="submitEmail()">Confirm &amp; Sign In</button>
  </div>

  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
    import { getAuth, isSignInWithEmailLink, signInWithEmailLink } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

    const firebaseConfig = ${JSON.stringify(config)};
    firebaseConfig.authDomain = 'paws-n-claws.vercel.app';

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // Make submitEmail available globally
    window._auth = auth;
    window._signInWithEmailLink = signInWithEmailLink;

    function show(id) { document.getElementById(id).style.display = 'flex'; }
    function hide(id) { document.getElementById(id).style.display = 'none'; }
    function setText(id, text) { document.getElementById(id).textContent = text; }

    function showError(msg) {
      hide('spinner');
      setText('title', 'Sign-in failed');
      document.getElementById('msg').innerHTML = '<span class="error">' + msg + '</span><br><br>Please go back to the app and request a new magic link.';
    }

    function showSuccess(email) {
      hide('spinner');
      setText('title', 'Signed in!');
      setText('msg', 'Opening Paws & Claws…');

      // Update the open button with email param
      document.getElementById('openAppBtn').href = 'pawsclaws://login?email=' + encodeURIComponent(email);

      // Try to open the app
      window.location.href = 'pawsclaws://login?email=' + encodeURIComponent(email);

      // Show manual button after 2s in case app didn't open
      setTimeout(() => {
        setText('msg', 'If the app didn\\'t open automatically, tap the button below.');
        show('actions');
      }, 2000);
    }

    async function doSignIn(email) {
      try {
        await window._signInWithEmailLink(window._auth, email, window.location.href);
        // Save for app to pick up
        localStorage.setItem('pendingAuthEmail', email);
        localStorage.setItem('emailForSignIn', email);
        showSuccess(email);
      } catch (err) {
        console.error('Sign-in error:', err);
        if (err.code === 'auth/invalid-action-code') {
          showError('This link has already been used or has expired.');
        } else {
          showError(err.message);
        }
      }
    }

    window.submitEmail = async function() {
      const email = document.getElementById('emailInput').value.trim();
      if (!email) return;
      hide('emailForm');
      show('spinner');
      setText('title', 'Signing you in…');
      await doSignIn(email);
    };

    async function init() {
      const currentUrl = window.location.href;

      if (!isSignInWithEmailLink(auth, currentUrl)) {
        showError('This link is invalid or has expired.');
        return;
      }

      // Try to get email: from URL param (we embed it), then localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const email = urlParams.get('email')
        || '${emailFromQuery}'
        || localStorage.getItem('emailForSignIn')
        || localStorage.getItem('pendingAuthEmail')
        || sessionStorage.getItem('emailForSignIn');

      if (email && email !== 'undefined' && email !== 'null') {
        await doSignIn(email);
      } else {
        // Ask user for email — show a clean form, not a browser prompt
        hide('spinner');
        setText('title', 'One more step');
        hide('msg');
        show('emailForm');
      }
    }

    init();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(html);
}
