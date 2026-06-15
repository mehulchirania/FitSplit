# FitSplit — Claude Context

## Project identity

Gym management platform. Pilot gym: **Sri Shakthi Hanuman Gym** (`shg`).  
Firebase project: `fitsplit-29215`. Live: https://fitsplit--fitsplit-29215.us-central1.hosted.app  
Developer: Mehul Chirania (`mehulchirania@gmail.com`), Bengaluru. Also a demo member: uid `member-mehul`, username `mehulchirania`, PIN `1234`.

## Stack

Next.js 15 App Router · React 19 · TypeScript 6 (strict) · Firestore · Firebase Auth (session cookies) · Firebase App Hosting · Firebase Storage · FCM · Radix UI · Recharts · FullCalendar · Framer Motion · Sonner · Dexie (offline) · Zod v4 · Zustand · Vitest

## Workflow rules (non-negotiable)

1. **Edit files directly in this repo, current branch. Never `git worktree add`, never create a side branch.** Worktrees broke `extensions.worktreeconfig` and Codex integration — that restriction is permanent.
2. **After every change: update `README.md` and prepend a dated entry to `PROJECT_HANDOFF.md`.** Stale docs cause context drift between Claude and Codex sessions.
3. **Run `npx tsc --noEmit` after every edit.** `strict: true` — fix every type error before committing.
4. **`npm run build` must exit clean.** ESLint errors block deployment. Resolve all unused imports, unused vars, and `no-explicit-any` warnings.
5. **`@next/next/no-img-element` warning:** All `<img>` tags use direct paths (not `next/image`). Add `{/* eslint-disable-next-line @next/next/no-img-element */}` immediately before each one.

## Auth system

- **Login flow:** `loginWithCredentials(formData)` in `src/lib/auth.ts` resolves username/phone/email → Firebase Auth email → ID token → `fitsplit-session` cookie (2 h default / 14 d "Remember me").
- **Member password format:** `pin-{4digits}` (e.g. `pin-1234`). Staff use plain passwords. Default staff password: `password` (must change on first login — `mustChangePassword` flag).
- **Demo logins** hardcoded in `demoLogins` map in `src/lib/auth.ts`. Falls back to `createLocalDemoSession` if Firestore profile missing.
- **Session cookies:** `fitsplit-session` (primary, HttpOnly, Secure, SameSite=Lax) + legacy `fitsplit-role`, `fitsplit-username`, `fitsplit-gym-id`, `fitsplit-member-id`.
- **Login lockout:** 5 failed attempts → 15 min lockout. Dual-tracked: by identifier (pre-resolution) and by email.
- **`requireRole([...roles])`** — server-side guard; redirects to role home on mismatch. Call on every protected page.
- **`requireOwner()`** — like `requireRole` but also checks `staffType`.

## Roles and routes

| Role | Route | Access |
|---|---|---|
| `admin` | `/admin` | All gyms, platform-wide |
| `owner` (staffType) | `/owner` | Own gym only |
| `trainer` (staffType) | `/trainer` | Own gym, member visibility enforced |
| `member` | `/member` | Self only |
| all authenticated | `/profile`, `/activity` | — |
| public | `/`, `/about`, `/privacy`, `/terms`, `/suspended` | — |

**Owner workspace** uses `OdpWorkspaceShell` (position: fixed, full-screen). `AppTopbar` hides itself on `/owner/*`. Member sub-pages live in the `app/member/(pages)/` route group with a shared `MemberSubSidebar` layout.

## Primary IDs

- `PRIMARY_GYM_ID = "shg"`, `PRIMARY_OWNER_ID = "santosh-shg"`
- Admin: `admin-fitsplit`
- Demo member: `member-mehul`
- Member auth email format: `${memberId}@members.fitsplit.app`

## Firestore schema

**Root collections:** `authProfiles`, `exerciseCatalog` (global), `workoutPrograms` (global), `liftLogs`, `bodyMetricLogs`, `dayLogs`, `macroLogs`, `activityLogs`, `workoutSessions`, `attendanceRecords`, `ptSessions`, `ptLiftLogs`, `notifications`, `activityEvents`, `contactMessages`, `packages`, `memberships`, `paymentRequests`, `exerciseRequests`, `loginAttempts`, `usernames`, `phones`, `archives`

**Gym-scoped subcollections:** `gyms/{gymId}/<all of the above>` + `members/`, `staff/`, `siteLinks/`, `summaries/`

**Dual-write pattern:** every write goes to the root collection AND `gyms/{gymId}/{collection}`. Use `mirrorGymScopedRecord(db, gymId, collection, docId, data)` from `actions/shared.ts`.

**Deterministic doc IDs:** `macroLogs` = `${memberId}_${date}`, `dayLogs` = `${memberId}_${dayId}_${weekStart}`, workout sessions = `sessionId` (UUID from client).

## CSS system

21 files in `src/app/styles/`, all imported in `app/layout.tsx`.

| Prefix | File | Scope |
|---|---|---|
| (tokens) | `00-base-shell.css` | All CSS variables, base reset |
| `adm-` | `08-admin-catalog-media.css` | Owner/admin shared UI (cards, KPIs, buttons, chips) |
| `ptd-` | `10-pt-training.css` | PT pages (booking form, session table) |
| `mhv-` | `19-members-redesign.css` | Members hybrid view |
| `odp2-` | `20-owner-dashboard.css` | Owner workspace shell (fixed sidebar layout) |
| `m3d-` | `21-member-redesign.css` | Member sub-pages shell + sidebar |
| `lpd-`, `l1-` | `app/landing.css` | Landing page |

