# FitSplit

FitSplit is a Firebase-backed gym operations and personal training platform. It serves multi-gym workspaces with robust tenant isolation, offline-resilient workout logging, personal training management, and deep operational insights — deployed as a PWA on Firebase App Hosting.

---

## ⚡ Tech Stack & Architecture

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, React 19 + React Compiler, TypeScript 6) |
| Dev bundler | Turbopack (`next dev --turbopack`) |
| Database | Cloud Firestore (gym-scoped multi-tenant) |
| Auth | Firebase Authentication — email/password + session cookies |
| Functions | Firebase Cloud Functions v2 (Node.js 22, `asia-south1`) |
| Storage | Firebase Storage (logos, exercise media) |
| Push | Firebase Cloud Messaging (FCM) |
| Client State | React state + Context (live workout session) |
| Offline | Dexie.js (IndexedDB — offline lift logging) |
| Charts | Recharts (lazy-loaded via `next/dynamic`, `ssr:false`) |
| Calendar | Custom PT calendar component (`pt-calendar.tsx`) |
| UI Primitives | Radix UI (Dialog, Dropdown, Select) |
| Animations | Framer Motion |
| Toasts | Sonner |
| Validation | Zod |
| Testing | Vitest |
| Deployment | Firebase App Hosting (0–10 instances, 512 MB, 80 concurrency) |

**Architecture pattern:** Next.js Server Components + Server Actions for all data access. No traditional REST API routes. Privileged writes (member creation, program assignment, access control) go through Cloud Functions using the Admin SDK. Middleware enforces role-based routing via session cookies before any page renders.

**B2C + B2B Evolution (Planned):** FitSplit is evolving from a pure gym-scoped multi-tenant architecture into a hybrid B2C/B2B platform. Standalone consumers will have their own "personal gym" workspaces (`gyms/personal-{uid}`), allowing them to track progress independently or seamlessly join a real gym later.

---

## 📚 Documentation

The **`docs/`** directory is the single source of truth for this codebase. Start at **[`docs/_INDEX.md`](docs/_INDEX.md)** for navigation and the maintenance protocol; load **[`docs/00_AI_CONTEXT.md`](docs/00_AI_CONTEXT.md)** for a fast, condensed context dump.

The docs follow a three-tier model:
- **Tier 0** — `00_AI_CONTEXT.md`: always-loaded condensed overview.
- **Tier 1** — `01_ARCHITECTURE.md` … `09_SCREEN_CATALOG.md`: verified facts (architecture, data model, actions, functions, roles, routes, screens).
- **Tier 2** — `10_REFACTORING_ROADMAP.md`: prioritized, opinionated improvement plan. Also see `11_KNOWN_ISSUES_AND_GAPS.md`, `12_UI_STYLE_GUIDE.md`, and `DISCREPANCIES.md`.

This README and `PROJECT_HANDOFF.md` remain the friendly entry point and the dated change log respectively; for any deep technical question, defer to `docs/`.

---

## ✨ Features

### 🏋️ Workout & Program Management
- **Program Library**: FitSplit global library + gym-custom programs. Split types: PPL ×2, PPL + Upper/Lower, Bro Split, Combo ×2, Custom.
- **Program Assignment**: Assign programs to individual members or bulk-assign across the roster.
- **Live Workout Console**: Members log sets and reps in real time with day navigation, skip/modify tracking, and week-over-week history.
- **Exercise Catalog**: Global FitSplit catalog + gym-custom exercises with YouTube video embeds, muscle group tagging, equipment metadata, and per-exercise muscle-target descriptions (all 66 default catalog entries).
- **Exercise Requests**: Members request new exercises; owners review and approve/reject.
- **Workout Insights**: Local heuristic analysis of lift history — rest day suggestions, progressive overload coaching tips, PR callouts. No external API needed.
- **Injury Notes**: Members record pain points or limitations (e.g. "left shoulder pain"). Trainer can see this note and adjust the plan. Rule-based exercise swap suggestions via local muscle-group logic.

### 🤝 Personal Training
- **PT Plan Booking**: Owners and trainers book PT plans with configurable duration (default 30 days).
- **Trainer Live Console**: Real-time set/rep logging during active PT sessions, dual-written to the member's lift log history.
- **PT History**: Members view their full PT session history and trainer-logged sets.
- **PT Calendar**: Custom calendar component (`pt-calendar.tsx`) schedule view for trainers.

### 📊 Progress & Analytics
- **Lift Log History**: Full set/rep history per exercise with progressive overload charts (PR reference line, kg units).
- **Body Metrics**: Weight and body fat percentage logging with trend charts.
- **Muscle Radar Chart**: Volume distribution visualization across muscle groups.
- **Attendance Calendar**: Member check-in/check-out history.
- **Gym Floor Load Map**: Real-time slot occupancy heatmap — categorizes traffic (Quiet 🟢, Moderate 🟡, Crowded 🔴), surfaces top congested exercises, and provides operational coaching advice.
- **Owner Reports**: Membership stats, activity feed, and operational summaries.

