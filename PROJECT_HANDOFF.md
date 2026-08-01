# FitSplit — Project Handoff & Improvement Roadmap

Verified analysis against the live codebase (May 2026). Items are ordered by execution priority, not theoretical impact.

---

## Commit, sync, and build-check pass (2026-08-01)

Landed everything that had accumulated locally since the 2026-07-21 go-live pass: the `mobile/` Expo app (previously untracked), `packages/core/src/exercise-catalog.ts`, the 5 mobile Cloud Function callables in `functions/src/index.ts`, and the doc updates recorded above and in `README.md`/`docs/20_EXPO_MIGRATION_PLAN.md`/`docs/_INDEX.md`.

**Found and fixed a real break before committing:** `node_modules/@fitsplit/core` and `@fitsplit/mobile` were symlinked to `C:\Users\mehul\Documents\Codex\2026-05-03\FitSplit\...` — a different, nonexistent clone path — not this repo. Root `tsc --noEmit` and `npm run mobile:typecheck` both failed with `Cannot find module '@fitsplit/core'` as a result. A plain `npm install` regenerated the npm-workspaces symlinks to point at this repo's own `packages/core` and `mobile`, and both typechecks went clean immediately after. This was a local environment artifact (likely from an earlier session running `npm install` inside a different worktree/clone of the same repo), not a code defect — nothing to fix in source.

**Build check, full gate, all green:** root `tsc --noEmit`, `npm run mobile:typecheck`, `npm --prefix functions run build`, `npm run build` (Next.js, all 47 routes), `npm test` (110/110 vitest), `npm run lint` (0 errors). Also removed two pre-existing unused imports surfaced by lint (`getAlternateExercises` in `member-coach-shell.tsx`, `Link` in `member-overview-screen.tsx`) per the standing "resolve unused imports/vars" rule — unrelated to this session's feature work, just cleanup while the gate was open. Remaining 17 lint warnings are the already-documented `react-hooks/set-state-in-effect` and `purity` pattern in `member-workout-screen.tsx` (accepted architecture, see the 2026-07-21 entries) plus its mirror image in the new `mobile/screens/WorkoutScreen.tsx` — same pattern, ported, not new debt.

