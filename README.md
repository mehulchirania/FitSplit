# FitSplit

FitSplit is a Firebase-backed gym management web app for Titan V2 Fitness, with a second Dummy-Gym workspace included for admin testing. It uses Firebase Authentication, server-verified role sessions, Cloud Firestore app data, and an AI-assisted semi-personal trainer workflow.

Live app:

```text
https://fitsplit--fitsplit-29215.us-central1.hosted.app
```

Firebase project:

```text
fitsplit-29215
```

## Stack

- Next.js App Router
- React 19
- TypeScript
- Firebase Auth email/password
- Firebase Admin session cookies
- Cloud Firestore
- Firebase Security Rules
- Firebase App Hosting
- Gemini API for AI semi-personal trainer features

## Current Status

- Firebase Auth login is wired through client-side email/password sign-in.
- The server creates and verifies Firebase session cookies for protected routes.
- Admin, owner, and member route access is enforced server-side.
- Demo usernames still work by resolving to Firebase Auth emails.
- New owner-created members also get Firebase Auth accounts with the same UID as their Firestore profile.
- Firestore is the source for gyms, profiles, exercise catalog, programs, assignments, activity, sessions, lift logs, attendance, contact messages, and site links.
- Firebase Auth demo users still need to be seeded in the Firebase project before login works end to end.

## Demo Login Credentials

| Role | Username / Mobile / Email | Password |
| --- | --- | --- |
| Admin | `admin` | `password` |
| Owner | `titan-owner-1` | `password` |
| Owner | `dummy-gym-owner-1` | `password` |
| Member | `mehulchirania` | `password` |
| Member | `9688227039` | `password` |
| Member | `aarav@example.com` | `password` |

Mobile numbers are normalized, so `9688227039` resolves to `+91 9688227039`.

## Features

- Login page with Firebase Auth, username/mobile/email resolution, and Firebase password reset email support.
- Admin dashboard for all gyms.
- Owner dashboard with member management, program assignment, live capacity, notifications, and training coverage.
- Member-only dashboard with assigned weekly workout, start/end workout session, rest timer, lift logging, attendance, profile metrics, and notifications.
- Exercise catalog and workout program builder backed by Firestore.
- AI injury/modification flow framed as a semi-personal trainer.
- Activity feed scoped by role: owner/admin see gym-wide activity, members see their own events.
- Dark mode, responsive UI, PWA manifest, and app icon.

## App Routes

```text
/                 -> Login page
/admin            -> Admin gym overview
/owner            -> Owner dashboard
/owner/members    -> Member list
/owner/exercises  -> Exercise catalog
/owner/programs   -> Workout programs
/member           -> Member dashboard
/profile          -> Profile page
/activity         -> Activity feed
/about            -> Contact and about
```

## Firestore Collections

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
attendanceRecords
contactMessages
siteLinks
```

Important IDs:

```text
Titan gym id: titan-v2-fitness
Titan owner id: titan-owner-1
Dummy gym id: dummy-gym
Dummy owner id: dummy-gym-owner-1
Admin profile id: admin-fitsplit
```

## Key Files

```text
lib/auth.ts                         -> Firebase session creation, login resolution, role guards
lib/firebase/admin.ts               -> Firebase Admin app/services
lib/firebase/client.ts              -> Firebase web SDK app/services
lib/firebase/actions.ts             -> Firestore write actions and member Auth account creation
lib/firebase/read-models.ts         -> Firestore read models with mock fallbacks
components/login-form.tsx           -> Firebase Auth login UI
components/app-topbar.tsx           -> Role-aware topbar/drawer/profile menu
components/main-nav.tsx             -> Role-aware owner/admin navigation
components/member-workout-console.tsx -> Member workout, AI modification, lift log, rest timer
scripts/seed-demo-firestore.mjs     -> Seeds Firestore demo data
scripts/seed-firebase-auth.mjs      -> Seeds Firebase Auth demo users
firestore.rules                     -> Firestore role/security rules
```

## Local Setup

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

## Environment Variables

Copy `.env.example` to `.env.local`.

Firebase client values are required for browser sign-in:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fitsplit-29215.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fitsplit-29215
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fitsplit-29215.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=766523780087
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Firebase Admin is required for server sessions, role guards, and live writes:

```env
FIREBASE_PROJECT_ID=fitsplit-29215
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

AI features use:

```env
GEMINI_API_KEY=
```

## Firebase Auth Setup

1. Open Firebase Console for `fitsplit-29215`.
2. Go to Authentication > Sign-in method.
3. Enable Email/Password.
4. Provide local Firebase Admin credentials:

```bash
gcloud auth application-default login
```

Or set `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` in `.env.local`.

5. Seed demo Auth users:

```bash
npm run seed:auth
```

6. Seed or refresh Firestore demo data:

```bash
npm run seed:demo
```

## Firebase Commands

Deploy Firestore rules:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project fitsplit-29215
```

Deploy App Hosting:

```bash
firebase deploy --only apphosting:fitsplit --project fitsplit-29215
```

## Known Caveats

- Firebase Auth demo users must be seeded before the demo usernames can log in.
- Local `seed:auth` requires Firebase Admin credentials or Application Default Credentials.
- Exercise video upload UI is not implemented yet; forms store URL/path text.
- Firebase Storage setup is still pending if direct video uploads are needed.

## Handoff

See `PROJECT_HANDOFF.md` for full change history, current status, and next steps.