### 🔔 Notifications & Activity
- **Rich Notification Center**: Role-scoped notifications with type icons, relative timestamps ("2h ago"), deep-action links, unread indicators, and per-item dismiss.
- **Full Notifications Page** (`/owner/notifications`): Filter tabs (All / Unread / PT / Members / Other), "Mark all read", paginated list.
- **Notification Types**: membership expiry, program assigned, PT booked/started/completed/cancelled/rescheduled, exercise requests, contact messages, member created.
- **Action Deep Links**: Each notification carries an `actionHref` that routes directly to the relevant page (e.g. PT notification → `/owner/training`, member notification → `/owner/members/[id]`).
- **Bell Badge**: Shows numeric count (capped at 9+), not just a dot.
- **FCM Push Notifications**: Web push for members via Firebase Cloud Messaging.
- **Activity Feed**: Audit trail of key events for owners and members.
- **Admin Inbox**: Platform-wide contact messages from the landing page.

### 🏢 Gym Operations
- **Geofenced Attendance**: GPS-verified check-in/check-out with configurable gym radius. Logs geofence status (`inside`, `not_configured`, `location_not_provided`).
- **Membership Management**: Plan tracking with expiry warnings and automated notifications.
- **Gym Notice Board**: Owners post rules, tips, reminders, and announcements visible to members.
- **Profile Photos**: Members and staff upload a cropped avatar (client-side circular crop → PNG) stored in Firebase Storage; shown in the top bar and profile screens. Members self-serve in settings; owners/admins can update any member in their gym.
- **Macro/Nutrition Targets**: Trainers prescribe daily calorie/macro targets; members track progress in the wellness panel.
- **Multi-Gym Isolation**: All reads and writes are partitioned by `gymId` — gym-scoped Firestore collections with Firestore security rules enforcing boundaries.

### 📱 PWA
- Installable on iOS and Android.
- Offline lift logging via IndexedDB (Dexie.js) with service worker.
- Mobile bottom navigation, scroll reveal animations, session timeout guard.

---

## 👥 User Roles

| Role | Access Scope | Key Capabilities |
|---|---|---|
| `admin` | Platform-wide | Manage all gyms, create staff, exercise catalog, global programs, inbox |
| `owner` | Gym-scoped | Member management, program assignment, PT scheduling, reports, gym settings |
| `trainer` (staffType) | Gym-scoped | PT schedule, live PT console, assign programs |
| `member` | Self only | Workout console, lift logging, progress, PT history, body metrics |

---

## 🔑 Demo Login Credentials

### Staff & Admin Logins
Use the **Staff** login tab:

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `password` |
| Owner (SHG) | `santosh-shg` | `password` |
| Trainer (SHG) | `shg-trainer-1` | `password` |
| Trainer (SHG) | `shg-trainer-2` | `password` |
| Owner (Titan) | `titan-owner-1` | `password` |
| Owner (Dummy) | `dummy-gym-owner-1` | `password` |

### Member Logins
Use the **Member** login tab (4-digit PIN):

| Username / Mobile / Email | PIN | Name |
|---|---|---|
| `mehulchirania` | `1234` | Mehul Chirania |
| `9688227039` | `1234` | Mobile Account |
| `mehul@example.com` | `1234` | Email Account |
| `aarav` | `1234` | Aarav |
| `meera` | `1234` | Meera |
| `kabir` | `1234` | Kabir |
| `nisha` | `1234` | Nisha |

---

