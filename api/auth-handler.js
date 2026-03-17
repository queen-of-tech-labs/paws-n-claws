// Serves the Firebase OAuth popup handler page with config injected from env vars.
// Firebase Google sign-in popup navigates to /__/auth/handler — Vercel's catch-all
// rewrite was sending it to index.html instead. This function serves the correct page.
export default function handler(req, res) {
  const config = {
    apiKey:            process.env.VITE_FIREBASE_API_KEY,
    authDomain:        'paws-n-claws.vercel.app',
    projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.VITE_FIREBASE_APP_ID,
  };

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Signing in...</title>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
  <style>
    body {
      background: #0f172a;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #94a3b8; font-size: 15px;
    }
  </style>
</head>
<body>
  <p>Completing sign-in…</p>
  <script>
    // Initialize Firebase so the auth SDK can handle the OAuth popup callback.
    // Firebase navigates the popup window here, resolves the credential,
    // then passes it back to the parent window via postMessage automatically.
    const app = firebase.initializeApp(${JSON.stringify(config)});
    const auth = firebase.auth(app);
    // The Firebase auth SDK takes it from here — no extra code needed.
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(html);
}
