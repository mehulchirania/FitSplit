# FitSplit Project Handoff

## TODO

- Develop billing support for FitSplit:
  - billing data model and Firestore collections
  - invoices/receipts or payment tracking requirements
  - owner/admin billing dashboards
  - member payment visibility if needed
  - security rules and audit/activity events for billing operations
- Implement OTP-based password reset:
  - member PIN reset flow with OTP verification
  - staff password reset approval flow through gym owner/admin
  - SMS/email provider selection
  - abuse limits, expiry windows, and audit trail

## Latest Update - 2026-05-13: Login Enter Key + Reset Request UX

- Follow-up: corrected member management UX:
  - logged-in users visiting `/` are redirected to their role dashboard, and login now uses history replacement so browser Back does not return them to the landing page.
  - Back button now routes to the role/top-level page instead of raw browser history.
  - profile/logout dropdown styling was aligned with the app UI.
  - member creation now preserves form values on errors and only clears after success.
  - member creation validates before Firestore persistence and uses generated member Auth emails so multiple members can share the same contact email.
  - inactive members remain visible in the members list, and profile edits no longer reactivate suspended members.
  - member Active/Inactive toggles were repaired for list and detail pages.
  - program assignment was moved into selectable cards on the member detail page.
  - AI program brief now has a Generate action that uses Gemini when configured and falls back to a deterministic saved-program match.
  - attendance calendar panels and attendance copy were removed from member/owner-facing pages.
  - member detail now includes a delete member action.
  - members list now supports sorting by name, newest, oldest, active, and inactive.
- Follow-up: regenerated FitSplit favicon/PWA icon assets as transparent logo-mark files and bumped manifest/favicon versions to clear stale browser-tab icon caching.
- Fixed login form keyboard behavior so pressing Enter from username/password fields submits the login form.
- Added "Forgot password?" to both active login experiences:
  - member reset requests show a confirmation dialog explaining the request goes to the gym owner and the member should contact them for the new PIN.
  - staff reset requests show a confirmation dialog explaining the request goes to the gym owner and admin.
- Added a Firestore-backed password reset request notification path for owner/admin recipients when Firebase Admin is configured.
- Scoped the Training Notes/Gym Rules footer to member pages only.
- Updated owner member access controls into compact Active/Inactive switch-style toggles on both the members list and member detail page.

## Latest Update - 2026-05-13: Focused Landing Page Redesign

- Follow-up: removed the remaining `Get Started` CTAs from the active landing page so Login is the only auth entry point.
- Follow-up: improved login speed by removing workspace seeding from the sign-in hot path and using lighter session-cookie verification on normal authenticated page reads.
- Follow-up: removed "Demo" / "Start Demo" wording from the active landing page and login modal helper copy.
- Removed outdated product limitation copy from the public landing page.
- Rebuilt the public `/` landing page into the requested five-section, dark-first FitSplit marketing site:
  - Navbar
  - Hero
  - How It Works
  - Features + Product Previews
  - Partners
  - Footer with compact contact form
- Removed the duplicated public landing sections from the active route: product overview strip, trainer/admin overview, repeated CTA strip, partner marquee, inline bottom login form, and landing navbar Install App button.
- Added a centered login modal wired to the existing Firebase Auth/session-cookie flow.
  - Member tab: mobile/email + 4-digit PIN.
  - Staff tab: username + password.
  - Successful login still redirects by role and resets scroll to top.
- Kept the existing PWA/service worker/manifest setup intact while removing the landing nav Install App CTA.
- Kept the SHG partner logo to the Partners section only, using `public/shg-gym-logo.jpeg`.
- Added a compact footer contact form and extended the existing Firestore `contactMessages` server action to accept this footer form without breaking the full Contact Us form/admin inbox.
- Verification passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`
  - local `/` HTTP + CSS 200 on `http://localhost:3000`

## Latest Update - 2026-05-12: Premium Matte Landing Refresh

- Refactored `/` into a cohesive matte-black premium SaaS landing page that matches the authenticated app visual language.
- Rebuilt the public storytelling flow around:
  - Hero
  - Product overview
  - Features
  - App previews
  - Trainer/Admin overview
  - Our Partners
  - Testimonials/trust
  - Contact
  - Final CTA
  - Login
- Added a data-driven `Our Partners` section with a smooth infinite SHG Gym logo carousel using `public/shg-gym-logo.jpeg`.
- Kept SHG partner branding off the public hero/nav; the landing page remains FitSplit-first, while SHG branding appears in the partner section and authenticated SHG workspace.
- Polished the landing navbar into a compact matte floating header with Home, Features, Partners, Contact, Login, theme toggle support, and an Install App CTA.
- Added premium matte styling for the PWA install banner, contact section, login band, product preview cards, and landing footer.
- Removed the stale `memberships` collection reference from the README to match the current Firestore model focus.
- Verification passed:
  - local `/` HTTP 200 on `http://localhost:3000`
  - `npm.cmd run typecheck`
  - `npm.cmd run build`