## 🛠️ Local Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env.local` and fill in the values:
```env
# Firebase client keys
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fitsplit-29215.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fitsplit-29215
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fitsplit-29215.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=766523780087
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK (server-side)
FIREBASE_PROJECT_ID=fitsplit-29215
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

### 3. Run the dev server
```bash
npm run dev   # next dev --turbopack (Rust bundler — fast cold start + HMR)
```

### 4. Type-check and build
```bash
npm run typecheck
npm run build
```

### 5. Run tests
```bash
npm test
```

---

## 🚀 Scripts

### Seeding & Demo Data
```bash
npm run seed:auth          # Create/update Firebase Auth demo accounts
npm run seed:firebase      # Seed Firestore with base data
npm run seed:demo          # Full demo seed — gyms, members, programs, mock logs
```

### Data Migrations
```bash
npm run migrate:gym-scoped        # Dry run: migrate root collections → gym-scoped
npm run migrate:gym-scoped -- --write   # Write: execute the migration
npm run migrate:tenant-cleanup          # Dry run: rebuild authProfiles, clean root
npm run migrate:tenant-cleanup -- --write
```

### Data Fixes & Backfills
```bash
npm run backfill:member-access    # Repair missing usernames and auth profiles
npm run fix:exercises             # Title Case cleanup, re-categorize, map videos
npm run fix:gym-video-urls        # Fix gym-scoped exercise video URLs
npm run patch:videos              # Backfill catalog video URLs from workout models
npm run sync:exercise-videos      # Sync exercise videos from workout definitions
npm run fetch:channel-videos      # Fetch YouTube channel video metadata
```

### Deployment
```bash
npm run deploy:firebase           # Build + full Firebase deploy
npm run functions:deploy          # Build + deploy Cloud Functions only
```

### Utilities
```bash
npm run split:css                 # Split CSS selectors (legacy helper)
npm run knip                      # Report unused files / exports / dependencies
npm run analyze                   # Production build with bundle analyzer (ANALYZE=true)
```

---

## 📂 Architecture Map

```
app/
  admin/
    billing/        # Platform billing — coming soon placeholder
    exercises/      # Global exercise catalog management
    gyms/[gymId]/   # Gym detail + staff management (owner edit, add staff)
    inbox/          # Platform support inbox (contact messages)
    programs/       # Admin-level program management (inline WorkoutProgramGallery)
  owner/
    billing/        # Payment requests — approve/reject with stat cards
    exercises/      # Gym exercise catalog (table + video preview column)
    members/        # Hybrid member roster (action queue, KPI strip, directory)
      [memberId]/   # Member detail — program, PT, coach note, access
    notifications/  # Full-page notification centre (filter tabs, mark-all-read)
    packages/       # Membership package management
    programs/       # Program library (WorkoutProgramGallery + CustomPlanBuilder)
    reports/        # Gym reports — KPIs, attendance trend, workout coverage, PT plans
    settings/       # Gym settings — details (owner-editable), logo, notices, trainer visibility
    trainers/       # Trainer roster with live PT plan counts + AddStaffForm
    training/       # PT booking + session list + calendar view
  member/
    page.tsx        # Member dashboard (MemberCoachShell — workout console, progress, wellness)
    (pages)/        # Route group — sub-pages share MemberSubSidebar layout
      coach/        # Trainer conversation + coach note detail
      exercises/    # Read-only exercise catalog
      membership/   # Membership status, package request form, payment history
      programs/     # Read-only workout program library
      pt-history/   # Full PT session history
      settings/     # Account settings — units, PIN change, notifications
  trainer/          # Trainer PT schedule + my members list
  styles/           # modular CSS files (21 numbered, plus forms.css, member.css, ep-modal.css)

components/
  member-sub-sidebar.tsx            # Member sub-pages sidebar (links, gym branding, logout)
  odp-sidebar.tsx                   # Owner workspace sidebar (nav, user footer, logout)
  odp-workspace-shell.tsx           # Owner workspace wrapper (sidebar + main area)
  open-details-button.tsx           # Client button that opens a <details id="…"> + scrolls to it
  trainer-live-console.tsx          # PT session trainer UI
  notification-list.tsx             # Rich notification list (icons, timestamps, links, dismiss)
  app-topbar.tsx                    # Topbar (hidden for /owner/* at component level, see above)
  workout-program-gallery.tsx       # Program browser with filtering + readOnly mode
  catalog-video-preview.tsx         # Exercise video preview chip (YouTube + gym video)
  progress-chart.tsx                # Lift history area chart (styled empty state)
  progressive-overload-chart.tsx    # Progressive overload line chart (PR reference line, kg units)
  muscle-radar-chart.tsx            # Muscle group volume radar
  members-hybrid-view.tsx           # D4 Hybrid members page (action queue, KPI strip, table)
  macro-progress-panel.tsx          # Nutrition target tracking
  workout-insights-card.tsx         # Local heuristic workout insights (no external API)
  staff-access-actions.tsx          # Inline staff edit/reset-password/delete with useActionState
  avatar-uploader.tsx               # Reusable circular avatar crop+upload (member avatar / staff image)

lib/
  auth.ts                           # Session cookies, login, requireRole(); demo login fallback fixed
  ai.ts                             # Local workout insights heuristic (getWorkoutInsights) — no API
  offline-db.ts                     # Dexie IndexedDB (offline lift logging)
  workout-utils.ts                  # Workout calculation helpers
  firebase/
    actions/                        # Server Actions (mutations) — one file per domain
      gyms.ts                       # updateGymDetails + updateGymLogo allow owner role (not admin-only)
      members.ts                    # changeMemberPin verifies current PIN via Firebase Auth REST
      pt.ts                         # PT booking, session management, live logging
      staff.ts                      # updateStaffProfile (fullName, phone, staffType) + delete
    read-models/                    # Server-side Firestore reads
    client.ts                       # Firebase client SDK init
    admin.ts                        # Firebase Admin SDK init
    collections.ts                  # Collection path constants
    functions.ts                    # Cloud Functions callable wrappers