**Brand colour rules (critical):**
- Dark mode: `--brand: #C8F135` (lime) → `--primary-foreground: #0A0A0A` (dark text on lime).
- Light mode: `--brand: #128d65` (green) → `--primary-foreground: #ffffff` (white text on green).
- **Always use `color: var(--primary-foreground)` on brand-fill buttons. Never `color: white` hardcoded.**
- Filter chips: `adm-chip--on` = `background: var(--text); color: var(--bg-elevated)`.

**Admin UI patterns:** `adm-btn` (solid), `adm-btn--ghost` (outline), `adm-card` + `adm-card__head` + `adm-card__body`, `adm-kpi`, `adm-grid-2`, `adm-details-panel` (collapsible). Dialogs must support ESC dismiss and unsaved-changes prompt.

## Server actions pattern

All write actions are in `src/lib/firebase/actions/`. Every action:
1. Calls `requireRole([...])` or `requireAuth()` first.
2. Parses `FormData` with `parseActionData(formData, ZodSchema)` from `actions/validation.ts`.
3. Calls `requireFirebase()` to get Admin SDK Firestore instance.
4. Dual-writes root + gym-scoped via `mirrorGymScopedRecord`.
5. Returns `success(message, gymId, ["cache-tag1", "cache-tag2"])` or `failure(error, fallback)` — both in `actions/shared.ts`.
6. `success()` calls `revalidateGymTags()` to bust Next.js cache.

**Mock mode:** `hasFirebaseAdminConfig() = false` (no Firebase env vars) → read-models return `lib/mock-data.ts` data; write actions return success without touching Firestore. Fully runnable locally.

## Key files

```
src/lib/auth.ts                  Login, sessions, requireRole, demo fallback
src/middleware.ts                 Route protection + per-request CSP nonce
src/types/domain.ts              All domain types
src/lib/firebase/collections.ts  collectionPaths, PRIMARY_GYM_ID
src/lib/firebase/admin.ts        Admin SDK init; hasFirebaseAdminConfig()
src/lib/firebase/actions/        All server actions (barrel re-export in actions.ts)
src/lib/firebase/read-models/    All Firestore reads (with cache tags + mock fallbacks)
src/lib/split-library.ts         Generates predefined WorkoutProgram[] from JSON sources
src/lib/workout-utils.ts         getWeekStart, getDefaultDayIndex, injury rules
src/lib/memberships.ts           getDaysRemaining, getMembershipStatus ← BUG: hardcoded date
src/lib/muscle-targets.ts        MUSCLE_TARGETS, inferExerciseTargets
src/lib/offline-db.ts            Dexie IndexedDB for offline lift logging (FitSplitDB)
functions/src/index.ts           Cloud Functions (asia-south1, nodejs22)
```

## Known bugs

- **`src/lib/memberships.ts` line 6:** `const today = new Date("2026-05-03T00:00:00+05:30")` is hardcoded. `getDaysRemaining` and `getMembershipStatus` are frozen. Fix: move `new Date()` inside `getDaysRemaining`.

## Important gotchas

- **`m.isPT` is never written.** Use PT plan data (`getAllPTSessionsForGym`, filter `status === "scheduled" | "active"`) to find active PT members.
- **Admin users have no `gymId`** on their profile. All admin pages use `currentUser.gymId ?? PRIMARY_GYM_ID`.
- **Owner workspace hides AppTopbar** via both component logic and CSS (`body:has(.odp2-workspace) .topbar { display: none }`).
- **FcmSetup** is only rendered for `role === "member"` in the root layout.
- **Split library weekly variation:** `applyCurrentWeeklyVariation(program, date)` picks a week based on ISO week index mod 4 — exercise selection rotates every week.
- **`parseActionData`** converts all FormData entries to a plain object before Zod parsing, so checkbox values arrive as the string `"on"` or `"true"`.
- **Nonce CSP:** `middleware.ts` sets `x-nonce` header per request. Root layout reads it for the inline theme script. All `<Script>` components in prod must carry the nonce.
- **Cloud Functions vs Server Actions:** the primary write path uses Server Actions + Admin SDK (bypasses Firestore rules). Cloud Functions handle background tasks, scheduled jobs, and Firestore triggers. `src/lib/firebase/functions.ts` has callable wrappers but most write ops go through Server Actions.
- **Archives:** deleting members/programs/gyms writes to `archives/{id}` with 60-day retention before physical delete.
- **`fitsplit-role` cookie** is user-craftable — middleware trusts it for routing decisions only. Every protected page calls `requireRole` which validates the signed session cookie — defense-in-depth is maintained only if this pattern is preserved.

## Firestore security

Rules in `firestore.rules` are the client-SDK defense layer only (Admin SDK bypasses them). Primary authorization is `requireRole`/`requireOwner` in Server Actions.  
Test rules: `$env:JAVA_HOME="C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"; firebase emulators:exec --only firestore --project demo-fitsplit "npm run test:rules"`.  
34 tests, all passing as of 2026-06-05.

## Docs to update after every change

1. `README.md` — CSS architecture table, feature list, file map
2. `PROJECT_HANDOFF.md` — prepend dated entry at the top
