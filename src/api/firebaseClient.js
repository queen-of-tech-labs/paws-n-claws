import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
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
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
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

export { fbAuth, db, fbStorage, fbFunctions };

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

  /** Sign in with Google popup */
  async redirectToLogin(redirectTo) {
    try {
      await signInWithPopup(fbAuth, googleProvider);
      window.location.href = redirectTo || '/dashboard';
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  },

  /** Send magic link email */
  async sendMagicLink(email, redirectTo) {
    const actionCodeSettings = {
      url: redirectTo || `${window.location.origin}/dashboard`,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(fbAuth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  },

  /** Sign out */
  async logout(redirectTo) {
    await signOut(fbAuth);
    window.location.href = redirectTo || '/';
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
  const fieldMap = { created_at: 'createdAt', created_date: 'createdAt', due_date: 'dueDate' };
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
