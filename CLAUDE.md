# FitSplit — Claude Context

## Project identity

Gym management platform. Pilot gym: **Sri Shakthi Hanuman Gym** (`shg`).  
Firebase project: `fitsplit-29215`. Live: https://fitsplit--fitsplit-29215.us-central1.hosted.app  
Developer: Mehul Chirania (`mehulchirania@gmail.com`), Bengaluru. Also a demo member: uid `member-mehul`, username `mehulchirania`, PIN `1234`.

## Stack

Next.js 16 App Router (Turbopack dev) · React 19 + React Compiler · TypeScript 6 (strict) · Firestore · Firebase Auth (session cookies) · Firebase App Hosting · Firebase Storage · FCM · Radix UI · Recharts (lazy-loaded) · Framer Motion · Sonner · Dexie (offline) · Zod v4 · Vitest

## Agent behavior

### Token efficiency
No conversational filler. No restating the question. No "Great question!" openers. Lead with the answer or the action. If a response would be pure acknowledgement, skip it.

### Verify before asserting
Never claim a function, file, component, Firestore path, or CSS class exists without reading it first. Memory of what was written earlier is not the same as what is on disk now. Read → reason → act. This applies equally to UI state assumptions, server action signatures, and data model fields.

### Response formatting
Use prose over bullet points for explanations and reasoning. Bullets are for reference material, checklists, and schema definitions — not for thinking out loud. No excessive bolding inside prose. Never use bullets when declining or redirecting. Tables are for comparisons, not for things a sentence would cover.

### File creation strategy
- **Under 100 lines:** write the complete file in one pass.
- **Over 100 lines:** outline the structure first, build section by section, review, then finalize. Never dump an unreviewed 400-line file in one block.
- **File vs inline:** a component, hook, action, or util is a file. An explanation or short snippet stays inline. Don't create files for things the user will only read in chat.

### Complexity calibration
- **Simple bug or style fix:** direct edit, no preamble.
- **New feature under 3 files:** implement with brief rationale.
- **New feature touching auth, data model, or offline path:** state the plan and get confirmation before writing code.
- **Architectural change:** start with "Here's what I'd actually do", state the exact decision, name the hidden friction, close with what the top teams do differently.

### Decision making
- Prioritize long-term maintainability over clever shortcuts.
- When two approaches are equally valid, pick the one that produces less code.
- Handle edge cases at the boundary (auth, tenant isolation, offline sync) — not inside business logic.
- Never leave a TODO without a linked decision — either implement it or open a tracked issue.
- When something is unclear, ask one question. If the question would block progress, state the assumption and proceed — flag it so the user can redirect.

---

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

## UI / UX standards

### Design principles
- Every screen must work at 375px (iPhone SE) without horizontal scroll.
- Touch targets minimum 44×44px — no exceptions for icons or nav items.
- Interactive elements must have a visible focus state. Don't remove outlines without replacing them.
- Motion: respect `prefers-reduced-motion`. Animations are enhancement, not baseline. Wrap Framer Motion variants in a check or use `useReducedMotion()`.
- Color contrast minimum AA: 4.5:1 for body text, 3:1 for large text and UI components.

### Component discipline
- One component, one responsibility. If a component needs a comment explaining what it does, it needs to be split.
- Props are typed explicitly — no `any`, no spreading unknown objects into DOM elements.
- Co-locate related logic: if a hook is only used by one component, it lives in the same file.
- Loading and error states are not optional. Every async operation has three UI states: loading, success, error.

### State and data flow
- Firestore-derived state is the source of truth. Never duplicate it into local state that can drift.
- Local UI state (modals, toggles, form fields) lives in `useState` / `useReducer`. Don't reach for global state for things one component needs.
- Optimistic updates for all workout logging and attendance actions — the app must feel instant on poor connectivity.
- Destructive actions (delete member, remove set, archive record) require a confirmation step. No undo = must confirm.

### UX patterns
- Empty states are designed, not blank. Every empty list tells the user what to do next.
- Form validation is inline and immediate, not deferred to submit.
- Sync status (pending / synced / failed) is always visible for offline-capable actions — never silently drop a pending write.
- Sonner toasts for transient feedback. Persistent errors go inline near the relevant field or action, not in a toast.
- Dialogs must support ESC dismiss and prompt on unsaved changes.

---

## Backend / Firestore discipline

### Data model
- Prefer flat collections over deeply nested subcollections. Nesting beyond 3 levels is a schema smell.
- Denormalize deliberately. If a field is read in a list view, it belongs on the list document — don't require a secondary fetch.
- Document IDs are auto-generated or deterministic slugs. Never use email or PII as a document ID.
- Timestamps use `serverTimestamp()` for creation and updates — never `new Date()` on the client.
- When adding a new collection: write the Firestore security rule for it in the same change. Never leave a collection unprotected.

