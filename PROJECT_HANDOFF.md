# FitSplit — Project Handoff & Improvement Roadmap

Verified analysis against the live codebase (May 2026). Items are ordered by execution priority, not theoretical impact.

---

## 🏗️ Next Major Milestone — Multi-Gym, Trainer, PT, Billing & Permissions Redesign (2026-05-28)

### Summary
FitSplit has gym-scoped tenancy, Firebase Auth, Functions, Firestore, PT sessions, members, staff, programs, and activity logs, but is missing first-class trainers, billing/packages/payment flows, trainer visibility enforcement, and dashboard summaries. This milestone closes all of those gaps in a staged rollout.

### Key Architecture Changes

**Domain types to add/expand (`types/domain.ts`):**
- `Role = "admin" | "owner" | "trainer" | "member"`
- `TrainerMemberVisibility = "assigned_only" | "all_pt_members" | "all_members"`
- New types: `Package`, `Membership`, `PaymentRequest`, `DashboardSummary`
- Unified `ActivityLog` (already added — ensure trainer-aware fields)
- Trainer-aware member fields: `isPT`, `assignedTrainerId`, `membershipStatus`, `membershipEndDate`, `currentPackageName`

**Canonical Firestore shape:**
- `gyms/{gymId}` — add `ownerId`, `trainerMemberVisibility`, `active`/`status`
- `gyms/{gymId}/members/{memberId}` — add `isPT`, `assignedTrainerId`, `membershipStatus`, `membershipEndDate`, `currentPackageName`
- `gyms/{gymId}/staff/{userId}` — owner/trainer records; trainer records carry `assignedMemberIds[]`
- `gyms/{gymId}/packages` — membership package definitions
- `gyms/{gymId}/memberships` — per-member active membership records
- `gyms/{gymId}/paymentRequests` — cash/card/UPI payment flows
- `gyms/{gymId}/activityLogs` — already exists, ensure trainer-accessible
- `gyms/{gymId}/notifications` — already exists
- `gyms/{gymId}/summaries/dashboard` — pre-computed summary doc (avoids expensive full-collection reads)
- `platformSummaries/main` — admin dashboard aggregate cards
- Keep `authProfiles/{uid}` as global login/index/claims source

**Keep global default exercises/programs outside gyms; gym-created ones stay under `gyms/{gymId}`.**

### Backend, Rules & Functions (`functions/src/`)

New/updated callable functions:
- `createGymWithOwner`, `createTrainer`, `createMember`, `assignTrainerToPTMember`, `updateTrainerVisibility`
- `createOrUpdatePackage`, `submitPaymentRequest`, `approvePaymentRequest`, `rejectPaymentRequest`, `activateOrRenewMembership`
- `generateGymDashboardStats`, `generateAdminDashboardStats`, `processMembershipExpiries`, `seedMockGymData`
- Update existing member toggle, program assignment, PT assignment, archive, and login-lookup functions to understand `role: "trainer"`
- Enforce one owner per gym via transaction on `gyms/{gymId}.ownerId`

**Payment scope:** Cash = full approval flow. Card/UPI = mock/integration-ready only.

**Firestore rules enforcement:**
- Admin: all gyms
- Owner: own gym only
- Trainer: own gym, filtered by `trainerMemberVisibility`
  - `assigned_only` → PT members where `assignedTrainerId == trainerId`
  - `all_pt_members` → all PT members in gym
  - `all_members` → all members in gym
- Member: own documents only
- Trainers cannot access packages, billing, payments, or other gyms

### UI & Flow Changes

**Admin Console:** Overview · Gyms · Owners · Trainers · Members · Packages · Billing · Payment Requests · Activity Logs · Settings

**Owner Console:** Overview · Members · PT Management · Trainers · Packages · Billing · Payment Requests · Activity Logs · Gym Settings
- Dashboard uses summary docs, not expensive full-collection reads
- Gym Settings → Trainer Access section with `trainerMemberVisibility` selector

**Trainer Console (new):** Overview · My Members · PT Activity · Progress Logs · PR Logs · Macro Logs · Cardio Logs · Stretch Logs
- No billing/package visibility at all

**Member App additions:** Membership/Billing tab, Cardio tab, Stretches tab
- PT members see PT guidance instead of the normal workout schedule

**Reusable UI components to create:** `StatCard`, `DataTable`, `StatusBadge`, `ActionMenu`, `ConfirmDialog`, `EmptyState`, `SearchFilterBar`, `PackageCard`, `PaymentRequestCard`, `NotificationBell`

### Migration & Mock Data
- Backfill trainer-like records from `role: "owner" + staffType: "trainer"` → `role: "trainer"`
- Backfill SHG members with `isPT`, `assignedTrainerId`, membership summary fields, package references
- Remove duplicate Titan gym entry; add `Fitness Studio` gym
- Seed SHG, Titan Gym, Fitness Studio each with: one owner, multiple trainers, regular + PT members, trainer-member assignments, packages, active/expired memberships, pending cash payment requests, activity logs, notifications
- Preserve 60-day archive retention for deleted gyms, members, packages, payment requests, programs, and staff

