# FitSplit Project Handoff

## Latest Update - 2026-05-05: Landing Navigation Polish

- Added a sticky glass landing navbar on `/` with immediate access to About us, Demo, Contact, and Login so daily users do not have to scroll to the bottom first.
- Reduced the hero headline scale for "Manage your members' workouts in one place." on desktop and mobile.
- Kept the landing palette consistent with a black/white/grey base and subtle cyan accent instead of the earlier green-to-black hue shift.
- Reworked landing scroll animation to fade sections in and out instead of using vertical motion/scale.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - local `/` HTTP 200 check on `http://localhost:3000`

## Latest Update - 2026-05-05: Trainer-Focused Landing Page

- Rebuilt `/` as a high-conversion FitSplit landing page focused on gym owners/trainers and members.
- Added role-separated positioning:
  - trainers create, assign, and track workout plans.
  - members log in, view assigned workouts, and track performance.
- Added product-preview panels for trainer dashboard, member workout screen, and progress tracking.
- Added `components/sample-plan-demo.tsx`, an interactive sample split generator driven by goal and days per week.
- Replaced generic carousel-led messaging with SaaS-style sections: hero, proof, who it is for, how it works, role-based features, product preview, interactive demo, testimonials, repeated CTA, and login.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - local desktop/mobile screenshot checks with no horizontal overflow

## Latest Update - 2026-05-05: Gym Staff Access Controls

- Reworked `/admin/gyms/[gymId]` from "Gym Owners" to "Gym Staff".
- Staff records now support `owner`, `trainer`, and `staff` categories through the admin add-staff form.
- Added a compact access toggle on the gym detail page.
- Gym access toggle now enables/disables Firebase Auth access for all owner/staff and member profiles in that gym, not just the gym status label.
- Added a delete action beside reset password for gym staff; deleting removes the Firestore profile and Firebase Auth user.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - local `/admin/gyms/titan-v2-fitness` render check for Gym Staff, access toggle, reset, and delete controls

## Latest Update - 2026-05-05: Auth Hardening and Firestore Rules

- Local Firebase Admin is now the required path for auth-backed local server actions.
- `scripts/seed-firebase-auth.mjs` now loads `.env.local` before seeding Firebase Auth users.
- Seeded demo Auth users with staff password `password` and member PIN `123456`.
- Demo login resolution now uses real Firebase Auth when Admin credentials are configured.
- Fixed server-render session handling so invalid Firebase session cookies do not attempt cookie mutation during page render.
- Normalized `titan-owner-1` login to `titan-owner-1@fitsplit.app`.
- Member creation is now gym-scoped to the authenticated owner/admin instead of hard-coding Titan.
- Logout now signs out the Firebase browser session before clearing the server session.
- Hardened and deployed Firestore rules:
  - admin can manage all gyms and records.
  - owners are scoped to their assigned gym.
  - members are scoped to their own profile, workout sessions, logs, assignments, attendance, and notifications.
- Verification passed:
  - `npm.cmd run seed:auth`
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - local admin/member/owner redirect checks
  - `firebase.cmd deploy --only firestore:rules --project fitsplit-29215`

## Latest Update - 2026-05-05: Hosted Demo Login Fix

- Fixed hosted login failure where demo usernames such as `admin`, `titan-owner-1`, and member mobile logins were routed through real Firebase Auth on Firebase App Hosting.
- Demo credentials now resolve to the local demo-session path first, even when Firebase Admin is configured in the hosted environment.
- Route guards now accept the demo compatibility cookies when no Firebase session cookie is present, so hosted demo users can reach `/admin`, `/owner`, and `/member`.
- Real Firebase Auth remains available for non-demo accounts.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`

## Latest Update - 2026-05-05: Firebase Auth Integration

- Main page revamp: `/` is now an intro landing page before login.
- Added a hero section with FitSplit branding, stock gym background image, and an “Explore features” smooth-scroll CTA.
- Added `components/feature-carousel.tsx` with auto-advancing feature slides, stock gym imagery, previous/next controls, and dot navigation.
- Added a “Login now” CTA after the carousel that scrolls to the login section.
- Existing login form remains available below the intro content, with member/staff local demo credentials preserved.
- Added landing/carousel/login page CSS in `app/globals.css`.
- Verification passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`

