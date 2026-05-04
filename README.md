# FitSplit

FitSplit is a Firebase-backed gym management web app supporting **Titan V2 Fitness** and **Dummy-Gym** as pilot workspaces. It includes a fully custom mock authentication system, role-based routing (admin, owner, member), and a smart AI semi-personal trainer.

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
- Mock cookie-based auth (username + mobile number login, password reset flow)
- Cloud Firestore for app data (with full mock fallbacks)
- Firebase Admin SDK for server actions
- Firebase Security Rules
- Firebase App Hosting
- Gemini API (AI Semi-Personal Trainer)

## Current Status (as of May 2026)

- ✅ Firebase Blaze enabled, Firestore seeded with demo data
- ✅ Mock authentication fully working (no Firebase Auth required for local dev)
- ✅ Member dashboard personalized with BMI (dynamic coloring), metrics, and attendance
- ✅ Attendance calendar implemented for members (monthly summary + full calendar view)
- ✅ Attendance tracking accessible by owner/admin in member detail view
- ✅ AI trainer enhanced with injury-aware stretch injection, push/pull logic fixed
- ✅ Dialog positioning fixed (centered modal via `position: fixed`)
- ✅ Workout session start/end and lift logging work in local mock mode (no Firebase config required)
- ✅ Coaching notes dynamically generated for all exercises (no more placeholder text)
- ✅ Exercise thumbnails updated with muscle-specific Unsplash images
- ✅ Dummy-Gym loaded alongside Titan V2 Fitness in admin panel
- ⚠️ Firebase Auth login not implemented yet (mock cookie auth is used)
- ⚠️ GitHub automatic deploys not connected

## Mock Login Credentials

| Role   | Username / Mobile     | Password |
|--------|-----------------------|----------|
| Admin  | `admin`               | password |
| Owner  | `titan-owner-1`       | password |
| Owner  | `dummy-gym-owner-1`   | password |
| Member | `mehulchirania`       | password |
| Member | `9688227039`          | password |
| Member | `aaravs`              | password |

> Mobile numbers are auto-normalized: typing `9688227039` is treated as `+91 9688227039`.

## Features

- **Login:** Centered brand UI, username or mobile number login, Forgot Password flow (notifies owner)
- **Admin:** Gym list with clickable links to owner dashboard, multi-gym support
- **Owner:** Member management, program assignment, password reset, live capacity panel
- **Member:** Personalized dashboard ("Welcome, Mehul"), inline editable BMI/metrics, assigned workout, notifications
- **AI Trainer:** Injury-aware exercise swaps (push/pull logic enforced), therapeutic stretches prepended, two-section Plan Modified view (Swaps + Stretches)
- **Workout Console:** Separate Stretches and Weight Exercise sections when modified, start/end workout modal (centered), in-workout rest timer (compact), progressive overload log with weight (kg)
- **Topbar:** Gym name shown left of profile avatar, initials avatar (e.g. `MC`), hidden on login page
- **Notifications:** Empty state message ("No new notifications for you!")
- Dark mode, mobile responsive UI

## App Routes

```text
/                 → Login page
/admin            → Admin gym overview
/owner            → Owner dashboard
/owner/members    → Member list
/owner/exercises  → Exercise catalog
/owner/programs   → Workout programs
/member           → Member dashboard
/profile          → Profile page
/activity         → Activity feed
/about            → Contact and about
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
Dummy gym id: dummy-gym
Dummy owner id: dummy-gym-owner-1
```

## Key Files

```text
lib/mock-data.ts              → All mock data (gyms, members, exercises with coaching notes)
lib/auth.ts                   → Mock login, logout, password reset server actions
lib/firebase/actions.ts       → Firebase write actions (with local mock fallbacks)
lib/firebase/read-models.ts   → Firebase read models (with mock fallbacks)
components/member-workout-console.tsx → AI trainer, workout display, lift log
components/login-form.tsx     → Login page form
components/editable-metrics.tsx → Inline BMI/body metric editing
components/app-topbar.tsx     → Topbar with gym name + initials avatar
app/layout.tsx                → Root layout, passes gym name and initials to topbar
app/member/page.tsx           → Member dashboard
app/admin/page.tsx            → Admin gym control panel
```

## Local Setup

Install:

```bash
npm install
```

Run locally (no Firebase config needed — mock fallback is automatic):

```bash
npm run dev
```

Build:

```bash
npm run build
```

## Environment Variables

Copy `.env.example` to `.env.local`.

Required for AI Trainer:

```env
GEMINI_API_KEY=your_key_here
```

Optional Firebase Admin (for live data — mock fallback used if absent):

```env
FIREBASE_PROJECT_ID=fitsplit-29215
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Optional Firebase Client (for future auth):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fitsplit-29215.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fitsplit-29215
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fitsplit-29215.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=766523780087
NEXT_PUBLIC_FIREBASE_APP_ID=1:766523780087:web:e825b99ed4a88d30c79cf2
```

## Firebase Commands

Seed demo data:

```bash
npm run seed:demo
```

Deploy Firestore rules:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project fitsplit-29215
```

Deploy App Hosting:

```bash
firebase deploy --only apphosting:fitsplit --project fitsplit-29215
```

## Known Caveats

- Firebase Auth login not implemented; mock cookie auth is used
- Server actions for workouts/lifts return mock success locally (no Firebase Admin required)
- Exercise video upload UI not implemented; stores URL text
- GitHub automatic deploy not connected to Firebase App Hosting

## Handoff

See `PROJECT_HANDOFF.md` for full change history and next steps.
