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
- Firebase App Hosting for full-stack hosting
- Firebase Security Rules for Firestore and Storage

## Important Status

- Last updated: 2026-05-04.
- Firebase Blaze is ready per user.
- Firebase Web App exists: `1:766523780087:web:e825b99ed4a88d30c79cf2`.
- App Hosting backend exists: `fitsplit` in `us-central1`.
- App Hosting URL: `https://fitsplit--fitsplit-29215.us-central1.hosted.app`.
- App Hosting local-source deploy succeeded.
- Live App Hosting URL returned HTTP 200 after deploy.
- A production add-member error with digest `2009792147` was traced in Cloud Run logs to `fullName is required.` from `createMemberWithMembership`; the add-member form is now required-field guarded and uses a friendly `useActionState` success/error message instead of crashing the page.
- Confirmation/status dialogs are now used for Firestore-backed actions: add member, edit member, renew membership, profile save, contact submit, catalog exercise save, custom workout plan save, Start Workout, End Workout, and Log Lift.
- Firestore has been initialized.
- Firestore rules and indexes have been deployed.
- Firestore was seeded with Titan V2 Fitness demo data on 2026-05-04.
- Live Firestore document counts after seeding: `gyms` 1, `profiles` 6, `memberships` 4, `exerciseCatalog` 49, `workoutPrograms` 5, `notifications` 3, `workoutSplitTemplates` 5, `liftLogs` 2, `programAssignments` 2, `activityEvents` 4, `workoutSessions` 0, `contactMessages` 0, `siteLinks` 4.
- Storage rules file exists but Storage setup was previously blocked until console setup.
- App Hosting config exists in `apphosting.yaml`.
- Firebase Admin on App Hosting uses application default credentials. Local development can use service account env vars.
- The app has Firebase Admin server actions and mock fallback when Firebase Admin cannot be initialized.
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

Seed Firestore with full demo pilot data:

```bash
npm.cmd run seed:demo
```

If service account env vars are missing but Firebase CLI is logged in locally:

```bash
set USE_FIREBASE_CLI_TOKEN=1
npm.cmd run seed:demo
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

Deploy App Hosting only:

```bash
firebase.cmd deploy --only apphosting:fitsplit --project fitsplit-29215
```

## Firebase Environment Variables

`.env.example` lists required variables.

Client-side Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fitsplit-29215.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fitsplit-29215
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fitsplit-29215.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=766523780087
NEXT_PUBLIC_FIREBASE_APP_ID=1:766523780087:web:e825b99ed4a88d30c79cf2
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

For local development outside Google runtime, use a service account key:

```text
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

For Firebase App Hosting, Firebase Admin uses the runtime service account via application default credentials. `apphosting.yaml` includes the public Firebase web config.

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
- `updateMemberProfile`
- `updateProfileMetrics`
- `renewMemberMembership`
- `logLiftSet`
- `startWorkoutSession`
- `endWorkoutSession`
- `submitContactMessage`
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
/activity
/about
/owner
/owner/members
/owner/exercises
/owner/programs
/member
/profile
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

Current backend:

```text
Backend: fitsplit
Region: us-central1
URL: https://fitsplit--fitsplit-29215.us-central1.hosted.app
```

Useful commands:

```bash
firebase.cmd apphosting:backends:list --project fitsplit-29215 --json
firebase.cmd deploy --only apphosting:fitsplit --project fitsplit-29215
```

GitHub automatic deployments are not connected yet. To enable them, connect:

```text
GitHub repo: mehulchirania/FitSplit
Branch: main
Root directory: /
Backend: fitsplit
```

Manual App Hosting deployment from local source is working and should be used until GitHub automatic deployments are connected.

## Known Caveats

- Real Firebase Auth login/role session enforcement is not fully implemented yet.
- Server actions currently use Firebase Admin and trust the owner/admin UI route. Add authenticated role checks before production use.
- Storage upload UI is not implemented yet; exercise form stores video URL/path text only.
- Firebase Storage still needs console setup and storage rules deployment if not completed.
- Member portal still uses the first mock member unless extended to auth-aware member lookup.
- Workouts and videos will be updated later.

## Recent Updates

