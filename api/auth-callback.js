// Vercel serverless function — serves auth-callback page with Firebase config injected
// Handles TWO types of Firebase action links:
//   1. Email ADDRESS VERIFICATION  (mode=verifyEmail) — from signUp flow
//   2. Magic link SIGN-IN          (mode=signIn)       — from passwordless sign-in
export default function handler(req, res) {
  const config = {
    apiKey:            process.env.VITE_FIREBASE_API_KEY,
    projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.VITE_FIREBASE_APP_ID,
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Paws & Claws</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f172a; color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; flex-direction: column; gap: 16px; padding: 24px;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 4px solid #334155; border-top-color: #3b82f6;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .logo { font-size: 40px; margin-bottom: 4px; }
    .title { font-size: 18px; font-weight: 600; color: #fff; }
    p { color: #94a3b8; font-size: 15px; text-align: center; max-width: 300px; }
    .success { color: #4ade80; font-size: 15px; text-align: center; }
    .error { color: #f87171; font-size: 14px; max-width: 300px; text-align: center; }
    .btn {
      margin-top: 8px; padding: 14px 28px;
      background: #3b82f6; color: white;
      border: none; border-radius: 12px;
      font-size: 15px; font-weight: 600;
      cursor: pointer; display: none; text-decoration: none;
      text-align: center;
    }
    .btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="logo">🐾</div>
  <div class="spinner" id="spinner"></div>
  <p class="title" id="title">Just a moment…</p>
  <p id="msg"></p>
  <p class="success" id="success" style="display:none"></p>
  <p class="error" id="error" style="display:none"></p>
  <a class="btn" id="openBtn" href="https://paws-n-claws.vercel.app/#/dashboard">Open Paws &amp; Claws App</a>

  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
    import {
      getAuth,
      applyActionCode,
      isSignInWithEmailLink,
      signInWithEmailLink
    } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

    const firebaseConfig = ${JSON.stringify(config)};
    firebaseConfig.authDomain = 'paws-n-claws.vercel.app';

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // Firebase puts mode, oobCode in the query string of the action URL
    function getParam(name) {
      return new URL(window.location.href).searchParams.get(name);
    }

    function hideSpinner() {
      document.getElementById('spinner').style.display = 'none';
    }

    function showSuccess(title, msg, autoRedirect) {
      hideSpinner();
      document.getElementById('title').textContent = title;
      document.getElementById('success').textContent = msg;
      document.getElementById('success').style.display = 'block';
      document.getElementById('openBtn').style.display = 'inline-block';
      // Auto-redirect after 3s so users don't have to tap anything
      if (autoRedirect) {
        let count = 3;
        document.getElementById('msg').textContent = 'Redirecting in ' + count + '…';
        document.getElementById('msg').style.color = '#64748b';
        const timer = setInterval(() => {
          count--;
          if (count <= 0) {
            clearInterval(timer);
            window.location.href = 'https://paws-n-claws.vercel.app/#/dashboard';
          } else {
            document.getElementById('msg').textContent = 'Redirecting in ' + count + '…';
          }
        }, 1000);
      }
    }

    function showError(msg) {
      hideSpinner();
      document.getElementById('title').textContent = 'Something went wrong';
      document.getElementById('error').textContent = msg;
      document.getElementById('error').style.display = 'block';
      document.getElementById('openBtn').style.display = 'inline-block';
    }

    async function handleAction() {
      const mode    = getParam('mode');
      const oobCode = getParam('oobCode');

      // ── MODE: verifyEmail ────────────────────────────────────────────────
      // Triggered when user clicks the email verification link after sign-up.
      // applyActionCode marks the email verified in Firebase.
      // The app's auto-poll (every 4s) detects this and logs the user in.
      if (mode === 'verifyEmail') {
        if (!oobCode) { showError('Invalid verification link — missing code.'); return; }
        try {
          document.getElementById('title').textContent = 'Verifying your email…';
          await applyActionCode(auth, oobCode);
          showSuccess(
            '✓ Email verified!',
            'Your email is confirmed. Opening the app automatically…',
            true
          );
        } catch (err) {
          console.error('verifyEmail error:', err);
          if (err.code === 'auth/invalid-action-code') {
            showError('This link has already been used or has expired. Please request a new verification email from the app.');
          } else {
            showError('Verification failed: ' + err.message);
          }
        }
        return;
      }

      // ── MODE: resetPassword ──────────────────────────────────────────────
      if (mode === 'resetPassword') {
        document.getElementById('title').textContent = 'Redirecting…';
        // Redirect to web app with reset params — app's deep link handler picks it up
        setTimeout(() => {
          window.location.href = 'https://paws-n-claws.vercel.app/#/login?mode=resetPassword&oobCode=' + encodeURIComponent(oobCode || '');
        }, 500);
        showSuccess('Password Reset', 'Opening the app to complete your reset…', false);
        return;
      }

      // ── MODE: signIn (magic/passwordless link) ───────────────────────────
      if (mode === 'signIn' || isSignInWithEmailLink(auth, window.location.href)) {
        const email = getParam('email')
          || localStorage.getItem('emailForSignIn')
          || sessionStorage.getItem('emailForSignIn')
          || window.prompt('Please enter your email address to confirm sign-in:');

        if (!email) { showError('Email is required to complete sign-in.'); return; }

        try {
          document.getElementById('title').textContent = 'Signing you in…';
          await signInWithEmailLink(auth, email, window.location.href);
          localStorage.setItem('pendingAuthEmail', email);
          localStorage.removeItem('emailForSignIn');

          showSuccess('✓ Signed in!', 'Opening the app…');
          window.location.href = 'pawsclaws://login?email=' + encodeURIComponent(email);

          setTimeout(() => {
            window.location.replace('https://paws-n-claws.vercel.app/#/dashboard');
          }, 2500);
        } catch (err) {
          console.error('signIn error:', err);
          showError('Sign-in failed: ' + err.message + '. Please request a new link from the app.');
        }
        return;
      }

      // ── Unknown mode ─────────────────────────────────────────────────────
      showError('Unknown link type. Please go back to the app and try again.');
    }

    handleAction();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