### Error handling
- All Firestore and Admin SDK calls are wrapped in try/catch at the call site. Errors are typed, not swallowed.
- Firebase Auth errors are mapped to user-readable messages before surfacing — never expose raw Firebase error codes or Admin SDK stack traces to the UI.
- Server actions return a typed result envelope via `success()` / `failure()` from `actions/shared.ts`. Never throw unstructured errors from an action.
- If an action can partially fail (e.g. dual-write root + gym-scoped), handle rollback or log the inconsistency explicitly — don't silently leave data in a half-written state.

### Security
- `requireRole` / `requireOwner` are called at the top of every protected Server Action and page. Skipping these is never acceptable even for "internal" endpoints.
- Admin SDK bypasses Firestore rules — security is entirely in the Server Action guards. This means every new action must start with an auth check, not end with one.
- The `fitsplit-role` cookie is user-craftable. `src/proxy.ts` trusts it for routing only. Authorization always re-validates via the signed session cookie in `requireRole`.

---

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
src/proxy.ts                      Route protection + per-request CSP nonce
src/types/domain.ts              All domain types
src/lib/firebase/collections.ts  collectionPaths, PRIMARY_GYM_ID
src/lib/firebase/admin.ts        Admin SDK init; hasFirebaseAdminConfig()
src/lib/firebase/actions/        All server actions (barrel re-export in actions.ts)
src/lib/firebase/read-models/    All Firestore reads (with cache tags + mock fallbacks)
src/lib/split-library.ts         Generates predefined WorkoutProgram[] from JSON sources
src/lib/workout-utils.ts         getWeekStart, getDefaultDayIndex, injury rules
src/lib/offline-db.ts            Dexie IndexedDB for offline lift logging (FitSplitDB)
functions/src/index.ts           Cloud Functions (asia-south1, nodejs22)
```

## Known bugs

- *None currently tracked.*
- **Membership expiry math now lives in ONE place — Cloud Functions.** `membershipStatus` is a **persisted Firestore field** written by `functions/src/index.ts` (`processMembershipExpiries`, package-activation handlers) and by `actions/billing.ts`; read-models just read `data.membershipStatus`. The old app-side `src/lib/memberships.ts` (`getDaysRemaining`/`getMembershipStatus`) was **deleted 2026-06-16** as dead code (zero references). The expiry warning still honors per-gym `expiryWarningDays`.

## Important gotchas

- **`m.isPT` is never written.** Use PT plan data (`getAllPTSessionsForGym`, filter `status === "scheduled" | "active"`) to find active PT members.
- **Admin users have no `gymId`** on their profile. All admin pages use `currentUser.gymId ?? PRIMARY_GYM_ID`.
- **Owner workspace hides AppTopbar** via both component logic and CSS (`body:has(.odp2-workspace) .topbar { display: none }`).
- **FcmSetup** is only rendered for `role === "member"` in the root layout.
- **Split library weekly variation:** `applyCurrentWeeklyVariation(program, date)` picks a week based on ISO week index mod 4 — exercise selection rotates every week.
- **`parseActionData`** converts all FormData entries to a plain object before Zod parsing, so checkbox values arrive as the string `"on"` or `"true"`.
- **Nonce CSP:** `src/proxy.ts` sets `x-nonce` header per request. Root layout reads it for the inline theme script. All `<Script>` components in prod must carry the nonce.
- **Cloud Functions vs Server Actions:** the primary write path uses Server Actions + Admin SDK (bypasses Firestore rules). Cloud Functions handle background tasks, scheduled jobs, and Firestore triggers. `src/lib/firebase/functions.ts` has callable wrappers but most write ops go through Server Actions.
- **Archives:** deleting members/programs/gyms writes to `archives/{id}` with 60-day retention before physical delete.
- **`fitsplit-role` cookie** is user-craftable — `src/proxy.ts` trusts it for routing decisions only. Every protected page calls `requireRole` which validates the signed session cookie — defense-in-depth is maintained only if this pattern is preserved.

## Firestore security

Rules in `firestore.rules` are the client-SDK defense layer only (Admin SDK bypasses them). Primary authorization is `requireRole`/`requireOwner` in Server Actions.  
Test rules: `$env:JAVA_HOME="C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"; firebase emulators:exec --only firestore --project demo-fitsplit "npm run test:rules"`.  
34 tests, all passing as of 2026-06-05.

## Docs to update after every change

1. `README.md` — CSS architecture table, feature list, file map
2. `PROJECT_HANDOFF.md` — prepend dated entry at the top
