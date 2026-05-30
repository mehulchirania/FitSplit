# FitSplit

FitSplit is a Firebase-backed gym operations and personal training platform. It serves multi-gym workspaces with robust tenant isolation, offline-resilient workout logging, personal training management, and deep operational insights — deployed as a PWA on Firebase App Hosting.

---

## ⚡ Tech Stack & Architecture

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, React 19, TypeScript 5.8) |
| Database | Cloud Firestore (gym-scoped multi-tenant) |
| Auth | Firebase Authentication — email/password + session cookies |
| Functions | Firebase Cloud Functions v2 (Node.js 22, `asia-south1`) |
| Storage | Firebase Storage (logos, exercise media) |
| Push | Firebase Cloud Messaging (FCM) |
| Client State | Zustand (live workout session) |
| Offline | Dexie.js (IndexedDB — offline lift logging) |
| Charts | Recharts |
| Calendar | FullCalendar (PT scheduling) |
| UI Primitives | Radix UI (Dialog, Dropdown, Popover, Select) |
| Animations | Framer Motion |
| Toasts | Sonner |
| Validation | Zod |
| Testing | Vitest |
| Deployment | Firebase App Hosting (0–10 instances, 512 MB, 80 concurrency) |

**Architecture pattern:** Next.js Server Components + Server Actions for all data access. No traditional REST API routes. Privileged writes (member creation, program assignment, access control) go through Cloud Functions using the Admin SDK. Middleware enforces role-based routing via session cookies before any page renders.

---

## ✨ Features

### 🏋️ Workout & Program Management
- **Program Library**: FitSplit global library + gym-custom programs. Split types: PPL ×2, PPL + Upper/Lower, Bro Split, Combo ×2, Custom.
- **Program Assignment**: Assign programs to individual members or bulk-assign across the roster.
- **Live Workout Console**: Members log sets and reps in real time with day navigation, skip/modify tracking, and week-over-week history.
- **Exercise Catalog**: Global FitSplit catalog + gym-custom exercises with YouTube video embeds, muscle group tagging, and equipment metadata.
- **Exercise Requests**: Members request new exercises; owners review and approve/reject.
- **Workout Insights**: Local heuristic analysis of lift history — rest day suggestions, progressive overload coaching tips, PR callouts. No external API needed.
- **Injury Notes**: Members record pain points or limitations (e.g. "left shoulder pain"). Trainer can see this note and adjust the plan. Rule-based exercise swap suggestions via local muscle-group logic.

### 🤝 Personal Training
- **PT Plan Booking**: Owners and trainers book PT plans with configurable duration (default 30 days).
- **Trainer Live Console**: Real-time set/rep logging during active PT sessions, dual-written to the member's lift log history.
- **PT History**: Members view their full PT session history and trainer-logged sets.
- **PT Calendar**: FullCalendar-based schedule view for trainers.

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
| `aarav@example.com` | `1234` | Aarav |

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
npm run dev
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
  styles/           # 21 modular CSS files (see CSS Architecture section)

components/
  workout/                          # Extracted workout sub-components
    session-timer-bar.tsx           # Active session bar: elapsed time + end workout
    injury-notes-form.tsx           # Injury/limitation notes with preset chips
    day-skip-form.tsx               # Skip reason chips + confirm + makeup exercises
    use-workout-console.ts          # All workout console business logic (custom hook)
  member-workout-console.tsx        # Coordinator (~220 lines)
  member-sub-sidebar.tsx            # Member sub-pages sidebar (links, gym branding, logout)
  odp-sidebar.tsx                   # Owner workspace sidebar (nav, user footer, logout)
  odp-workspace-shell.tsx           # Owner workspace wrapper (sidebar + main area)
  open-details-button.tsx           # Client button that opens a <details id="…"> + scrolls to it
  trainer-live-console.tsx          # PT session trainer UI
  notification-list.tsx             # Rich notification list (icons, timestamps, links, dismiss)
  app-topbar.tsx                    # Topbar (hidden for /owner/* at component level, see above)
  gym-floor-load-map.tsx            # Real-time slot occupancy heatmap
  workout-program-gallery.tsx       # Program browser with filtering + readOnly mode
  catalog-video-preview.tsx         # Exercise video preview chip (YouTube + gym video)
  progress-chart.tsx                # Lift history area chart (styled empty state)
  progressive-overload-chart.tsx    # Progressive overload line chart (PR reference line, kg units)
  muscle-radar-chart.tsx            # Muscle group volume radar
  attendance-calendar.tsx           # Member attendance history
  members-hybrid-view.tsx           # D4 Hybrid members page (action queue, KPI strip, table)
  bulk-member-list.tsx              # Bulk select + actions
  macro-progress-panel.tsx          # Nutrition target tracking
  workout-insights-card.tsx         # Local heuristic workout insights (no external API)
  staff-access-actions.tsx          # Inline staff edit/reset-password/delete with useActionState