## Latest Update - 2026-05-12: SHG Gym Pilot Rename + Partner Branding

- Renamed the primary pilot workspace from the earlier gym identity to `Sri Shakthi Hanuman Gym`.
- Standardized the primary gym identifiers:
  - Gym id / slug: `shg`
  - Owner id / username: `santosh-shg`
  - Owner auth email: `santosh-shg@fitsplit.app`
- Added the SHG Gym logo from the supplied WhatsApp image as `public/shg-gym-logo.jpeg`.
- Updated the authenticated app topbar to show a FitSplit x SHG Gym logo lockup after users log in to the SHG Gym workspace.
- Kept the public landing page FitSplit-only so visitors see the product brand before login.
- Fixed the landing break caused by the global Next loading fallback remaining visible over the home page.
- Updated the service worker to stop caching dynamic Next pages/RSC responses, preventing stale loading shells from coming back.
- Tightened mobile landing navigation so the brand and hamburger stay in one compact row.
- Added SHG demo staff profiles for two trainers: `shg-trainer-1` and `shg-trainer-2`, both using password `password`.
- Ensured the SHG demo workspace seeds five editable member profiles and filters the previous legacy pilot gym out of the gyms page.
- Updated mock fallbacks, Firebase seed scripts, auth demo mapping, workspace switcher, owner/admin copy, and read models to use SHG Gym.
- Removed direct app/docs/script references to the previous pilot gym name.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - local `/` HTTP 200 on `http://localhost:3000`

## Latest Update - 2026-05-06: Landing Contact + Admin Inbox

- Removed the public landing-page footer credit so the credit only appears in the logged-in app footer.
- Regenerated public logo assets from `lib/images` to remove the white halo around the dark logo on dark backgrounds.
- Added a landing-page dark/light theme toggle in the glass navbar and improved the mobile navbar layout.
- Added a landing contact form with required name, mobile number, message body, and optional email.
- Contact submissions now create Firestore `contactMessages` records with `unread` status and create an admin notification record.
- Added `/admin/inbox` for admins to view contact messages, call back, and mark messages as read.
- Added an admin hamburger-menu Inbox link with unread badge; the hamburger button shows a notification dot when unread messages exist.
- Fixed Gemini partial implementation issues:
  - contact form field names now match the server action.
  - unread count now checks `unread`, not `new`.
  - unread count is loaded server-side in the layout instead of calling a server function from the client topbar.
  - inbox message read action is wired through a valid server form action.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - local `/` and CSS asset HTTP 200 on `http://localhost:3000`

## Latest Update - 2026-05-05: Premium SaaS Landing V2

- Rebuilt `/` into the requested modern FitSplit SaaS landing flow:
  - Hero
  - Who it is for
  - How it works
  - Interactive plan builder preview
  - Product previews
  - Feature bento grid
  - Before vs After
  - About + Contact
  - CTA
  - Footer
- Added `components/landing-nav.tsx` with a fixed glassmorphism navbar, desktop links, and mobile hamburger menu.
- Removed Contact from the top nav; contact details now live inside the About + Contact section.
- Updated hero copy to: "Assign better workouts. Track member progress. Keep training simple."
- Expanded the interactive demo to support Goal, Days, and Level, with dynamic split, exercise cards, sets/reps, rest time, and assigned-member preview.
- Added About copy and developer card for Mehul Chirania with Bengaluru, India and phone contact.
- Footer now uses the exact requested text: `© 2026 FitSplit. Made with 💪 by Mehul Chirania.`
- Follow-up fix: restarted the local Next dev server after CSS 404s caused the landing page to render unstyled.
- Follow-up fix: tightened hero typography/spacing and added mobile-safe width/wrapping rules for the hero and preview cards.
- Follow-up logo update: copied the new dark/light logo assets from `lib/images` into `public/fitsplit-logo-dark.png` and `public/fitsplit-logo-light.png` for browser use.
- Follow-up logo update: replaced the old neon icon in the landing nav, landing hero, About developer card, app topbar, and manifest icon.
- Follow-up hero update: changed the first viewport from two competing cards into a centered brand-first introduction with the product mockup below it.
- Follow-up layout update: removed the unnecessary slant from the hero product mockup and aligned the supporting cards.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - local `/` HTTP 200 check on `http://localhost:3000`
  - local landing CSS asset HTTP 200 check

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
  - local `/admin/gyms/shg` render check for Gym Staff, access toggle, reset, and delete controls