- Converted remaining page/component static data to Firestore-backed read models. Only `lib/firebase/read-models.ts` now imports `mock-data`, strictly for fallback when Firebase Admin is unavailable.
- Added and seeded Firestore collections for `programAssignments`, `activityEvents`, and `siteLinks`.
- Added Firestore-ready collections/rules for `workoutSessions` and `contactMessages`; these populate from Start Workout/End Workout and About form submissions.
- Fixed owner add-member failure handling. `/owner/members` now uses `components/add-member-form.tsx`, requires Full name, Email, Start date, and Duration in the browser, validates duration server-side, and returns visible success/error messages from the Firebase server action.
- Added reusable `components/confirm-action-form.tsx` for confirmation before submit and success/error status after server actions.
- Updated Firestore server actions to return a shared `{ status, message }` state and to catch user-facing validation/write failures instead of throwing raw app errors.
- Added confirmation and post-update status dialogs for member workout events: Start Workout, End Workout, and Log Lift.
- Made home, admin, member, activity, profile, about, owner workspace, and exercise lookup data dynamic.
- Updated `ExerciseList` and member workout AI logic to use Firestore exercise catalog data passed from read models.
- Added Firestore-backed historical lift logging for progressive overload via `liftLogs`, `logLiftSet`, and `getLiftLogsForMember`.
- Added in-workout rest countdown timer with 1, 1.5, 2, and 3 minute presets.
- Updated demo seed data with two Barbell Bench Press lift logs for Aarav.
- Deployed Firestore rules for `liftLogs`.
- Added member-side AI Semi-Personal Trainer workflow: Update Injury/Limitation trigger, deterministic catalog-based exercise swaps, and fallback recovery routine.
- Added mandatory Start Workout and End Workout controls on the member workout screen, using local active-session state as an attendance proxy.
- Added member Gym Busyness widget based on active workout count.
- Added owner dashboard AI business-value analytics: Active Semi-Personal Training Plans, Trainer Hours Saved, and AI-ready templates.
- Added owner live capacity panel with exact active workout headcount and a simple peak usage chart.
- Updated home/about/member/owner copy to emphasize the AI as an automated Semi-Personal Trainer.
- Added global hamburger drawer with Light/Dark mode toggle, Activity link, and About link.
- Added profile icon dropdown with View Profile link and dummy Log Out button.
- Added `/activity` page with owner/member conditional feed views.
- Added `/profile` page with basic data entry fields and reactive BMI calculation.
- Added `/about` page with required contact fields, social placeholders, email link, and exact footer text.
- Added `public/favicon.ico` generated from the cropped icon and changed tab icon links to `/favicon.ico?v=3` plus versioned PNG links to force browser favicon refresh.
- Recropped `public/icon-512.png` to the dark artwork panel so no white border is visible, and replaced the header `FS` text mark with the same icon image.
- Added FitSplit PWA/browser icon assets: `public/icon-512.png`, `public/manifest.json`, and root layout manifest/favicon/apple-touch links.
- Seeded live Firestore for project `fitsplit-29215` with full Titan V2 Fitness demo data: gym workspace, admin/owner/member profiles, memberships, exercise catalog, workout programs, notifications, and split templates.
- Added `scripts/seed-demo-firestore.mjs` and `npm.cmd run seed:demo` for repeatable demo seeding.
- Added editable member profile form on `/owner/members/[memberId]` backed by `updateMemberProfile`.
- Made owner dashboard and owner programs page read dynamic Firestore data.
- Wired member renewal saving to Firebase. `/owner/members/[memberId]` now reads member detail from Firestore, submits renewal memberships with a notification record, and refreshes owner/member views.
- Fixed membership ID creation so the stored membership `id` matches the Firestore document ID.
- Made membership date calculation use UTC date-only math to avoid timezone drift.
- Made `/owner/members/[memberId]` dynamic so newly created Firebase members can open detail pages without a rebuild.
- Refreshed `README.md` to match current Firebase-only architecture, live App Hosting deployment, commands, caveats, and setup files.
- Created Firebase Web App `FitSplit`.
- Created Firebase App Hosting backend `fitsplit` in `us-central1`.
- Added `apphosting` backend entry to `firebase.json`.
- Updated Firebase Admin initialization to use application default credentials on App Hosting.
- Marked owner members and exercise catalog pages as dynamic to avoid build-time Firestore reads.
- Hardened Firebase read models to fall back to mock data if Admin initialization/querying fails.
- Deployed App Hosting successfully.
- Verified live URL returns HTTP 200.

## Open Issues

- GitHub automatic deployment is not connected in Firebase App Hosting backend settings.
- Storage rules deploy was previously blocked because Firebase Storage had not been initialized in console.
- No real Firebase Auth flow yet.
- No Firebase custom claims or server-side role checks yet.
- Renewal saving now writes to Firestore, but there is not yet a user-facing success toast or form error state.

## Last Known Verified Commands

These passed after Firebase migration:

```bash
npm.cmd run typecheck
npm.cmd run build
```

These passed after wiring member renewal:

```bash
npm.cmd run build
npm.cmd run typecheck
```

These passed after adding PWA icon/manifest:

```bash
npm.cmd run build
npm.cmd run typecheck
```

These passed after recropping the icon and using it in the header brand:

```bash
npm.cmd run build
npm.cmd run typecheck
```

These passed after adding the dedicated favicon and cache-busted icon links:

```bash
npm.cmd run build
npm.cmd run typecheck
```

These passed after adding navigation, activity, profile, and about pages:

```bash
npm.cmd run build
npm.cmd run typecheck
```

These passed after adding AI modification and live capacity tracker features:

```bash
npm.cmd run build
npm.cmd run typecheck
```

App Hosting deploy passed:

```bash
firebase.cmd deploy --only apphosting:fitsplit --project fitsplit-29215
```

Live URL check passed:

```text
https://fitsplit--fitsplit-29215.us-central1.hosted.app -> HTTP 200
```

Firestore deploy passed:

```bash
firebase.cmd deploy --only firestore:rules,firestore:indexes --project fitsplit-29215
```

GitHub push passed to:

```text
https://github.com/mehulchirania/FitSplit
```
