# FitSplit

FitSplit is a Firebase-backed gym management web app for Sri Shakthi Hanuman Gym (SHG Gym), with a second Dummy-Gym workspace included for admin testing. It uses Firebase Authentication, server-verified role sessions, Cloud Firestore app data, and an AI-assisted semi-personal trainer workflow.

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

- Firebase Auth login is handled through a server-side credential flow that resolves usernames, phone numbers, and emails to Firebase Auth emails before creating server-verified session cookies.
- Admin, owner, and member route access is enforced server-side.
- Sessions are limited to 2 hours and the client forces logout when the local session timer expires.
- Member login uses registered mobile/email/username plus a 4-digit PIN. Firebase stores this internally as a valid 6+ character password format.
- Demo usernames still work by resolving to Firebase Auth emails.
- New owner-created members also get Firebase Auth accounts with the same UID as their Firestore profile.
- Firestore is the source for gyms, profiles, exercise catalog, programs, assignments, activity, sessions, lift logs, attendance, contact messages, and site links.
- The app has PWA basics: manifest, service worker, matte install prompt, app icons, apple touch icon, and offline shell caching.
- Admin inbox stores landing Contact Us messages in Firestore with read/unread state.
- Admin can manage gym workspaces at `/admin/gyms`.

## Demo Login Credentials

| Role | Username / Mobile / Email | Password |
| --- | --- | --- |
| Admin | `admin` | `password` |
| Owner | `santosh-shg` | `password` |
| Trainer | `shg-trainer-1` | `password` |
| Trainer | `shg-trainer-2` | `password` |
| Owner | `dummy-gym-owner-1` | `password` |
| Member | `mehulchirania` | `1234` |
| Member | `9688227039` | `1234` |
| Member | `mehul@example.com` | `1234` |
| Member | `aarav@example.com` | `1234` |

Mobile numbers are normalized, so `9688227039` resolves to `+91 9688227039`.

## Features

- Matte-black premium landing page with FitSplit-first hero, product overview, grouped features, realistic app previews, trainer/admin overview, SHG partner carousel, Contact Us form, theme support, and PWA install prompt.
- Login page with username/mobile/email resolution, 4-digit member PIN support, staff password login, and Firebase password reset email support.
- Admin dashboard for all gyms plus `/admin/gyms` management for adding, editing, opening, and guarded removal of gym workspaces.
- Admin inbox for Contact Us submissions with unread notification support.
- Owner dashboard with member management, program assignment, live capacity, notifications, and training coverage.
- Member-only dashboard with assigned weekly workout, GPS-backed start/end workout check-in, lift logging, attendance, profile metrics, injury/limitation handling, and notifications.
- Exercise catalog and workout program builder backed by Firestore.
- AI injury/modification flow framed as a semi-personal trainer.
- Activity feed scoped by role: owner/admin see gym-wide activity, members see their own events.
- Dark mode, responsive UI, mobile bottom navigation, scroll-aware topbars, PWA manifest/service worker, cleaned app icons, and install banner.

## App Routes

```text
/                 -> Premium landing page with Contact Us and login section
/admin            -> Admin gym overview
/admin/gyms       -> Add/edit/remove gym workspaces
/admin/gyms/[id]  -> Gym-specific settings, staff, and access control
/admin/inbox      -> Contact Us inbox
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
SHG gym id: shg
SHG owner id: santosh-shg
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
components/login-form.tsx           -> Role-aware login UI and validation
components/app-topbar.tsx           -> Role-aware topbar/drawer/profile menu
components/landing-nav.tsx          -> Landing navbar and mobile menu
components/main-nav.tsx             -> Role-aware owner/admin navigation
components/mobile-bottom-nav.tsx    -> Thumb-friendly mobile app navigation
components/pwa-install-prompt.tsx   -> Service worker registration and install prompt
components/member-workout-console.tsx -> Member workout, AI modification, lift log, GPS check-in
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

Optional gym geofence values for workout check-in:

```env
SHG_GYM_LATITUDE=
SHG_GYM_LONGITUDE=
SHG_GYM_RADIUS_METERS=150
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
- Firebase Storage avatar/staff image upload is still pending.
- Firebase Cloud Messaging push reminders are still pending.
- Production geofence coordinates must be configured before strict gym-radius attendance can be trusted.

## Handoff

See `PROJECT_HANDOFF.md` for full change history, current status, and next steps.
