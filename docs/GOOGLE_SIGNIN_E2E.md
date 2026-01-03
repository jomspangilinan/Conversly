# Google Sign-In (Student + Creator) — E2E Implementation Spec

Goal: replace hardcoded `studentId = 'student-demo'` with real Google auth, and support **two entry modes**:

- **Sign in as Student** → watch/learn flows
- **Sign in as Creator** → upload/review/publish flows

This document is designed to be a checklist so we can finish the whole end-to-end path without inventing extra UX.

---

## Current state (what’s hardcoded)

- Student identity is hardcoded in [frontend/src/views/StudentWatchPage.tsx](../frontend/src/views/StudentWatchPage.tsx) (`studentId = 'student-demo'`, `studentName = 'Student'`).
- Backend already uses `firebase-admin` for Firestore (service account envs exist), but there is no request auth middleware yet.
- Frontend API client has a placeholder for attaching a Bearer token in [frontend/src/api/client.ts](../frontend/src/api/client.ts).

---

## Recommendation (simple + secure)

Use **Firebase Authentication (Google provider) in the frontend** and send a **Firebase ID token** to the backend via `Authorization: Bearer <idToken>`.

Why this approach:

- We already have Firebase Admin on the backend for Firestore.
- Firebase ID tokens are easy to verify server-side with `admin.auth().verifyIdToken()`.
- We avoid shipping any Firebase Admin keys to the browser.

We will store a user’s “mode” (`student` vs `creator`) in Firestore (`users/{uid}`) and gate the UI routes based on that.

---

## UX decision: how to separate student vs creator sign-in

### Option A (recommended): Two buttons before Google sign-in

Create a single `SignIn` screen with:

- **Continue as Student**
- **Continue as Creator**

Clicking either sets `desiredRole` in local state (or query param), then performs Google sign-in.

After sign-in, call backend to upsert the user and persist `role`.

Pros: dead simple, no extra wizard.

### Option B: One sign-in, then role chooser on first login

After Google sign-in, if user has no role, show a 2-button role picker.

Pros: fewer choices before login; Cons: adds one extra screen.

This spec assumes **Option A**.

---

## Required homepages (minimal)

Add two lightweight landing pages after sign-in:

### Student homepage

- Route: `/student`
- Shows: a simple list of available videos
- Primary action: **Watch** → `/student/watch/:videoId`

### Creator homepage

- Route: `/creator`
- Shows: a simple list of videos (optionally include status)
- Primary actions:
  - **Upload** → `/creator/upload`
  - **Review** → `/creator/videos/:videoId`

No extra dashboards/filters required for MVP.

---

## Data model (minimal)

### Firestore: `users/{uid}`

```ts
type UserRole = "student" | "creator";

type UserProfile = {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
};
```

### Firestore: existing checkpoint responses

Checkpoint responses already include `userId`; we’ll set `userId = uid`.

---

## Backend changes (Express)

### 1) Add `requireAuth` middleware

Create middleware that:

- Reads `Authorization` header `Bearer <token>`
- Verifies using `admin.auth().verifyIdToken(token)`
- Attaches `req.user = { uid, email }`
- Rejects with `401` if missing/invalid

### 2) Add auth routes

Add in `backend/src/routes/auth.ts` (or similar):

- `GET /api/auth/me`

  - Requires auth
  - Returns `{ uid, email, role, displayName, photoURL }` (reads from Firestore)

- `POST /api/auth/upsert-profile`
  - Requires auth
  - Body: `{ role: 'student' | 'creator', displayName?, photoURL? }`
  - Writes `users/{uid}` (merge)
  - Returns the stored profile

### 3) Route protection (server-side)

- For creator-only endpoints (upload/analyze/publish), add a `requireRole('creator')` middleware that checks Firestore `users/{uid}.role`.
- For student-only endpoints (progress), add `requireRole('student')` if desired.