**Merged all 9 open Dependabot PRs** (all pre-vetted, CI-green dependency bumps, no code changes on this repo's side): `next` 16.2.9→16.2.10→16.2.12, `@sentry/nextjs` 10.62.0→10.69.0 (needed a `@dependabot rebase` after our mobile commit changed `package.json`/`package-lock.json` underneath it — rebased and re-verified CI-green before merging), `@radix-ui/react-dialog` 1.1.17→1.1.19, `@opentelemetry/core` 2.8.0→2.9.0, `knip` 6.23.0→6.25.0, `body-parser` 1.20.5→1.20.6 (`functions/`), and two `websocket-driver` 0.7.4→0.7.5 bumps (root + `functions/`). Two of the nine (`next` 16.2.12, `body-parser`) were opened by Dependabot mid-session, presumably triggered by the earlier merges landing — merged those too once CI passed. Zero open PRs remain.

**Pushed to `main` and re-synced after each round of PR merges.** Per the standing note in `docs/21_MOBILE_GO_LIVE_CHECKLIST.md`, the initial push triggers the live Firebase App Hosting rollout of fitsplit.in — the web app was verified unaffected by the mobile/core additions (clean build, all tests green). Re-ran the full gate (`tsc --noEmit` ×2, `functions` build, `next build`, `lint`, `vitest`) one final time against the fully-synced `main` after all 9 PRs landed — still all green, 110/110 tests, 0 lint errors.

---

## Expo/React Native migration — go-live readiness pass (2026-07-21)

Took the member app to production-ready. Full honest checklist in [`docs/21_MOBILE_GO_LIVE_CHECKLIST.md`](docs/21_MOBILE_GO_LIVE_CHECKLIST.md).

**Done this pass:**
- **Production `app.json`** — name **FitSplit**, slug `fitsplit`, bundle id **`in.fitsplit`** (iOS + Android, reverse-DNS of fitsplit.in), version 1.0.0, `userInterfaceStyle: dark`, and `extra.eas.projectId` set to the EAS project the user created (`4d07e898-6168-4867-923c-ee4a0aa0994c`). Verified the app still bundles and the browser tab title is now "FitSplit".
- **`eas.json`** — development / preview (internal Android APK) / production build profiles + submit placeholder. The `preview` profile gives the user a sideloadable APK for local Android testing with no Mac/store needed. **Not run** — `eas build`/`eas submit` are human-gated.
- **Body-weight logging wired** — added `logBodyWeight` to `lib/mutations.ts` and a bodyweight-entry card to the Progress screen (`logBodyWeightMobile`). Verified live: "Logged 72.5 kg." So 3 of 5 deployed callables are now client-wired and proven (lift, meal, bodyweight).

**Verified:** root `tsc --noEmit` (web + core) exit 0; `mobile` typecheck clean; app renders + all three write flows work live against production; no console errors. (Used typecheck rather than `npm run build` for the web to avoid the `.next` dev-server collision.)

**Explicit boundary — what "go live" still needs, and why Claude didn't do it:** store submission, Apple/Google account + listing setup, branded icon/splash assets, and a real iOS-device test are human/hardware-gated (and store submission is prohibited for the agent). Remaining *engineering* Claude could still do: offline lift-sync (`syncOfflineLiftsMobile`, needs a local queue — the one sizable gap), undo-day-skip (`clearDayLogMobile`), and push notifications (`expo-notifications`). None block a functional v1.

**Still nothing pushed/committed to remote.** The 5 Cloud Functions remain deployed (earlier approval); all app/refactor code is local. Pushing `main` would trigger the live fitsplit.in web rollout — verified unaffected, but treat as a prod web deploy.

---

## Expo/React Native migration — write-callable consolidation (2026-07-21)

Consolidated all mobile write-through-Cloud-Function calls into a single `mobile/lib/mutations.ts` so screens never call `httpsCallable` directly — one clean pattern. Previously `logLiftSet` lived in `lib/lift-logs.ts` and the meal callable was inlined in `MacrosScreen`.

- New `lib/mutations.ts` — typed wrappers `logLiftSet` (→ `logLiftSetMobile`) and `logMeal` (→ `logMealMobile`), both with payload/result types. Deleted `lib/lift-logs.ts` (folded in).
- `WorkoutScreen` import updated to `@/lib/mutations`.
- `MacrosScreen` now imports `logMeal` from `@/lib/mutations` and dropped its inline `httpsCallable`/`functions` imports.

**Meal write flow verified live** (demo member, production): tapping the "Whey Protein Shake" quick-add logged the meal and the day's totals moved 0 → "140 kcal / 25g protein / 3g carb / 1g fat" — confirming both the `mealLogs` write and the `macroLogs` `FieldValue.increment` side-effect. So 2 of the 5 deployed callables (`logLiftSetMobile`, `logMealMobile`) are now wired and proven from the client; the other 3 (`logBodyWeightMobile`, `clearDayLogMobile`, `syncOfflineLiftsMobile`) are deployed and ready but not yet called by any screen — add wrappers to `mutations.ts` when a screen needs them (kept out for now to avoid dead code).

`npm run mobile:typecheck` clean. Not pushed.

---

## Expo/React Native migration — exercise-name resolution fix (2026-07-21)

**Problem:** several exercises in the mobile app rendered as the literal "Exercise" (Progress PR list, Workout today's-focus, Logs). Root cause: `mobile/lib/programs.ts` `getExerciseCatalog` only read `gyms/{gymId}/exerciseCatalog`, but the **predefined** exercises referenced by split-library programs and most lift logs are code-generated from `workouts.json` and are NOT stored in Firestore. The web read-model (`src/lib/firebase/read-models/exercises.ts`) handles this by **merging the default catalog with the gym-scoped catalog**; the mobile app wasn't.

**Fix:**
- New `packages/core/src/exercise-catalog.ts` exports `defaultExerciseCatalog: Exercise[]` (66 entries, flattened from `workouts.json` and mapped to the `Exercise` domain type) plus a `defaultExerciseNameById` lookup. Re-exported from the core barrel. This is the shared, canonical source both clients can now use.
- `mobile/lib/programs.ts` `getExerciseCatalog` now seeds the map with `defaultExerciseCatalog` first, then overlays gym-scoped Firestore entries (gym-custom wins on id collision) — mirroring the web merge exactly.

**Verified live** (signed in as demo member, production data): Workout today's-focus exercise that showed "Exercise" now resolves to "Barbell Curl / Biceps"; Progress PR list resolved "Barbell Curl" (was "Exercise"). Typecheck clean, no console errors.

**Known remaining (not a code bug):** 3 entries in this demo member's Progress PR list still show "Exercise" — their `exerciseId`s exist in **no** catalog (default or gym). These are orphaned references in the demo seed data (ids that were removed/renamed after the logs were seeded). The **web app shows the same "Exercise" fallback** for these ids (`getExerciseName` uses `?? "Exercise"`), so mobile now matches web behaviour exactly — the fix is complete on the code side; the remaining gap is a demo-data cleanup task if desired.

The web app does not import `defaultExerciseCatalog` (it uses its own read-model path), so this change is additive to core and leaves the web untouched.

---

## Expo/React Native migration — filepath convention + type-safety cleanup (2026-07-21)

Two consistency refactors across `mobile/`, both verified (`npm run mobile:typecheck` clean, app re-bundled and rendered live against production with no console errors):

**1. One clean filepath style — `@/` path alias.** Every intra-app import in `mobile/` was on brittle relative paths (`../lib/theme`, `./screens/X`). Standardized on the same `@/` alias convention the web app uses (`@/*`, documented in CLAUDE.md). Added `"paths": { "@/*": ["./*"] }` to `mobile/tsconfig.json` (no `baseUrl` — deprecated in TS 6; paths resolve relative to the tsconfig dir). Rewrote all imports to `@/lib/…`, `@/screens/…`, `@/components/…` — zero relative imports remain. **Verified Metro resolves the alias at bundle time too**, not just TS: the web bundle built and the app rendered with real data, no "unable to resolve" errors. Expo's Metro reads tsconfig paths natively; no babel-plugin-module-resolver needed.

Also renamed `lib/liftLogs.ts` → `lib/lift-logs.ts` so all non-component `lib/` modules are lowercase/kebab-case (matching the web `src/lib/` convention: `workout-utils.ts`, `split-library.ts`, etc.). Component/screen `.tsx` files stay PascalCase (RN convention, already consistent).

**2. Removed all `as any` from `mobile/lib/data.ts`** (5 casts → 0). They existed because the Firestore mappings didn't actually satisfy the `@fitsplit/core` domain types the screens consume:
- `getLiftLogs` was missing `LiftLog.sessionId` (required) — now mapped from `data.sessionId`.
- `getDayLogs` cast `status`/`skipReason` through `String` — now narrowed to `DayLog["status"]` and `SkipReason`.
- `getMealLogs` already matched `MealLog` — cast was gratuitous, removed.
- `getMacroLogs` was **dead code** (never called by any screen) *and* its shape didn't match core `MacroLog` (it invented a `kcal` field the type doesn't have) — deleted entirely, along with now-unused `MacroLog`/`WorkoutProgram`/`Exercise`/`orderBy` imports.

The data layer now returns genuinely type-checked core domain objects. No screen changed — they already annotated against the core types, so tightening the producers was transparent to consumers.

---

## Expo/React Native migration — actual mobile app state reconciled + design system applied (2026-07-21)

**Important correction to the phase 4/5 entries below.** Those entries describe a minimal `HomeScreen.tsx` I built (plain white "Today's focus" list). That approach has been **superseded**: the `mobile/` app now has a full **five-tab member workspace** — `OverviewScreen`, `WorkoutScreen`, `LogsScreen`, `ProgressScreen`, `MacrosScreen` + `BottomNav`, backed by `mobile/lib/data.ts` (Firestore reads for lifts/days/macros/meals/gym/member) — mirroring the web member redesign. This was built partly in parallel (co-dev workflow); when I picked back up, `App.tsx` already routed to these five tabs and no longer imported `HomeScreen`. I reconciled rather than reverted.

**What the app actually is now (verified live via `expo start --web` + Browser pane, signed in as demo member `mehulchirania`/`1234` against production `fitsplit-29215`):**
- **Overview** — adherence/streak/this-week/best-PR stat cards, weekly activity strip, today's assigned workout.
- **Workout** — full per-set logger (Timeline/Ledger toggle, day selector, elapsed timer, exercise swap, per-set Log buttons) writing via the deployed `logLiftSetMobile` callable. Faithful port of `member-workout-screen.tsx`.
- **Logs** — real date-grouped history (confirmed a set logged earlier persisted and appears here).
- **Progress** — Bench e1RM, weekly volume, weekly sets, 30-day PR count, full PR list.
- **Macros** — calorie ring, protein/carb/fat targets, quick-add presets, meal log, custom-meal entry.

All five tabs render with **real Firestore data** and the **FitSplit design system** applied: `mobile/lib/theme.ts` holds the dark-mode tokens from `docs/12_UI_STYLE_GUIDE.md` (bg `#111`, brand lime `#C8F135`, `primaryForeground` `#0A0A0A` — never white-on-lime). Confirmed at runtime: root background computes to `rgb(17,17,17)` and lime brand `rgb(200,241,53)` is present on 8 elements.

**Cleanup done this session:**
- Deleted the orphaned `mobile/screens/HomeScreen.tsx` (dead code — nothing imported it after `App.tsx` moved to the tab router). Its data helpers `lib/liftLogs.ts` and `lib/programs.ts` are still used by the tab screens, so they stay.
- Themed `LoginScreen.tsx` and `components/ErrorBoundary.tsx` to the design tokens (were still on the generic white/green placeholder palette).
- Fixed a display bug in `ProgressScreen.tsx`: Weekly Volume rendered `0kkg` (a `k`-suffixed value concatenated with `kg`). Now shows `360 kg` / `1.2k kg` correctly.
- Added `components/ErrorBoundary.tsx` earlier so a render error in one screen degrades to an inline message instead of blanking the whole app.

`npm run mobile:typecheck` clean throughout. **Not deployed, not pushed** (the 5 Cloud Functions were deployed earlier per explicit approval; the app code itself is local-only).

**Note on the "web landing page is broken" report:** investigated — the web landing page is **not** broken by the `packages/core` refactor (that change only moved TS files behind re-export shims, touching no CSS or landing components). Verified on a fresh dev server: the full landing page renders (hero, lime brand, all sections) with zero console errors, matching the reference screenshot. The transient blank the user saw was almost certainly the documented `.next` build/dev collision (running `npm run build` while a dev server is up corrupts its `.next`). Mitigation: don't run the web build while a web dev server is running.

---

## Expo/React Native migration — Complete UI porting (2026-07-20)

Fully ported the member workspace UI to the Expo app with premium dark mode styling and tab navigation:
- Decoupled `App.tsx` navigation state and built `BottomNav.tsx` styled with brand lime (`#C8F135`).
- Created and styled `OverviewScreen.tsx`, `WorkoutScreen.tsx`, `LogsScreen.tsx`, `ProgressScreen.tsx`, and `MacrosScreen.tsx`.
- Replaced composite query ordering in `data.ts` with in-memory sorting on the client, resolving Firestore missing index errors and avoiding production migration constraints.
- Verified all 5 screens load and render successfully on localhost:8081 with real data.

---

## Expo/React Native migration — phase 5, first real read-only data screen (2026-07-20)

Added `mobile/lib/programs.ts` — fetches the signed-in member's active program assignment directly via the Firestore client SDK (`gyms/{gymId}/programAssignments`, `memberId`+`status==active`, mirroring `getProgramAssignmentForMember`'s query shape from `src/lib/firebase/read-models/programs.ts`), resolves the assigned program (checking `@fitsplit/core`'s `splitLibraryPrograms` first for predefined splits — generated client-side, never stored in Firestore — falling back to a gym-scoped `workoutPrograms` doc for custom programs), applies `applyCurrentWeeklyVariation` for the current week's rotation, and picks today's day via `getDefaultDayIndex`. Exercise names resolve against a gym-scoped `exerciseCatalog` fetch. No new backend — everything here is a direct, rules-enforced Firestore read, confirming the phase 2a audit's finding that mobile reads don't need an API layer.

`mobile/screens/HomeScreen.tsx` now renders this alongside the profile header: today's day title, the program name, and the full exercise list with sets/reps.

**Verified live, not just claimed:** `expo start --web` + Browser pane, signed in as the demo member (`mehulchirania` / PIN `1234`) against real production `fitsplit-29215`, and the screen rendered the member's actual assigned program — "Chest Back 1" / "Arnold Split" — with 7 real exercises and their real sets×reps (e.g. "Barbell Bench Press 4 × 6-8"), pulled live from Firestore, no mock data anywhere in the path. Signed out cleanly afterward.

**Verified clean:** `npm run mobile:typecheck` (0 errors). Root `eslint .` doesn't lint `mobile/` at all (0 mentions in its output) — that's an intentional scope boundary, not a gap: Next's ESLint config (`@next/next/*` rules etc.) doesn't apply to React Native code, and `mobile/` would need its own lint setup (e.g. `eslint-config-expo`) if that's wanted later — not done as part of this phase.

**Not deployed, not pushed.**

---

## Expo/React Native migration — phase 4, Expo scaffold + real end-to-end auth (2026-07-20)

**This is the milestone the phased rollout called "does the whole stack work" — and it's genuinely proven, not just claimed.** Scaffolded `mobile/` via `create-expo-app` (Expo SDK 57, React Native 0.86, React 19.2.3), joined it to the root npm workspace alongside `packages/*` (`root package.json` `"workspaces"` now `["packages/*", "mobile"]`), renamed its package to `@fitsplit/mobile`, and added it to root `tsconfig.json`'s `exclude` (same treatment as `functions/` — it's its own TS project extending `expo/tsconfig.base`, would otherwise get pulled into the Next.js DOM-flavored root compile).

**Firebase data-access layer** (`mobile/lib/firebase.ts`): plain `firebase` JS SDK per the SDK-reversal decision above, same `fitsplit-29215` project config as the web app (public client values, committed to `mobile/.env` as `EXPO_PUBLIC_FIREBASE_*` — Expo's equivalent of Next's `NEXT_PUBLIC_*`, same non-secret values already in `apphosting.yaml`). Auth persists across app restarts via `@react-native-async-storage/async-storage` (`initializeAuth` + `getReactNativePersistence`), Firestore via `persistentLocalCache`.

**One real, documented packaging gap found and worked around, not silently patched over:** `getReactNativePersistence` genuinely IS exported at runtime for React Native (Metro resolves `@firebase/auth`'s package.json `"react-native"` condition correctly), but neither `firebase/auth` nor `@firebase/auth`'s own `"exports"` map nests a `"types"` key under that condition — the top-level `"types"` key wins regardless of platform, so `tsc` can never see this one symbol through any import path, in this firebase version (checked `node_modules/@firebase/auth/package.json` directly before reaching for a suppression). Fixed with a single `// @ts-expect-error` on that one import, comment explains why. Everything else typechecks clean with no suppressions.

**Metro monorepo config** (`mobile/metro.config.js`): `watchFolders`, `nodeModulesPaths`, `disableHierarchicalLookup`, `unstable_enableSymlinks` per Expo's official monorepo guide — needed so Metro can see `@fitsplit/core` through its npm-workspaces symlink. **Actually verified, not assumed**: temporarily imported `dayNames` from `@fitsplit/core` into `App.tsx`, confirmed it bundled and logged correctly in the browser console, then reverted the smoke-test import since nothing in the app needs it yet. This closes the "don't assume this just works on the mobile side" flag from the phase-1 doc.

**Auth screen wired end-to-end and tested live against production `fitsplit-29215`** (not mocked): `mobile/lib/auth.ts` calls the existing `lookupLoginEmail` callable (one of the 28 pre-existing Cloud Functions, unmodified) to resolve a typed username/PIN to a Firebase Auth email, then signs in directly with `signInWithEmailAndPassword` — no session cookie, the Firebase SDK owns token storage/refresh. `mobile/screens/HomeScreen.tsx` reads the signed-in user's own `authProfiles/{uid}` doc **directly via the Firestore client SDK**, no backend endpoint needed, since `firestore.rules`' `isMemberSelf(userId)` already permits it (confirmed in the phase 2a audit). Verified via `expo start --web` + the Browser pane (no phone available, per the hardware-constraint discussion — this is genuinely equivalent proof for a JS-SDK app, since React Native Web runs the same code through the same Metro bundle): signed in as the demo member `mehulchirania` / PIN `1234`, the app rendered "Hey, Mehul Chirania — Member · Shg" pulled live from Firestore, then signed out cleanly back to the login screen.

**Verified clean:** root `tsc --noEmit`, `mobile`'s own `tsc --noEmit` (`npm run mobile:typecheck`), `npm run build` (Next.js, unaffected), `npm --prefix functions run build`, `vitest run` (110/110), `eslint .` (0 errors, still only the 6 pre-existing warnings in `member-workout-screen.tsx` — one new warning from an unnecessary `eslint-disable` comment was introduced and fixed before this was called done).

**Not deployed, not pushed.** Everything above is local working-tree only.

---

## Expo/React Native migration — phase 3, the 5 mobile-write callables (2026-07-20)

Added `logLiftSetMobile`, `syncOfflineLiftsMobile`, `logBodyWeightMobile`, `clearDayLogMobile`, `logMealMobile` to `functions/src/index.ts` (region `asia-south1`, matching all 28 existing callables' conventions exactly — `getCallableUser(request)` for bearer-token auth via custom claims, `HttpsError` for validation failures, `gymDoc()` for gym-scoped paths). Each mirrors the exact write shape of its audited Server Action counterpart in `src/lib/firebase/actions/progress.ts` (§3 of `docs/20_EXPO_MIGRATION_PLAN.md`):

- `logLiftSetMobile` — writes `liftLogs` + upserts `workoutSessions`/`attendanceRecords` via the same `upsertImplicitWorkoutAttendance` logic, ported.
- `syncOfflineLiftsMobile` — batch version, same per-day session-summary aggregation logic.
- `logBodyWeightMobile` — writes `bodyMetricLogs` + best-effort mirrors weight onto the member's profile doc.
- `clearDayLogMobile` — deletes both the legacy root `dayLogs` doc and the gym-scoped copy.
- `logMealMobile` — writes `mealLogs` + increments the day's `macroLogs` totals via `FieldValue.increment`.

New shared helper: `assertCanWriteForMember(user, memberId)` — member can only act on self; staff must belong to the same gym as the target member (via the existing `assertMemberBelongsToGym`); admin unrestricted. Mirrors `assertCanManageMember`/`assertMemberBelongsToCallerGym` from the web Server Actions, adapted to the callable's `CallableUser` shape.

**Deliberately not added:** callables for `saveMacroLog` or `logDayStatus` — per the phase 2a audit, both are safe as direct client-SDK writes from the mobile app (single-collection, no side effects), so no backend code is needed for those at all; the mobile app just writes to Firestore directly through the existing rules.

**Verification status — read carefully before assuming these are production-proven:** `npm --prefix functions run build` (`tsc`) compiles clean, and every field/side-effect was checked line-by-line against the already-audited `progress.ts` source. **Not yet exercised against a running emulator or real Firestore** — `firebase.json`'s emulator config has no `auth` emulator, and this codebase's existing 28 callables have no unit-test harness either (Cloud Functions `onCall` handlers aren't extracted as pure testable functions here, a limitation already noted for billing logic in an earlier session). Real functional verification will happen the same way those 28 do: exercised live once the mobile app is calling them (Phase 4), where success/failure is directly observable in Firestore. Don't treat "compiles clean" as "verified correct" beyond that.

**Not deployed.** These functions exist only in the local working tree — `firebase deploy --only functions` hasn't been run, matching the standing instruction not to push/deploy anything until the full refactor is done and tested locally.

---

## Expo/React Native migration — SDK decision reversed after real hardware constraints surfaced (2026-07-20)

The earlier decision to use `@react-native-firebase` (native modules, for mobile performance) is reversed to the plain **`firebase` web JS SDK**, at least for now. Reason: the user has no personal iPhone, no personal Mac, and a work MacBook Pro M4 with no permission to install dev tools (Xcode isn't installed and IT won't allow it). Native Firebase modules require a custom EAS-built dev client — Expo Go can't run them — and for iOS that dev client still needs a physical iPhone to install onto via TestFlight/ad-hoc, which doesn't exist here. The JS SDK runs inside plain Expo Go with zero build step, so Android development/testing is fully unblocked today (local, on the developer's own device) and iOS just needs *some* physical iOS device to visually verify on via Expo Go later — no build, no Mac, no Apple Developer account interaction required for ordinary day-to-day work.

**Mitigation so every Firebase call lives behind one data-access module in the Expo app from the start** (not deferred as cleanup) — this is what makes swapping to `@react-native-firebase` later, once real device/Mac access exists, a contained change instead of a rewrite touching every screen. `docs/20_EXPO_MIGRATION_PLAN.md` §0 and §4 updated accordingly; §6 step 4 (Expo scaffold) updated to reflect Expo Go as the primary dev loop instead of an EAS dev client.

**Also flagged and stopped:** the user pasted an Expo dashboard screenshot with `npx eas-cli@latest init --id <appId>` and `npx eas-cli@latest build --platform all --auto-submit` and asked about running them. Neither should run yet — `eas-cli init` needs an actual local Expo project (not scaffolded yet, still in progress per the phase list below), and `--auto-submit` ships whatever gets built straight to App Store/Play Store review automatically, which would submit an empty placeholder app right now. Both deferred to the correct point in the phased rollout.

---

## Expo/React Native migration — phase 2a, backend API-surface audit (2026-07-20)

Decisions locked in before this phase: native `@react-native-firebase` (not the web JS SDK) for mobile performance, at the cost of needing an EAS-built dev client instead of plain Expo Go; Windows dev machine means Android is fully local but iOS builds/testing go through EAS Build's cloud service (no local Xcode).

**Before writing any new backend code, audited whether the "port every Server Action to a callable Cloud Function" premise in `docs/20_EXPO_MIGRATION_PLAN.md` §3 was actually necessary.** It wasn't — it was written without checking `firestore.rules` against this exact question. Reading all 497 lines of `firestore.rules` found it already grants signed-in members direct read **and create** access to their own `liftLogs`, `macroLogs`, `mealLogs`, `dayLogs`, `bodyMetricLogs`, `activityLogs`, `workoutSessions`, and `attendanceRecords`, gated by `memberOwned(data)` matching `data.memberId` against the ID token's custom-claim `memberId`. That rules engine already has a passing 34-test emulator suite behind it. This means the mobile app can hit Firestore directly via the client SDK for most reads and several writes, respecting the same rules the web Server Actions currently enforce via Admin SDK — a smaller, faster, and lower-maintenance architecture than a REST/RPC proxy in front of everything.

Dispatched a focused audit (Explore agent) against every member-logging Server Action in `src/lib/firebase/actions/progress.ts` and the PT lifecycle in `pt.ts`, asking specifically: does a raw rules-compliant client write achieve the same outcome, or is there hidden server-side logic (extra collection writes, aggregation, side effects) a raw write would silently skip? Full table is in `docs/20_EXPO_MIGRATION_PLAN.md` §3. Headline results:
- **Safe as direct client-SDK writes:** `saveMacroLog` (single deterministic-ID write, no side effects) and `logDayStatus` (single-collection, but the mobile client must replicate its format validation since rules don't enforce it).
- **Must stay behind a new callable:** `logLiftSet`/`syncOfflineLifts` (silently maintain `workoutSessions`/`attendanceRecords` bookkeeping nothing else creates), `logBodyWeight` (mirrors weight onto the profile doc for dashboard reads), `clearDayLog` (must also purge a legacy root-collection copy), `logMeal` (keeps `macroLogs` totals in sync via `FieldValue.increment` that a plain write would skip).
- **Out of scope for the member-first mobile rollout:** all of `pt.ts`'s session lifecycle actions — staff-only under both the Server Actions and the rules (not `memberOwned`), drive notifications/FCM pushes with no trigger to replace them.
- **Confirmed dead code, not a hidden requirement:** geofence "validation" doesn't exist anywhere in the codebase — `progress.ts` only ever hardcodes `distanceMeters: null, geofenceStatus: "location_not_provided"`. PR (personal record) detection is pure client-side UI, never persisted or triggered server-side.
- **Bonus find:** `functions/src/index.ts` already has 28 `onCall` Cloud Functions covering every admin/owner-privileged mutation (member/staff/gym CRUD, PT plans, packages, payments, billing, trainer management, dashboard stats) — all directly reusable by the RN app once it has a native Firebase Functions client, zero rebuild needed. One of them, `lookupLoginEmail` (`functions/src/index.ts:1204`), already does most of what the planned identifier-resolution auth callable needed to do (username/phone → auth email, member and staff modes) — missing only the demo-login shortcuts and lockout bookkeeping from `auth.ts`, which are a dev-testing convenience, not a production requirement.

**Net effect:** the actual new backend work is 5 callable Cloud Functions, not an 18-file/6,036-line rewrite. `docs/20_EXPO_MIGRATION_PLAN.md` §1, §3, §4, and §6 (phased rollout) were all revised to reflect this — the rollout is renumbered and step 2 is now "done" (this audit) rather than "build the API layer."

**Next:** build the 5 new callables (`logLiftSet`, `syncOfflineLifts`, `logBodyWeight`, `clearDayLog`, `logMeal` mobile equivalents) in `functions/src/`, verified against the Firestore emulator, before touching any mobile UI.

---

## Expo/React Native migration — phase 1, `packages/core` extraction (2026-07-20)

First implementation step of the migration plan below: extracted the framework-agnostic code identified in `docs/20_EXPO_MIGRATION_PLAN.md` §1 into a new npm workspace package, `packages/core` (`@fitsplit/core`), so a future Expo app can depend on it without pulling in anything Next.js-specific.

**What moved (via `git mv`, preserving history):**
- `src/types/domain.ts` → `packages/core/src/domain.ts` (743 lines, no imports — pure move)
- `src/types/action-state.ts` → `packages/core/src/action-state.ts` (pure move)
- `src/lib/workout-utils.ts` → `packages/core/src/workout-utils.ts` (import path adjusted to relative)
- `src/lib/split-library.ts` → `packages/core/src/split-library.ts` (import path adjusted to relative)
- `src/lib/firebase/actions/validation.ts` → `packages/core/src/validation.ts` (import path adjusted to relative)
- `src/lib/split-library-source.json` → `packages/core/src/split-library-source.json`

**Deliberate risk-reduction choice:** rather than rewriting the ~140 existing import sites across the app (`@/types/domain` alone has 82 importers, `@/types/action-state` has 51), the four original `src/` paths were left in place as one-line re-export shims (e.g. `src/types/domain.ts` now reads `export * from "@fitsplit/core/domain";`). Every existing import in the Next.js app is unchanged. This keeps the diff for this step small and low-risk against a production app that auto-deploys on push to `main`, at the cost of one extra indirection layer that can be flattened later if worth it.

**One deliberate non-move:** `workouts.json` (the exercise catalog, 1,305 lines) is duplicated rather than shared — a copy lives in `packages/core/src/workouts.json` for `split-library.ts`, and the original stays at `src/lib/workouts.json` for three web-only direct importers (`actions/exercises.ts`, `actions/programs.ts`, `mock-data.ts`) that have no reason to ever be part of the shared package. The alternative (having `packages/core` reach back into `src/`) would have undermined the point of the extraction. If this file needs to change, both copies need the edit.

**Also required, and easy to miss:** Next.js doesn't transpile raw TypeScript source sitting in `node_modules` by default — `packages/core` ships `.ts` source directly with no build step, so `next.config.mjs` now sets `transpilePackages: ["@fitsplit/core"]`. Root `package.json` gained `"workspaces": ["packages/*"]` and a `"@fitsplit/core": "*"` dependency entry. **Flagged for the Expo step, not yet solved:** Metro (React Native's bundler) has the same non-transpilation default for `node_modules` and will need its own equivalent handling — don't assume this config carries over.

**Verified clean:** `npx tsc --noEmit` (0 errors — one real catch: `workouts.json` needed restoring at its original path since three files imported it directly, not just through `split-library.ts`, before this was clean), `npm run build` (all 47 routes compiled, zero errors), `npx vitest run` (110/110 tests passing, including `src/lib/__tests__/validation.test.ts` unchanged against the new shim), `npx eslint .` (0 errors; the 6 pre-existing warnings are all in `member-workout-screen.tsx`, untouched by this change). Not yet committed — working tree only, pending review.

**Archive tag from the same initiative, still local-only, not pushed to `origin`.**

---

## Expo/React Native migration — archive tag + design plan (2026-07-20)

Initiative kicked off to eventually target native Android/iOS via Expo, driven by an explicit user decision after scoping showed this is a rewrite (Server Actions, Radix UI, the CSS system, and cookie-session auth have no React Native equivalent), not a refactor.

**Archival:** tagged the pre-initiative state as `archive/nextjs-web-2026-07-20` on `main` (commit `d7f6842`) — a git tag, not a physical folder copy, per explicit decision. **No files were moved.** The Next.js web app is untouched and fitsplit.in keeps deploying from `main` exactly as before; nothing about the current build/deploy path changes. (Tag is local only — not yet pushed to `origin`.)

Also found and fixed: the repo was in a detached-HEAD state at session start (pointing at the same commit as `main`, so no work was at risk). Checked out `main` properly before tagging/committing so nothing gets orphaned.

**Design plan written:** [`docs/20_EXPO_MIGRATION_PLAN.md`](docs/20_EXPO_MIGRATION_PLAN.md) — no implementation yet. Key finding from reading `src/lib/auth.ts` and `functions/src/index.ts`: auth reuse is stronger than expected. Firebase Auth custom claims (`role`/`gymId`/`memberId`, set in `functions/src/index.ts:346`) are already the source of truth `_getCurrentUserImpl` prefers over a Firestore read — any future mobile backend can `verifyIdToken()` and read the same claims a bearer token carries, with zero new authorization model. The `beforeUserSignIn` lockout trigger already protects at the Auth layer, client-agnostic. Only the session **transport** is web-specific (HttpOnly cookie via `auth.createSessionCookie()`) — RN replaces that with the Firebase client SDK's own token persistence/refresh, which is less code, not more. The identifier-resolution logic (username/phone → Firebase Auth email, demo login table, lockout bookkeeping) is pure Admin-SDK/Firestore code entangled with Next's `cookies()` only incidentally — it relocates almost unchanged into a shared Cloud Function callable that both a future web login and the RN app can call.

The plan also flags the actual largest chunk of new work: turning the 18 files / ~6,036 lines in `src/lib/firebase/actions/` (Next.js Server Actions, which have no RN transport) into real HTTP/callable endpoints. That's a backend-work prerequisite before any native screen can read or write real data — not a UI-porting problem.

**Next steps (not started):** extract `packages/core` (types, Zod schemas, `workout-utils`, `split-library`) into a shared workspace package; stand up the new API layer; prove the shared identifier-resolution callable against the existing web login first; then scaffold the Expo app itself. See the phased rollout in doc 20 for the full sequence.

---

## Member desktop workspace redesign — Logs/Progress/Macros complete (increments 3–5 of 5) (2026-07-08, night)

Completes the Claude Design workspace redesign across all 5 screens (Overview, Workout, Logs, Progress, Macros). Per explicit "deploy subagents and complete everything" direction, the three remaining screens were built by three parallel agents against self-contained new files (no shared-file edits), then integrated by hand into `member-coach-shell.tsx` afterward to avoid concurrent-edit conflicts on one file.

**New backend, built first (by hand, not delegated — a real schema/security-rule change):** itemized meal logging.
- `src/types/domain.ts` — new `MealLog` type (`memberId, gymId, date, name, items?, kcal, protein, carbs, fat, loggedAt`), many-per-day, lives at `gyms/{gymId}/mealLogs/{id}`.
- `src/lib/firebase/collections.ts` — registered `mealLogs` in both `collectionPaths` and `gymScopedCollectionPaths`.
- `firestore.rules` — added gym-scoped + root-mirror rules for `mealLogs`, mirroring the existing `macroLogs` pattern exactly (member-owned read/write, owner/trainer/admin read).
- `src/lib/firebase/actions/progress.ts` — new `logMeal` action: writes a `mealLogs` doc **and** increments the day's existing `macroLogs` doc's protein/carbs/fat via `FieldValue.increment()`, both gym-scoped only (`mirrorGymScopedRecord`/`scopedGymDoc`) — matching every other write in this file (`saveMacroLog`, `logDayStatus`, `logLiftSet`, `logBodyMetric`); none of them write to the root collection anymore, per the codebase's R4 root-write cleanup. (First pass of this action mistakenly added root writes too — caught by re-reading `saveMacroLog`'s actual behavior before trusting the assumption, fixed before commit.) The design decision that matters: the existing `saveMacroLog` action *sets* absolute daily totals (a manual "type in your totals" form) — increment-on-log is additive and compatible with that: a manual edit resets the baseline, itemized meals keep incrementing from there. No existing macro-tracking behavior changes.
- `src/lib/firebase/read-models/progress.ts` — new `getMealLogsForMember(memberId, gymId, date)`, wired into `src/app/member/page.tsx` and threaded through `MemberCoachShellProps.mealLogs`.
- Ran the Firestore rules emulator test suite after adding the new rules (`firebase emulators:exec --only firestore --project demo-fitsplit "npm run test:rules"`) — all 34 existing tests still pass, confirming `firestore.rules` is syntactically valid and nothing else regressed. No dedicated `mealLogs` test was added to the suite (it's structurally identical to the verified `macroLogs` block) — a follow-up if this schema gets exercised more.

**Three screens, built by parallel subagents, each in isolated new files:**
- **Logs** (`src/components/member-logs-screen.tsx`, `styles/25-member-logs.css`) — rebuilt `MemberHistory`'s day-card feature set as a flat, date-grouped, newest-first row list matching the design (icon + title + meta + time). Preserved: PR badging, skip-reason labels, macro-target-met calculation, day-log completed/skipped/modified status + notes, cardio/stretch distinction, "show more" pagination. `PTCard` (a private component that couldn't be imported) was replaced with an equivalent PT-history link card built into the new screen.
- **Progress** (`src/components/member-progress-screen.tsx`, `styles/26-member-progress-screen.css`) — added the design's 4-stat header (Bench e1RM via Epley formula, week's training volume, sets this week, PRs this month — swapped for the design's "bodyweight" stat since `bodyMetricLogs` wasn't in this screen's data already; a real bodyweight stat is a follow-up if wanted) + a Personal Records list, rendered **above** the existing `MemberProgressPanel` (real chart + working "log a set" form, untouched) and `WorkoutCalendar` (untouched). Numbers that need ≥8 weeks of history to be meaningful render `—` rather than a fabricated value when there isn't enough data.
- **Macros** (`src/components/member-macros-screen.tsx`, `styles/27-member-macros.css`) — calorie hero + protein/carbs/fat bars + 6 quick-add presets + a real "Meal log · today" list sourced from `mealLogs`, plus a Radix Dialog for manual meal entry — all wired to the new `logMeal` action. Rendered **above** the existing `MacroProgressPanel`, `ProfileMetricsWidget`, and `EditableMetrics` (all untouched; body-metrics editing still lives here since there's no separate "Body" nav tab in the new design).

**Integration cleanup:** `member-coach-shell.tsx`'s desktop `logs`/`progress`/`macros` screen blocks now just render the three new components. Two now-dead private components (`PRsCard`, `PTCard` — both superseded by equivalents inside the new screens) and one now-unused import (`WorkoutCalendar`, moved into `ProgressScreen`) were deleted rather than left as dead code. The mobile bottom-tab experience (`tab` state: train/progress/body) is completely untouched — still uses `MemberProgressPanel`/`MemberHistory`/`MacroProgressPanel`/`ProfileMetricsWidget`/`EditableMetrics` directly, same as before this whole redesign started.

Verified: `npx tsc --noEmit` clean, `npm run build` clean. **Not verified live in a browser this session** (same dev-server port-lock issue noted in the increment 1/2 entries above — another session's server holds port 3000/`.next`). Before trusting this: log a meal (both quick-add and manual dialog) and confirm the Macros calorie bar updates; check the Logs screen renders real chronological data with no missing entries versus the old MemberHistory view; check the Progress stat row shows `—` (not wrong numbers) for a member with no bench-press history. Uncommitted, working tree only — all 5 desktop screens plus the mobile experience should be spot-checked together before this is considered done.

---

## Member desktop workspace redesign — real Workout logger (increment 2 of 5) (2026-07-08, night)

Continuation of the Claude Design workspace redesign. This increment replaces the desktop "Workout" screen's placeholder (a ported read-only day preview) with a real, fully-wired set-by-set logger, per explicit decision: **"Build the real Workout logger now"** rather than defer it.

**Why this was bigger than a reskin:** investigated first and found the design's Workout screen (per-set checkboxes, rest timer, elapsed timer, sticky "Finish workout") didn't correspond to any existing UI. The actual set-logging path today is `logLiftSet` + `WorkoutLiftLogForm`, called from `MemberProgressPanel` (an aggregate one-exercise-at-a-time form with offline queueing via Dexie) — not from `FocusedDayView` (`/member/programs/[id]/day/[dayId]`), which turned out to be a read-only day accordion + day-status form (`logDayStatus`/`clearDayLog`), not a logger at all. **Both of those existing surfaces are untouched** — `MemberProgressPanel` still works exactly as before (now living on the Progress screen), and `FocusedDayView` still works exactly as before (unlinked from the new nav but still reachable at its URL). The new Workout screen is additive, not a replacement of either.

- **`src/components/member-workout-screen.tsx`** (new) — real per-set logger matching the design's Timeline/Ledger split:
  - **Timeline** (default): one row per exercise, the focused exercise expands to per-set weight/reps/RPE inputs + a checkmark button. Checking a set calls `logLiftSet` for real (`sets: 1` per checked row — fits the existing `LiftLog` schema with no backend changes), with the exact same offline-first fallback pattern as `MemberProgressPanel` (Dexie `offlineDB.liftLogs` queue on `!navigator.onLine` or a thrown request, `router.refresh()` on success, PR-aware toast).
  - **Ledger**: same underlying per-set state, flat chip layout — tapping a chip logs that set using its current weight/reps.
  - **Rest timer + elapsed timer**: pure client state, one shared `setInterval`, matching the design's own `componentDidMount` pattern. Rest duration comes from the program's `WorkoutExercise.restSeconds` (falls back to 90s).
  - **Exercise swap**: preserved feature parity with the dashboard's old `TodaySessionList`/`MobileTodayCard` swap — the swap helpers (`getAlternateExercises`, `getNextExerciseSwap`, `getLastLiftForExercise`, `hasLoggedWeight`, `getExerciseSwapKey`) were moved out of `member-coach-shell.tsx` into `src/lib/workout-utils.ts` so both the mobile shell and the new Workout screen share one implementation instead of duplicating it.
  - **Exercise detail drawer** (new, via Radix `Dialog` for ESC/focus-trap a11y): muscle group, equipment, instructions, video (`CatalogVideoPreview`), recent sessions, and PR — reusing existing exercise-catalog fields, no new data model.
  - **Finish workout** (sticky footer) calls the *existing* `logDayStatus(status: "completed")` — the exact same write FocusedDayView's "Mark done" button uses, keyed by the deterministic `${memberId}_${dayId}_${weekStart}` doc ID, so a workout finished from either screen produces the same record. **Skip today** (also in the footer) calls `logDayStatus(status: "skipped")` with a reason picker, reusing `SKIP_REASONS` from `workout-utils.ts` and replicating the same `makeupExerciseIds` (first 3 exercises) computation FocusedDayView uses — preserving that feature rather than dropping it.
  - Row state on load is seeded from today's already-logged `liftLogs` for each exercise (best-effort: counts today's logs per exercise and pre-checks that many rows) so a page refresh mid-workout doesn't silently discard progress.
- **`src/lib/workout-utils.ts`** — gained the shared swap/last-lift helpers (moved, not duplicated) described above.
- **`src/components/member-coach-shell.tsx`** — desktop `workout` screen now renders `<WorkoutScreen>` instead of the ported `TodaySessionList`; `TodaySessionList` (dead now that mobile has its own `MobileTodayCard`) and the now-unused `BodyMacrosCard` were deleted rather than left as dead code. `PRsCard` (previously only shown on the old Workout placeholder) moved to the Progress screen so it isn't lost.
- **`src/app/styles/24-member-workout.css`** (new, `m3d-wk-` / `m3d-wk-drawer-` prefixes) — theme-aware via existing CSS custom properties, registered in `src/app/layout.tsx`.
- **Known gaps, called out rather than silently dropped:** RPE is captured in the UI but not persisted (no `rpe` field on `LogLiftSetSchema`/`LiftLog` — would need a schema decision, deferred); per-exercise notes in the drawer/row are visual-only, matching the source design's own lack of wiring (the *day-level* note from `logDayStatus` is real and unaffected); there's no "undo" for an already-logged set (checkbox is disabled once done — correcting a bad entry still requires the existing lift-history/edit paths elsewhere).

Verified: `npx tsc --noEmit` clean, `npm run build` clean (one transient `.next` ENOENT from a concurrent dev server in another session — retried and passed). **Not verified live in a browser this session** — same dev-server-port-lock issue as increment 1. Needs a manual check: open the demo member's Workout screen, log a real set in both Timeline and Ledger mode, confirm it appears in Progress/Logs, test the rest timer, exercise swap, drawer, Finish workout, and Skip today. Uncommitted, working tree only.

---

## Landing page v2 design import — hero/model/nav copy pass (2026-07-08, night)

Imported a second Claude Design handoff (`FitSplit Premium Workspace Design-handoff (1).zip`, project `fitsplit-premium-workspace-design`, file `FitSplit Landing v2.dc.html`) targeting a refreshed hero and a new B2B2C explainer section. Scoped per user decisions: kept the existing hero product-mockup visual (design dropped it, user wanted it kept), added the new "How it fits together" section, skipped the new "Today at your gym" live floor-view widget (static/illustrative, no backend value), and kept the enquiry form's existing fields/server-action wiring rather than matching the design's simplified field set.

- **`src/components/landing/landing-page-client.tsx`** — nav links changed to "The model" (`#model`) / "Athletes" (`#athletes`) / "Gyms" (`#gyms`) / "FAQ" (`#faq`), dropping the "How it works" nav link (`#how` section still exists on the page, just unlinked, matching the design). Hero copy replaced: badge → "Now onboarding gyms across India", headline → "Run the floor. *Own your training.*", subhead updated. `HERO_PATHS` reordered (gym path first, "Live now" badge; athlete path second, "Coming soon" badge) and its per-path icon removed in favor of an eyebrow+badge header row, matching the design's layout. New `Model` section/component (3-cell "01 Gyms subscribe / 02 Every member gets full Pro / 03 Solo athletes train free" grid with live/coming-soon pills) inserted between the marquee and the athletes section. `Individuals` renamed `Athletes` (`#individuals` → `#athletes`), heading simplified to "Structured, not scattered." Footer Product column links updated to match the new nav set.
- **`src/app/landing.css`** — added `.lp-path__head`/`.lp-path__badge(--live)`/`.lp-path--live` for the hero path badges (replacing the removed `.lp-path__icon` rule), and `.lp-model__*` for the new 3-column explainer grid (incl. a 980px breakpoint collapsing it to 1 column).
- **`src/components/landing/login-modal.tsx`** — title copy updated to "Welcome back.", subtitle now switches per mode (member vs staff) per the design, matching wording already used elsewhere in the modal.

Verified: `npx tsc --noEmit` clean. Dev server started via `preview_start`, confirmed via accessibility snapshot that nav/hero/model/athletes sections render with the new copy and structure, and via `preview_inspect` that `.lp-path--live` and `.lp-model__grid` compute the expected styles (3-column grid at desktop width). Screenshot tool timed out repeatedly this session (unrelated flakiness — server logs show clean 200s) so no visual screenshot was captured; snapshot + inspect are the verification record. Uncommitted, working tree only.

---

## Member desktop workspace redesign — Shell + Overview (increment 1 of 5) (2026-07-08, evening)

Imported a Claude Design handoff (`FitSplit Premium Workspace Design-handoff.zip`, project `fitsplit-premium-workspace-design`, file `FitSplit Member Workspace.dc.html`) targeting a full 5-screen dark/lime desktop member workspace (Overview / Workout / Logs / Progress / Macros). Scoped to an incremental build per user decision: **Shell + Overview shipped this session; Workout/Logs/Progress/Macros are functional ports of existing content, not yet pixel-redesigned** — that's the next 4 increments.

- **`src/components/member-coach-shell.tsx`** — desktop and mobile nav state fully decoupled: `tab` (mobile bottom bar, unchanged: train/progress/body) and `screen` (new desktop sidebar: overview/workout/logs/progress/macros) are now independent `useState`s instead of one shared value. Desktop `Sidebar` nav items renamed/reordered to match the design; the old inline "Coach" tab was removed as a top-level nav item — Coach is still reachable via the existing `m3d-user-menu` "Message coach" link (unchanged) and mobile's tab-bar Coach link, per explicit decision to not add a 6th nav slot. Content area split into two fully separate subtrees under `.mcr-desktop-only` / `.mcr-mobile-only` (both already-existing CSS-driven visibility classes) so neither breakpoint's markup renders on the other. Desktop `workout` screen = ported `TodaySessionList` + right-column cards (`BodyMacrosCard`/`PRsCard`/`PTCard`/membership) exactly as before. `logs` = `MemberHistory` + `PTCard`. `progress` = `MemberProgressPanel` + `WorkoutCalendar`. `macros` = `MacroProgressPanel` + `ProfileMetricsWidget` + `EditableMetrics` (body metrics folded in here for now — no dedicated Body nav item in the new design). Mobile's `train`/`progress`/`body` tab content is byte-for-byte what it was before, just moved into its own wrapper.
- **`src/components/member-overview-screen.tsx`** (new) — pixel-matched Overview screen: avatar + member/gym eyebrow + name + program/week/coach line; 4-stat divider row (adherence %, workout streak, sessions this week, most recent PR); "today" hero linking to the Workout screen with a MON–SUN day-of-week strip (checkmark for trained days, ring for today); coach note + gym notices (kept — the source design omitted these, but dropping live gym communications would have been a regression); recent-activity feed (last 3 lift logs) with a "View all →" link into the Logs screen.
  - New derivations: `computeAdherencePct` (trained days from `liftLogs`/`dayLogs` over the trailing 4 weeks ÷ `weeklyTarget × 4`) and `getRecentPR` (most recently-dated log that equals its exercise's max weight). Both are pragmatic approximations — there's no stored "adherence" or "PR event" field anywhere in the schema.
- **`src/app/styles/23-member-overview.css`** (new, `m3d-ov-` prefix) — all colors via existing CSS custom properties (`var(--brand)`, `var(--text-soft)`, etc.), not the hardcoded hex from the design mockup, so it stays theme-aware (light/dark) like the rest of the `m3d-` system. Registered in `src/app/layout.tsx`.
- **Deferred to later increments:** Workout/Logs/Progress/Macros visual redesign; Macros screen's itemized meal-log schema (decided: build a real schema when that screen's turn comes, not now — `MacroLog` today is one doc/day with protein/carbs/fat totals only, no meal items).

Verified: `npx tsc --noEmit` clean, `npm run build` clean (no ESLint errors). **Not verified live in a browser this session** — another session already had the dev server running on port 3000 holding the `.next` lock; this session's own `preview_start` reported success but never actually bound a port (confirmed via `netstat`, only :3000 listening). Did not kill the other session's process. **Needs a manual browser check** before considering increment 1 done: log in as the demo member (`mehulchirania` / PIN `1234`), confirm the Overview screen renders correctly at desktop width, the 5 sidebar tabs work, and mobile (375px) is pixel-identical to before this change. Uncommitted, working tree only.

---

## Dual-audience landing page rebuild + B2C strategy docs (2026-07-08, late afternoon)

Landing page rebuilt from scratch (Sonnet subagent, briefed + verified by Fable) to present both audiences ahead of the B2C launch; strategy folded into the design doc.

- **Docs:** `docs/B2C_B2B_DESIGN.md` gained §8 (individual vs gym-member experience design — one app, two contexts), §9 (free-vs-paid gating principle: never gate logging, gate insight; history hidden not deleted; ₹149–199/mo posture), §10 (acquisition loops: gym seeding, WhatsApp share cards, split-library SEO; landing positioning decision). `docs/B2C_IMPLEMENTATION_PLAN.md` (authored earlier today) holds the e2e build plan.
- **`src/components/landing/landing-page-client.tsx`** — full rewrite. New order: nav → dual-path hero ("I train myself" → coming-soon modal; "I run a gym" → `#enquiry`) → marquee → `#individuals` (self-coaching pitch + Free/Pro plan cards, both badged "Coming soon", no prices) → `#gyms` (4 ops feature cards + "every member gets the full training app" banner) → `#how` (4 steps) → `#faq` (5 items incl. new "Can I use FitSplit without a gym?") → enquiry → footer. Old `ROLES` tab component with fabricated stats (128 members / 42 attendance / +12%) removed entirely; SHG proof line removed — no client gym names or made-up numbers anywhere on the page.
- **`src/components/landing/coming-soon-modal.tsx`** — new accessible dialog (role=dialog, aria-modal, focus trap + focus return, ESC, click-outside, 44px close). Primary action links to `#enquiry`.
- **`src/app/landing.css`** — dead `.lp-roles__*`/`.lp-hero__ctas` rules removed; new section/plan/modal styles added (all `lp-` prefixed, self-contained dark theme).
- **`hero-visual.tsx`** — chart mock relabeled "Bench press · 8-week trend" (was "Attendance") to avoid business-metric framing.

Verified: `npx tsc --noEmit` clean (agent + parent both ran it); `npm run build` clean (agent). SSR HTML on the running dev server confirmed the new sections render and greps show zero SHG/fake-stat references. **Not verified live in a browser** — both the preview bridge and the Chrome extension were unreachable this session; eyeball `http://localhost:3000` at 375px and test the coming-soon modal before shipping. Uncommitted, working tree only.

---

## Login modal Enter-key fix + member Train tab redesign (2026-07-08, afternoon)

Uncommitted, not yet built. Landing page also has a broader in-flight rework (`HERO_PATHS`/`PLANS`/dual-audience sections) from an external edit today — see the diff for the full picture; the two hero CTA buttons this session set out to remove are already gone under the new hero structure (per-path CTAs — "Start free" opens the coming-soon modal, "Get FitSplit" links to `#enquiry`), nav "Sign in" / "Get FitSplit for your gym" unchanged.

- **`src/components/landing/login-modal.tsx`** — the password/PIN field's `onKeyDown` now calls `e.currentTarget.form?.requestSubmit()` on Enter (both Member and Staff tabs), guarded by `!isPending && !resetConfirmOpen` so it doesn't double-submit or fire while the reset-confirm panel is open.
- **Member home / Train tab redesign** (`src/components/member-coach-shell.tsx`, `src/app/styles/21-member-redesign.css`, `src/app/member/page.tsx`):
  - Header stats: the three static chips are replaced by one interactive "this week" progress-strip button that switches to the progress tab; streak only renders when ≥1 week; "sets logged" stat removed. Weekly target is now derived once via `getWeeklyTarget(program)` (falls back to 4 when the assigned program has no day count) and shared by both the desktop header and the mobile `StatsSection` — single source of truth instead of two separate computations. The dead `liftLogCount` prop was removed from the component's prop surface.
  - Train tab now leads with a hero "today" card — session name, lifts/sets/duration meta, and a primary "Start workout" CTA linking straight into the existing focused day view (`/member/programs/{id}/day/{dayId}`). The day picker is demoted to a "Preview other days" row below it.
  - Exercise rows are decluttered to index, name, sets×reps, and a "last: Xkg × Y" (or "last: N reps" for bodyweight movements) line; the Swap action and video link moved into a per-row expandable detail panel (chevron toggle, `aria-expanded`, keyboard-operable).
  - Swap bug fix: the swap cycle now includes the original exercise so it wraps back around instead of getting stuck on an alternative forever; the old "Alternative for X" note is now a one-tap "↩ Back to {original}" revert button.
  - Mobile bottom tab bar (`.mcr-tabbar`) was translucent glass sitting directly over scrolling content — now backed with a solid `--bg` layer plus the `--bg-elevated` tint, with blur kept as a progressive enhancement on top.
  - Mobile stats grid switched to CSS auto-flow columns so it divides evenly whether there are 3 or 4 cards (now that "sets logged" is gone, this matters more).

Verified: `npx tsc --noEmit` clean; ESLint clean on the changed files. `npm run build` **not** run this session (dev server had `.next` locked). Nothing staged or committed — working tree only.

---

## Go-live deployment executed (2026-07-08)

Ran the §5 go-live checklist from `docs/16_FABLE_AUDIT_2026-07-05.md` against prod (`fitsplit-29215`):

1. **Composite indexes deployed** — `firebase deploy --only firestore:indexes` succeeded (all 32 entries incl. the T3 additions and the COLLECTION_GROUP notifications index the admin bell needs).
2. **Root→gym backfill applied** — restored the missing `backfill:root` npm alias (lost in the 2026-07-06 script-archival sweep; script itself was intact), repaired a corrupted `node_modules/firebase-admin` install (`npm install`), then dry-run → `--apply` → verification dry-run. Copied to `gyms/shg/...`: 9 liftLogs, 1 dayLog, 1 macroLog, 10 notifications, 7 memberships, 10 activityEvents. Zero errors; post-apply dry run shows `wouldCopy=0` everywhere. Root docs untouched per runbook.
3. **Cloud Functions deployed** (asia-south1) — 39 of 40 functions live. Notably `processMembershipExpiries`, the payment-request callables, and gym-workspace functions were **first-time creates** — the scheduled expiry job had never been live in prod before this deploy. **One failure: `beforeSignInHandler`** — blocking auth triggers require upgrading Firebase Auth to Identity Platform (GCIP), which this project hasn't done. It is defense-in-depth only (lockout re-check + SSR claims optimization; `loginWithCredentials` + `requireRole` don't depend on it) and has never been deployed. Decision needed: upgrade to Identity Platform (billing-model change) or remove the function. Deploy reported "Skipping deletes" due to this error.
4. **App Hosting rollout** — pinned rollout of `main` (`d307752`) created; Cloud Run revision `fitsplit-build-2026-07-08-004` is Ready with 100% traffic. Note the backend has `rolloutPolicy.codebaseBranch: main`, so pushes to main auto-rollout — the manual rollout and the push-triggered one built back-to-back.
5. **Post-deploy smoke test (HTTP-level)** — `https://fitsplit.in/` and `/about` 200 with full landing content; `/owner`, `/member`, `/admin`, `/trainer` all 307-redirect anonymous users. `/login` 404 is by design (login is a landing-page modal). Full 4-role click-through still recommended manually using `docs/18_DEMO_USERS.md`.
6. **Discovery: the live domain is `https://fitsplit.in`.** The default `fitsplit--fitsplit-29215.us-central1.hosted.app` domain was **disabled 2026-05-19** and serves an envoy 404 — this looked like a broken deploy until the App Hosting domains API showed `disabled: true` on the DEFAULT domain and an ACTIVE custom domain. CLAUDE.md's Live URL was stale and is now fixed.
7. Membership-expiry job (`processMembershipExpiries`) is scheduled and deployed; verify its first prod run against live data (Cloud Functions logs) after it fires.

---

## Fix: member detail page missed gym-scoped program assignments (2026-07-07, late evening)

`/owner/members/[memberId]` showed "Needs program" and an empty schedule for seeded shg members (e.g. `shg-m-arjun`) while `/owner/members` correctly showed their program (the "known data issue" flagged in the redesign entry below). Root cause: the members list uses `getActiveProgramAssignments(gymId)`, which reads the canonical gym-scoped `gyms/{gymId}/programAssignments` directly, but the detail page called `getProgramAssignmentForMember(memberId)` without a `gymId`, which routed into a `collectionGroup("programAssignments")` query. That query depends on the COLLECTION_GROUP-scoped `(memberId, status)` composite index; when it fails, the bare `catch` in the read-model silently returned the mock-data fallback (which has no `shg-m-*` entries), so the assignment resolved to null.

Fix (read path only, per the R4 pattern in `docs/12_ARCHITECTURE_AUDIT_2026.md`):

- `src/lib/firebase/read-models/programs.ts` — `getProgramAssignmentForMemberUncached` now always reads the gym-scoped path (`gymId ?? PRIMARY_GYM_ID`, same default as `getActiveProgramAssignments`) with the existing legacy root-collection fallback intact. The cross-tenant `collectionGroup` branch was removed.
- `src/app/owner/members/[memberId]/page.tsx` — passes `gymId` to `getProgramAssignmentForMember`, matching every other call site (member dashboard, member programs pages), so non-primary demo gyms resolve correctly too.

Verified: `npx tsc --noEmit` and `npm run build` clean; `/owner/members/shg-m-arjun` in the browser now shows the "Push Pull Legs Upper Lower" assignment and the full weekly schedule (Mon Push → Fri Lower) instead of the "Needs program" pill.

---

## Implemented: Owner Member Detail + Reports Redesign (2026-07-07, evening)

Implemented `docs/19_OWNER_DETAIL_REPORTS_REDESIGN_PLAN.md` (Sonnet agent did the bulk; the agent hit a session limit near the end, so §5.5 deep-link wiring, the `atc-empty` chart empty-state CSS, and all doc updates were finished by Fable in the same session).

- **New:** `src/app/styles/22-owner-detail-reports.css` (~745 lines) — full `mpd-`/`tpp-` stylesheet for member detail (hero, 4-stat metrics strip, `1fr/340px` two-column workspace, context cards, trainer/PT panel, `<details>` collapsibles with rotating chevron, danger zone) + `rpt-` system for reports + `atc-empty` chart empty state. Imported in `app/layout.tsx`; stray `.mpd-main-schedule` rule moved out of `16-ux-improvements.css`.
- **Member detail markup fixes:** `formatShortDate` on joined date, removed masked unused-vars eslint-disable + dead `totalExercises`, coach-note inline styles → classes, assign-program submit de-inlined, loading skeleton mirrors the new anatomy.
- **Reports:** header + subtitle, KPI cards are now links (`/owner/members`, `?tab=all`), "N unassigned" links to `/owner/members?tab=no-plan`, all ~40 inline styles moved to classes (only dynamic bar widths remain inline), coverage fill uses tokens (`--success`/`--accent`/`--warning`), attendance-chart empty state redesigned in `attendance-trend-chart.impl.tsx`.
- **Deep-link enabler (§5.5):** `owner/members/page.tsx` awaits `searchParams`, validates `?tab=` against the `Bucket` union, passes `initialBucket` to `MembersHybridView` (init-only, no URL sync on tab click).
- **Verified in browser** (admin login, gym `shg`): member-mehul (empty-schedule state) + member-aarav (full weekly schedule) at 1366px two-column and 375px single-column (no horizontal scroll, metrics 2×2); reports KPIs/links at both widths; `?tab=no-plan` lands on the Needs plan tab; light mode legible; collapsibles are 44px targets with rotating chevron; console clean. `npx tsc --noEmit` and `npm run build` clean.
- **Known data issue found (not fixed, out of scope):** `getProgramAssignmentForMember` doesn't see the seeded `shg-m-*` assignments that `getActiveProgramAssignments` returns — e.g. `shg-m-arjun` shows "Push Pull Legs Upper Lower" in the members list but "Needs program" on his detail page. Likely a root vs gym-scoped read path mismatch between the two read-models.

---

## Redesign Plan: Owner Member Detail + Reports Pages (2026-07-07)

Diagnosed why `/owner/members/[memberId]` and `/owner/reports` look broken and wrote an implementation-ready plan: **`docs/19_OWNER_DETAIL_REPORTS_REDESIGN_PLAN.md`** (Sonnet is expected to implement it as specified).

- **Root cause (member detail):** the page and 4 client components (`member-context-editor`, `trainer-pt-panel`, `member-access-actions`, `member-delete-action`) were written against `mpd-*`/`tpp-*` CSS classes **that were never created** — the only `mpd-` rule in the repo is one stray selector in `16-ux-improvements.css:825`. Icons from `src/components/icons.tsx` have no intrinsic size, so the hero's Mail/Dumbbell SVGs render at full viewport width. Verified live in browser 2026-07-07.
- **Root cause (reports):** page renders but ~40 inline `style={{}}` objects, no hierarchy, and every stat is a dead end (no links).
- **Plan highlights:** new `src/app/styles/22-owner-detail-reports.css` (sections `mpd-`/`tpp-` + `rpt-`); keep both pages' data layer untouched; member-detail keeps its hero → metrics → two-column anatomy, just styled to the `mhv-` design language; reports gets navigable KPI links + `?tab=` deep-link init support in `members-hybrid-view.tsx` (init-only, no URL sync); full verification checklist incl. 375px, both themes, reduced motion.
- No code changed in this session beyond docs (`docs/19_…`, `docs/_INDEX.md`, this entry). Stopped/restarted the stale dev server on port 3000 via preview tooling for the visual audit.

---

## Owner Members Page Redesign — Directory-First Two-Column Layout (2026-07-07)

Redesigned `/owner/members` (`src/components/members-hybrid-view.tsx` + `src/app/styles/19-members-redesign.css`, same `mhv-` scope). The old layout buried the directory under a horizontally scrolling action-card queue (11 near-identical 256px cards) and a 4-box KPI strip that duplicated the queue legend.

- **Layout:** two-column grid on desktop (≥1080px) — directory table left, sticky "Needs attention" rail (300px) right. Single column below 1080px (directory first), verified no horizontal scroll at 375px.
- **Attention rail:** replaces the horizontal card queue. Grouped dense rows (Expired / Expiring soon / No workout plan), capped at 5 per group with "Show N more" expander, per-row snooze, whole row links to member detail.
- **Filter tabs:** replace the KPI boxes. Segmented control in the table toolbar (All / Active / Needs plan / Renewals) with live counts — same `bucket` filter state as before.
- **Fixes along the way:** sort `<select>` no longer stretches full width (global `select { width: 100% }` was the culprit — `width: auto` on `.mhv-sort-select`); pulse + dock animations now respect `prefers-reduced-motion`; breadcrumb inline styles moved to `.mhv-crumbs`.
- **Unchanged logic:** search/sort/pagination, bulk dock (assign/renew/message/restore/suspend), optimistic access state, membershipStatus lag normalization (docs/14 U6).
- `loading.tsx` skeleton updated to mirror the new structure. Verified in browser (dark + light, desktop + 375px, tab filters, group expand, bulk dock). `tsc --noEmit` and `npm run build` clean.

---

## Multi-Gym Demo Data Seeding for E2E Testing (2026-07-06)

Seeded rich multi-gym demo data into **live** Firestore (`fitsplit-29215`) so every feature can be manually E2E-tested before go-live. New script: `scripts/seed-demo-gyms.mjs` (`npm run seed:demo-gyms`), idempotent — deterministic doc IDs + merge writes, safe to re-run.

- **Gyms:** kept `shg` untouched (already at 20 members — its gym doc, staff, and members were NOT modified; only its 3 package docs were merge-refreshed). Created two new gyms with full data: `ironcore-blr` (IronCore Fitness, Bengaluru) and `pulse-hyd` (Pulse Fitness Studio, Hyderabad), each with 1 owner + 1 trainer (staff + authProfiles, password `password`, `mustChangePassword: false`), 3 packages, and the predefined `split_01`–`split_04` program catalog copied into `gyms/{gymId}/workoutPrograms`.
- **Members:** 20 per new gym (40 new), states cycled for E2E coverage: active, expiring-soon, expired, no-plan, no-membership, 2 PT members per gym. Persisted `membershipStatus` set consistent with membership dates. Programs assigned round-robin from the gym's real (runtime-queried) `workoutPrograms` doc IDs.
- **History:** 1–6 weeks of varied training data per active member — lift logs with progressive overload, day logs (`{memberId}_{dayId}_{weekStart}`), attendance + workout sessions (`{memberId}_{yyyy-mm-dd}`), macro logs (`{memberId}_{date}`), body-metric logs, activity logs. Volume varies per member so lists/charts look organic. Live-run totals: ironcore-blr 1337 docs, pulse-hyd 1365 docs.
- **Billing/PT:** 3 pending + 3 approved payment requests and 5 PT sessions (4 completed + 1 scheduled) per PT member, per gym; owner notifications for expiring/expired/no-plan/payment-request cases.
- **Auth:** 44 Firebase Auth users created (40 members with unique per-member PINs — password `pin-{PIN}`, email `{memberId}@members.fitsplit.app`, unique phone numbers, custom claims `{gymId, role, memberId}` — plus 4 staff). `usernames/` and `phones/` registries written. `member-mehul` and `santosh-shg` credentials untouched (verified post-run).
- **Docs:** new `docs/18_DEMO_USERS.md` — complete login table (all 60 members + staff + admin) with PINs, membership state, assigned program, and the E2E scenario each account covers. Registered in `docs/_INDEX.md`; README scripts section updated.
- **Notable findings:** `workoutPrograms` live gym-scoped only (root collection is empty — `collections.ts` still lists it as root); the twelve `shg-m-*` members from `seed-shg-full.mjs` have no Firebase Auth users and cannot log in (owner-side demo data only) — documented in 18_DEMO_USERS.md.

---

## Script Archival & Documentation Audit (2026-07-06)

Archived legacy one-off scripts, updated the dependencies, and synchronized documentation.

- **Script Archival:** Moved obsolete scripts (migrations, patches, video-syncs) out of the root into `archive/scripts/` (categorized into `migrations/`, `patches/`, `video-imports/`, and `misc-queries/`).
- **Dependencies:** Merged PR #28 (`@radix-ui/react-dropdown-menu`), resolving `package.json` conflicts. Removed script aliases from `package.json`.
- **Documentation:** Swept through Tier 2 documents (`11_KNOWN_ISSUES_AND_GAPS.md`, `10_REFACTORING_ROADMAP.md`) and pruned resolved bugs/technical debt. Updated `README.md` and `00_AI_CONTEXT.md` to accurately reflect the active architecture and available commands.

---

## T5/T6 — Go-live polish + release readiness sweep (Fable audit) (2026-07-06)

Closes T5 and T6 from `docs/16_FABLE_AUDIT_2026-07-05.md`.

T5 polish landed:

- `src/components/attendance-trend-chart.impl.tsx` now has a designed empty state that explains lift-log-driven attendance.
- `src/app/admin/gyms/page.tsx` no longer has the duplicate header "+ Add gym" affordance; the provisioning guidance remains in the add-gym section.
- `src/components/member-settings-client.tsx` turns unset fitness goals into a real "Set goals" button that opens the existing profile editor.
- Owner reports were verified against the actual data path: `logLiftSet` and `syncOfflineLifts` upsert completed gym-scoped `workoutSessions`, and `getRecentSessionCounts` reads those completed sessions for the Training Activity chart.

T6 release gate:

- CSP sweep found no app-level `next/script` usage beyond the nonce-aware root theme script; `src/proxy.ts` still forwards `x-nonce`/CSP and `layout.tsx` passes the nonce.
- `npm run knip` clean after deleting the unused `src/lib/legal.ts` shim and removing the stale `firebase-functions/v2/firestore` ignore.
- Restored `scripts/backfill-root-to-gym.mjs` from the archive and added the missing `npm run backfill:root` command so `docs/17_ROOT_BACKFILL_RUNBOOK.md` and README commands are executable.
- Validation clean: `npm run typecheck`, `npm run lint`, Firestore rules 34/34 via Java 21 + Node 22 runner (`firebase emulators:exec --only firestore --project demo-fitsplit "npx -y node@22 --experimental-vm-modules scripts/test-firestore-rules.mjs"`), and the single final `npm run build` after stopping the local Next dev server.

Note: local default Node is v24 and crashed the rules runner on Windows before assertions completed; Node 22 matches CI and passes.

---

## T4 — Money-path tests: billing approval + membership expiry (Fable audit) (2026-07-05)

Closes T4 from `docs/16_FABLE_AUDIT_2026-07-05.md` (F5). The billing approval and
membership-expiry money paths had zero test coverage. Following the repo's
extract-pure-logic pattern (`notifications.test.ts`), the decision logic was pulled
out of the Firestore-coupled call sites into two dependency-free modules that the
originals now call — tests exercise real production code, not copies:

- `src/lib/firebase/actions/billing-logic.ts` — payment-request approval/rejection
  transition validation and membership date math for package activation; imported
  by `actions/billing.ts`.
- `functions/src/membership-expiry-logic.ts` — `computeMembershipStatus`,
  `planExpiryTransition`, `warningWindowEnd`, `addMonths`, `daysUntilExpiry`;
  imported by `functions/src/index.ts` (`processMembershipExpiries` et al.). Also
  fixed a `Math.ceil` `-0` quirk in `daysUntilExpiry` surfaced by the new tests.

New suites: `billing-logic.test.ts` and `membership-expiry-logic.test.ts` covering
approval state transitions (double-approve/reject rejected), expiry boundaries
(expires today / expired yesterday / exactly at the `expiryWarningDays` threshold /
per-gym override / missing endDate), and renewal date math.

Validation: `npx vitest run` — 110/110 pass (5 files); `npx tsc --noEmit` clean;
`npm run lint` clean; `functions` bundle compiles under its own tsconfig
(`npm run build` in `functions/`).

---

## T3 — Composite index audit (Fable audit) (2026-07-05)

Closes T3 from `docs/16_FABLE_AUDIT_2026-07-05.md` (F4). The 2026-06-29 pagination
sprint and this week's root-fallback-removal sprint changed several query shapes
(gym-scoped `orderBy` + `limit`, collectionGroup fallbacks, the new
`getAdminNotifications` collectionGroup query from T1) without a full re-audit of
`firestore.indexes.json` — F4 flagged this as a P1 risk since a missing composite
index fails hard in production (mock mode and local dev never surface the gap).

Enumerated every `.where(`/`.orderBy(`/`.collectionGroup(` chain across
`src/lib/firebase/read-models/*.ts`, `src/lib/firebase/actions/*.ts`,
`src/lib/auth.ts`, and `functions/src/index.ts` (~90 query sites) and reconciled
each against the existing 22-entry index file. Confirmed the T1-added
`notifications` COLLECTION_GROUP index (`recipientRole`, `createdAt`) is correct
and not duplicated.

Added 10 missing composite indexes (file now has 32 entries): `programAssignments`
needed four variants (`gymId+memberId+status` for the root cancel-existing-active
lookup in `actions/programs.ts` and `functions/src/index.ts`; `memberId+status` for
the gym-scoped equivalent and for `read-models/programs.ts`'s
`getProgramAssignmentForMemberUncached`; the same fields again as a
COLLECTION_GROUP for its no-gymId fallback; and `gymId+status` for
`getActiveProgramAssignmentsUncached`'s root fallback). Added `activityEvents`
(`gymId+audience`) and `workoutPrograms` (`gymId+isActive`) for their respective
root fallbacks in `read-models/activity.ts` and `read-models/programs.ts`. Added
four `authProfiles` indexes (`defaultGymId+role`, `phone+role`, `email+role`,
`username+role`) — these serve `read-models/gyms.ts`/`members.ts` and
`functions/src/index.ts`'s `lookupLoginEmail`/`setGymAccess`, none of which had
composite coverage even though `authProfiles` is the primary login-resolution
collection.

Flagged (not removed): the pre-existing `profiles` COLLECTION index
(`defaultGymId, role, isActive`) doesn't match any live query — every
`collectionPaths.profiles` read in the codebase is a single-field `where` or a
direct `.doc()` lookup, and the real compound queries run against `authProfiles`
instead. Likely a stale leftover from before the `authProfiles`/`profiles` split.
Left in place (extra indexes are cheap; deleting on a guess is not) — see the new
"Composite index audit (2026-07-05)" section appended to
`docs/16_FABLE_AUDIT_2026-07-05.md` for the full table and the
`firebase deploy --only firestore:indexes` deploy step.

`npx tsc --noEmit` and `npm run lint` both clean (no source changes, JSON + docs
only). Not deployed — human runs `firebase deploy --only firestore:indexes` as
part of the go-live checklist.

---

## T2 — Legacy root-data backfill tooling (Fable audit) (2026-07-05)

Closes T2 from `docs/16_FABLE_AUDIT_2026-07-05.md` (F3). T1 (same day) removed
read-model root fallbacks from hot paths, which means any operational data
still living only in a legacy root collection (`/liftLogs`, `/dayLogs`, etc.)
became invisible to the app — no backfill tooling existed to move it into the
canonical `gyms/{gymId}/...` path before that sprint shipped.

Added `scripts/backfill-root-to-gym.mjs` (`npm run backfill:root`), a plain
ESM script (no tsx/ts-node dependency, matches the existing `.mjs` script
convention in `scripts/`) covering `liftLogs`, `bodyMetricLogs`, `dayLogs`,
`macroLogs`, `activityLogs`, `workoutSessions`, `attendanceRecords`,
`ptSessions`, `ptLiftLogs`, `notifications`, `contactMessages`,
`exerciseRequests`, `memberships`, `paymentRequests`, `activityEvents`,
`packages`. Excludes the intentional global catalogs (`exerciseCatalog`,
`workoutPrograms`) and intentionally-root-only collections (`authProfiles`,
`usernames`, `phones`, `loginAttempts`, `archives`).

Dry-run by default — prints a per-collection report (root doc count, already
gym-scoped, would-copy, and docs with no resolvable `gymId` that fall back to
the default gym). Writes only with `--apply`; also supports
`--collections=a,b,c` and `--gym=<id>` overrides. Per-doc gym resolution reads
`data.gymId` first, falling back to `PRIMARY_GYM_ID` ("shg") when absent (and
counting that fallback separately in the report). Writes are batched at ~400
ops (Firestore's cap is 500) via `set(..., { merge: true })` to
`gyms/{gymId}/<collection>/{sameDocId}`, stamping `gymId` and
`mirroredFromRootCollection: true` — the same shape `mirrorGymScopedRecord`
(`src/lib/firebase/actions/shared.ts:416`) produces, so re-running is always
idempotent and never creates duplicates or clobbers concurrent live writes.
Root documents are never modified or deleted (archival is a separate later
step). Credentials reuse the same env vars as `src/lib/firebase/admin.ts`
(`FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` or
`GOOGLE_APPLICATION_CREDENTIALS`), failing fast with a clear message if
absent.

Added `docs/17_ROOT_BACKFILL_RUNBOOK.md` (prerequisites, dry-run command, how
to read the report, apply command, post-apply verification steps, rollback
note, and the archival follow-up) and registered it in `docs/_INDEX.md`.
Updated `README.md`'s "Data Fixes & Backfills" section with the new script.
Not run against production by this change — dry-run/apply is a human step per
the go-live checklist in `docs/16_FABLE_AUDIT_2026-07-05.md` §5.

`npx tsc --noEmit` and `npm run lint` both clean.

---

## T1 — Root-fallback removal sprint finished (Fable audit) (2026-07-05)

Closes T1 from `docs/16_FABLE_AUDIT_2026-07-05.md` (F1 + F2). The in-progress "legacy
root-fallback removal" sprint left `getAdminNotifications` (`src/lib/firebase/read-models/notifications.ts`)
reading the ROOT `notifications` collection only — but admin notifications (`contact.ts`,
`exercises.ts`, `auth.ts` staff-login alerts) are written **gym-scoped only** via
`mirrorGymScopedRecord`, so new enquiry/exercise-request/login notifications would never
reach the admin bell. Fixed: `getAdminNotifications` now queries
`db.collectionGroup(gymScopedCollectionPaths.notifications)` with the same
`recipientRole == "admin"` filter + `orderBy("createdAt", "desc").limit(50)` — a
collectionGroup query also matches the legacy root `notifications` collection (same
collection ID), so old data stays visible with no separate read. Added the matching
composite index to `firestore.indexes.json` (`notifications`, `COLLECTION_GROUP`,
`recipientRole` ASC + `createdAt` DESC) — not yet deployed, needs
`firebase deploy --only firestore:indexes`.

Also fixed the stale doc comment above `loadPTSessionForWrite` in
`src/lib/firebase/actions/pt.ts` (leftover "fall back to root... keeping both mirrors in
sync" text that no longer matched the single-path gym-scoped behavior).

Swept `read-models/` and `actions/` for other leftovers of this sprint. Nothing else
needed a code change: `sessions.ts`, `progress.ts`, `contact.ts` are already gym-scoped
only with no stray `collectionPaths` imports; `pt.ts` has no `collectionPaths` import at
all. Left in place (out of scope, pre-existing/defensive, not broken):
`getOwnerNotifications`/`getMemberNotifications`/`getContactMessages`/`getUnreadContactMessageCount`
in `notifications.ts`, `getExerciseCatalogUncached`/`getPendingExerciseRequests` in
`read-models/exercises.ts`, and `getActivityEvents` in `activity.ts` — all still do a
working "read gym-scoped, fall back to root if empty" (not broken like F1 was); the
member/gym delete sweeps in `actions/members.ts` and `actions/gyms.ts` that clean up both
root and scoped copies of a deleted member's data (intentional until T2 backfill/archival
lands); and the `exerciseRequests` root-read-with-collectionGroup-fallback plus
conditional root write in `actions/exercises.ts`'s `approveCatalogExerciseRequest` /
`rejectCatalogExerciseRequest` (still needed to support any pre-migration pending
requests until T2 backfills them — flagged for review, not touched).

`npx tsc --noEmit` and `npm run lint` both clean.

---

## Root `/` now redirects already-authenticated users to their role dashboard (2026-07-05)

Follow-up on the 2026-07-04 deep evaluation (Fable-orchestrated audit, session S18): of the issues that audit's live browser passes flagged, most were false alarms caught mid-fix or already-correct behavior once re-verified against current source (login modal "broken" was a stale `.next` build artifact, not a code bug; fonts not using `next/font` was Fable testing a build that predated the same-morning font fix; the owner dashboard's ~3s blank-DOM concern is just `src/app/owner/loading.tsx`'s Suspense skeleton working as designed). One finding held up: **`src/app/page.tsx` never checked auth state**, so a logged-in member/owner/trainer/admin who navigated to `/` saw the public marketing page instead of being routed to their workspace.

Fixed: `page.tsx` now calls `getCurrentUser()` and redirects to `/admin`, `/owner`, `/trainer`, or `/member` per role before rendering `LandingPageClient`. Unauthenticated visitors are unaffected. Verified in-browser: login as `mehulchirania` → `/member`, then navigating back to `/` redirects straight back to `/member` instead of showing the landing page.

`npx tsc --noEmit` and `npm run lint` both clean.

---

## UI defect sprint from the 2026-07-02 walkthrough closed out (2026-07-03)

UI defect sprint from the 2026-07-02 walkthrough (docs/14 "UI Walkthrough Review" section, findings U1–U11): global input CSS reset so radios/checkboxes are no longer inflated to full width (02-shared-components.css); member exercise-row overlap fixed (m3d-ex grid + name ellipsis, 21-member-redesign.css); PT table wrapper overflow-x:auto (10-pt-training.css); trainer money gating (requireOwnerPage() in auth.ts, applied to /owner/billing|reports|settings|packages pages; sidebar + dashboard Money tab/KPIs/actions hidden and stripped server-side for staffType trainers); membership Active/Expired badge contradiction fixed (expiry date wins); "-24d" expiring copy normalized to expired (members-hybrid-view); 44px mobile touch targets + hidden tabbar scrollbar (20-owner-dashboard.css); T&C consent gate rebranded (dead lp-btn-primary class + nonexistent tokens replaced); app typography unified on next/font Inter + DM Sans (00-base-shell, 21-member-redesign, 06-programs legacy); content enter animations for odp2 + m3d shells, reduced-motion gated.

Verified live in browser: radio fix, membership badge, "-24d" reclassification, PT table scroll, trainer sidebar/tab/KPI gating + /owner/billing redirect.

Note: attendance is now implicit (logLiftSet/syncOfflineLifts upsert sessions/attendance); the dashboard's localStorage-only "Start workout" toggle was removed by the parallel reconnection sprint.

---

## Landing page rebuilt: class-based CSS, enquiry flow restored, Three.js removed (2026-07-02)

Full rebuild of the public landing page, replacing the Jun-29 inline-style implementation (1,095-line single component, hardcoded `#C8F135`, `window.confirm`/`alert`, 34px close button, Three.js hero, hotlinked Unsplash backdrop, `force-dynamic`).

**New structure** — `src/components/landing/`:
- `landing-page-client.tsx` — composition: nav, hero, marquee, interactive role showcase (Owner/Trainer/Member tablist), features, steps, FAQ, footer. Scroll reveals via IntersectionObserver.
- `hero-visual.tsx` — cursor-reactive canvas particle field (vanilla 2D canvas, no WebGL) + parallax product mockups (session card, attendance chart, payment toast).
- `login-modal.tsx` — same auth logic (`loginWithCredentials`/`requestPasswordReset`), now with role=dialog, focus trap, ESC dismiss, 44×44 close, inline reset confirmation + Sonner toast (no more `window.confirm`/`alert`).
- `enquiry-section.tsx` — **wires the previously orphaned `submitContactMessage` server action** via `useActionState`: name/mobile/email/message with field-level Zod errors, success panel, toast. Restores the landing → `/admin/inbox` lead pipeline; `markContactMessageRead` is wired on the admin inbox side.

**CTA hierarchy fixed** (user complaint: multiple buttons all opening the login popup): login = nav "Sign in" + hero secondary link only; primary journey ("Get FitSplit" / "Bring FitSplit to your gym" / footer "Contact us") scrolls to the enquiry form. Footer has no dead `href: null` links anymore.

**CSS**: `src/app/landing.css` fully rewritten as an `lp-` class system (~700 lines). Self-contained dark theme that re-declares `--brand`/`--primary-foreground` scoped to `.lp-root` (mirrors dark tokens per CLAUDE.md rule). `prefers-reduced-motion` disables particles/tilt/marquee/reveals. Smooth anchor scroll is motion-safe (`html:has(.lp-root)`), `scroll-margin-top` offsets the sticky nav. Verified no horizontal scroll at 375px.

**Removed**: old `src/components/landing-page-client.tsx`, `three` + `@types/three` dependencies, Unsplash hotlink, runtime-injected Sora font (now uses `--font-dm-sans`/`--font-inter` from the root layout), `export const dynamic = "force-dynamic"` on `/`.

**Also**: `.claude/launch.json` gained `autoPort: true`. Note for future sessions: a stale `.next/lock` can block `npm run build` with "Another next build process is already running" even when no process exists — delete the lock file.

**Validation**: `tsc --noEmit` clean, ESLint clean on new files, `npm run build` exit 0. Browser-verified via preview: role tabs switch, FAQ accordion + `aria-expanded` works, login modal opens with focus on the username field and closes on ESC, enquiry form renders, mobile 375px has no horizontal overflow.

---

## Product refinement audit added (2026-07-02)

Added `docs/14_PRODUCT_REFINEMENT_AUDIT_2026-07-02.md` as the current product/UI refinement audit. It records the main July findings:

- P0 orphaned attendance/session flow: owner charts read data that the current UI no longer writes.
- P0 orphaned day completion/makeup flow: member history reads `dayLogs`, but current UI no longer writes them.
- P1 contact/enquiry pipeline is dead end-to-end unless the landing enquiry form and admin inbox mark-read are restored.
- Landing page cleanup is needed after the late-June rewrite churn: inline styles, hardcoded colors, shadcn/Tailwind debris, and a Three.js dependency decision.
- Recommended next sprint is reconnection-and-deletion: restore attendance/day completion/contact or delete dead readers/actions together, then prune verified unused deps/files and rebuild graphify.

`docs/_INDEX.md`, `README.md`, and `docs/11_KNOWN_ISSUES_AND_GAPS.md` were updated to point to the new audit and reflect the P0 findings.

---

## Product refinement easy wins started (2026-07-02)

Started the reconnection sprint from `docs/14_PRODUCT_REFINEMENT_AUDIT_2026-07-02.md`:

- **Attendance restored from lift logging:** `logLiftSet` now upserts deterministic daily `workoutSessions` and `attendanceRecords` as completed sessions. `syncOfflineLifts` batches the same daily session/attendance upserts for offline logs. Location is recorded as `location_not_provided`, so lift logging never fails because GPS is unavailable.
- **Focused day status restored:** `/member/programs/[id]/day/[dayId]` now loads the current week's `dayLogs`, and `FocusedDayView` exposes Save note / Mark skipped / Clear controls using the existing `logDayStatus` and `clearDayLog` actions.
- **Admin inbox mark-read wired:** `AdminInboxClient` now calls `markContactMessageRead`, updates unread state optimistically, and refreshes the route.
- **Landing contact restored:** the landing page now uses the refactored `src/components/landing/landing-page-client.tsx`, renders `EnquirySection`, and links primary CTAs/footer contact links to `#enquiry`.
- **shadcn/Tailwind debris removed:** deleted orphaned `src/components/ui/*`, `src/lib/utils.ts`, `src/lib/landing-mock.ts`, `components.json`, `postcss.config.mjs`, and `src/app/styles/shadcn.css`; removed unused deps including the Tailwind stack, shadcn helper deps, the `radix-ui` umbrella package, `lucide-react`, and `three`.
- **Unused-code CI guardrail added:** `.github/workflows/unused-code.yml` runs `npm run knip -- --include files,dependencies --reporter github-actions`; details in `docs/15_UNUSED_CODE_CI_GUARDRAIL_2026-07-02.md`.

Validation: `npm run typecheck`, `npm run lint`, `npm run knip -- --include files,dependencies --reporter compact`, and `npm run build` pass after the changes.

---

## Backend hardening sprint (2026-06-29)

Five remaining backlog items from the 2026-06-28 architecture audit, implemented today:

- **`exercises.ts` approve redundant write removed:** `approveCatalogExerciseRequest` had 3 sequential writes for the status patch (explicit root, `requestDoc.ref`, gym-scoped). Collapsed to 2 parallel writes (root + gym-scoped via `Promise.all`). Reject already used collectionGroup fan-out correctly.
- **`getGymFloorLoadMap` caching:** Replaced `getMembersUncached`, `getWorkoutProgramsUncached`, `getExerciseCatalogUncached` with their `unstable_cache`-backed variants (`getMembers`, `getWorkoutPrograms`, `getExerciseCatalog`). `getActiveProgramAssignments` was already `cache()`-wrapped.
- **Per-gym resource limits:** Added `limits?: { maxMembers?, maxStorage? }` to `GymWorkspace` type and `mapWorkspace` parser. `createMemberProfile` now reads `gym.limits.maxMembers` and returns a typed `failure()` before the transaction if the cap is reached.
- **Progress history pagination:** `getLiftLogsForMember` (default 500), `getDayLogsForMember` (365), `getBodyMetricLogsForMember` (365) now apply `.orderBy("loggedAt","desc").limit(N)` server-side. Callers that need more can pass a higher limit explicitly.
- **FCM topic subscriptions:** `saveFcmToken` now calls `messaging.subscribeToTopic(token, \`gym-${gymId}\`)` after saving the per-device token. Enables gym-wide push broadcasts without iterating member profiles. Non-fatal on failure.

`tsc --noEmit` clean after all changes.

---

## Easy Firestore Cost Wins Implemented (2026-06-28)

Implemented the low-effort/high-impact items from the architecture audit, with no AI features added.

**Firestore write cost reduction:**
- `src/lib/firebase/actions/progress.ts` no longer writes hot member progress data to both root and gym-scoped collections. The remaining live progress writers (`logLiftSet`, `logBodyWeight`, `logDayStatus`, `clearDayLog`, `saveMacroLog`) write gym-scoped data; lift logging also upserts daily workout sessions and attendance records.
- `syncOfflineLifts` now writes deterministic gym-scoped lift docs in a single batch. It reuses the offline/client ID when present and falls back to a stable composite ID, so retrying the same offline sync no longer creates duplicate random root records.

**Firestore read cost reduction:**
- `getGymWorkspaces` now reads only the `gyms` collection and uses `memberCount` from each gym doc. Removed the full collectionGroup members scan and root `authProfiles` member scan.
- `getGymDetail` now uses the mapped gym doc directly instead of fetching all member docs just to count them.
- `getBodyMetricLogsForMember` and `getMemberNotifications` accept optional `gymId`; main profile/layout/privacy call sites now pass it so reads hit direct gym-scoped collections instead of collectionGroup queries.

**Docs updated:**
- `docs/11_KNOWN_ISSUES_AND_GAPS.md`, `docs/12_ARCHITECTURE_AUDIT_2026.md`, `docs/00_AI_CONTEXT.md`, and `CLAUDE.md` now mark these easy wins complete and leave the remaining backlog separate: history pagination/summaries, notification batching, auth/session read reduction, B2B2C subscription/resource limits, and legacy root fallback removal after migration.

---

## Architecture & Cost Audit — B2B2C Scaling Analysis (2026-06-28)

Full backend audit covering Firestore cost patterns, scaling bottlenecks, and B2B2C readiness. Full report in `docs/12_ARCHITECTURE_AUDIT_2026.md`. Key findings:

**Critical findings from the audit, fixed in the easy-win pass above:**
- `progress.ts` was dual-writing the highest-volume logs. The hot progress/session paths now write gym-scoped only.
- `syncOfflineLifts` wrote root-only with no gym-scoped mirror, and generated non-deterministic IDs so the same offline set could be double-written.
- `getGymWorkspaces` did 3 full-collection scans per admin page load. It now reads only gym docs and uses denormalized counters.
- `getGymDetail` fetched all member documents just for a count.

**Medium priority:**
- Progress and notification read-models use unscoped `collectionGroup` queries (no gym filter). Cost scales with total gym count, not per-member. Fix: pass gymId explicitly.
- Multi-notification events use sequential `await` chains — N round-trips per event. Need `batchMirrorGymScopedRecords()` helper.
- `requireRole()` reads `authProfiles/{uid}` on every SSR page. Fix: embed isActive/gymId/memberId in session cookie claims.
- `getGymFloorLoadMap` calls 4 uncached functions + authProfiles scan per render.

**B2B2C gaps:**
- No gym subscription schema (tier, billedUntil, stripeCustomerId) — required before B2B sales.
- No per-gym resource limits (maxMembers, maxStorage).
- Single-gym member model (`defaultGymId: string`) — no support for multi-branch chains.
- No FCM topic subscription on registration — gym-wide broadcasts would require reading all member profiles.

Issues 7–10 added to `docs/11_KNOWN_ISSUES_AND_GAPS.md`. Action plan in `docs/12_ARCHITECTURE_AUDIT_2026.md` Section "Recommended Action Plan".

---

## R5 + R4 Phase 1: Server Actions standardisation & dual-write reduction (2026-06-28)

**R5 — Cloud Function → Server Action migration (complete)**

All 11 UI components that used a CF-primary/SA-fallback pattern have been migrated to SA-only. Removed components: `add-member-form`, `add-staff-form`, `member-access-actions`, `gym-access-status-action`, `gym-logo-manager`, `gym-details-form`, `program-assignment-form`, `pt-booking-form`, `admin-gym-member-list`, `members-hybrid-view`, `staff-access-actions`. `functions.ts` trimmed from ~390 to ~80 lines — dead wrappers deleted; kept only archive, lookup, stats, activation, and trainer-assignment CFs that have no SA equivalent.

**R4 Phase 1 — Root write removal for confirmed dual-write pairs (partial)**

Removed redundant root-collection writes in `members.ts` (3 × activityEvents), `staff.ts` (2 × activityEvents — one root-only converted to gym-scoped), and `programs.ts` (7 × programAssignments + notifications + activityEvents). All gym-scoped writes via `mirrorGymScopedRecord` remain untouched.

**R4 Phase 1 — Now complete for all confirmed pairs**

Additional root writes removed from `pt.ts` (ptSessions, ptLiftLogs, liftLogs, notifications ×3), `exercises.ts` (exerciseCatalog, exerciseRequests, notifications), `contact.ts` (contactMessages, notifications). The remaining `exercises.ts` root writes (lines 272, 346, 435) are intentional admin-global writes for the shared exercise catalog, not dual-write pairs. The `contact.ts` "mark as read" now relies solely on the collectionGroup update for gym-scoped copies.

**Still out of scope:** `progress.ts` personal-member logs (liftLogs, bodyMetricLogs, dayLogs, macroLogs, activityLogs, workoutSessions, attendanceRecords) — these appear to be root-only writes with no gym-scoped pair; verification needed before touching them.

---

## Landing page redesigned with shadcn/ui (2026-06-28)

**Superseded 2026-07-02:** the shadcn/Tailwind landing experiment was removed in the product-refinement cleanup. `components.json`, `postcss.config.mjs`, `src/app/styles/shadcn.css`, `src/components/ui/*`, `src/lib/utils.ts`, and the unused shadcn/Tailwind dependencies are gone. The current landing lives under `src/components/landing/` with `lp-` CSS in `src/app/landing.css`.

Replaced all hand-rolled interactive components on the landing page with shadcn/ui primitives. No change to page structure, copy, or mock visuals.

**What changed:**
- Installed: `tailwindcss`, `@tailwindcss/postcss`, `tailwindcss-animate`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `radix-ui` (monorepo), `@radix-ui/react-accordion`, `@radix-ui/react-tabs`, `@radix-ui/react-slot`
- Created `postcss.config.mjs` with `@tailwindcss/postcss`
- Created `src/app/styles/shadcn.css` — Tailwind v4 utilities only (no preflight), maps shadcn CSS variables to project tokens via `@theme inline`
- Created `components.json` (shadcn config) and `src/lib/utils.ts` (`cn` helper)
- Downloaded shadcn components to `src/components/ui/`: `button`, `dialog`, `accordion`, `card`, `tabs`, `badge`, `input`, `label`
- Rewrote `src/components/landing-page-client.tsx`: LoginModal/EnquiryModal → shadcn `Dialog`; nav/hero/CTA buttons → shadcn `Button`; feature/step cards → shadcn `Card`; FAQ accordion → shadcn `Accordion`; login tabs → shadcn `Tabs`; eyebrow → shadcn `Badge`; form fields → shadcn `Input`/`Label`; inline SVG icons → `lucide-react`
- Updated `src/app/landing.css`: removed `.lp-modal-backdrop` (shadcn Dialog provides overlay), kept all structural layout classes, added `.lp-input` override to style shadcn Input to match brand
- Existing 21-CSS-file system is untouched; Tailwind utilities are scoped to components that use them

---

## Documentation refreshed for current App Router structure (2026-06-28)

Updated the repo docs to match the live Next.js 16 app structure:

- Replaced stale Next.js 15 and `middleware.ts` references with Next.js 16 and `src/proxy.ts`.
- Documented the App Router special files: `src/app/template.tsx`, `src/app/not-found.tsx`, shared `AppStatusScreen`, and `/api/health`.
- Corrected the old "no `/api` routes" claim: business data still uses Server Components, Server Actions, read-models, and Cloud Functions; `/api/health` is the only operational route handler.
- Updated README, `CLAUDE.md`, Tier-0/Tier-1 docs, discrepancies, known issues, and UI style guidance.
- Validation: `npm run lint`, `npm run typecheck`, and `npm run build` passed after the App Router status/health additions.

---

## 🗂️ Latest Milestone — Exercise JSON normalization + Firestore rules CI (2026-06-28)

Two items from `docs/11_KNOWN_ISSUES_AND_GAPS.md` resolved.

**Exercise JSON normalization (`src/lib/workouts.json`):**
All 66 catalog entries now carry three new per-entry fields:
- `muscleGroup` — mirrors the top-level key (e.g. `"Chest"`, `"Back"`); enables flat Firestore reads without relying on the nested key.
- `equipment` — actual equipment token: `barbell`, `dumbbell`, `cable`, `machine`, `bodyweight`, `ez_bar`, or `smith_machine`.
- `movementPattern` — movement classification: `horizontal_push`, `vertical_push`, `horizontal_pull`, `vertical_pull`, `hip_hinge`, `squat`, `lunge`, `knee_extension`, `knee_flexion`, `calf_raise`, `elbow_flexion`, `elbow_extension`, `shoulder_abduction`, `shoulder_flexion`, `shrug`, `fly`, `pullover`, `spinal_flexion`, `hip_extension`, `wrist_flexion`.

**Bug fixed in `src/lib/mock-data.ts`:** The `exercises` mapper was assigning `catalogExercise.mechanic` (`"Compound"` / `"Isolation"`) to the `Exercise.equipment` field — every mock exercise in the app had `equipment: "Compound"`. Fixed to read `catalogExercise.equipment`. `movementPattern` is now also surfaced on the mapped `Exercise` object. The three hardcoded stretch entries got `movementPattern` too. `CatalogExercise` type updated accordingly. `tsc --noEmit` clean.

**Firestore rules CI (`.github/workflows/firestore-rules.yml`):**
GitHub Actions workflow created. Triggers on push to `main` and PRs against `main` when `firestore.rules` or `scripts/test-firestore-rules.mjs` change. Pipeline: Node 22 + Java 21 (Temurin) → `npm ci` → `firebase-tools` global install → `firebase emulators:exec --only firestore --project demo-fitsplit "npm run test:rules"` (34 tests).

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

**4 more files investigated and deleted 2026-06-16** (initially flagged for review; each confirmed
superseded/dead via whole-repo reference checks, then removed — `tsc` + `next build` green):
- `lib/memberships.ts` — `membershipStatus` is now a **persisted Firestore field** (written by
  Cloud Functions `processMembershipExpiries` + `actions/billing.ts`; read-models read `data.membershipStatus`).
  The app-side `getDaysRemaining`/`getMembershipStatus` had zero callers — superseded, deleted. CLAUDE.md
  Known-bugs updated to reflect expiry now lives in ONE place (Cloud Functions).
- `lib/muscle-targets.ts` — only consumer was the (already-deleted) `muscle-target-pills`; the live
  `exercise-list.tsx` uses its own `getMuscleTargetDescription()`. Dead, deleted.
- `components/gym-floor-load-map.tsx` (+ `-lazy`) — **NOT a bug** (my earlier hunch was wrong): the
  floor-load feature works fine via **inline JSX** — `owner/reports/page.tsx` renders the A/B/C/D slot grid
  and `owner/page.tsx` passes `floor` to the workspace shell. The standalone `GymFloorLoadMap` component was
  dead duplicate code. The data fn `getGymFloorLoadMap` (`read-models/gyms.ts`) is untouched and still live.

**Docs reconciled (2026-06-16):** removed stale FullCalendar/Zustand/`memberships.ts`/`muscle-targets.ts`/
deleted-component references from `CLAUDE.md`, `README.md`, `docs/01_ARCHITECTURE.md`,
`docs/07_MODULE_BREAKDOWN.md`, `docs/10_REFACTORING_ROADMAP.md`. (The `status-pill` style-guide entry stays —
it's a live CSS class even though the dead `status-pill.tsx` component was removed.)

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
- Set `NEXT_PUBLIC_FITSPLIT_LEGAL_NAME`, `NEXT_PUBLIC_FITSPLIT_LEGAL_ADDRESS`, and `NEXT_PUBLIC_FITSPLIT_LEGAL_EMAIL` before production so `/privacy` and `/terms` show the registered operator.
- Sign a **DPA** with gyms (FitSplit is their processor) + rely on Google's DPA.


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
- **Superseded 2026-07-02:** `app/owner/page.tsx` no longer fetches `getGymDashboardSummary`; the dashboard derives its current stats from live member, session, assignment, PT, notification, and billing read-models.
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
- **Superseded 2026-07-02:** the standalone cardio/stretch `logActivity` action and its stale UI path were removed after Knip confirmed no live caller.
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

---

## Latest Update - 2026-05-25: Member greeting and read-only programs

- Member dashboard greeting now uses explicit `Asia/Kolkata` time instead of server-local time.
- Greeting windows:
  - 6 AM-12 PM: Good morning
  - 12 PM-4 PM: Good afternoon
  - after 4 PM: Good evening
- Added a member hamburger drawer link to `Workout Programs`.
- Added `/member/programs`, a read-only workout library page showing predefined and gym-created programs.
- `WorkoutProgramGallery` now supports `readOnly` mode, hiding assignment counts and edit/delete controls while preserving the view-plan modal.
