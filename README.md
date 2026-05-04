# FitSplit

FitSplit is a Firebase-backed gym management web app for the **Titan V2 Fitness** pilot gym.

The app supports admin and owner workflows for gym workspaces, members, memberships, exercise catalogs, workout programs, and workout split templates. It also includes a member-facing portal for membership status and assigned workouts.

Live app:

```text
https://fitsplit--fitsplit-29215.us-central1.hosted.app
```

GitHub:

```text
https://github.com/mehulchirania/FitSplit
```

Firebase project:

```text
fitsplit-29215
```

## Stack

- Next.js App Router
- React 19
- TypeScript
- Firebase Authentication, planned for real login and role enforcement
- Cloud Firestore for app data
- Firebase Storage for future uploaded exercise videos
- Firebase Admin SDK for server actions
- Firebase Security Rules
- Firebase App Hosting

## Current Status

- Firebase Blaze is enabled.
- Firebase Web App is created.
- Firebase App Hosting backend `fitsplit` is deployed in `us-central1`.
- Live App Hosting URL returns HTTP 200.
- Firestore is initialized.
- Firestore has demo records for the Titan V2 Fitness pilot workspace.
- Firestore rules and indexes are deployed.
- Storage rules exist, but Storage setup/rules deploy may still need to be completed in Firebase Console.
- GitHub automatic deployments are not connected yet; local-source App Hosting deployment works.
- Real Firebase Auth login and server-side role enforcement are not implemented yet.

## Features

- Admin workspace overview
- Titan V2 Fitness pilot workspace
- Owner dashboard
- Member management
- Global hamburger drawer with theme, Activity, and About links
- Profile dropdown with View Profile and dummy Log Out controls
- Editable Firestore-backed member records
- Membership status calculation
- Role-aware activity feed
- User profile form with reactive BMI calculation
- Member injury/limitation logging with deterministic AI-style exercise swaps
- Start Workout and End Workout controls for active-session attendance tracking
- Member Gym Busyness widget based on active workouts
- Firestore-backed historical lift log for progressive overload
- In-workout rest countdown timer
- Owner AI business-value analytics for Semi-Personal Training plans and trainer hours saved
- Owner live capacity panel with active headcount and peak usage chart
- About page with contact form, social placeholders, email link, and footer
- Owner-only exercise catalog
- Workout split templates loaded from `lib/workouts.json`
- Custom workout plan builder
- Member dashboard
- Route-aware navigation
- Modern minimal UI
- Dark mode
- Firestore read models with mock fallback
- Firebase server actions for writes

## App Routes

```text
/admin
/activity
/about
/owner
/owner/members
/owner/exercises
/owner/programs
/member
/profile
```

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
liftLogs
programAssignments
activityEvents
workoutSessions
contactMessages
siteLinks
```

Important IDs:

```text
Titan gym id: titan-v2-fitness
Titan owner id: owner-titan-v2
```

## Firebase App Code

Firebase helpers:

```text
lib/firebase/actions.ts
lib/firebase/admin.ts
lib/firebase/client.ts
lib/firebase/collections.ts
lib/firebase/read-models.ts
```

Current server actions:

- `createMemberWithMembership`
- `updateMemberProfile`
- `updateProfileMetrics`
- `renewMemberMembership`
- `logLiftSet`
- `startWorkoutSession`
- `endWorkoutSession`
- `submitContactMessage`
- `createCatalogExercise`
- `createCustomWorkoutProgram`

Current read models:

- `getMembersWithMemberships`
- `getMemberDetail`
- `getGymWorkspaces`
- `getTitanWorkspace`
- `getRoleSummary`
- `getExerciseCatalog`
- `getOwnerNotifications`
- `getMemberNotifications`
- `getWorkoutPrograms`
- `getLiftLogsForMember`
- `getProgramAssignmentForMember`
- `getActivityEvents`
- `getProfileMetrics`
- `getSiteLinks`
- `getActiveWorkoutSessions`

If Firebase Admin cannot initialize, read models fall back to:

```text
lib/mock-data.ts
lib/workouts.json
```

## Workout Data

Workout source:

```text
lib/workouts.json
```

Seed script:

```text
scripts/seed-firebase.mjs
scripts/seed-demo-firestore.mjs
```

Included split templates:

- PPL x 2
- PPL + Upper/Lower
- Bro Split
- Modified Arnold Split x 2
- Custom User Routine

## Local Setup

Install dependencies:

```bash
npm.cmd install
```

Run locally:

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

## Environment Variables

Copy `.env.example` to `.env.local`.

Client Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fitsplit-29215.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fitsplit-29215
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fitsplit-29215.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=766523780087
NEXT_PUBLIC_FIREBASE_APP_ID=1:766523780087:web:e825b99ed4a88d30c79cf2
```

Server Firebase Admin config for local development:

```env
FIREBASE_PROJECT_ID=fitsplit-29215
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Firebase App Hosting uses application default credentials at runtime, so service account key values are mainly for local development and seeding.

## Firebase Commands

Seed Firestore from `lib/workouts.json`:

```bash
npm.cmd run seed:firebase
```

Seed Firestore with the full demo pilot data:

```bash
npm.cmd run seed:demo
```

For local machines without service account env vars, an authenticated Firebase CLI fallback is available:

```bash
set USE_FIREBASE_CLI_TOKEN=1
npm.cmd run seed:demo
```

Deploy Firestore rules and indexes:

```bash
firebase.cmd deploy --only firestore:rules,firestore:indexes --project fitsplit-29215
```

Deploy Storage rules after Firebase Storage is initialized:

```bash
firebase.cmd deploy --only storage --project fitsplit-29215
```

Deploy App Hosting:

```bash
firebase.cmd deploy --only apphosting:fitsplit --project fitsplit-29215
```

Deploy all configured Firebase targets:

```bash
firebase.cmd deploy --project fitsplit-29215
```

## Firebase Config Files

```text
firebase.json
apphosting.yaml
firestore.rules
firestore.indexes.json
storage.rules
.firebaserc
```

## Deployment

Current deployed backend:

```text
Backend: fitsplit
Region: us-central1
URL: https://fitsplit--fitsplit-29215.us-central1.hosted.app
```

Manual App Hosting deployment from local source is working:

```bash
firebase.cmd deploy --only apphosting:fitsplit --project fitsplit-29215
```

GitHub automatic deployment is not connected yet. To enable it in Firebase Console, connect:

```text
Repository: mehulchirania/FitSplit
Branch: main
Root directory: /
Backend: fitsplit
```

## Known Caveats

- Firebase Auth login flow is not implemented yet.
- Firebase custom claims and server-side role checks are not implemented yet.
- Server actions currently trust the owner/admin UI route.
- Firebase Storage upload UI is not implemented yet; exercise forms store URL/path text.
- Firebase Storage setup/rules deploy may still need to be completed in console.
- Member portal currently uses mock/member fallback behavior until auth-aware lookup is added.
- Workouts and videos will be updated later.

## Handoff

For future chats, start with:

```text
PROJECT_HANDOFF.md
```

That file tracks current status, updates, issues, commands, and next steps.