**MVP approach:** protect creator endpoints first; student progress can remain permissive during dev if needed.

---

## Frontend changes (React)

### 1) Add Firebase client auth

Add Firebase client SDK to `frontend`:

- `firebase/app`
- `firebase/auth`

Configure using Vite env vars (public):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Create module:

- `frontend/src/auth/firebase.ts` → initializes Firebase app
- `frontend/src/auth/useAuth.tsx` → React context for:
  - `user` (Firebase user)
  - `idToken`
  - `role` (loaded via backend `/api/auth/me`)
  - `signInWithGoogle(roleIntent)`
  - `signOut()`

### 2) Attach Bearer token to API requests

Update [frontend/src/api/client.ts](../frontend/src/api/client.ts) to attach:

- `Authorization: Bearer ${idToken}`

Prefer storing token in memory (Auth context) instead of localStorage.

### 3) Replace hardcoded student id

Update [frontend/src/views/StudentWatchPage.tsx](../frontend/src/views/StudentWatchPage.tsx):

- Remove `const studentId = 'student-demo'`
- Use `auth.user.uid`
- Use `auth.user.displayName ?? 'Student'`

Pass these into `StudentVideoPlayer` unchanged.

### 4) Add “entry routing”

Add a minimal `SignInPage`:

- `/signin` route
- Two buttons: Student / Creator
- On click: `signInWithGoogle('student' | 'creator')`
- After login:
  - call `POST /api/auth/upsert-profile` with the chosen role
  - navigate:
    - student → `/student`
    - creator → `/creator`

### 5) Add route guards

- Student pages require `role === 'student'`
- Creator pages require `role === 'creator'`

Routes to guard:

- Student:
  - `/student`
  - `/student/watch/:id`
- Creator:
  - `/creator`
  - `/creator/upload`
  - `/creator/videos/:id`

MVP behavior on mismatch:

- Show a simple message: “You are signed in as a Creator/Student” + a button to go to the correct area.
- Optionally allow “Switch mode” which simply calls `upsert-profile` with the other role.

---

## Creator vs Student: what actually differs

**Same Google account can be used for both**. “Student vs Creator” is an app-level role stored in Firestore.

- Student role controls:

  - progress writes (`checkpoint_responses` documents keyed by `uid`)
  - student UI routes

- Creator role controls:
  - upload/analyze/publish routes
  - `uploadedBy` on `videos` (if used)

---

## Environment + Console setup checklist

### Firebase Console

- Enable **Authentication → Sign-in method → Google**.
- Add authorized domains:
  - localhost (for dev)
  - production domain

### Backend env vars (already present pattern)

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (with `\n` newlines)

### Frontend env vars

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

---

## E2E verification steps

1. Open `/signin`.
2. Click “Continue as Student”, complete Google sign-in.
3. Confirm:
   - `/api/auth/me` returns `role: student`.

- Student homepage loads and lists videos.
- Student watch page uses `uid` (no `student-demo`).

4. Answer a checkpoint via Voice Tutor.
5. Confirm Firestore `checkpoint_responses` document uses `userId = uid`.
6. Refresh the page.
7. Confirm hydration loads responses and Review shows Completed.

Repeat with “Continue as Creator” and confirm you can access upload/review routes.

---

## Implementation order (fastest path)

1. Backend: `requireAuth` + `/api/auth/me` + `/api/auth/upsert-profile`.
2. Frontend: Firebase auth + Auth context + attach Bearer token.
3. Frontend: `/signin` page with Student/Creator buttons.
4. Replace `student-demo` usage.
5. Route guards.

---

## Open questions (answer before coding, if you want)

- Should “Creator vs Student” be _switchable_ after login (toggle), or should it require a separate account?
  - This spec assumes switchable (one account can do both).
- Do you want separate URLs for creator vs student sign-in?
  - If yes: `/signin/student` and `/signin/creator` can pre-select the role.