functions/src/index.ts              # All Cloud Functions (~2000+ lines)
types/domain.ts                     # Domain types — Notification has actionHref, memberId, ptSessionId
middleware.ts                       # Route protection + role redirects (admin/owner/trainer/member)
firestore.rules                     # Firestore security rules
```

### Firestore Structure (gym-first multi-tenant)
```
gyms/{gymId}/
  members/{memberId}          staff/{staffId}
  exerciseCatalog/{id}        workoutPrograms/{id}
  programAssignments/{id}     liftLogs/{id}
  bodyMetricLogs/{id}         dayLogs/{id}
  workoutSessions/{id}        attendanceRecords/{id}
  ptSessions/{id}             ptLiftLogs/{id}
  notifications/{id}          activityEvents/{id}
  contactMessages/{id}        siteLinks/{id}

authProfiles/{uid}            # Auth/session index (root, lightweight)
exerciseCatalog/{id}          # FitSplit global library (admin-only writes)
workoutPrograms/{id}          # FitSplit global library (admin-only writes)
archives/{id}                 # Soft-delete archive (60-day retention)
```

See `FIRESTORE_STRUCTURE.md` for the full schema and migration rules.

---

## 🔒 Security

- **CSP headers**: Strict Content-Security-Policy set per-request in `src/middleware.ts`. **Production uses a fresh per-request nonce + `'strict-dynamic'`** for `script-src` (no `'unsafe-inline'`/`'unsafe-eval'` in effect); Next.js applies the nonce to every script it renders, and the inline theme script in `layout.tsx` carries it via `headers()`. `img-src` is `https:` only (no mixed content) with `upgrade-insecure-requests`; `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`. Development keeps `'unsafe-inline'`/`'unsafe-eval'` (no nonce) so HMR works.
- **Security headers**: HSTS (2 years, `preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, a locked-down `Permissions-Policy` (camera/mic/payment/usb off, geolocation self), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `X-DNS-Prefetch-Control: off`, `X-Permitted-Cross-Domain-Policies: none`.
- **Firestore rules**: Role-based rules (`isAdmin()`, `isOwnerForGym()`, `isStaffForGym()`, `isGymMember()`), gym-scoped at root and per-gym. Privileged writes are `allow: false` — must go through Cloud Functions. Tested via `npm run test:rules` (Firestore emulator).
- **Storage rules**: Catalog media is gym-scoped — reads limited to users of the owning gym, writes to that gym's owner/admin only, with content-type and size caps. Default-deny for all other paths.
- **Login lockout**: 5 failed attempts triggers a 15-minute lockout, enforced via a Firebase Auth blocking trigger.
- **Session cookies**: 2-hour secure HttpOnly cookies (`SameSite=Lax`, `Secure` in production). Role and gymId stored separately for middleware routing.
- **Secrets**: only public `NEXT_PUBLIC_FIREBASE_*` values are committed (`apphosting.yaml`); the Firebase Admin private key is supplied via Secret Manager, never committed.

---

## ⚖️ Legal & Compliance

- **Public legal pages**: `/privacy` (GDPR + CCPA/CPRA) and `/terms` (incl. a health/fitness "not medical advice" disclaimer). `/about` is public too. All three are linked from the landing footer, login modal, and member settings.
- **Consent**: a blocking **first-login gate** (`components/terms-consent-gate.tsx`) requires every user to accept the Terms and Privacy Policy (incl. fitness-data processing) before using the app — accept to proceed, decline to log out. Acceptance is recorded per-user (`termsAcceptedAt` on the auth profile) plus a session cookie, via the `acceptTerms` server action.
- **Data subject rights (DSAR)**: members can **export all their data as JSON** and **request account deletion** from Settings → *Privacy & your data* (`src/lib/firebase/actions/privacy.ts`). Deletion requests notify the gym owner, who performs the erasure.
- **Still required before production**: fill the legal-entity name/address placeholder in the policies, and sign a DPA with gyms (FitSplit acts as their processor). See `PROJECT_HANDOFF.md`.

---

## 🎨 Design System & UI Patterns

FitSplit uses a custom design system with comprehensive design tokens (dark mode by default), CSS architecture, and reusable layouts (like the owner workspace `.odp2-workspace` and member hybrid view). 

For the complete UI style guide, including color palettes, critical button rules, and CSS prefixes, see **[`docs/12_UI_STYLE_GUIDE.md`](docs/12_UI_STYLE_GUIDE.md)**.

---

## 📝 Maintenance & Handoff

For architectural logs, dated updates, and next milestones, see **`PROJECT_HANDOFF.md`**.

This project is jointly developed by **Claude** and **Codex**, in collaboration with **[Blume Labs](https://blumelabs.in)**. Update the handoff log after implementing significant changes.