- Follow-up UI fix: login page now always renders the login experience at `/` instead of redirecting logged-in local users through the loader.
- Rebuilt `components/login-form.tsx` into a dedicated two-panel glass login UI with member/staff tabs, clear local demo credentials, cleaner labels, and proper error/success states.
- Added login-specific responsive CSS in `app/globals.css`; tablet/mobile layout now keeps the form visible above the fold.
- Added a mount scroll reset so returning to `/` does not preserve a previous page scroll offset and clip the login hero.
- Verified visually in the in-app browser at `http://localhost:3000` for both Member and Staff tabs.
- Verification passed:
  - `npm.cmd run typecheck`

- Follow-up fix: added a local demo-session fallback when Firebase Admin credentials are not configured locally.
- Local login now works without Firebase Admin credentials:
  - Staff tab: `admin` / `password` -> `/admin`
  - Member tab: `9688227039` / `123456` -> `/member`
- Real Firebase Auth remains the production path when Admin credentials are configured.
- Verified in the in-app browser on `http://localhost:3000`:
  - Staff login reaches `/admin`.
  - Member login reaches `/member`.
- Verification passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`

- Follow-up fix: login page was hanging locally because `.env.local` had only `FIREBASE_PROJECT_ID`, so Firebase Admin SDK tried Application Default Credentials that are not configured on this machine.
- `lib/firebase/admin.ts` now treats Admin as configured only when a service account/private key is present or when running in a Google runtime / ADC environment.
- Fixed new Antigravity compile errors:
  - Added `Settings` icon export.
  - Allowed `style` on `ConfirmActionForm`.
  - Imported `Role` in Firebase actions.
  - Added `isActive` to mock members.
  - Hardened `getGymDetail` data typing.
- Local login page now renders and submit returns the setup message instead of hanging:
  - `Firebase Admin is not configured on the server yet.`
- Verification passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`

- Replaced the mock password/cookie login flow with Firebase Auth email/password sign-in.
- `components/login-form.tsx` now resolves demo usernames/mobile numbers to Firebase Auth emails, signs in with the Firebase Web SDK, sends the ID token to the server, and supports Firebase password reset emails.
- `lib/auth.ts` now creates/verifies Firebase Admin session cookies and exposes `requireAuth` / `requireRole` guards.
- Protected routes now enforce roles server-side:
  - `/admin` requires admin.
  - `/owner/*` requires admin or owner.
  - `/member` requires member.
  - `/profile` and `/activity` require a signed-in user.
- Role-aware top navigation now hides owner/admin links from members.
- Member dashboard/profile now use the authenticated member ID instead of the old `fitsplit-member-id` fallback cookie.
- Added `scripts/seed-firebase-auth.mjs` and `npm run seed:auth` to create demo Firebase Auth accounts:
  - `admin`
  - `titan-owner-1`
  - `dummy-gym-owner-1`
  - demo member emails/phones, including Mehul.
- Firestore profile seeding now includes `authEmail` and `username` fields used by login resolution.
- New member creation now creates a matching Firebase Auth user and custom claims.
- Firestore rules were updated for `recipientId` notifications and `attendanceRecords`.
- Local `.env.local` was converted from UTF-16 to UTF-8 and public Firebase web config was added for local browser sign-in.
- Verification passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`
- Attempted `npm.cmd run seed:auth`, but local Firebase Admin credentials are missing. Run one of these before seeding:
  - `gcloud auth application-default login`
  - or set `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.

## Latest Update - 2026-05-05: Login Keyboard Submit Fix

