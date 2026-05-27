# FitSplit — Project Handoff & Improvement Roadmap

Verified analysis against the live codebase (May 2026). Items are ordered by execution priority, not theoretical impact.

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
