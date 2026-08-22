import { initializeApp } from 'firebase/app';
import { isNativePlatform } from '@/lib/platform';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  signInWithPopup,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
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

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        'paws-claws-pet-tracker-3t0ana.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// getAuth()'s automatic persistence-layer detection is known to hang
// indefinitely inside Capacitor's iOS WKWebView — the custom capacitor://
// URL scheme confuses its auto-detection logic, and onAuthStateChanged
// simply never fires as a result, leaving the app stuck on its loading
// screen forever with no error. The fix is to explicitly tell Firebase
// which persistence to use on native instead of letting it guess.
let fbAuth;
if (isNativePlatform()) {
  fbAuth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  });
} else {
  fbAuth = getAuth(app);
}

const db          = getFirestore(app);
const fbStorage   = getStorage(app);
const fbFunctions = getFunctions(app);

export { fbAuth, db, fbStorage, fbFunctions, Timestamp };

const googleProvider = new GoogleAuthProvider();

export const auth = {
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

  // Google sign-in:
  // - On Android: uses native SocialLogin plugin (works in APK) — only needs webClientId
  // - On iOS: uses native SocialLogin plugin too, but ALSO needs iOSClientId (a separate
  //   OAuth client from the iOS app registered in Firebase — see CLIENT_ID in
  //   ios/App/App/GoogleService-Info.plist) or the plugin throws
  //   "No provider was initialized". Hardcoded here (not a secret — same as
  //   webClientId below, and it already ships inside the app bundle either way)
  //   so this can't silently break by depending on a build-time env var.
  // - On web: uses signInWithPopup with firebaseapp.com authDomain (works on Vercel)
  async redirectToLogin() {
    const isNative = isNativePlatform();
    if (isNative) {
      const { SocialLogin } = await import('@capgo/capacitor-social-login');
      const webClientId = '264364776080-ig58tvhl9m7m6lp4eioa1qmpk2dc99l0.apps.googleusercontent.com';
      const iOSClientId = '264364776080-usacqv69jkr75496k6beeik6o12j31de.apps.googleusercontent.com';
      await SocialLogin.initialize({
        google: {
          webClientId,
          iOSClientId,
          iOSServerClientId: webClientId,
        },
      });
      const result = await SocialLogin.login({ provider: 'google', options: {} });
      const idToken = result?.result?.idToken || result?.result?.authentication?.idToken;
      if (!idToken) throw new Error('No ID token returned from Google');
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(fbAuth, credential);
    } else {
      await signInWithPopup(fbAuth, googleProvider);
    }
  },

  // Email + password sign up — sends verification email automatically
  async signUp(email, password) {
    const result = await createUserWithEmailAndPassword(fbAuth, email, password);
    sendEmailVerification(result.user).catch(() => {});
    return result;
  },

  // Email + password sign in
  async signInWithPassword(email, password) {
    return signInWithEmailAndPassword(fbAuth, email, password);
  },

  // Send password reset email
  async sendPasswordReset(email) {
    return sendPasswordResetEmail(fbAuth, email);
  },

  async logout() {
    await signOut(fbAuth);
  },

  async updateMe(updates) {
    const user = fbAuth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const profileRef = doc(db, 'profiles', user.uid);
    await updateDoc(profileRef, { ...updates, updatedAt: serverTimestamp() });
    return updates;
  },

  async isAuthenticated() {
    return !!fbAuth.currentUser;
  },

  onAuthStateChanged(callback) {
    return onAuthStateChanged(fbAuth, callback);
  },
};

function normalizeOrder(orderStr = '-created_at') {
  const desc = orderStr.startsWith('-');
  const field = orderStr.replace(/^-/, '');
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
      const data = { ...record, created_by: user?.email || null, createdAt: serverTimestamp() };
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

export const functions = {
  async invoke(functionName, payload = {}) {
    const callable = httpsCallable(fbFunctions, functionName);
    const result = await callable(payload);
    return { data: result.data };
  },
};

export const integrations = {
  Core: {
    async InvokeLLM({ prompt, response_json_schema, add_context_from_internet }) {
      const callable = httpsCallable(fbFunctions, 'invokeLLM');
      const result = await callable({ prompt, response_json_schema, add_context_from_internet });
      return result.data;
    },
  },
};

export const storage = {
  async upload(bucket, path, file) {
    const storageRef = ref(fbStorage, `${bucket}/${path}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  },
};

const api = { auth, entities, functions, integrations, storage };
export default api;