## Latest Update - 2026-05-05: Auth Hardening and Firestore Rules

- Local Firebase Admin is now the required path for auth-backed local server actions.
- `scripts/seed-firebase-auth.mjs` now loads `.env.local` before seeding Firebase Auth users.
- Seeded demo Auth users with staff password `password` and member PIN `1234`.
- Demo login resolution now uses real Firebase Auth when Admin credentials are configured.
- Fixed server-render session handling so invalid Firebase session cookies do not attempt cookie mutation during page render.
- Normalized `santosh-shg` login to `santosh-shg@fitsplit.app`.
- Member creation is now gym-scoped to the authenticated owner/admin instead of hard-coding the pilot gym.
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

- Fixed hosted login failure where demo usernames such as `admin`, `santosh-shg`, and member mobile logins were routed through real Firebase Auth on Firebase App Hosting.
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
  - Member tab: `9688227039` / `1234` -> `/member`
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
  - `santosh-shg`
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
| Owner  | `santosh-shg`       | password |
| Owner  | `dummy-gym-owner-1`   | password |
| Member | `mehulchirania`       | 1234 |
| Member | `9688227039`          | 1234 |
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
- **Dummy-Gym** displayed alongside Sri Shakti Hanuman Gym.

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

FitSplit is a Next.js gym management app for the Sri Shakti Hanuman Gym pilot gym.

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
- Firestore was seeded with Sri Shakti Hanuman Gym demo data on 2026-05-04.
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
SHG gym id: shg
SHG owner id: santosh-shg
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
- `getPrimaryWorkspace`
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
- Renamed the gym selector UI to `Select Gym`; it is a dropdown with Sri Shakti Hanuman Gym as the current pilot option.
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
- Seeded live Firestore for project `fitsplit-29215` with full Sri Shakti Hanuman Gym demo data: gym workspace, admin/owner/member profiles, memberships, exercise catalog, workout programs, notifications, and split templates.
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

## Latest Update - May 11, 2026

- Added `/admin/gyms` management page for admin users.
- Admin can now add new gym workspaces, edit existing gym details inline, open a gym detail page, and remove unused gyms.
- Gym removal is guarded:
  - Sri Shakti Hanuman Gym cannot be deleted because it is the active pilot gym.
  - Gyms with assigned profiles cannot be removed until staff/members are reassigned or deleted.
- Removed the old workspace helper copy: `Admin can add more gyms later`.
- Replaced that copy with `Manage gyms` buttons on the admin dashboard and workspace switcher.
- Login hardening completed in the previous pass:
  - Member login accepts username/mobile/email plus `1234` PIN.
  - Server-side credential login maps member PIN to Firebase-compatible `pin-1234`.
  - Successful login uses hard navigation to the role dashboard.
- Landing/authenticated nav now hides on scroll down and returns on scroll up.
- Landing theme toggle moved into the hamburger menu.
- README was refreshed to match current PWA/auth/admin-gym state.

Latest verification:

```bash
npm.cmd run build
npm.cmd run typecheck
```

Local server:

```text
http://localhost:3000
```

## Open Issues

- GitHub automatic deployment is not connected in Firebase App Hosting backend settings.
- Storage rules deploy was previously blocked because Firebase Storage had not been initialized in console.
- Firebase Storage avatar/staff image upload is still pending.
- Firebase Cloud Messaging push reminders are still pending.
- Production gym geofence coordinates must be configured in environment variables before strict attendance validation is complete.
- Membership renewal saving was removed from FitSplit UI because membership tracking now stays in the user's existing gym app.

## Last Known Verified Commands

Latest local UI fix:

- PWA/Auth upgrade pass added a cache-busted manifest, service worker, install prompt, cleaned transparent logo assets for favicon/app icon/header usage, and mobile bottom navigation.
- Member auth now uses a 4-digit numeric PIN (`1234` for demo members) with inline client validation and 2-hour cookie/session timeout handling.
- Workout check-in now requests GPS, sends latitude/longitude/device info to `workoutSessions.attendance`, and enforces the gym geofence when `SHG_GYM_LATITUDE`, `SHG_GYM_LONGITUDE`, and optional `SHG_GYM_RADIUS_METERS` are configured.
- Member profile now stores timing slots, gender/DOB, goals, medical notes, injury notes, and assigned trainer fields.
- In-workout rest timer UI/code references were removed.
- Authenticated footer now carries Pro Tips and Gym Rules. Landing page remains free of the Mehul footer credit before login.
- Still pending for a later pass: Firebase Cloud Messaging push reminders, Firebase Storage avatar/staff image uploads, full revenue/payment dashboard modeling, and production geofence coordinates in `.env.local`/hosting config.
- Verification passed:

```bash
npm.cmd run build
npm.cmd run typecheck
```

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