### Staged Rollout (work through in order)

| Phase | Scope |
|---|---|
| **1 ✅** | Schema / types / collection constants / read-model updates + migration scripts |
| **2 ✅** | Callable Functions + Firestore rules + emulator rule tests |
| **3 ✅** | Admin + owner dashboard and management pages |
| **4 ✅** | Trainer console + trainer visibility enforcement |
| **5 ✅** | Member billing / PT / member dashboard flow |
| **6 ✅** | Firestore indexes, dashboard summary integration, billing seed script |

### Test Plan
- `npm run typecheck`, `npm run build`, `npm run functions:build` must pass after every phase
- Firestore rules emulator tests: admin all-gyms, owner own-gym, trainer visibility modes, member self-access, billing permissions
- Manual smoke: admin manages all gyms; owner manages own gym only; trainer login works; trainer visibility changes produce correct member lists; PT members see PT guidance not workout schedule; member renewal creates pending payment request; cash approval activates membership; card/UPI mock does not activate without confirmation; dashboard summaries load without full-collection scans; archive entries created on delete

---

## Latest Update - 2026-05-28: Members page — Design 04 Hybrid redesign

Implemented Design 04 (Hybrid) from the Claude Design export. Replaces the old table+gradient-stats layout.

### New files
- **`components/members-hybrid-view.tsx`** — Full client component implementing the D4 Hybrid. Action queue, KPI strip, directory table, dark bulk dock, all inline. Uses `sonner` toasts. Reuses existing `callBulkAssignProgram` + `callBulkToggleMemberAccess` for bulk ops.
- **`app/styles/19-members-redesign.css`** — `mhv-*` scoped CSS: queue cards, KPI chips, avatar colours, refined table, dark bulk dock, dark mode variants, responsive breakpoints.

### Modified files
- **`app/owner/members/page.tsx`** — Replaced old server component (stats cards + `BulkMemberList`) with the new one. Computes `daysToExpiry` from `membershipEndDate`, builds `HybridMember[]` array (hasPlan, programTitle included), passes to `MembersHybridView`.
- **`app/layout.tsx`** — Added `import "./styles/19-members-redesign.css"`.

### Design recap (D4 Hybrid = D1 table + D3 queue)
1. **Action queue** — horizontal scroll, one card per urgent member. Priority: expired (red) → expiring soon (amber) → no plan (blue). Each card has a dismiss (snooze) and a CTA that navigates to the member profile. Queue header shows a pulsing dot + count badge.
2. **KPI strip** — 4 clickable cards (Total / Active / Needs plan / Renewals due) that filter the directory. Left accent stripe is toned by urgency. Active chip gets a double-border.
3. **Directory** — search-first toolbar, sort select, refined table (checkbox, avatar+status dot, membership cell with pill+subtext, plan cell, joined date). Prev/Next pagination at 10/page.
4. **Dark bulk dock** — floats above the bottom, slides in on first selection. Shows: count badge, Assign plan (→ program picker), Renew, Message, Restore, Suspend (red), × to clear.
5. **Add member** — toggleable inline panel powered by existing `AddMemberForm`.

### Notes
- `assignedTrainer` (display name) is not in `getMembers` result (only `assignedTrainerId` is). The plan cell shows `w/ {trainer}` only when the field is populated — could be added by joining trainer profiles in the read model later.
- The old `BulkMemberList` component is preserved; only the members page uses the new view.

---

## Latest Update - 2026-05-28: Phase 6 — Indexes, dashboard summary, seed script

### New files
- **`scripts/seed-billing.mjs`** — Seed script for packages, payment requests, active/expired memberships, trainer-to-PT-member assignments, and dashboard summary doc. Run with `npm run seed:billing`. Safe to re-run (skips existing docs). Also manually computes and writes `gyms/shg/summaries/dashboard`.

