// Serves the Firebase OAuth popup handler page with config injected from env vars.
export default function handler(req, res) {
  const config = {
    apiKey:            process.env.VITE_FIREBASE_API_KEY,
    authDomain:        'paws-claws-pet-tracker-3t0ana.firebaseapp.com',
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
      color: #94a3b8; font-size: 15px; flex-direction: column; gap: 12px;
    }
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid #1e293b; border-top-color: #3b82f6;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <p>Completing sign-in…</p>
  <script>
    try {
      // Initialize Firebase with the injected config
      const app = firebase.initializeApp(${JSON.stringify(config)});
      const auth = firebase.auth(app);

      // getRedirectResult processes the OAuth response in the popup window
      // and automatically passes the credential back to the opener window.
      auth.getRedirectResult()
        .then((result) => {
          // If there's a result, the opener will receive it via Firebase's internal
          // messaging. The popup closes itself automatically after this.
          if (!result || !result.user) {
            // No redirect result — this is a popup flow, Firebase handles it internally
            // Just make sure we don't close prematurely
          }
        })
        .catch((error) => {
          console.error('Auth handler error:', error);
          // Post error back to opener so it can show a message
          if (window.opener) {
            window.opener.postMessage(
              { type: 'firebaseAuthError', error: error.message },
              window.location.origin
            );
          }
          window.close();
        });
    } catch (e) {
      console.error('Firebase init error:', e);
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(html);
}
