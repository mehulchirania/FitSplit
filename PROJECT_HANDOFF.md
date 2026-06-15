# FitSplit — Project Handoff & Improvement Roadmap

Verified analysis against the live codebase (May 2026). Items are ordered by execution priority, not theoretical impact.

---

## 🧹 Latest Milestone — Dead-code triage + landing framer-motion split (2026-06-15)

Follow-up to the bundle-optimization milestone below. **No live functionality changed** (verified by
`tsc` + `next build` — every deletion would have broken a static import if it were still referenced).

**Landing framer-motion → LazyMotion** ([landing-page-client.tsx](src/components/landing-page-client.tsx)) —
the two modals (`LoginModal`, `EnquiryModal`) now use `LazyMotion features={domAnimation}` + `m.*` instead
of `motion.*`. `/` First Load 247 kB → **237 kB** (−10 kB). Honest note: smaller than the ~80 kB hoped —
`domAnimation` is imported synchronously and the landing didn't use the heavy drag/layout features. Going
fully lazy (dynamic `features`) could save more but risks an animation flash; not worth it here.

**Knip dead-code triage — deleted 22 unused files + 8 unused deps:**
- Files: the legacy workout-console cluster (`member-workout-console`, `workout/use-workout-console`,
  `lib/stores/workout-store`, `member-dashboard-tabs`, `workout/{day-skip-form,injury-notes-form,session-timer-bar}`),
  `login-form` (landing has its own inline login), and unreferenced generic components
  (`activity-log-form`, `add-gym-form`, `attendance-calendar`, `back-button`, `bulk-member-list`,
  `data-table`, `feature-carousel`, `landing-nav`, `loader`, `member-row`, `muscle-target-pills`,
  `owner-quick-links`, `status-pill`, `workout-makeup-card`).
- Deps (`package.json`): **`@fullcalendar/*` ×5** (never wired — the "PT Calendar" has zero imports;
  CLAUDE.md/README are stale on this), **`@radix-ui/react-popover`** (only `member-row` used it),
  **`@radix-ui/react-slot`** (zero refs), **`zustand`** (only the dead `workout-store` used it).

**Left in place for OWNER REVIEW (flagged, not deleted) — Knip says unused, but they're documented/WIP:**
- `lib/memberships.ts` — zero imports / zero callers of `getDaysRemaining`/`getMembershipStatus`, **yet
  CLAUDE.md (updated today) describes it as live and just-fixed.** Contradiction — confirm whether the
  expiry logic was moved (then delete) or still intended (then wire it up).
- `lib/muscle-targets.ts` — documented key file; only consumer was the (now-deleted) `muscle-target-pills`.
- `components/gym-floor-load-map.tsx` (+ `-lazy`) — the **data** fn `getGymFloorLoadMap` is still used by
  owner pages, but the **visual component** is rendered nowhere. The floor-map feature fetches data but
  doesn't display this component — likely wants re-wiring, not deletion.

**Knip false positives to ignore:** `eslint-config-next` (used by ESLint flat config `extends`); the 63
"unused exports" are mostly the intentional `icons.tsx` barrel.

---

## 📦 Latest Milestone — Bundle size optimization (verified) (2026-06-15)

Data-driven code-splitting from the `npm run analyze` treemap. **No functionality changed** — same
components, deferred loading. All numbers measured from `next build` output, before → after.

**Verified results (First Load JS):**

| Route | Original | Now | Δ |
|---|---|---|---|
| Shared baseline (every route) | 215 kB | **183 kB** | −32 kB |
| `/profile` | 361 kB | **208 kB** | −153 kB (−42%) |
| `/member` | 476 kB | **329 kB** | −147 kB (−31%) |
| `/owner/members/[memberId]` | 359 kB | 327 kB | −32 kB |
| `/` (landing) | 279 kB | 247 kB | −32 kB |