- Fixed login keyboard behavior where pressing Enter in the password field did not submit the login form.
- Split Forgot Password into its own form so it no longer competes with the main login submit action.
- Added an Enter key handler on the login form that explicitly triggers the login submit button for reliable keyboard access.
- Verified in the in-app browser:
  - Enter from the password field logs in and navigates to `/admin`.
  - Enter while the Log in button is focused also logs in and navigates to `/admin`.
- Verification passed:
  - `npm.cmd run typecheck`

## Latest Update - 2026-05-05: Login Reveal Fix

- Fixed login page invisibility caused by scroll reveal applying `reveal-on-scroll` to the `/` login form.
- `components/scroll-reveal.tsx` now excludes the login route and clears reveal classes when returning to `/`.
- Verified in the in-app browser at `http://localhost:3001/`: login form is visible and the red Next dev issue badge is gone after restarting the dev server.
- Verification passed:
  - `npm.cmd run typecheck`

## Latest Update - 2026-05-05: Neutral Theme, Floating Nav, Scroll Reveal

- Shifted the visual theme away from green into a neutral black/white/grey palette for both light and dark modes.
- Added a floating glassmorphism sticky topbar treatment with rounded container, blur, shadow, and neutral hover states.
- Added `components/scroll-reveal.tsx`, mounted in `app/layout.tsx`, using IntersectionObserver to reveal hero sections, panels, forms, cards, and lists as the user scrolls.
- Updated `public/manifest.json` and the layout `theme-color` to neutral app chrome colors.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
- Local dev server restarted on `http://localhost:3001`; `/owner`, `/member`, `/profile`, and `/owner/programs` return HTTP 200.

## Latest Update - 2026-05-05: UI Refresh

- Added a cohesive glassmorphism visual refresh in `app/globals.css` across the app shell, topbar, hero/dashboard headers, cards, stat blocks, forms, day tabs, dialogs, drawer, and lists.
- Reworked the existing colorful `ui-card` experiment into calmer glass stat cards with accent strips, consistent typography, and no blur-on-hover clutter.
- Added branded hero-style header treatment with a subtle FitSplit icon watermark and accent rail.
- Fixed the profile header metric cards to read `weightKg` and `heightCm` from the actual profile model.
- Verification passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`
- Local dev server restarted cleanly on `http://localhost:3001`; `/owner`, `/member`, and `/profile` return HTTP 200.

## Latest Update - 2026-05-05: App Route Loader