### Modified files
- **`firestore.indexes.json`** — Added 7 composite indexes for new Phase 1-5 collections:
  - `paymentRequests`: `status + requestedAt DESC` (status-filtered listing)
  - `paymentRequests`: `memberId + requestedAt DESC` (member's own payment history)
  - `paymentRequests`: `memberId + packageId + status` (duplicate pending guard)
  - `paymentRequests`: `status + resolvedAt ASC` (MTD revenue query in Cloud Function)
  - `memberships`: `memberId + createdAt DESC` (member membership history)
  - `members`: `assignedTrainerId + isPT` (trainer assigned_only visibility filter)
- **`app/owner/page.tsx`** — Fetches `getGymDashboardSummary` in parallel with other data. Stats bar now shows: totalMembers (from summary if available), unassigned count, live session count, and conditionally "Expiring Soon" (amber urgent) or "Active Members", plus "Revenue MTD" as a clickable link to `/owner/billing` when the summary doc exists.
- **`app/styles/18-billing-trainers.css`** — Added `.odp-stat-link` class for clickable stat boxes in the dashboard stats bar (brand-colored strong, hover highlight).
- **`package.json`** — Added `"seed:billing": "node scripts/seed-billing.mjs"` script.

### Architecture note
`gyms/{gymId}/summaries/dashboard` is computed by the `generateGymDashboardStats` Cloud Function (already deployed, see `functions/src/index.ts`). The seed script also writes this document directly so the dashboard works before the function has run. In production, the function re-computes it on a schedule or on-demand.

---

## Latest Update - 2026-05-28: Phase 5 — Member membership & billing flow

### New files
- **`lib/firebase/actions/member-billing.ts`** — `submitPaymentRequestAction` server action: member submits a payment request for a package. Guards against duplicate pending requests, loads package details, notifies gym owner.
- **`lib/firebase/actions.ts`** — exports `member-billing`.
- **`lib/firebase/read-models/billing.ts`** — Added `getPaymentRequestsForMember(gymId, memberId)` for member-scoped history query.
- **`app/member/membership/page.tsx`** — Full membership page for members:
  - Active membership status card with days-left count and expiry warning (amber ≤7 days, red = expired)
  - Pending request banner suppresses the join form while request is in review
  - Renew/join form hidden inside `<details>` when membership is active + not expiring
  - Payment request history list
  - Membership history list
- **`components/membership-request-form.tsx`** — Client form: package radio options, payment method pills (cash/UPI/card/other), submits via `submitPaymentRequestAction`, shows success state after submit.

### Dashboard link
- Member dashboard hero "Status" stat replaced with a "Membership" stat card linking to `/member/membership`. Shows `membershipStatus` and expiry date inline.

### CSS
- `18-billing-trainers.css` extended with: `membership-status-card`, `membership-pending-banner`, `pkg-option-list`, `method-pills`, `payment-history-list`, `membership-request-form`, `membership-submitted`.

### Status
- `npx tsc --noEmit` exits 0.

---

## Latest Update - 2026-05-28: Phase 4 — Trainer console + visibility enforcement

### Changes
- **`lib/auth.ts`** — `redirectForRole` now sends `role === "trainer"` users to `/trainer` instead of falling through to `/member`.
- **`middleware.ts`** — Added `/trainer` protected route (allows `trainer` + `owner` roles). Added `trainer` to `roleHome` map. Matcher updated to include `/trainer/:path*`. Added `trainer` to `/profile`, `/activity`, `/about` allowed roles.
- **`lib/firebase/read-models/members.ts`** — New `getMembersForTrainer(gymId, trainerId, visibility)` that enforces `TrainerMemberVisibility`:
  - `assigned_only` → Firestore query `.where("assignedTrainerId", "==", trainerId).where("isPT", "==", true)`
  - `all_pt_members` → `.where("isPT", "==", true)`
  - `all_members` → no filter (full gym member list)
  - Cached with `gym:{gymId}:members` tag, 60s revalidate
- **`app/trainer/page.tsx`** — Rewritten: `requireRole(["owner", "trainer"])`, fetches gym doc to read `trainerMemberVisibility`, uses `getMembersForTrainer` for PT booking form, accepts `memberId` search param for pre-selected member, `StatusBadge` replacing raw `status-pill` strings.
- **`app/trainer/members/page.tsx`** (new) — Full member list page for trainers with stat cards, visibility mode label, member rows with PT/assigned/membership status badges, "Assign PT →" links.
- **`components/main-nav.tsx`** — Trainer nav now matches on `role === "trainer"` (not only `staffType`). Trainer links updated to `/trainer/members` instead of `/owner/members`.
- **`components/mobile-bottom-nav.tsx`** — Added `role === "trainer"` branch: Schedule, Members, Profile tabs.

### Result
- A trainer logging in with `role: "trainer"` is routed to `/trainer`, sees only the members matching their gym's visibility setting, and can assign PT plans to those members only. TypeScript exits 0.

---

## Latest Update - 2026-05-28: Phase 3 — Owner billing, packages & trainers pages

### New pages
- `app/owner/packages/page.tsx` — Package list with create/edit inline form. Active/inactive split. Deactivate action from PackageCard.
- `app/owner/billing/page.tsx` — Payment requests list with All/Pending/Approved/Rejected filter tabs, stat cards, approve/reject actions.
- `app/owner/trainers/page.tsx` — Trainer roster with per-trainer PT member count, links to sessions, and a "PT members without trainer" action list.
- Owner settings now includes a `TrainerVisibilityForm` (assigned_only / all_pt_members / all_members) wired to `updateTrainerVisibilityAction`.

### New components
- `components/payment-request-card.tsx` — Approve/reject card with inline rejection reason input, `sonner` toasts.
- `components/package-form.tsx` — Create/edit package form (name, duration, price, currency, PT sessions).
- `components/trainer-visibility-form.tsx` — Radio-based visibility selector that saves on change.
- `components/stat-card.tsx`, `components/status-badge.tsx`, `components/empty-state.tsx`, `components/data-table.tsx` — Reusable UI primitives.
- `components/package-card.tsx` — Package display card with edit/deactivate.
- `app/owner/packages/packages-client.tsx` — Client wrapper for edit/create mode toggle.

### Dashboard update
- Owner dashboard now fetches `getPendingPaymentRequests` and passes pending count to `OwnerQuickLinks`.
- Quick links now show an amber "Payments" chip with badge when there are pending requests.

### Navigation
- `main-nav.tsx` owner links now include Packages, Billing, Trainers.

### CSS
- `app/styles/18-billing-trainers.css` — All styles for stat-card, payment-request-card, package-card, package-form, trainer-list, empty-state, data-table, trainer-visibility-form.

### Status
- `npx tsc --noEmit` exits 0. No regressions.

---

## Latest Update - 2026-05-27: Member dashboard wellness/progress pass

- Removed the empty `Training Insights` profile card path by deleting the dead `ProfileAiSummary` component and the deleted `lib/ai.ts` dependency. The profile page now keeps concrete metrics, charts, bodyweight, and security only.
- Member dashboard readability improved: Workout, Progress, Wellness, lift-log, and side panels now render as fully readable elevated surfaces instead of overly transparent glass.
- Macro tracking is now wired end-to-end on the member page: today hydrates from `getMacroLogForMember`, history hydrates from `getMacroLogsForMember`, the macro panel receives history, and charts/list empty states are visible.
- Added cardio/stretch activity logging into the member Progress tab using `ActivityLogForm`, `logActivity`, and the `activityLogs` Firestore collection path.
- Member history now combines lift logs, day logs, cardio, stretches, macro logs, PR chips, and macro target hits in one collapsible timeline.
- Workout calendar now shows distinct markers for workout, PR, cardio, stretch, macro target met, skip, and makeup activity.
- Reward feedback added via `sonner` toasts for PRs, set logging, workout completion, macro target hits, cardio logs, and stretch logs.
- Gym location support is wired: admin create/edit gym forms support `locationUrl`, Firebase callable/server action validates it, and the member hero gym badge opens Google Maps when available. SHG has a fallback Maps URL.
- Exercise rows now show a highlighted target-muscle description pill with more specific focus such as upper chest, long-head triceps, lats/rhomboids, side delts, hamstrings, etc.
- Verification: `npm run functions:build`, `npm run build`, and clean post-build `npm run typecheck` pass. Build still prints the existing Sentry instrumentation notices.

### Open TODOs From This Pass
- Deeper exercise JSON/catalog cleanup is still a separate data migration pass: dedupe names, normalize categories/equipment/movement patterns, and verify every workout reference against the final catalog.
- Add a proper billing feature later. Do not mention billing exclusions in landing/member-facing copy; keep this as an internal roadmap item.
- Add browser/manual smoke testing for the new member dashboard UI once the local auth state is available.

> **As of 2026-05-27:** The codebase is production-ready. `npm run build` passes clean (zero errors or warnings). Gemini/AI API dependencies have been removed. The notification system is fully rebuilt. `member-workout-console.tsx` is modularised. The 5 remaining gaps (items 1–4, 15) are non-blocking for launch.

---

## 🎨 Design System Standards (Reference for Future Builds)

See `README.md` → **Design System** section for the full reference. Key rules summarised here for quick lookup during development.

### Critical Button Rule

> `--brand` is **lime (#C8F135)** in dark mode. Never pair it with `color: white`. Always use `color: var(--primary-foreground)`.

```css
/* ✅ Always do this */
.btn { background: var(--brand); color: var(--primary-foreground); }
/* ❌ Never do this */
.btn { background: var(--brand); color: white; }
```

### Core Token Quick Reference

| Token | Dark value | Light value |
|---|---|---|
| `--brand` | `#C8F135` (lime) | `#4f46e5` (indigo) |
| `--brand-strong` | `#b8e028` | `#4338ca` |
| `--primary-foreground` | `#0A0A0A` | `#ffffff` |
| `--danger` | `#ef4444` | `#dc2626` |
| `--warning` | `#f59e0b` | `#d97706` |

### Button `<button>` Reset

Any `<button>` used as a custom-styled element needs these resets to clear UA grey background:
```css
button.my-custom { background: transparent; border: none; font: inherit; cursor: pointer; }
```

### CSS File Prefixes

| Prefix | Scope |
|---|---|
| `odp2-` | Owner dashboard workspace |
| `lpd-` | Landing page shared (buttons, modals) |
| `l1-` | L1 Hero section |
| `lp-modal-` | Landing page modals |
| `nlist-` | Notification list |
| `ntf-` | Notification topbar dropdown |
| `mhv-` | Members hybrid view |

### Owner Dashboard Topbar Suppression

The owner workspace uses `position: fixed; inset: 0` and suppresses the app topbar via CSS `:has()`:
```css
body:has(.odp2-workspace) .topbar,
body:has(.odp2-workspace) .mobile-bottom-nav { display: none !important; }
```
**Do not** try to fight this with z-index. The `:has()` approach is intentional and definitive.

### Priority Row Color Coding (Owner Tables)

Expired → `var(--danger)` / Expiring soon → `var(--warning)` / Active → `var(--brand-soft)` / Neutral → `var(--bg-card)`

---

## ✅ Already Done — Don't Re-do

### TypeScript Strict Mode
`strict: true` is already enabled in `tsconfig.json`. There are only 12 actual `any` usages across `lib/` — fix those in `lib/ai.ts` (15 min job) and move on. Do **not** add `noUncheckedIndexedAccess` — it would break hundreds of array accesses throughout the codebase for no meaningful safety gain at this stage.

---

## 🔴 Do Now — High Impact, Low/Medium Effort

### 1. Granular Cache Revalidation Tags
**Status (May 25, 2026): Done for the current read-model/action path.** Cached read models now use collection-level gym tags like `gym:{gymId}:members`, `gym:{gymId}:programs`, `gym:{gymId}:exercises`, `gym:{gymId}:pt-sessions`, and `gym:{gymId}:pt-lift-logs`. The shared action `success()` helper now revalidates per-collection tags instead of the old coarse `"gym-data"` tag. Next improvement: pass narrower tag lists from every action instead of relying on the safe default collection set.

**Current state:** Only 2 files use `revalidateTag`. `lib/firebase/actions/shared.ts:160-162` fires both `gym:${gymId}` AND the coarse global `"gym-data"` tag on every mutation, which invalidates all cached gym data across all routes simultaneously.

**What to do:**
- Replace with per-collection tags: `gym:${gymId}:members`, `gym:${gymId}:programs`, `gym:${gymId}:sessions`, etc.
- Each action only invalidates the collections it actually touched
- Estimated 30 minutes across 2 files — real latency improvement for any concurrent user

### 2. Error Handling Standardization
**Current state:** Mixed patterns across server actions — some `throw new Error()`, some return `FormActionState`, some `console.error` and return undefined silently. `shared.ts:requireText` throws raw, but many callers don't wrap in try/catch, meaning these can crash server actions with no user-visible message.

**What to do:**
- Audit all server actions in one pass. Every catch block must return `failure(error, "human-readable message")` — never throw raw, never return void
- `console.error` with context is fine for logging — skip the "structured logger" suggestion, that's over-engineered for this stage
- Estimated 2 hours — real bug risk closed

### 3. Pre-commit Hooks (husky + lint-staged)
**Status (May 25, 2026): Baseline added.** Installed `husky` and `lint-staged`, added `.husky/pre-commit`, converted linting from deprecated interactive `next lint` to `eslint .`, and added a flat ESLint config. Current lint passes with warnings; the remaining warnings are legacy cleanup work, mostly unused imports, `img` optimization warnings, and a few existing `any` usages outside `lib/ai.ts`.

**Current state:** Neither `husky` nor `lint-staged` is installed. `typecheck` and `lint` scripts exist in package.json but nothing enforces them.

**What to do:**
- Add `husky` + `lint-staged`, run `typecheck + lint` on pre-commit
- Do **not** run tests on pre-commit — too slow, kills developer flow
- Estimated 20 minutes

### 4. Sentry Error Monitoring
**Current state:** No error monitoring installed. Production failures are invisible unless someone checks Cloud Functions logs manually.

**What to do:**
- Install `@sentry/nextjs` — it auto-instruments both server and client errors with one init call
- Add to Cloud Functions separately via `@sentry/node`
- Estimated 30 minutes, invaluable in production

### 5. Fix the 12 `any` Types in `lib/ai.ts`
**Status (May 25, 2026): Done.** `lib/ai.ts` now uses `LiftLog`, `Exercise`, and `WorkoutExercise` domain types, exports a typed `SmartSwapResult`, and normalizes unknown Gemini JSON before returning it.

Replace the loose `any[]` and `any` params in the AI module with the proper `LiftLog` and `Exercise` types that already exist in `@/types/domain`. 15-minute task, no architectural change needed.

---

## 🟡 Do Next Sprint — Good Value, Bounded Scope

### 6. Exercise Swap Logic
**Status (May 27, 2026): Revised.** Gemini-based smart swaps have been removed (cost saving). The rule-based `findAlternative` + `isContraindicated` helpers in `lib/workout-utils.ts` handle injury-aware swap suggestions locally. Members record injury notes via `InjuryNotesForm`; owners/trainers can see the note and adjust manually. No external API call.

### 7. Macro Tracking — Persist to Firestore
**Status (May 25, 2026): Done.** `MacroProgressPanel` now debounces writes to Firestore (1500 ms) via `saveMacroLog` server action. Initial value is server-hydrated from `getMacroLogForMember` in the member dashboard page. Macro log doc ID is `{memberId}_{date}`, written to both `gyms/{gymId}/macroLogs` and the root `macroLogs` collection.

### 8. Bulk Member Operations — Wire Existing Action
**Status (May 25, 2026): Done.** `BulkMemberList` is fully wired — bulk assign program calls the Firebase `bulkAssignProgram` callable with a server action fallback; bulk suspend is wired the same way.

### 9. "Today's Workout" Quick-Start on Member Dashboard
**Status (May 25, 2026): Done.** `MemberWorkoutConsole` uses `getDefaultDayIndex` to default to today's ISO day, and the first visible panel is the active day's exercise list with logging controls. No separate "Today's Workout" card needed.

### 10. Firebase Emulator Support
**Status (May 25, 2026): Done.** `firebase.json` has emulator config (Firestore :8080, Functions :5001, Storage :9199, UI :4000). `lib/firebase/client.ts` reads `NEXT_PUBLIC_USE_EMULATOR=true` and connects all four emulators via a singleton guard. `.env.emulator` documents the required env vars.

---

## 🟢 Do When Time Permits

### 11. 80 Targeted Tests (Not 200)
**Status (May 25, 2026): Done. 80 tests across 2 files, all passing.**

Added `getDefaultDayIndex`, `findAlternative`, and `createModification` suites to `workout-utils.test.ts` (45 tests total), and a `ZodHelpers.username` suite plus additional `parseActionData` edge cases to `validation.test.ts` (35 tests total). Run with `npm test`.

Remaining gap: server action tests (suspend/delete/assign) and `requireRole` middleware require Firebase emulator setup (Item 15). Not in scope for this pass.

### 12. CSS Token Consolidation
**Status (May 25, 2026): Done.** All design tokens (`--brand`, `--bg`, `--text-*`, `--border`, `--radius`, etc.) are defined once in `00-base-shell.css`. The 4-way duplication is resolved.

### 13. CI/CD Pipeline (GitHub Actions)
**Status (May 25, 2026): Done.** `.github/workflows/ci.yml` has two jobs: `ci` (typecheck + lint + test on ubuntu-latest, Node 22) and `build` (depends on `ci`, runs `next build` with placeholder Firebase env vars).

### 14. Automatic Offline Sync Trigger
**Status (May 25, 2026): Done.** `MemberWorkoutConsole` already listens on the `online` event and auto-triggers Dexie→Firestore sync when connectivity is restored.

### 15. Security Rule Tests
Add automated Firestore security rule tests (`firebase-admin` test runner) before any production deploy that changes `firestore.rules`. Not urgent now but should gate any rule changes.

### 16. Bundle Size Analysis
Add `@next/bundle-analyzer` as an npm script. Recharts and Radix are the likely heaviest packages. Takes 10 minutes to wire and probably surfaces at least one lazy-load opportunity.

---

## ❌ Skip — Not Worth It at This Stage

| Item | Reason |
|---|---|
| `noUncheckedIndexedAccess` TS flag | Breaks hundreds of array accesses, weeks of cleanup, marginal safety gain |
| Zustand store split into slices | No measured performance problem. Revisit only if profiler confirms the store as a bottleneck |
| N+1 query audit | Parallelised with `Promise.all` on the pages that matter. Profile before optimising — don't guess |
| B2C payment / Stripe integration | Out of scope. Changes security posture significantly. Only if explicitly back in roadmap |
| Service Worker / Background Sync | Over-engineered for current scale. `visibilitychange` sync covers the real need |
| Zod validation on Firestore read models | Adds complexity without clear benefit — TypeScript already types the reads, and malformed Firestore data is rare in a controlled gym setting |
| Localization / i18n | No evidence of international user demand. Extracting strings before there's a second language is premature |
| Feature flags | No features currently needing gradual rollout. Add if/when a risky AI feature needs gating |
| Achievement / badge system | Requires new Firestore collection, Cloud Function triggers, notification flow, and UI. Scope it properly as a full feature before starting |

---

## 📊 Execution Order Summary

**Still outstanding (genuine gaps):**
1. Granular revalidation tags — 30 min (item 1)
2. Error handling standardization — 2 hrs (item 2)
3. Husky + lint-staged — 20 min (item 3, baseline added but warnings remain)
4. Sentry DSN configuration — need `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in `.env.local` / CI secrets (item 4)
5. Security rule tests — requires `@firebase/rules-unit-testing` + emulator in CI (item 15)
6. **`muscleTargetDescription` in `lib/workouts.json`** — `scripts/patch-muscle-targets.mjs` was created and writes descriptions to the Firestore exercise catalog, but the 66 mock exercises in `lib/workouts.json` still lack the `muscleTargetDescription` field. The field is typed as `muscleTargetDescription?: string` in `Exercise` (domain.ts). Needs a one-pass fill of all 66 entries covering the specific muscle focus (e.g. "Targets the lateral and long head of the triceps…", "Emphasises the lower chest fibres…"). Once added, the exercise detail UI pill will render for mock exercises too — currently it only renders for Firestore catalog docs that were patched directly.
7. **Exercise JSON / catalog deep cleanup** — `lib/workouts.json` has 66 exercises across 8 muscle groups but no normalised `muscleGroup`, `equipment`, or `movementPattern` fields on individual entries (only top-level group keys). A cleanup pass should: add per-entry `muscleGroup` (lowercase, e.g. `"chest"`), `equipment`, and `movementPattern` fields; deduplicate any entries where the same exercise appears under multiple groups; cross-reference every `exerciseId` in `gyms/shg/workoutPrograms` split days against the JSON IDs and flag any missing entries; verify the 3 exercises that resolve to Firestore UUIDs (Pec Deck Fly → `efee6382…`, Barbell Row → `f17b8521…`, Hammer Curl → `ec5320ce…`) are still handled correctly after any restructure. Do **not** change existing short IDs (`ch_01`, `bk_03`, etc.) — they are referenced in live program assignments.

**Done (as of May 27, 2026):**
- Items 5, 6 (revised — Gemini removed, local rules retained), 7, 8, 9, 10, 11, 12, 13, 14, 16 — all complete
- Notification system fully rebuilt with deep links, timestamps, rich UI, full-page view
- `member-workout-console.tsx` modularised into 4 sub-components + custom hook
- All Gemini/AI API code removed; `sonner` toasts added; progressive overload chart fixed (kg, PR line)
- `npm run build` passes with zero ESLint errors or warnings

---

## Codebase Health Note

The codebase is in solid shape. Gym-scoped multi-tenancy, Radix UI, Recharts code-splitting, and the server action / read model separation were all well-executed. The main gaps are **production observability** (Sentry), **cache coherence** (granular tags), and **feature completeness** (macro persist, bulk ops, AI wiring). TypeScript strictness and test infrastructure are already further along than the previous handoff suggested.

---

## Latest Update - 2026-05-27: Pre-launch UX overhaul — AI removal, notification rebuild, component modularisation, build clean

### Phase 1 — Gemini / AI removal (cost saving)
- Removed `@google/genai` from `package.json` and all Gemini SDK imports.
- Deleted `components/ai-program-brief.tsx` entirely.
- `lib/ai.ts`: Removed `generateWorkoutSummary` and `generateSmartSwaps` (both Gemini). Kept and exported `getWorkoutInsights` — local heuristic only, zero external API calls.
- `lib/firebase/actions/programs.ts`: Removed `pickProgramWithGemini()`. `generateAndAssignProgram` now always uses `pickProgramWithoutAi()`.
- `components/member-workout-console.tsx`: Removed AI swap call and all related state. Injury notes textarea saves directly to `profile.injuryNotes` via the existing server action.
- `.env.local` / README: Removed `GEMINI_API_KEY` and `GEMINI_MODEL` env vars.

### Phase 2 — Notification system rebuild
- `types/domain.ts`: Added `actionHref?`, `memberId?`, `ptSessionId?` to `Notification` type.
- `lib/firebase/actions/pt.ts`: PT notifications now include `actionHref: "/member/pt-history"` and `ptSessionId`.
- `lib/firebase/actions/contact.ts`: Contact message notifications include `actionHref: "/admin/inbox"`.
- `lib/firebase/actions/exercises.ts`: Exercise request notifications include `actionHref: "/owner/exercises"`.
- `lib/firebase/actions/programs.ts`: Program-assigned notifications include `actionHref: "/member"` and `memberId`.
- `lib/firebase/read-models/shared.ts`: Removed `trainingNotificationCopy()` — it was overwriting membership notification titles to "Training profile follow-up", hiding real context. `sanitizeNotification` is now a pass-through.
- `lib/firebase/read-models/notifications.ts`: Replaced `trainingNotificationCopy` calls with a clean `mapNotificationDoc()` helper that maps all fields including `actionHref`, `memberId`, `ptSessionId`.
- `components/notification-list.tsx`: Full rebuild — type icons per notification category, relative timestamps ("2h ago"), `<Link>` deep-action rows, unread left-accent bar, per-item dismiss (`clearUserNotifications([id])`), "You're all caught up" empty state.
- `components/app-topbar.tsx`: Bell badge now shows numeric count (capped at 9+). Dropdown items show timestamps and action links. Added "View all notifications →" link to `/owner/notifications`.
- `app/owner/notifications/page.tsx`: **New full-page notifications view** — filter tabs (All / Unread / PT / Members / Other), unread count badge, "Mark all read" button.
- `app/owner/page.tsx`: Owner dashboard now shows up to 8 notifications (was 5) with "See all →" link.
- `app/styles/16-ux-improvements.css`: New sections for notification count badge, rich list rows, dropdown layout, full-page filter tabs.

### Phase 3 — Bug fixes & polish
- `components/progressive-overload-chart.tsx`: Fixed tooltip unit `"lbs"` → `"kg"`. Added `ReferenceLine` PR marker with label. Changed `dot={false}`, dots only on hover.
- `app/layout.tsx`: Added `<Toaster>` from `sonner` (position bottom-center, theme-matched). Added `sonner` to `package.json`.
- `app/owner/reports/page.tsx`: Added zero-member empty state (icon, heading, CTA). Fixed `<a>` → `<Link>` (was blocking build).
- `components/progress-chart.tsx`: Empty state upgraded to styled card with dashed border, activity-line SVG icon, "No lift data yet" heading.
- `app/owner/settings/loading.tsx`, `app/member/programs/loading.tsx`, `app/owner/notifications/loading.tsx`: Added `<FitnessLoader />` loading skeletons.
- Deleted `lib/workouts_updated.json` (dead file, nothing imported it).

### Phase 4 — `member-workout-console.tsx` modularisation
- Split 938-line component into focused files under `components/workout/`:
  - `session-timer-bar.tsx` — active session bar with elapsed timer and end-workout button
  - `injury-notes-form.tsx` — injury/limitation notes form with preset chips
  - `day-skip-form.tsx` — skip reason chips, confirm, makeup exercise selection
  - `use-workout-console.ts` — all business logic as a custom hook (useEffects, derived values, handlers)
- `member-workout-console.tsx` reduced to ~220 lines (coordinator only, no logic).

### Build clean-up (post-modularisation)
- Fixed all ESLint errors and warnings from `npm run build`:
  - `app/owner/reports/page.tsx`: `<a>` → `<Link>` (was blocking build with `@next/next/no-html-link-for-pages`)
  - `use-workout-console.ts`: Memoized `visibleWorkoutDay` with `useMemo`; wrapped `loggableExercises` in its own `useMemo`; removed stale `eslint-disable` comment
  - `member-workout-console.tsx`: Removed unused `selectedDay` destructuring; added inline disable for `_initialActiveSessionCount`
  - `injury-notes-form.tsx`: Removed unused `memberId` prop entirely
- `npm run build` now completes with **zero ESLint errors or warnings** (only pre-existing Sentry config notices).

---

## Latest Update - 2026-05-25: Profile dropdown fix + Gym Settings page + owner member page layout

- Fixed profile dropdown disappearing immediately on click: removed `AnimatePresence` + `asChild` + `forceMount` pattern from `components/app-topbar.tsx` — let Radix manage lifecycle, CSS handles entry animation via `.profile-dropdown` keyframe already in `02-shared-components.css`.
- Same fix applied to notification dropdown (same root cause).
- Removed now-unused `isNotifOpen`, `isProfileOpen` state variables from `AppTopbar`.
- "Gym Settings" link in profile dropdown now routes to `/owner/settings` instead of `/owner`.
- Created `app/owner/settings/page.tsx`: full gym settings page with `GymDetailsForm`, `GymLogoManager`, and `GymNoticeManager`.
- Owner member detail page (`/owner/members/[memberId]`): restructured workspace layout — primary column holds program schedule, context editor, coach note, AI brief; sidebar holds trainer PT panel, program assignment, account access, danger zone.
- `program-assignment-form.tsx`: added `router.refresh()` after successful assignment so "Needs program" hero badge updates without a hard reload.
- `/owner/training`: replaced collapsible `<details>` with always-visible 2-column grid (`pt-workspace-grid`). Left: booking form. Right: sticky sessions list with trainer filter pills, member filter banner, view toggle, and status tabs.
- Created `restart-local-server.ps1` + `restart-local-server.bat` at project root.

---

## Latest Update - 2026-05-25: 80 tests + handoff accuracy pass

- Reached 80 passing tests (`npm test`) — up from 49.
- New suites added to `lib/__tests__/workout-utils.test.ts`: `getDefaultDayIndex` (4), `findAlternative` (6), `createModification` (8), plus 2 extra `isContraindicated` edge cases covering avoidTerms matching and verified-safe instructions.
- New suite added to `lib/__tests__/validation.test.ts`: `ZodHelpers.username` (8) + 4 additional `parseActionData` cases.
- Corrected handoff items 6–14 and 16 to "Done" — they were implemented in earlier sessions but the document was stale.
- Remaining genuine gaps: items 1 (granular cache tags), 2 (error handling), 3 (husky warnings), 4 (Sentry DSN env vars), 15 (security rule tests).

## Latest Update - 2026-05-25: Member greeting and read-only programs

- Member dashboard greeting now uses explicit `Asia/Kolkata` time instead of server-local time.
- Greeting windows:
  - 6 AM-12 PM: Good morning
  - 12 PM-4 PM: Good afternoon
  - after 4 PM: Good evening
- Added a member hamburger drawer link to `Workout Programs`.
- Added `/member/programs`, a read-only workout library page showing predefined and gym-created programs.
- `WorkoutProgramGallery` now supports `readOnly` mode, hiding assignment counts and edit/delete controls while preserving the view-plan modal.