lib/
  auth.ts                           # Session cookies, login, requireRole(); demo login fallback fixed
  ai.ts                             # Local workout insights heuristic (getWorkoutInsights) — no API
  offline-db.ts                     # Dexie IndexedDB (offline lift logging)
  workout-utils.ts                  # Workout calculation helpers
  stores/workout-store.ts           # Zustand workout session state
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

- **CSP headers**: Strict Content-Security-Policy covering Firebase, YouTube, and Google Fonts. `unsafe-eval` only in development.
- **Security headers**: HSTS (2 years), `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Firestore rules**: Role-based rules (`isAdmin()`, `isOwnerForGym()`, `isStaffForGym()`, `isGymMember()`). Privileged writes are `allow: false` — must go through Cloud Functions.
- **Login lockout**: 5 failed attempts triggers a 15-minute lockout, enforced via a Firebase Auth blocking trigger.
- **Session cookies**: 2-hour secure HttpOnly cookies. Role and gymId stored separately for middleware routing.

---

## 🎨 Design System

### Design Tokens

All tokens live in `app/styles/00-base-shell.css`. The app ships in **dark mode by default** (`data-theme="dark"` on `<html>`), with light mode available via toggle.

#### Color Tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--brand` | `#4f46e5` (indigo) | `#C8F135` (lime) | Primary action fills |
| `--brand-strong` | `#4338ca` | `#b8e028` | Hover state of brand fills |
| `--brand-soft` | `#e0e7ff` | `rgba(200,241,53,.12)` | Tinted backgrounds, badges |
| `--primary-foreground` | `#ffffff` | `#0A0A0A` | **Text on brand-filled elements** |
| `--bg` | `#ffffff` | `#111111` | Page background |
| `--bg-card` | `#f9f9f9` | `#1a1a1a` | Card/panel backgrounds |
| `--bg-hover` | `#f2f2f2` | `#222222` | Hover state backgrounds |
| `--text` | `#0a0a0a` | `#f5f5f5` | Primary body text |
| `--text-soft` | `#737373` | `#a3a3a3` | Secondary/muted text |
| `--border` | `rgba(0,0,0,.09)` | `rgba(255,255,255,.09)` | Dividers, card borders |
| `--accent` | `#737373` | `#a3a3a3` | Icon tints, subtle labels |
| `--accent-soft` | `#f1f1f1` | `#1f1f1f` | Soft background fills |
| `--danger` | `#dc2626` | `#ef4444` | Error states, destructive actions |
| `--danger-soft` | `#fee2e2` | `rgba(239,68,68,.12)` | Error backgrounds |
| `--warning` | `#d97706` | `#f59e0b` | Warning states |

#### Critical Button Rule

