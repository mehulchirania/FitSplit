# FitSplit Project Handoff

Use this file as the starting context for future Codex chats.

## Project

FitSplit is a Next.js gym management app for the Titan V2 Fitness pilot gym.

Local project path:

```text
C:\Users\mehul\Documents\Codex\2026-05-03\FitSplit
```

GitHub:

```text
https://github.com/mehulchirania/FitSplit
```

Firebase project:

```text
fitsplit-29215
```

Firebase console:

```text
https://console.firebase.google.com/project/fitsplit-29215/overview
```

## Current Stack

- Next.js App Router
- React 19
- TypeScript
- Firebase Authentication, planned for real login and role enforcement
- Cloud Firestore for app data
- Firebase Storage for uploaded exercise videos, pending Storage setup in console
- Firebase App Hosting for full-stack hosting after Blaze upgrade
- Firebase Security Rules for Firestore and Storage

## Important Status

- Firebase Blaze is ready per user.
- Firestore has been initialized.
- Firestore rules and indexes have been deployed.
- Storage rules file exists but Storage setup was previously blocked until console setup.
- App Hosting config exists in `apphosting.yaml`, but backend still needs to be created/connected after Blaze.
- The app has Firebase Admin server actions but still uses mock fallback when Firebase Admin env vars are absent.
- Videos/workouts will be updated later by user.

## Key Commands

Install:

```bash
npm.cmd install
```

Run local dev server:

```bash
npm.cmd run dev
```

Typecheck:

```bash
npm.cmd run typecheck
```

Build:

```bash
npm.cmd run build
```

Seed Firestore from `lib/workouts.json`:

```bash
npm.cmd run seed:firebase
```

Deploy Firestore rules/indexes:

```bash
firebase.cmd deploy --only firestore:rules,firestore:indexes --project fitsplit-29215
```

Deploy Storage rules after Storage is initialized:

```bash
firebase.cmd deploy --only storage --project fitsplit-29215
```

Deploy all Firebase config:

```bash
firebase.cmd deploy --project fitsplit-29215
```

## Firebase Environment Variables

`.env.example` lists required variables.

Client-side Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fitsplit-29215.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fitsplit-29215
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Server-side Firebase Admin config:

```env
FIREBASE_PROJECT_ID=fitsplit-29215
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Other:

```env
CRON_SECRET=
AI_PROVIDER_API_KEY=
```

For App Hosting, map secrets in Firebase/Google Secret Manager:

```text
firebaseClientEmail
firebasePrivateKey
cronSecret
```

`apphosting.yaml` currently references these.

## Firebase Data Model

Firestore collections:

```text
gyms
profiles
memberships
exerciseCatalog
workoutPrograms
notifications
workoutSplitTemplates
```

Important IDs:

```text
Titan gym id: titan-v2-fitness
Titan owner id: owner-titan-v2
```

Relevant files:

```text
lib/firebase/actions.ts
lib/firebase/admin.ts
lib/firebase/client.ts
lib/firebase/collections.ts
lib/firebase/read-models.ts
```

## Current Firebase Writes

Server actions in `lib/firebase/actions.ts`:

- `createMemberWithMembership`
- `createCatalogExercise`
- `createCustomWorkoutProgram`

These are used by:

```text
app/owner/members/page.tsx
app/owner/exercises/page.tsx
components/custom-plan-builder.tsx
```

## Current Firebase Reads

Read models in `lib/firebase/read-models.ts`:

- `getMembersWithMemberships`
- `getExerciseCatalog`

If Firebase Admin env vars are missing, the app falls back to mock data from:

```text
lib/mock-data.ts
lib/workouts.json
```

## Workout Data

Primary workout source:

```text
lib/workouts.json
```

Seed script:

```text
scripts/seed-firebase.mjs
```

Supported split templates:

- PPL x 2
- PPL + Upper/Lower
- Bro Split
- Modified Arnold Split x 2
- Custom User Routine

## UI Notes

The UI has:

- Modern minimal CSS in `app/globals.css`
- Dark mode toggle in `components/theme-toggle.tsx`
- Route-aware navigation in `components/main-nav.tsx`
- Owner pages hide member-only navigation and vice versa

Important pages:

```text
/admin
/owner
/owner/members
/owner/exercises
/owner/programs
/member
```

## Firebase Rules

Rules and indexes:

```text
firestore.rules
firestore.indexes.json
storage.rules
firebase.json
```

Firestore rules are deployed.

Storage rules exist but need deployment after Firebase Storage is initialized in console.

## App Hosting Next Steps

Now that Blaze is ready:

1. Confirm Firebase App Hosting API works:

```bash
firebase.cmd apphosting:backends:list --project fitsplit-29215 --json
```

2. Create/connect an App Hosting backend to:

```text
GitHub repo: mehulchirania/FitSplit
Branch: main
Root directory: /
Region: asia-south1 preferred
```

3. Configure App Hosting env/secrets from `apphosting.yaml`.

4. Deploy/roll out backend.

## Known Caveats

- Real Firebase Auth login/role session enforcement is not fully implemented yet.
- Server actions currently use Firebase Admin and trust the owner/admin UI route. Add authenticated role checks before production use.
- Storage upload UI is not implemented yet; exercise form stores video URL/path text only.
- Member portal still uses the first mock member unless extended to auth-aware member lookup.
- Workouts and videos will be updated later.

## Last Known Verified Commands

These passed after Firebase migration:

```bash
npm.cmd run typecheck
npm.cmd run build
```

Firestore deploy passed:

```bash
firebase.cmd deploy --only firestore:rules,firestore:indexes --project fitsplit-29215
```

GitHub push passed to:

```text
https://github.com/mehulchirania/FitSplit
```

