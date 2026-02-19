# 🐾 Paws & Claws Companion
### React + Vite + Firebase + OneSignal — Deploy to Vercel

---

## 🚀 Setup Guide

### Step 1 — Install dependencies
```bash
npm install
```

### Step 2 — Connect Firebase
```bash
cp .env.example .env
```
Fill in your Firebase credentials from:
**Firebase Console → Project Settings → Your Apps → SDK setup**

### Step 3 — Run locally
```bash
npm run dev
```

---

## 🌐 Deploy to Vercel (No command line needed!)

### 1. Push your code to GitHub
- Create a free account at [github.com](https://github.com)
- Create a new repository
- Upload your project files

### 2. Connect to Vercel
- Go to [vercel.com](https://vercel.com) and sign up (free)
- Click **Add New Project**
- Import your GitHub repository
- Vercel auto-detects it as a Vite project

### 3. Add Environment Variables
In the Vercel dashboard before deploying, click **Environment Variables** and add:

| Name | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | From Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | From Firebase Console |
| `VITE_FIREBASE_PROJECT_ID` | From Firebase Console |
| `VITE_FIREBASE_STORAGE_BUCKET` | From Firebase Console |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase Console |
| `VITE_FIREBASE_APP_ID` | From Firebase Console |
| `ONESIGNAL_REST_API_KEY` | From OneSignal → Settings → Keys & IDs |

### 4. Deploy!
Click **Deploy** — Vercel builds and deploys automatically. Done!

---

## 🔔 OneSignal Setup (2 steps)

### 1. Add your site URL to OneSignal
- Go to **OneSignal Dashboard → Settings → Platforms → Web Push**
- Add your Vercel URL (e.g. `https://your-app.vercel.app`)
- Set Service Worker Path to `/OneSignalSDKWorker.js`

### 2. Add authorized domain to Firebase
- Go to **Firebase Console → Authentication → Settings → Authorized domains**
- Add your Vercel URL (e.g. `your-app.vercel.app`)

That's it! Push notifications will work automatically.

---

## 🔔 How Push Notifications Work

| Trigger | Notification |
|---|---|
| Reminder due today | 🐾 "[Reminder name] — Due today for [Pet]" |
| Care log overdue | ⚠️ "Overdue Care Alert — [Pet]'s [care] is overdue" |
| Admin broadcast | Custom message to all users |

**Admin broadcast panel** is at the bottom of **Admin → Users** page.

---

## 📁 Key Files

| File | Purpose |
|---|---|
| `src/api/firebaseClient.js` | Firebase client — auth, Firestore, Storage |
| `src/components/services/oneSignalService.jsx` | OneSignal init, permissions, notification triggers |
| `api/send-notification.js` | Vercel serverless function — calls OneSignal REST API securely |
| `public/OneSignalSDKWorker.js` | Required service worker for push notifications |
| `vercel.json` | Vercel routing configuration |
| `.env.example` | Environment variable template |