- Added `components/hamster-loader.tsx` as a reusable animated loading indicator based on the Uiverse loader supplied by the user.
- Added `app/loading.tsx` so Next.js can show the loader during route-level loading states.
- Added global loader styles and keyframes in `app/globals.css`, including a reduced-motion pause rule.
- Verification passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`

Use this file as the starting context for future Codex chats.

## ⚡ Latest Update — May 2026 (Session 3): Attendance, BMI Analytics & Build Stability

### Attendance Calendar
- **Attendance Tracking:** New `attendanceRecords` collection/type for gym check-ins.
- **Member Dashboard:** Added "Monthly Attendance" stat in summary panel and a full **Attendance Calendar** grid in the dashboard.
- **Owner Access:** Owners can now view a member's full attendance history on the member detail page.
- **Mock Data:** Populated Aarav and Mehul with 15+ attendance records for April/May.

### BMI & Metrics UX
- **Dynamic BMI Coloring:** The BMI pill now changes color based on health categories:
  - Underweight (< 18.5): **Yellow** (`status-warning`)
  - Normal (18.5 – 24.9): **Green** (`status-active`)
  - Overweight (25 – 29.9): **Yellow** (`status-warning`)
  - Obese (≥ 30): **Red** (`status-danger`)
- **BMI Info Popover:** Added a `?` info button next to BMI that reveals a categorical chart/popover for user education.
- **Editable Metrics:** BMI and metrics (Age, Weight, Height) are fully inline editable from the member dashboard.

### Build & Stability
- **Build Fix:** Resolved a duplicate `minHeight` property error in `app/page.tsx` that was blocking Firebase deployments.
- **Firestore Paths:** Added `attendanceRecords` to the central `collectionPaths` registry.
- **Type Safety:** Added `AttendanceRecord` and `WorkoutSession` to domain types and mock models.

---

## ⚡ Latest Update — May 2026 (Session 2): Admin, Program Assign & Workout Clock

### Admin Panel Fix
- Gym name link now correctly points to `/owner` (was `/owner/dashboard` which 404'd).

### Program Assignment Fix
- `assignProgramToMember` action now has a **mock fallback** — works without Firebase Admin configured.
- Returns `"… was assigned (local mode)."` locally instead of a 500 error.

### Workout Elapsed Clock
- A **live elapsed clock** (`⏱ MM:SS` or `⏱ Xh YYm`) is displayed in the session panel when a workout is active.
- The start timestamp is persisted in `localStorage` (`fitsplit-session-start`) so the clock survives page refreshes.
- At **3 hours** elapsed, the clock turns red and shows an `"Auto-ends at 4h"` warning pill.
- At **4 hours**, the session is **automatically ended** — `endWorkoutSession` is called, localStorage is cleared, and capacity is decremented.
- The clock resets to zero on manual "End Workout" as well.

---

## ⚡ Latest Update — May 2026: Auth & UX Overhaul

### Authentication
- **Mock auth** implemented via `lib/auth.ts` using Next.js cookies (no Firebase Auth required).
- Login supports **username OR mobile number** (e.g., `9688227039` → auto-normalizes to `+91 9688227039`).
- Inputs are trimmed of whitespace before matching.
- **Forgot Password** flow sends a notification to admin/owner. Owner can reset from member detail page.
- Password field now shows a placeholder (`password`) rather than pre-filled `*****`.

| Role   | Username / Mobile     | Password |
|--------|-----------------------|----------|
| Admin  | `admin`               | password |
| Owner  | `titan-owner-1`       | password |
| Owner  | `dummy-gym-owner-1`   | password |
| Member | `mehulchirania`       | password |
| Member | `9688227039`          | password |
| Member | `aaravs`              | password |

### Login Page
- Centered FitSplit logo/branding, no topbar/hamburger/profile on login.
- Placeholder: `"Enter username/mobile number"`.
- Forgot Password moved to bottom of form (after Login button) to prevent Tab-key skip.

### Member Dashboard
- Greeting: `"Welcome, Mehul"` + `"Let's get fit!"` headline.
- Body metrics (Age, Weight, Height, BMI) shown as pills with a **pencil ✏️ icon** for inline editing via `<EditableMetrics />` component.
- BMI auto-calculated from weight/height.
- **Gym Busyness widget removed.**
- Assigned Program panel shows correct `daysPerWeek` (not `days.length`).
- Gym name **removed from Assigned Program panel** — now shown in topbar next to profile avatar.

### Topbar
- Gym name displayed to the left of the initials avatar.
- Initials avatar (e.g., `MC`) replaces the generic person icon.
- Hidden entirely on the login page (`/`).
- Hook-order bug fixed (early return moved after all `useEffect` calls).

### AI Semi-Personal Trainer
- **Push/Pull logic enforced:** swapping a push exercise no longer accidentally assigns a pull exercise.
- **Lower back pain** no longer avoids Legs (only avoids Back/deadlifts/rows).
- Stretches are **prepended** to the routine and shown in a separate `🧘 Stretches & Warm-ups` section in the workout view.
- Weight exercises appear in a separate `🏋️ Weight Exercises` section when modified.
- **Plan Modified panel** now has two distinct sections: `🔄 Exercises Swapped` and `🧘 Stretches Added for Pain Management`.
- Swap reasons include injury name for better context.

### Firebase / Local Mode
- `startWorkoutSession`, `endWorkoutSession`, `logLiftSet` — all now **return mock success** when Firebase Admin is not configured. No more 500 errors locally.
- Dialog (`confirm-dialog`) positioning fixed: `position: fixed; display: flex; z-index: 1000` — always centered on screen.

### Admin Page
- **"Owner scope"** row removed from summary panel.
- Gym names are **clickable links** to `/owner/dashboard`.
- **Dummy-Gym** displayed alongside Titan V2 Fitness.

### Mock Data
- All exercise `instructions` now have **real coaching notes** (e.g., "Keep chest up, drive through the heels...") instead of the placeholder `"Compound back movement. Add coaching notes..."`.
- Exercise thumbnails updated to muscle-specific Unsplash images (bench press for Chest, pull-up for Back, squat for Legs, etc.).
- Mehul's phone number updated to `+91 9688227039`.

### Rest Timer
- Font size reduced (`clamp(1.6rem, 4vw, 2.4rem)`) to make the timer more compact.

### Weight Label
- Log Lift form label updated to `"Weight (kg)"`.

### Notifications
- Empty state added: `"No new notifications for you!"`.

---

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
- Confirmation/status dialogs are now used for Firestore-backed actions: add member, edit member, profile save, contact submit, catalog exercise save, custom workout plan save, Start Workout, End Workout, and Log Lift.
- Product direction update: membership tracking is intentionally handled outside FitSplit in the user's existing gym app. FitSplit now focuses on member training profiles, workout programs, custom exercises, weekly schedules, AI modifications, and live capacity.
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

- `createMemberProfile`
- `updateMemberProfile`
- `assignProgramToMember`
- `updateProfileMetrics`
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

- `getMembers`
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
- `getActiveProgramAssignments`
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
- Removed membership-dependent UI and stopped creating membership/renewal records from FitSplit. Existing Firestore `memberships` seed data is legacy only and is no longer read by active pages.
- Renamed the gym selector UI to `Select Gym`; it is a dropdown with Titan V2 Fitness as the current pilot option.
- Moved custom exercise creation into a `Custom Workouts` section on `/owner/exercises` and renamed its submit action to `Save custom exercise`.
- Added a global footer across every page with `Developed with ❤️ by Mehul`.
- Improved primary navigation flow to Dashboard, Members, Workout Programs, Custom Workouts, and Exercise Catalog.
- Added weekly schedule day tabs for assigned programs. Member and owner member-detail views default to the current weekday, so Monday opens the Monday workout first.
- Added real owner-side program assignment on member detail pages. Owners can select a workout plan, confirm assignment, and the app writes `programAssignments`, member notification, and owner activity records.
- Added a global back-arrow button in the top navigation.
- Program cards on `/owner/programs` now open full modal dialogs with an `X` close button and weekly schedule tabs.
- Reworked the owner dashboard into a training ops command center: total members, assigned plans, plan gaps, active workouts, program count, catalog count, assignment coverage, and action links.
- Live capacity now shows current status, active workout sessions, member names when available, and a refresh button instead of only a static chart.
- Removed `Custom Workouts` from the top navigation; custom exercise creation remains inside the Exercise Catalog page.
- Optimized the hamburger drawer spacing and changed the brand tagline to `Your fitness companion`.
- Reworked About page links into compact social icon links above the global footer using default public destinations.
- Removed user-facing Firebase/Firestore wording from page status pills, form confirmations, and save buttons.
- Activity page now shows the combined gym-wide feed across owner and member audiences instead of a member-specific feed tied to the demo/local user.
- Moved the back button out of the brand/topbar cluster into a contextual row below the topbar for better navigation ergonomics.
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
- Membership renewal saving was removed from FitSplit UI because membership tracking now stays in the user's existing gym app.

## Last Known Verified Commands

Latest local UI fix:

- Admin page could render only the topbar because the scroll reveal helper was mutating server-rendered page elements before hydration completed.
- `components/scroll-reveal.tsx` is now non-mutating and only clears the legacy reveal root class.
- Restarted the local Next dev server on `http://localhost:3000`.
- Verified `/admin` in the in-app browser: `Gym control.` heading and admin dashboard content are visible after reload.
- `npm.cmd run typecheck` passed.

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
