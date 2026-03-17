// Vercel serverless function — serves auth-callback page with Firebase config injected
// This keeps Firebase config values in Vercel env vars (safe) rather than hardcoded in HTML
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
  <title>Signing you in — Paws & Claws</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f172a; color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; flex-direction: column; gap: 16px;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 4px solid #334155; border-top-color: #3b82f6;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .logo { font-size: 32px; margin-bottom: 4px; }
    p { color: #94a3b8; font-size: 15px; }
    .error { color: #f87171; font-size: 14px; max-width: 300px; text-align: center; }
    .btn {
      margin-top: 12px; padding: 12px 24px;
      background: #3b82f6; color: white;
      border: none; border-radius: 10px;
      font-size: 15px; font-weight: 600;
      cursor: pointer; display: none; text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="logo">🐾</div>
  <div class="spinner" id="spinner"></div>
  <p id="msg">Signing you in…</p>
  <p class="error" id="error" style="display:none"></p>
  <a class="btn" id="openBtn" href="pawsclaws://login">Open Paws & Claws App</a>

  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
    import { getAuth, isSignInWithEmailLink, signInWithEmailLink } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

    const firebaseConfig = ${JSON.stringify(config)};
    firebaseConfig.authDomain = 'paws-n-claws.vercel.app';

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    function getParam(name) {
      const url = new URL(window.location.href);
      return url.searchParams.get(name);
    }

    function showError(msg) {
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('msg').style.display = 'none';
      document.getElementById('error').style.display = 'block';
      document.getElementById('error').textContent = msg;
      document.getElementById('openBtn').style.display = 'inline-block';
    }

    async function handleSignIn() {
      const currentUrl = window.location.href;

      if (!isSignInWithEmailLink(auth, currentUrl)) {
        showError('This link has expired or is invalid. Please request a new magic link from the app.');
        return;
      }

      const email = getParam('email')
        || localStorage.getItem('emailForSignIn')
        || sessionStorage.getItem('emailForSignIn')
        || window.prompt('Please enter your email to confirm sign-in:');

      if (!email) { showError('Email is required to complete sign-in.'); return; }

      try {
        await signInWithEmailLink(auth, email, currentUrl);

        // Store email so the app's Login.jsx can find it when it opens
        localStorage.setItem('emailForSignIn', email);
        localStorage.setItem('pendingAuthEmail', email);

        document.getElementById('spinner').style.display = 'none';
        document.getElementById('msg').textContent = '✓ Signed in! Opening the app…';

        // Open the app via custom URI scheme
        window.location.href = 'pawsclaws://login?email=' + encodeURIComponent(email);

        // Fallback: redirect to web dashboard after 2.5s if app didn't open
        setTimeout(() => {
          window.location.replace('https://paws-n-claws.vercel.app/#/dashboard');
        }, 2500);

      } catch (err) {
        console.error(err);
        showError('Sign-in failed: ' + err.message + '. Please try requesting a new link.');
      }
    }

    handleSignIn();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
