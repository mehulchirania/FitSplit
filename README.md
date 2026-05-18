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

## Landing Page

The public `/` landing page is a premium dark B2B SaaS experience (Linear/Vercel-inspired) built with Framer Motion. Key design tokens live in CSS variables under `.lp-root`. Sections: Navbar, Hero (animated `AppMockup` workout card + `/bg-image.png` background), Feature strip, How it works, Audience pills, Workflow bento, Partners (SHG Gym), Footer + contact form, Login modal. The login modal is wired to the full Firebase Auth flow. All landing CSS is appended to `globals.css` under the `lp-*` prefix and does not affect the authenticated app shell.

## Member Dashboard

The member `/member` page uses a premium `md-*` layout consistent with the dark landing page aesthetic (`#0A0A0A` background, `#C8F135` lime accent). Layout: a responsive summary hero with contextual greeting, program title, week/sets badges, and inline editable metrics (Age, Weight, Height, BMI); below is the `MemberWorkoutConsole` with day tabs, AI customized workout toggle, cleaned lift logging, lift history/progress panels, and the AI Semi-Personal Trainer injury/limitation workflow.

## Current Status

- Firebase Auth login is handled through a server-side credential flow that resolves usernames, phone numbers, and emails to Firebase Auth emails before creating server-verified session cookies.
- Admin, owner, and member route access is enforced server-side.
- Unauthenticated `/` shows the public landing page; authenticated `/` redirects users to their role dashboard.
- Sessions are limited to 2 hours. The client shows a warning banner at T-5 minutes and forces logout when the timer expires.
- Member login uses registered mobile/email/username plus a 4-digit PIN. Firebase stores this internally as a valid 6+ character password format.
- Demo usernames still work by resolving to Firebase Auth emails.
- New owner-created members also get Firebase Auth accounts with the same UID as their Firestore profile.
- Firestore is the source for gyms, profiles, exercise catalog, programs, assignments, activity, sessions, lift logs, attendance, contact messages, and site links.
- The app has PWA basics: manifest, service worker, matte install prompt, app icons, apple touch icon, and offline shell caching.
- Admin inbox stores landing Contact Us messages in Firestore with read/unread state.
- Admin can manage gym workspaces at `/admin/gyms`.
- Trainers (`staffType: "trainer"`) can view member records and assign programs but cannot create/delete members, reset PINs, toggle access, or create/delete exercises and programs. This is enforced via `requireOwner()` in `lib/auth.ts`.
- `/profile` is role-split: members see the full profile form with body metrics; admin and owner see a simple identity card with no body metrics.
- Deleting a member also removes all associated programAssignments, liftLogs, notifications, workoutSessions, and attendanceRecords.
- Owner member detail page shows member's self-reported body metrics (weight, height, age, BMI, slot) read-only in the aside panel.
- All owner Firestore reads (members, programs, exercises, sessions, assignments, notifications) now use `currentUser.gymId` instead of the hardcoded SHG gym ID, enabling correct data isolation for multi-gym setups.
- Authenticated app chrome, owner dashboard copy, member empty state, and role profile pages now resolve the visible gym from the logged-in user's `gymId` instead of always using the primary SHG workspace.
- Workout check-in creates an `attendanceRecords/{sessionId}` document at Start Workout and updates `checkOutAt` when the member ends the workout.
- Start Workout requires browser GPS permission before submitting; server-side geofence validation reads gym-level `latitude`, `longitude`, and `radiusMeters` when present, falling back to SHG env vars.
- Admin notification bell is now populated from `recipientRole: "admin"` notifications (password reset requests, etc.).
- `GymWorkspace.memberCount` is now kept in sync: incremented on member create, decremented on member delete.
- Member dashboard UI is stabilized for desktop/mobile: the top summary card, profile/notification dropdowns, dark-mode selects, and lift logging panel have dedicated responsive styling.
- Members can change their own 4-digit PIN from the `/profile` page. Admin and owner users have a password change form on their `/profile` page.
- `assignedTrainer` field on the member profile form uses a `<select>` dropdown populated from the gym's trainer roster.
- Activity events are emitted on member create, access toggle (suspend/restore), and member delete.
- Member list (`/owner/members`) shows phone number, join date, and a colour-coded Active/Inactive status badge per row.
- Custom plan builder supports multiple workout days (up to 7): add/remove days, per-day exercise picker, title and sets/reps per day.
- `WorkspaceSwitcher` removed from owner pages (owners have one gym); kept on admin page for gym management link.

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

- Focused dark-first landing page for `fitsplit.in` with sticky navbar, modal login, hero product mockup, three-step workflow, merged role-based features/previews, SHG and Titan V2 Fitness partner proof, and compact Firestore-backed footer contact form.
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
/                 -> Focused landing page with modal login and footer contact form
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
components/landing-page-client.tsx  -> Public landing page, modal login, footer contact form
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

## Co-Developer Notes

This project is developed jointly by **Claude** and **Codex**. After every change either developer makes, both `README.md` and `PROJECT_HANDOFF.md` must be updated - README for current state, handoff doc for the dated change log entry. These two files are the shared context that lets each developer pick up cold.

## Handoff

See `PROJECT_HANDOFF.md` for full change history, current status, and next steps.
