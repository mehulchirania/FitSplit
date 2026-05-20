# FitSplit

FitSplit is a Firebase-backed gym management web app for Sri Shakthi Hanuman Gym (SHG Gym), with Titan Fitness Club and a Dummy-Gym workspace included for admin testing. It uses Firebase Authentication, server-verified role sessions, Cloud Firestore app data, and an AI-assisted semi-personal trainer workflow.

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

The public `/` landing page is a premium dark B2B SaaS experience (Linear/Vercel-inspired) built with Framer Motion. Key design tokens live in CSS variables under `.lp-root`. Sections: Navbar, Hero (animated `AppMockup` workout card + `/bg-image.png` background), Feature strip, How it works, Audience pills, Workflow bento, Partners (SHG Gym + Titan V2 Fitness), Footer + contact form, Login modal. The login modal is wired to the full Firebase Auth flow. Landing-only CSS lives in `app/landing.css` under the `lp-*` prefix and does not affect the authenticated app shell.

## Member Dashboard

The member `/member` page uses a premium `md-*` summary hero plus an isolated `member-*` workout console layout. The console has responsive day tabs, stable exercise cards with video playback actions, contained lift logging, lift history/progress panels, and the AI Semi-Personal Trainer injury/limitation workflow. Member workout styles live in `app/styles/member.css`.

## Current Status

- Firebase Auth login is handled through a server-side credential flow that resolves usernames, phone numbers, and emails to Firebase Auth emails before creating server-verified session cookies.
- Admin, owner, and member route access is enforced server-side.
- Unauthenticated `/` shows the public landing page; authenticated `/` redirects users to their role dashboard.
- Protected routes use middleware to redirect unauthenticated users before the dashboard Server Components render.
- Sessions are limited to 2 hours. The client shows a warning banner at T-5 minutes and forces logout when the timer expires.
- Member login uses registered mobile/email/username plus a 4-digit PIN. Firebase stores this internally as a valid 6+ character password format.
- Demo usernames still work by resolving to Firebase Auth emails.
- New owner-created members also get Firebase Auth accounts with the same UID as their Firestore profile.
- Firestore is the source for gyms, profiles, exercise catalog, programs, assignments, activity, sessions, lift logs, attendance, contact messages, and site links.
- Workout assignment merges predefined `lib/workouts.json` splits with gym-created Firestore programs, so owners can assign built-in plans even before creating custom plans. Empty placeholder templates are excluded from assignment.
- The exercise catalog read model merges predefined `lib/workouts.json` exercises with gym-created Firestore exercises so predefined plans always render exercise names. Optional `video_url` values in `workouts.json` become default exercise videos, with Firestore overrides layered on top.
- The app has PWA basics: manifest, service worker, matte install prompt, app icons, apple touch icon, and offline shell caching.
- Admin inbox stores landing Contact Us messages in Firestore with read/unread state.
- Admin can manage gym workspaces at `/admin/gyms`.
- Gyms are treated as active, paused, or inactive workspaces. Older setup status values are normalized to `active` on read.
- Admin gym detail pages include a logo crop/resize uploader that saves a 512px PNG to Firebase Storage and stores the gym `logoUrl` in Firestore.
- Member top navigation shows a FitSplit x gym-logo lockup when the logged-in member's gym has a logo.
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
- Member workout UI uses isolated `member-*` CSS classes so exercise rows, video actions, and lift logging do not inherit conflicting owner/admin list styles.
- Members can change their own 4-digit PIN from the `/profile` page. Admin and owner users have a password change form on their `/profile` page.
- `assignedTrainer` field on the member profile form uses a `<select>` dropdown populated from the gym's trainer roster.
- Activity events are emitted on member create, access toggle (suspend/restore), and member delete.
- Member list (`/owner/members`) shows phone number, join date, and a colour-coded Active/Inactive status badge per row.
- Custom plan builder supports multiple workout days (up to 7): add/remove days, filterable exercise picker grouped by muscle group, per-exercise sets/reps, custom free-text exercises, and a "Send to admin for catalog" checkbox.
- Custom gym plans can now be edited (inline dialog) or deleted from the programs gallery. Delete shows a confirmation dialog. Predefined plans are collapsed by default in the gallery so custom plans are prominent.
- Exercise catalog deduplicates by name when Firebase and mock data are both present — prevents duplicate entries when the same exercise exists in both sources.
- Owners can request new exercises to be added to the admin catalog directly from the custom plan builder. Admin receives a notification and sees pending requests in `/admin/exercises` with a one-click review-and-approve form.
- Back button removed from the app shell — breadcrumbs in page headers already provide full navigation context.
- Fitness loading animation (barbell + pulsing dots) shows on every route-level `loading.tsx` boundary.
- Dark-theme dropdowns and dialogs use an opaque `#1c1c1e` background so notification/profile menus are readable.
- Member list (`/owner/members`) now has filter tabs (All / Has plan / Needs plan) and sort controls (Name / Newest / Oldest / Active first / Inactive first). Plan status is shown as a colour-coded badge per member row. Suspend/Restore is a direct form submit (no confirm modal).
- Mock data expanded: 10 extra SHG members and 20 Titan Fitness Club members with mixed active/inactive status and plan assignments for realistic scroll and filter testing.
- Titan Fitness Club gym workspace added to mock data.
- Member trainer field is read-only for members on `/profile` — only owners/admins can change the assigned trainer.
- `/owner/programs` separates predefined plans from custom gym plans and shows mapped catalog exercises, training-day counts, total exercises, and assigned members without stock image cards.
- SHG now has Firestore-backed custom **Stage 2 Workouts** and **Stage 3 Workouts** imported from trainer spreadsheets, including 12 total training days, 180 catalog workout items, and 143 video links.
- `/owner/exercises` supports inline editing with visible open/close controls, admin-only video URL management, and a compact clickable video indicator for exercises that include a form video.
- Member workout rows show a `Play video` action for exercises with a video URL, including YouTube Shorts links.
- `WorkspaceSwitcher` removed from owner pages (owners have one gym); kept on admin page for gym management link.
- Landing CSS is split into `app/landing.css`; `/` imports it directly and the repaired navbar/login modal styles are scoped to `lp-*`.