**1. Sentry Session Replay lazy-loaded** ([instrumentation-client.ts](src/instrumentation-client.ts)) —
`replayIntegration` was statically imported, forcing ~188 kB (parsed) onto 100% of users in the shared
bundle, though replay is only sampled at 1% of sessions / 100% of error sessions. Now added via
`Sentry.addIntegration` after a same-origin dynamic `import()` (not the CDN `lazyLoadIntegration`, which
would violate the nonce CSP). Removes ~32 kB First Load from **every route**.

**2. Recharts charts code-split** (~318 kB lib) — the 6 chart components are now `next/dynamic(..., { ssr:false })`
wrappers (`*-chart.tsx`/`*-panel.tsx`/`*-widget.tsx` = thin wrapper; real code moved to `*.impl.tsx`).
Wrapping at the **component** (not call-site) is required because `app/profile/page.tsx` and
`app/owner/reports/page.tsx` are Server Components, where `ssr:false` is forbidden. Shared
[chart-skeleton.tsx](src/components/chart-skeleton.tsx) fallback reuses the design-system `.sk-pulse` class.
- **Consolidated a half-finished optimization:** a prior pass had created `*-chart-lazy.tsx` files but
  only wired 3 of 6 call sites to them (muscle-radar / macro-progress / profile-metrics still loaded
  recharts eagerly — that's why `/profile` was 361 kB). Deleted the 3 redundant `-lazy.tsx` files and
  repointed their call sites to the now-lazy base import, so the pattern is uniform and foolproof.
  (`gym-floor-load-map-lazy.tsx` left as-is — separate concern.)

**Verification:** `tsc --noEmit` clean; `next build` exit 0; dev server boots with zero console/server
errors; landing renders fully. **Authed chart-render QA (member/profile pages) not run in headless
preview** — same demo-login harness limitation noted in the avatar milestone. The 3 newly-lazied charts
use the identical `dynamic({ssr:false})` pattern as the 3 already lazy in production, so runtime risk is low.

**Remaining opportunity (not done):** framer-motion (123 kB) on `/` — swap `motion` → `LazyMotion`+`m`
to shave ~80 kB off the landing route.

---

## 🧰 Tooling — Graphify knowledge graph (2026-06-15)

Installed **graphify** (`graphifyy` 0.8.39, via `uv tool install`) — a CLI that builds a queryable
knowledge graph of the codebase. Registered as a Claude Code skill (`graphify install --platform claude`,
writes to `~/.claude/skills/graphify/`; also created a global `~/.claude/CLAUDE.md`). **No app code changed.**

- Ran the full pipeline on the repo: **353 files / ~460k words → 2,130 nodes, 4,902 edges, 148 communities**
  (1,967 AST nodes from 317 code files + 163 semantic nodes from 26 docs; 10 favicon/logo images skipped).
- Outputs land in `graphify-out/` — **added to [.gitignore](.gitignore)** (not committed). Contains
  `graph.html` (interactive), `GRAPH_REPORT.md` (audit), `graph.json` (GraphRAG/MCP-ready), `cache/`.
- God nodes (most-connected core abstractions): `requireRole()` (109 edges), `failure()`, `success()`,
  `hasFirebaseAdminConfig()`, `getFirebaseAdminServices()`, `parseActionData()`, `requireFirebase()` —
  confirms the server-action guard/validation layer is the architectural hub.
- Usage going forward: ask codebase questions via `graphify query "<question>"`, or `/graphify .` to rebuild.

---

## ⚡ Latest Milestone — Dev-speed + build tooling upgrades (2026-06-15)

Focus: faster local dev and low-risk performance/tooling wins. **No app functionality changed.**

- **Turbopack dev** — `dev` script is now `next dev --turbopack` ([package.json](package.json)). Verified
  booting on Next 15.5.19: page renders `200`, HMR ~485 ms, zero runtime/hydration errors. This is the
  "Vite-class" fast inner loop without leaving the Next.js framework (Server Actions, middleware CSP,
  RSC all intact).
- **React Compiler enabled** — `experimental.reactCompiler: true` ([next.config.mjs](next.config.mjs)),
  backed by new dev dep `babel-plugin-react-compiler`. Auto-memoizes components (cuts re-renders,
  removes most manual `useMemo`/`useCallback`). Verified: clean production build (`Compiled successfully`)
  and clean dev runtime. **Needs broader runtime QA across member/owner pages** — easily reverted by
  removing the `experimental` block if any page misbehaves.
- **Build now enforces correctness** — removed `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`
  from `next.config.mjs`. These were masking regressions and contradicting CLAUDE.md rules #3/#4.
  Safe because `tsc --noEmit` and `next lint` are both clean (warnings only). `npm run build` is green.
- **Knip added** (`npm run knip`, [knip.json](knip.json)) for unused file/export/dependency detection.
  First run flags 26 files / 8 deps as candidates — **treat as a review list, not auto-delete**: several
  (e.g. `gym-floor-load-map.tsx`, `@fullcalendar/*`, `zustand`) are live features loaded via dynamic
  imports Knip can't trace. Manual triage required before any removal.
- **`cross-env` added** — fixes the `analyze` script, which used bash-only `ANALYZE=true` syntax that
  silently never set the env var on Windows/PowerShell. `npm run analyze` now works cross-platform.
- **Bundle baseline (from build):** shared First Load JS = **215 kB** (one ~120 kB shared chunk dominates —
  worth investigating, likely Firebase client SDK). Heaviest routes: `/member` (476 kB First Load),
  `/profile` (361 kB), `/owner/members/[memberId]` (359 kB). Candidates for dynamic-import / code-split
  follow-up.

**Gotcha discovered:** running `next dev --turbopack` and `next build` (webpack) concurrently corrupts
`.next/` (Turbopack chunks collide with the webpack build → `Cannot find module '[turbopack]_runtime.js'`).
Stop the dev server (and/or `rm -rf .next`) before a production build.

---

## 📸 Latest Milestone — Profile photo uploads + exercise muscle descriptions (2026-06-15)

Implemented two prioritized functional items (#3, #4); geofence config (#1) moved to backlog (`docs/11`).

### #4 — Muscle target descriptions (workouts.json)
- All **66** mock catalog exercises in `src/lib/workouts.json` now carry a specific `muscle_target_description` (e.g. "Emphasises the long head of the triceps by extending the elbow with the arm overhead…"). Previously the exercise-detail pill fell back to a generic inferred string.
- `src/lib/mock-data.ts`: `CatalogExercise` type + the `exercises` mapper now read `muscle_target_description` → `muscleTargetDescription`. The 3 stretch entries also got descriptions.
- Flows through existing `exercise-list.tsx` `getMuscleTargetDescription()` (uploaded/specific value wins over inference) and `read-models/exercises.ts` (Firestore `muscleTargetDescription` already read).

### #3 — Firebase Storage avatar / staff image uploads
- **New reusable component** `src/components/avatar-uploader.tsx` — circular client-side crop (canvas → square PNG data URL) + zoom, submits through a server action. Used for both member avatars and staff images.
- **New server actions** (mirror the gym-logo upload pattern in `actions/gyms.ts`):
  - `updateMemberAvatar` (`actions/members.ts`) — member-self or owner/admin; uploads to `member-avatars/{gymId}/{memberId}.png`; persists `avatarUrl`+`avatarPath` to auth index + gym-scoped member doc.
  - `updateStaffImage` (`actions/staff.ts`) — staff-self or owner/admin; uploads to `staff-images/{gymId}/{userId}.png`; persists `imageUrl`+`imagePath` to authProfiles + gym-scoped staff doc.
  - Both use `parsePngDataUrl` + `requireFirebaseServices().storage`, build a tokenized `firebasestorage.googleapis.com` download URL. (Admin SDK uploads bypass Storage rules; token-based URLs bypass read rules — no rules change needed.)
- **Type/read-model wiring:** `MemberProfile.avatarUrl`/`avatarPath` added; `avatarUrl` added to `Member` + `ProfileMetrics` picks; populated in all 3 member mappers (`read-models/shared.ts`, `read-models/members.ts` ×2). `AuthenticatedUser.avatarUrl` + `ProfileRecord.avatarUrl` added in `auth.ts` (reads member `avatarUrl` or staff `imageUrl`).
- **Display:** member settings hero (`member-settings-client.tsx`) and owner profile page (`profile/page.tsx`) render the uploader; topbar (`app-topbar.tsx`) shows the avatar image (via `currentUser.avatarUrl` from layout) instead of initials when present.
- **CSS:** new `.avatar-uploader*` + `.profile-trigger-avatar` block in `15-ui-upgrades.css`.
- **Verification:** `tsc --noEmit` clean; `next lint` clean (no new warnings); dev server compiles with zero server/console errors; landing + login modal render. Authenticated avatar walkthrough not completed in the headless preview (demo login didn't establish a session via synthetic form submit — harness limitation, not a code issue).

---

## 🔑 Previous Milestone — B2C identity spike (account vs affiliation) (2026-06-15)

New decision doc: **`docs/B2C_IDENTITY_SPIKE.md`** — resolves the highest-uncertainty item
(§4.4) from the B2C design plan. Verdict: the identity refactor is **contained to the auth module
+ a self-signup/provisioning path**, not a platform rewrite.

- **Three code facts that de-risk it:** (1) `AuthenticatedUser.gymId` already comes from
  `profile.defaultGymId` — named for multi-gym; (2) all training logs are dual-written to **root**
  collections keyed by `memberId` (= uid), so history is already portable across gyms; (3) the
  whole downstream (`requireRole`, read-models, actions) consumes a single `gymId`/`role`.
- **Model:** identity = Firebase Auth `uid` = **account** (`authProfiles/{uid}` gains `plan` +
  an `affiliations` subcollection; `defaultGymId` → "active workspace"). Affiliation carries
  per-gym `role`. Personal gym = an affiliation with `gymId = personal-{uid}`, `type:"personal"`.
- **Load-bearing move:** add `activeGymId` to the session; `getCurrentUser` projects the active
  affiliation into the **existing single-gym `AuthenticatedUser` shape** → downstream untouched.
  All multi-gym complexity stays in the resolver. `resolveEntitlements(account, activeGym)` plugs
  in right after.
- **Watch items:** `getProfileById` collectionGroup `.limit(1)` becomes ambiguous with multi-gym
  uids (must resolve via account + activeGymId); add a **global phone index** for self-signup
  login identity (keep per-gym `phones` for member contacts); account-linking on member-add.
- **Open decisions (defaults set):** affiliations subcollection; model N affiliations; lazy
  account creation for existing pin-only members.
- **Status:** design only. Unblocks Foundation phase (§6.1).

---

## 🧭 Previous Milestone — B2C + B2B model design plan (2026-06-15)

New strategy/architecture design doc: **`docs/B2C_B2B_DESIGN.md`**. Plans opening FitSplit to
direct consumers (B2C: Free + Pro) alongside the existing gym-owner business model (B2B), without
letting Free cannibalize the business tier.

- **Core principle:** segment by *job-to-be-done*, not quantity. Consumer plans = "train myself
  better"; Business plans = "run a roster of paying clients." Roster operations (member mgmt,
  payments, attendance, PT delivery, revenue dashboard) are structurally un-cannibalizable by any
  consumer tier — this is the moat that keeps owners paying.
- **Decision locked:** gym members of a paying gym get the **full Consumer Pro** feature set free
  (granted by the gym) — the headline B2B sales weapon; Pro feature set is built once.
- **Key architecture call:** model each consumer as a **"personal gym"** (`gym.type:
  "personal"`, consumer is sole owner+member) so the entire `gyms/{gymId}/...` dual-write model,
  read-models, and rules are reused — no `gymId === null` fork.
- **New entitlements layer** (separate from `requireRole`): `plan` on account/gym →
  `resolveEntitlements(user, gym)` = max(personal plan, gym-granted plan); gate with
  `requireEntitlement(...)` server-side + UI upsell.
- **Open items:** account-vs-gym identity model (§4.4, needs a spike), global login uniqueness
  migration, server-side entitlement enforcement, free-tier calibration. Platform billing →
  Razorpay subscriptions (India-first). 5-phase rollout in §6.
- **Status:** design only, nothing implemented yet.

---

## 🗂 Previous Milestone — Docs audit + Cloud Function expiry fix (2026-06-15)

### Docs audit
Full pass through `DISCREPANCIES.md` (2026-06-05 vintage) against the live codebase:

- **A3/B5 (Notification type union)**: Confirmed already resolved in code — `payment_request_pending`, `payment_request_rejected`, `data_deletion_request` present at `src/types/domain.ts:438-440`. DISCREPANCIES.md now marked resolved.
- **A4 (FIRESTORE_STRUCTURE.md stale)**: Updated `FIRESTORE_STRUCTURE.md` to add 8 gym-scoped collections (`ptSessions`, `ptLiftLogs`, `macroLogs`, `activityLogs`, `packages`, `memberships`, `paymentRequests`, `summaries/dashboard`) and root collections (`usernames`, `phones`, `platformSummaries`, `loginAttempts`, root mirrors). Both DISCREPANCIES.md and the doc now agree.
- **B6 (Action vs CF duplication)**: Already documented in `04_DATA_ACCESS_CATALOG.md` "Action vs Function overlap" section with a 15-operation table. Marked as documented.
- **Section E (previously uninspected)**: `next.config.mjs`, split-library/workout-utils internals, PWA manifest — all inspected and noted in DISCREPANCIES.md.
- **11_KNOWN_ISSUES_AND_GAPS.md item 5**: Notification type drift marked as fixed (per R6 from 2026-06-05).
- **CLAUDE.md**: Created at project root — comprehensive per-session context file covering stack, auth, routes, Firestore schema, CSS system, server action patterns, key files, known bugs, and gotchas.

### Cloud Function fix (B7)
`computeGymDashboard` and `processMembershipExpiries` both used a hardcoded 7-day window (`addMonths(todayStr, 0, 7)`) for `expiringThisWeek` / `isExpiringSoon`, ignoring the per-gym `expiryWarningDays` setting editable in gym settings.

- `computeGymDashboard` now fetches `db.doc('gyms/${gymId}')` in the same `Promise.all` and reads `gymDoc.data()?.expiryWarningDays ?? 7`
- `processMembershipExpiries` reads `gymDoc.data().expiryWarningDays ?? 7` per gym inside the existing gym loop (gymDoc was already in scope from `gymsSnap.docs`)
- Functions TypeScript check passes clean

---

## 🎨 Previous Milestone — Owner-workspace UI fixes + PT page redesign (2026-06-05)

### Members page (`members-hybrid-view` / `19-members-redesign.css`)
- **White action buttons fixed.** `.mhv-qcard__action` (and 2 sibling buttons) used `color: var(--bg-elevated)` as text on a `var(--text)` (white) background; `--bg-elevated` is now a translucent `rgba(255,255,255,0.03)` overlay → invisible text. Changed text colour to solid `var(--bg)`.
- **Empty directory fixed.** The directory `.mhv-panel` was flex-compressed by `.mhv-root` and its `overflow: hidden` clipped the table rows. Added `flex-shrink: 0`.
- **Oversized checkbox fixed.** `.mhv-check` now has hard min/max 16px size locks.

### Personal Training (`/owner/training`) — redesigned + bug fix
- **Activate/Complete/Cancel/Reschedule "PT session not found." — FIXED e2e.** The four lifecycle actions (`actions/pt.ts`) looked the session up in the **root** `ptSessions` collection, but the UI lists from the **gym-scoped** path. New `loadPTSessionForWrite` helper resolves gym-scoped first, falls back to root, and `applyPatch` updates only the copies that exist (no partial-doc writes).
- **Page rebuilt on the `adm-card` design system** (`ptx-` namespace, `10-pt-training.css`): list-first **two-column manage view** — controls/actions rail (KPIs, Assign CTA, trainer/status filters, List/Calendar toggle) on the left, **plan lists grouped by status** (Scheduled / Active / Completed / Cancelled) on the right. "+ Assign PT plan" opens a **focused booking mode** (`?book=1`). Booking-form fields now styled (the type-less inputs had no matching selector). Old `pt-workspace`/`pt-session-card`/`pt-command-*` styles are now dead.
- **Open:** the `?book=1` Assign-PT-plan form page still needs a layout pass (oversized head icon, long single-flow form) — tracked as a backlog task.

---

## 🔒 Latest Milestone — Security Hardening, Legal/Compliance & DSAR (2026-06-05)

### Security posture
- **Firestore RLS hardening** (`firestore.rules`): fixed a cross-tenant leak where root `/exerciseRequests` was readable/creatable by any `signedIn()` user (now `isGymUser(resource.data.gymId)`-scoped); added explicit root `match` blocks for `macroLogs`, `activityLogs`, `memberships` (previously relied on implicit default-deny). Closed `DISCREPANCIES` B3 + B4.
- **Storage rules** (`storage.rules`): were `allow read,write: if request.auth != null` — any authed user could read/write any gym's files with no limits. Now gym-scoped via `request.auth.token.gymId`/`role` custom claims: reads = gym users, writes = owner/admin of that gym + content-type + size caps, plus a default-deny catch-all.
- **Security headers**: static headers in `next.config.mjs` (dropped `http:` from `img-src` +`upgrade-insecure-requests`, removed stale Gemini origin, added `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `X-DNS-Prefetch-Control: off`, `X-Permitted-Cross-Domain-Policies: none`, expanded `Permissions-Policy`).
- **Nonce-based CSP (DONE)**: CSP moved to `src/middleware.ts` and now uses a **fresh per-request nonce + `'strict-dynamic'`** for `script-src` in production (no `'unsafe-inline'`/`'unsafe-eval'` in effect). Next.js applies the nonce to every script; the inline theme script in `layout.tsx` reads it via `headers()` (`x-nonce`). Dev keeps the loose CSP (no nonce) for HMR. Verified against a production build: per-request nonce differs across requests, 41 scripts nonced, `strict-dynamic` present, zero CSP violations in-browser.
- **Rules tests** (`scripts/test-firestore-rules.mjs`): fixed two latent harness bugs (type-only `RulesTestEnvironment` import; `makeAuth` `uid` claim) and added 8 root-isolation tests. All 34 pass against the Firestore emulator (needs Java).

### Legal & compliance
- **New public pages**: `/privacy` (GDPR + CCPA/CPRA) and `/terms` (`src/app/privacy|terms/page.tsx`), linked from the landing footer, login modal, enquiry form, About page, and member settings.
- **Consent**: a blocking **first-login gate** (`TermsConsentGate`, rendered by the root layout) requires every user to accept Terms + Privacy (incl. fitness-data processing) — accept → `acceptTerms` (records `termsAcceptedAt` + cookie), decline → logout. (Replaced the earlier login-modal checkbox.)
- **DSAR** (`src/lib/firebase/actions/privacy.ts`): members can **export all their data as JSON** (`exportMyData`) and **request account deletion** (`requestAccountDeletion`, which notifies the gym owner) from the member Settings → "Privacy & your data" section.
- **`/about` is now public** (removed from `middleware.ts` `protectedRoutes` + matcher) — it was auth-gated and unreachable to visitors. Content now credits collaboration with [Blume Labs](https://blumelabs.in); landing footer carries the same credit.

### Still open (needs input / larger effort)
- Fill the **legal-entity name + address** placeholder in `/privacy` and `/terms` before production.
- Sign a **DPA** with gyms (FitSplit is their processor) + rely on Google's DPA.
- Consider storing **consent once per user** rather than gating every login.

---

## 🚀 Latest Milestone — Full Workflow Audit, Bug Fixes & UI Revamp (2026-05-30)

### Summary

Comprehensive audit and fix pass across the entire app. Every user-facing workflow was checked for broken actions, missing auth, dead data, and UX gaps.

### Critical Bug Fixes

**Owner gym settings now save correctly**
- `updateGymDetails` and `updateGymLogo` both required `admin` role only. Owners calling the server action fallback (when the Cloud Function is unavailable) got "Not authorized". Both actions now accept `["admin", "owner"]` with a guard that owners can only update their own gym.

**Member PIN change now verifies current PIN**
- `changeMemberPin` updated the password without checking the current PIN. Fixed: now calls Firebase Auth REST (`signInWithPassword`) to verify the current PIN server-side before any update is allowed.

**PT member counts on Trainers page always showed zero**
- The `isPT` field on member documents is never written by any action. The Trainers page now derives PT member counts from live PT plan data (`getAllPTSessionsForGym` — scheduled + active sessions only). Per-trainer PT load also uses real session counts.

**Member login fixed for demo accounts**
- Demo logins (e.g. "aarav", "mehulchirania") with Firebase Admin configured would match Firebase Auth successfully, but `createSession` couldn't find an `authProfiles` doc for the fake demo UIDs (e.g. "member-aarav"). This returned "Your FitSplit profile is inactive or missing" instead of falling back to the local demo session. Fixed: the demo path now only accepts a Firebase session result if it actually succeeds; otherwise falls through to `createLocalDemoSession`.

**Member dashboard blank on real accounts**
- `getMemberWithProfile` returned `member: null` for subcollection member documents that lack a `role` field (which is all real gym members — the role lives on `authProfiles`, not the member doc). Fixed: only reject documents with a `role` field explicitly set to a non-member value.

### UI / UX Fixes

**Owner topbar flash eliminated**
- `AppTopbar` and `MainNav` both return `null` immediately for `/owner/*` paths at the component level. The previous CSS-only `:has(.odp2-workspace) .topbar { display: none }` approach caused a brief flash because the browser renders the topbar HTML before encountering `.odp2-workspace` deeper in the DOM.

**`<details>` panels now auto-open on anchor click**
- New `components/open-details-button.tsx` client component replaces bare `<a href="#id">` links on the Programs and Trainers pages. A plain anchor scroll does NOT open a collapsed `<details>` element — the component calls `el.open = true` before the scroll proceeds.

**Admin inbox: removed permanently-disabled Compose button**
- A `<button disabled>+ Compose</button>` with no backing feature was visible on every inbox visit. Removed.

**`.pt-page` base CSS class added**
- `10-pt-training.css` defined `.pt-page--booking` but not the base `.pt-page`. Added.

### Loading States

Added `loading.tsx` (FitnessLoader) to all routes that were missing it:
- `app/owner/billing/`, `app/owner/packages/`, `app/owner/trainers/`
- All `app/member/(pages)/*` sub-routes: coach, exercises, membership, programs, pt-history, settings

### Owner & Admin UI Revamp (2026-05-29–30)

All owner pages migrated from old `list-panel` / `panel-title` patterns to the `adm-card` / `adm-kpis` design system:
- **Reports**: 4-column KPI bar, `adm-card` sections, all hardcoded `--color-*` vars replaced with design tokens
- **Training**: booking form and session list use `adm-card`
- **Trainers**: full rewrite — KPI row, trainer roster with live PT counts, unassigned PT members, `AddStaffForm`
- **Members page**: removed double `odp2-scroll` wrapper causing compound padding; `mhv-root` now self-scrolls
- **Exercise catalog**: added "Preview" column with `CatalogVideoPreview` for YouTube + gym video preview
- **Admin programs**: embedded `WorkoutProgramGallery` inline (old links to non-existent `/owner/programs/[id]` removed)
- **Admin staff**: `StaffAccessActions` fully rewritten — inline edit form (name, phone, role), reset password, delete with confirmation; `updateStaffProfile` server action added

### Member Sub-Pages Shell

New route group `app/member/(pages)/` with shared `layout.tsx` rendering `MemberSubSidebar` (sidebar with gym branding, nav links, logout). All member sub-pages (coach, exercises, membership, programs, pt-history, settings) now have a consistent sidebar navigation instead of top-nav.

### CSS Fix Highlight

Member shell height chain (`body → .app-shell → .m3d-root → .m3d-main → .m3d-content`) was broken because `body:has(.m3d-root) main { ... }` targeted `<main>` but the app uses `<div class="app-shell">`. Fixed by targeting `.app-shell` directly.

---

## 🚀 Previous Milestone — E2E User Flow Redesign (2026-05-29)

Based on the Claude Design E2E User Flow bundle (`Eq-9dY9qmQavHnVHeWlVVw`), all roles were redesigned with consistent UI patterns. Implementation is staged across 7 phases.

### Design Decisions (from chat transcripts)
- **Member dashboard**: Workout-first (today's session is the hero, not coach note). Coach note moves to a dedicated Coach tab. Mobile-first with bottom tab bar.
- **Co-branding**: FitSplit logo × gym logo lockup in sidebar/topbar for gym-scoped roles (owner, trainer, member). Admin sees FitSplit only.
- **Button foreground**: Brand (`--brand`) fill buttons use **dark text** (`var(--brand-fg)`) — NOT white. High contrast white-on-green is explicitly avoided.
- **Owner dashboard**: Tabbed workspace (Today/People/Money/Operations/Insights). Priority cards (Renewals / Plans Pending / Payments) replace Revenue + In-Gym cards on Today tab.
- **Members page**: D4 Hybrid — Action queue + KPI strip + refined table.
- **Admin = Owner+**: Admin can access and edit everything the owner can.
- **Settings**: Members get a `/member/settings` page (units kg/lbs, cm/ft; membership link; notifications; account/PIN).
- **Exercise videos**: `videoUrl` / `gymVideoUrl` shown as chip buttons on all exercise rows.
- **Consistent shell**: All desktop roles share sidebar (brand lockup top, profile + logout bottom-left). Mobile member uses top bar + bottom tab bar.

### Phase Plan

| Phase | Scope | Status |
|---|---|---|
| **1** | Admin parity — add `"admin"` to all owner-only `requireRole` guards | ✅ Done |
| **2** | Button foreground fix — `--brand-fg` dark token; audit all brand-fill buttons | ✅ Done |
| **3** | Member Settings page — `/member/settings` (units, membership, notifications, account) | ✅ Done |
| **4** | Member Coach page — `/member/coach` (trainer conversation, coach note detail) | ✅ Done |
| **5** | Member shell improvements — Co-brand lockup, Coach/Settings as links, avatar dropdown (Settings/Membership/Coach/Logout) | ✅ Done |
| **6** | Programs & Exercise page enhancements — filter chips, current-program highlight, video buttons on FocusedDayView | ✅ Done |
| **7** | Owner/Admin polish — activity rows clickable with action links, type icons, 8 items, proper empty state | ✅ Done |

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

## 🎨 Design System Standards

The complete Design System (tokens, CSS architecture, prefixes, layouts) has been moved to **[`docs/12_UI_STYLE_GUIDE.md`](docs/12_UI_STYLE_GUIDE.md)**. Please refer to that document for all styling guidelines.

---

## ✅ Already Done — Don't Re-do

### TypeScript Strict Mode
`strict: true` is already enabled in `tsconfig.json`. There are only 12 actual `any` usages across `lib/` — fix those in `lib/ai.ts` (15 min job) and move on. Do **not** add `noUncheckedIndexedAccess` — it would break hundreds of array accesses throughout the codebase for no meaningful safety gain at this stage.

---

## 📊 Known Issues & Backlog

All identified bugs, tech debt, and incomplete features have been centralized into **[`docs/11_KNOWN_ISSUES_AND_GAPS.md`](docs/11_KNOWN_ISSUES_AND_GAPS.md)**.

Please refer to that document for:
- High priority bugs (Trainer role login failures, PT collections privacy leaks).
- Architecture tech debt (Dual-write consolidation, Cloud Function vs Server Action duplication).
- Incomplete functionalities (Stripe/billing integration, exercise catalog normalization).

**Done (as of May 27, 2026):**
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
