import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
  signInWithEmailLink,
  sendSignInLinkToEmail,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ─────────────────────────────────────────────
// Firebase config
// Replace with your Firebase project credentials from:
// Firebase Console → Project Settings → Your Apps → SDK setup
// ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        'paws-n-claws.vercel.app',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app       = initializeApp(firebaseConfig);
const fbAuth    = getAuth(app);
const db        = getFirestore(app);
const fbStorage = getStorage(app);
const fbFunctions = getFunctions(app);

export { fbAuth, db, fbStorage, fbFunctions, Timestamp };

// ─────────────────────────────────────────────
// Auth helpers  (mirrors base44.auth.*)
// ─────────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();

export const auth = {
  /** Returns the current user with profile merged in */
  async me() {
    const user = fbAuth.currentUser;
    if (!user) return null;
    const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
    const profile = profileSnap.exists() ? profileSnap.data() : {};
    return {
      id: user.uid,
      email: user.email,
      full_name: user.displayName || profile.full_name,
      photo_url: user.photoURL,
      ...profile,
    };
  },

  /** Sign in with Google — native plugin on Android, popup on web */
  async redirectToLogin(redirectTo) {
    const isNative = !!(window.Capacitor?.isNativePlatform?.());
    if (isNative) {
      const { SocialLogin } = await import('@capgo/capacitor-social-login');
      await SocialLogin.initialize({ google: { webClientId: '264364776080-ig58tvhl9m7m6lp4eioa1qmpk2dc99l0.apps.googleusercontent.com' } });
      const result = await SocialLogin.login({ provider: 'google', options: {} });
      const idToken = result?.result?.idToken || result?.result?.authentication?.idToken;
      if (!idToken) throw new Error('No ID token returned from Google');
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(fbAuth, credential);
    } else {
      try {
        await signInWithPopup(fbAuth, googleProvider);
      } catch (error) {
        console.error('Google sign-in error:', error);
        throw error;
      }
    }
  },

  /** Send magic link email */
  async sendMagicLink(email, redirectTo) {
    // Always use the Vercel URL as the redirect — Firebase requires a whitelisted domain.
    // On Android the App Link intent-filter will intercept this URL and open the app.
    // On web it opens the browser normally and Login.jsx handles the sign-in.
    const actionCodeSettings = {
      url: 'https://paws-n-claws.vercel.app/#/login',
      handleCodeInApp: true,
      // Android package info tells Firebase to try to open the app directly
      android: {
        packageName: 'paws.claws.pet.tracker',
        installIfNotAvailable: false,
        minimumVersion: '1',
      },
    };
    await sendSignInLinkToEmail(fbAuth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  },

  /** Sign out */
  async logout(redirectTo) {
    await signOut(fbAuth);
    // navigation handled by caller
  },

  /** Update current user's profile */
  async updateMe(updates) {
    const user = fbAuth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const profileRef = doc(db, 'profiles', user.uid);
    await updateDoc(profileRef, { ...updates, updatedAt: serverTimestamp() });
    return updates;
  },

  /** Check if user is authenticated */
  async isAuthenticated() {
    return !!fbAuth.currentUser;
  },

  /** Subscribe to auth state changes */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(fbAuth, callback);
  },
};

// ─────────────────────────────────────────────
// Firestore entity helpers  (mirrors base44.entities.*)
// Each entity maps to a Firestore collection.
// ─────────────────────────────────────────────

// Map field names: Firestore uses camelCase timestamps
function normalizeOrder(orderStr = '-created_at') {
  const desc = orderStr.startsWith('-');
  const field = orderStr.replace(/^-/, '');
  // Normalise common snake_case field names to Firestore camelCase
  const fieldMap = { created_at: 'createdAt', created_date: 'createdAt' };
  return { field: fieldMap[field] || field, direction: desc ? 'desc' : 'asc' };
}

function docToEntity(docSnap) {
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

function makeEntity(collectionName) {
  const col = () => collection(db, collectionName);

  return {
    async list(orderStr = '-createdAt', maxResults = 100) {
      const { field, direction } = normalizeOrder(orderStr);
      const q = query(col(), orderBy(field, direction), limit(maxResults));
      const snap = await getDocs(q);
      return snap.docs.map(docToEntity);
    },

    async filter(filters = {}, orderStr = '-createdAt', maxResults = 100) {
      const { field, direction } = normalizeOrder(orderStr);
      const constraints = [orderBy(field, direction), limit(maxResults)];
      Object.entries(filters).forEach(([key, val]) => {
        constraints.unshift(where(key, '==', val));
      });
      const q = query(col(), ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map(docToEntity);
    },

    // filterOnly: filter without orderBy — avoids needing composite indexes.
    // Sort results in your component instead.
    async filterOnly(filters = {}, maxResults = 100) {
      const constraints = [limit(maxResults)];
      Object.entries(filters).forEach(([key, val]) => {
        constraints.push(where(key, '==', val));
      });
      const q = query(col(), ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map(docToEntity);
    },

    async get(id) {
      const snap = await getDoc(doc(db, collectionName, id));
      return docToEntity(snap);
    },

    async create(record) {
      const user = fbAuth.currentUser;
      const data = {
        ...record,
        created_by: user?.email || null,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(col(), data);
      return { id: ref.id, ...data };
    },

    async update(id, updates) {
      const ref = doc(db, collectionName, id);
      await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
      return { id, ...updates };
    },

    async delete(id) {
      await deleteDoc(doc(db, collectionName, id));
      return true;
    },
  };
}

export const entities = {
  Pet:              makeEntity('pets'),
  Appointment:      makeEntity('appointments'),
  CareLog:          makeEntity('careLogs'),
  HealthRecord:     makeEntity('healthRecords'),
  Reminder:         makeEntity('reminders'),
  Veterinarian:     makeEntity('veterinarians'),
  ForumPost:        makeEntity('forumPosts'),
  ForumReply:       makeEntity('forumReplies'),
  ForumCategory:    makeEntity('forumCategories'),
  PetCareGuide:     makeEntity('petCareGuides'),
  PetCareCategory:  makeEntity('petCareCategories'),
  RescueSuggestion: makeEntity('rescueSuggestions'),
  Conversation:     makeEntity('conversations'),
  Message:          makeEntity('messages'),
  User:             makeEntity('profiles'),
};

// ─────────────────────────────────────────────
// Firebase Functions  (mirrors base44.functions.invoke)
// ─────────────────────────────────────────────
export const functions = {
  async invoke(functionName, payload = {}) {
    const callable = httpsCallable(fbFunctions, functionName);
    const result = await callable(payload);
    return { data: result.data };
  },
};

// ─────────────────────────────────────────────
// AI / LLM  (mirrors base44.integrations.Core.InvokeLLM)
// Calls a Firebase Function that wraps your AI provider
// ─────────────────────────────────────────────
export const integrations = {
  Core: {
    async InvokeLLM({ prompt, response_json_schema, add_context_from_internet }) {
      const callable = httpsCallable(fbFunctions, 'invokeLLM');
      const result = await callable({ prompt, response_json_schema, add_context_from_internet });
      return result.data;
    },
  },
};

// ─────────────────────────────────────────────
// Storage  (mirrors base44 file upload)
// ─────────────────────────────────────────────
export const storage = {
  async upload(bucket, path, file) {
    const storageRef = ref(fbStorage, `${bucket}/${path}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  },
};

// Default export — same shape the app uses as `api`
const api = { auth, entities, functions, integrations, storage };
export default api;