## Demo Login Credentials

| Role | Username / Mobile / Email | Password |
| --- | --- | --- |
| Admin | `admin` | `password` |
| Owner (SHG) | `santosh-shg` | `password` |
| Trainer (SHG) | `shg-trainer-1` | `password` |
| Trainer (SHG) | `shg-trainer-2` | `password` |
| Owner (Titan) | `titan-owner-1` | `password` |
| Owner (Dummy) | `dummy-gym-owner-1` | `password` |
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
- Exercise videos can be stored on catalog entries and played from assigned member workout rows.
- Exercise thumbnails are resolved from movement-specific WGER exercise images by exercise name, prefer animated GIFs where reliable matches exist, and can be clicked to open an enlarged in-app preview.
- Owner can request custom exercises to be added to admin catalog from the plan builder, with a "send to admin" checkbox — admin reviews, edits, and approves in one step from `/admin/exercises`.
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
exerciseRequests
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
Titan Fitness Club gym id: titan-gym (mock only)
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

## Maintenance Scripts

```bash
npm run seed:auth         # Create / update Firebase Auth demo accounts
npm run seed:demo         # Seed Firestore with SHG, Titan, dummy gym, members, programs
npm run fix:exercises     # Clean up exerciseCatalog: Title Case names, fix categories,
                          # remove duplicates, inject SHG gym video URLs
npm run patch:videos      # Patch exerciseCatalog videoUrl from workouts.json
```

## Known Caveats

- Firebase Auth demo users must be seeded before the demo usernames can log in.
- Local `seed:auth` requires Firebase Admin credentials or Application Default Credentials.
- Exercise video upload UI is not implemented yet; forms store URL/path text.
- Firebase Storage avatar/staff image upload is still pending.
- Firebase Cloud Messaging push reminders are still pending.
- Production geofence coordinates must be configured before strict gym-radius attendance can be trusted.
- Newly created gym staff (owner/trainer) accounts use default password `password`. No email is sent — credentials must be shared manually. Staff should change their password via `/profile` after first login. Login requires the **Staff** tab (not the Member/PIN tab).

## Co-Developer Notes

This project is developed jointly by **Claude** and **Codex**. After every change either developer makes, both `README.md` and `PROJECT_HANDOFF.md` must be updated - README for current state, handoff doc for the dated change log entry. These two files are the shared context that lets each developer pick up cold.

## Handoff

See `PROJECT_HANDOFF.md` for full change history, current status, and next steps.