> ⚠️ `--brand` is **lime (#C8F135)** in dark mode — NEVER pair it with `color: white`. Always use `color: var(--primary-foreground)`.

```css
/* ✅ Correct — works in both themes */
.my-button {
  background: var(--brand);
  color: var(--primary-foreground);
}

/* ❌ Wrong — unreadable on lime in dark mode */
.my-button {
  background: var(--brand);
  color: white;
}
```

#### Button Variants

| Variant | Class | Background | Text | Use for |
|---|---|---|---|---|
| Primary | `.lpd-btn--brand` / `.lpd-btn--primary` | `var(--brand)` | `var(--primary-foreground)` | Main CTAs |
| Ghost | `.lpd-btn--ghost` | transparent | `var(--text)` | Secondary actions |
| Danger | — | `var(--danger)` | `#ffffff` | Destructive actions |
| Subtle | — | `var(--accent-soft)` | `var(--text-soft)` | Tertiary/icon-only |

Always reset `<button>` default UA styles for custom-styled buttons:
```css
.my-button {
  background: transparent;
  border: none;
  font: inherit;
  cursor: pointer;
}
```

---

### CSS Architecture

CSS is split into modular files under `app/styles/`, loaded in order via `app/layout.tsx`. Each file has a numeric prefix defining load order:

| File | Scope |
|---|---|
| `00-base-shell.css` | Design tokens (all CSS variables), base reset, app-shell layout |
| `01-owner-members.css` | Legacy owner member table styles (superseded by `19-members-redesign.css`) |
| `02-shared-components.css` | Shared components — cards, badges, buttons, inputs, modals |
| `03-visual-refresh.css` | Visual refresh tokens, elevation scale |
| `04-loader-animation.css` | FitnessLoader barbell animation |
| `05-theme-polish.css` | Theme refinements, dark-mode overrides |
| `06-programs-mobile-legacy-landing.css` | Legacy program cards + mobile landing |
| `07-member-dashboard-legacy.css` | Legacy member dashboard styles (kept for fallback) |
| `08-admin-catalog-media.css` | Admin UI (`.adm-*`), exercise catalog table, media embeds |
| `09-profile-history-notices-loader.css` | Profile metrics, workout history, gym notices |
| `forms.css` | Form panels, field layouts, error/success messages |
| `member.css` | Core member shell styles |
| `10-pt-training.css` | PT scheduling, booking, session cards (`.pt-*`) |
| `11-member-tabs.css` | Member dashboard tab navigation |
| `11-bulk-member-list.css` | Bulk member select + actions dock |
| `12-member-dashboard-new.css` | Member dashboard v2 — coach shell, panels |
| `13-skeletons.css` | Loading skeleton animations |
| `14-radix-overrides.css` | Radix UI (Dialog, Dropdown, Select, Popover) overrides |
| `15-ui-upgrades.css` | Cross-cutting UI upgrades — pills, tags, status indicators |
| `16-ux-improvements.css` | UX polish — notification badge, dropdown layout, dark mode fixes |
| `17-profile-metrics.css` | Member profile metrics, body stats, charts |
| `18-billing-trainers.css` | Billing, packages, payment cards, trainer list (`.pkg-*`, `.payment-*`) |
| `19-members-redesign.css` | Owner members hybrid view (`.mhv-*`) — action queue, KPI strip, table |
| `20-owner-dashboard.css` | Owner workspace (`.odp2-*`) — sidebar, nav, full-screen layout |
| `21-member-redesign.css` | Member sub-pages shell (`.m3d-*`) — sidebar, layout, height chain |

Also: `app/landing.css` for all landing page component styles.

#### Class Prefix Conventions

| Prefix | Scope |
|---|---|
| `odp2-` | Owner dashboard workspace (Owner Dashboard v2) |
| `adm-` | Admin/owner shared UI — page headers, cards, KPIs, staff rows, buttons |
| `mhv-` | Members hybrid view — action queue, KPI strip, directory table |
| `m3d-` | Member sub-pages shell — sidebar, layout, content area |
| `mcv-` | Member coach view (messaging/conversation panel) |
| `pt-` | Personal training — booking form, session cards, calendar |
| `lpd-` | Landing page shared components (buttons, modals) |
| `l1-` | L1 Hero section on the landing page |
| `lp-modal-` | Landing page modals (login, contact) |
| `nlist-` | Notification list component |
| `ntf-` | Notification bell topbar dropdown |

---

### Owner Dashboard Layout

The owner dashboard uses a **fixed full-viewport workspace** pattern:

```css
.odp2-workspace {
  position: fixed;
  inset: 0;           /* top:0 right:0 bottom:0 left:0 */
  z-index: 1000;
  display: flex;
  overflow: hidden;
}
```

The app topbar (`AppTopbar`) returns `null` immediately for `/owner/*` paths at the component level — this prevents the topbar HTML from ever being emitted for owner routes, eliminating the flash that a pure CSS `:has()` approach would cause (the browser briefly renders the topbar before encountering `.odp2-workspace` in the DOM):

```tsx
// components/app-topbar.tsx
if (pathname === "/" || !role || pathname.startsWith("/owner")) {
  return null;
}
```

A belt-and-suspenders CSS rule also hides it in case of edge cases:

```css
body:has(.odp2-workspace) .topbar,
body:has(.odp2-workspace) .mobile-bottom-nav {
  display: none !important;
}
```

#### Priority Row Color Coding (Owner Tables)

Used in member lists and activity feeds to surface urgency:

| Status | Token | Meaning |
|---|---|---|
| 🔴 Urgent / Expired | `var(--danger)` / `var(--danger-soft)` | Membership expired, overdue |
| 🟡 Warning | `var(--warning)` | Expiring soon (≤7 days) |
| 🟢 Active / Normal | `var(--brand-soft)` | Current, healthy |
| ⚪ Neutral | `var(--bg-card)` | No action needed |

---

## 📝 Maintenance & Handoff

For architectural logs, dated updates, and next milestones, see **`PROJECT_HANDOFF.md`**.

This project is jointly developed by **Claude** and **Codex**. Update the handoff log after implementing significant changes.
