# Digital Pet Health Passport — Integration Guide

## What Was Built

| File | Where it goes | Purpose |
|------|--------------|---------|
| `PetPassport.jsx` | `src/pages/` | The shareable public passport page |
| `PetPassport.css` | `src/styles/` | All styles for the passport page |
| `HealthDataManager.jsx` | `src/components/pet/` | Add/delete health records (used inside Pet Detail page) |
| `HealthDataManager.css` | `src/styles/` | Styles for the manager form/tabs |
| `PassportButton.jsx` | `src/components/pet/` | CTA button — view/share passport or upgrade prompt |

---

## Step 1 — Add the Route in App.jsx

Open `src/App.jsx` and add the passport route.

**Find this block** (your existing routes):
```jsx
<HashRouter>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/pet/:petId" element={<PetDetail />} />
    {/* ... other routes */}
  </Routes>
</HashRouter>
```

**Add the passport route:**
```jsx
import PetPassport from "./pages/PetPassport";

// Inside <Routes>:
<Route path="/passport/:petId" element={<PetPassport />} />
```

> ✅ The passport route is PUBLIC — no login required. Anyone with the link can view it.

---

## Step 2 — Import the CSS

Open `src/main.jsx` (or `src/App.jsx`) and add:
```jsx
import "./styles/PetPassport.css";
import "./styles/HealthDataManager.css";
```

---

## Step 3 — Add HealthDataManager to Pet Detail Page

Open `src/pages/PetDetail.jsx` (or wherever you show individual pet info).

**Add the import at the top:**
```jsx
import HealthDataManager from "../components/pet/HealthDataManager";
import PassportButton from "../components/pet/PassportButton";
```

**Add state to load health data:**
```jsx
const [healthData, setHealthData] = useState({
  vaccinations: [],
  vetVisits: [],
  medications: [],
  conditions: [],
});

// Add this function:
async function loadHealthData() {
  const types = ["vaccinations", "vetVisits", "medications", "conditions"];
  const results = {};
  for (const type of types) {
    try {
      const colRef = collection(db, "pets", petId, type);
      const q = query(colRef, orderBy("date", "desc"));
      const snap = await getDocs(q);
      results[type] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      results[type] = [];
    }
  }
  setHealthData(results);
}

// Call it in your useEffect where you load the pet:
useEffect(() => {
  loadPet();
  loadHealthData();
}, [petId]);
```

**Add the components in your JSX** (below the pet info card):
```jsx
{/* Only show these to the pet owner */}
{isOwner && (
  <>
    <PassportButton
      petId={petId}
      isPremium={isPremium}
    />
    
    <HealthDataManager
      petId={petId}
      healthData={healthData}
      onUpdate={loadHealthData}
    />
  </>
)}
```

---

## Step 4 — Firestore Data Structure

The health data lives in **sub-collections** under each pet document:

```
Firestore
└── pets/
    └── {petId}/
        ├── (pet fields: name, species, ownerId, etc.)
        ├── vaccinations/
        │   └── {docId}: { name, date, nextDueDate, administeredBy }
        ├── vetVisits/
        │   └── {docId}: { date, reason, vet, clinic, weight, notes }
        ├── medications/
        │   └── {docId}: { name, dosage, frequency, startDate, endDate, prescribedBy }
        └── conditions/
            └── {docId}: { name, type, severity, notes }
```

> ⚠️ You do NOT need to manually create these collections — Firestore creates them automatically when the first record is added.

---

## Step 5 — Firestore Security Rules

Add these rules to allow public READ of health sub-collections (so the shareable link works), but only the owner can WRITE:

```javascript
// In your Firebase Console → Firestore → Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Existing pet rules (update your existing match block):
    match /pets/{petId} {
      allow read: if true;   // public read for passport
      allow write: if request.auth != null
                   && request.auth.uid == resource.data.ownerId;

      // Health sub-collections — same rules as parent
      match /{subcollection}/{docId} {
        allow read: if true;
        allow write: if request.auth != null
                     && get(/databases/$(database)/documents/pets/$(petId)).data.ownerId
                        == request.auth.uid;
      }
    }

    // Users collection (for checking isPremium):
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**To update rules:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → **Firestore Database** → **Rules** tab
3. Replace with the rules above
4. Click **Publish**

---

## Step 6 — Test It

1. Run the app: `npm run dev`
2. Log in and go to any pet's detail page
3. You should see the **Health Records** section with tabs
4. Add a vaccination record
5. Navigate to `http://localhost:5173/#/passport/{petId}` — you should see the passport!
6. Click "Copy Link" → paste in an incognito window to verify public access works

---

## Sharing Flow (How It Works for Users)

```
Pet owner adds health records
         ↓
Clicks "View Health Passport" → sees the passport page
         ↓
Clicks "🔗 Copy Link" → copies the URL
         ↓
Sends URL to vet / groomer / sitter
         ↓
They open the link (no login required!) → see full health history
```

---

## Premium Gate

The `PassportButton` component automatically shows:
- **Premium users** → "View Health Passport" + "Copy Link" buttons
- **Free users** → An upgrade CTA card

The actual passport PAGE is accessible to anyone with the link — the premium gate is just about generating/sharing the link. This is intentional: it encourages adoption and word-of-mouth when vets see the passport.

---

## Troubleshooting

**Passport page shows blank / "Pet not found"**
- Make sure `ownerId` is saved on the pet document when pets are created
- Check that the `petId` in the URL matches a real Firestore document

**Health records not showing on passport**
- Check Firestore Rules allow public `read` on sub-collections
- Open browser DevTools → Console for any permission errors

**Date fields showing "—"**
- Firestore Timestamps need `.toDate()` — the code handles this automatically
- Make sure dates are saved as JavaScript `Date` objects (the form does this)
