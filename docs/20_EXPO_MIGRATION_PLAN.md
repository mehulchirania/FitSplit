# 20 — Expo / React Native Migration Plan

Status: implementation in progress. Written 2026-07-20, revised same day after the API-surface audit in §3 and again after the SDK reversal below.
Archive point: git tag `archive/nextjs-web-2026-07-20` on `main` (d7f6842) — permanent reference to the Next.js web app as it stood before this initiative. No files were moved or copied; the tag is a pointer, not a backup folder.

**SDK decision — revised 2026-07-20, same day:** started with `@react-native-firebase` (native modules) for performance, then reversed to the plain **`firebase` web JS SDK** once the real hardware situation came up: no personal iPhone, no personal Mac, and a work MacBook Pro M4 with no dev-tool install permission (Xcode not installed, not allowed). Native Firebase modules can't run inside Expo Go — they need an EAS-built custom dev client, which for iOS means installing onto a physical iPhone via TestFlight/ad-hoc, and there isn't one available. The JS SDK runs inside plain Expo Go with zero build step, so development and testing (at least on Android, which is fully local) aren't blocked on any of that. **Revisit `@react-native-firebase` once real iOS device or Mac access exists** — it's a contained swap later precisely because every Firebase call is going to live behind one data-access module, not scattered through screens (see §4).

Practical consequence: Android is the primary day-to-day test target (fully local, Expo Go on the developer's own device). iOS still needs *some* physical iOS device to visually verify on via Expo Go — that doesn't go away with the JS SDK — but it no longer needs a build, a Mac, or an Apple Developer account for ordinary development; only final production builds for App Store submission will need those, much later.

## 0. Decision so far

- fitsplit.in keeps deploying from the existing Next.js app on `main`, unchanged, for the entire duration of this initiative. Nothing about the current build/deploy path changes as part of this plan.
- The Expo app is new code added to this same repo (no worktrees, no side branches — per the standing workflow rule), most likely as a sibling top-level folder (`mobile/`) once implementation starts.
- This document is the design plan only. Repo restructuring (monorepo tooling, new folders, first Expo scaffold) is a separate, later step that needs its own go-ahead.

## 1. What ports directly vs what gets rebuilt

| Layer | Lines (approx) | Verdict |
|---|---|---|
| `src/types/domain.ts` | 743 | Ports as-is into a shared package |
| `src/lib/workout-utils.ts` + `split-library.ts` | 560 | Pure logic, ports as-is |
| `src/lib/firebase/actions/validation.ts` (Zod schemas) | — | Ports as-is |
| `src/lib/firebase/actions/*` (18 files, Server Actions) | 6,036 | **Revised in §3** — most member-facing writes are safe as direct rules-enforced Firestore client-SDK writes; only 5 (`logLiftSet`, `syncOfflineLifts`, `logBodyWeight`, `clearDayLog`, `logMeal`) need new callables; 28 admin/owner mutations already exist as callables in `functions/src/index.ts` |
| `src/lib/firebase/read-models/*` (12 files) | 2,374 | **Revised in §4** — reads for member-owned/gym-visible data go straight through the Firestore client SDK against existing rules, no new API; Next's `unstable_cache`/`revalidateTag` has no RN equivalent and isn't needed for this path |
| `src/lib/auth.ts` | 1,129 | Partially reusable — see §2 |
| `src/lib/offline-db.ts` (Dexie/IndexedDB) | 43 | Rebuilt on `expo-sqlite`, same sync contract |
| All 35 route pages, Radix UI, Framer Motion, 29 CSS files | — | Not portable; native screens built from scratch in RN primitives |
| FCM web push (`FcmSetup`) | — | Rebuilt on `expo-notifications` |

## 2. Auth — what actually reuses, in detail

This was the open question. The answer is better than expected: **the identity backend barely changes.** Firebase Auth is already the identity provider, and role/gym authorization already travels as Firebase custom claims, not as anything Next.js-specific.

**Confirmed reusable, unchanged:**
- Firebase Auth itself as the identity provider — signs in from any client (web REST call today, RN Firebase SDK tomorrow) against the same user pool.
- Custom claims (`role`, `gymId`, `memberId`, set via `auth.setCustomUserClaims()` in `functions/src/index.ts:346`) are already the source of truth `_getCurrentUserImpl` prefers over a Firestore read (`src/lib/auth.ts:948`, the "SSR Profile Optimization" fast path). Any backend — the current Next.js server, a future Cloud Function API, or nothing at all — can call `auth.verifyIdToken()` on a bearer token from the RN app and read the same claims directly off the token. No new authorization model needed.
- The Firebase Auth `beforeUserSignIn` blocking trigger enforces the identifier-based lockout (`loginAttempts` collection) at the Auth layer itself, before any client — web or mobile — gets a token. This protection is already client-agnostic.
- Password conventions: member = `pin-{4 digits}`, staff = plain password with `mustChangePassword` gate. Data-level, reused as-is.
- The `authProfiles`/`profiles` Firestore schema and `toProfile()` shape.

**Reusable with relocation (currently entangled with `cookies()`, but the logic itself doesn't touch Next.js):**
- `normalizeIdentifier` / `normalizedLookupKeys` / `resolveProfileForIdentifier` / `demoLogins` / `validateExpectedRole` / `checkIdentifierLockout` family (`src/lib/auth.ts:250-618`) — pure Admin SDK + Firestore functions. These get lifted into one shared Cloud Function callable, e.g. `resolveLoginIdentifier(identifier, mode)`, that both a future web login rewrite and the RN app call to turn a typed username/phone into the Firebase Auth email to sign in with. Today this logic is duplicated inline in the Server Action; extracting it once removes duplication instead of adding it.

**Must be rebuilt (genuinely web-specific):**
- Session transport. Today `createSession()` (`src/lib/auth.ts:864`) mints an HttpOnly `fitsplit-session` cookie via `auth.createSessionCookie()`, because that's how Next.js SSR reads identity on every request. React Native has no cookie jar in that sense. The mobile equivalent:
  1. App calls the shared `resolveLoginIdentifier` callable to get the `authEmail`.
  2. App signs in directly with `@react-native-firebase/auth` (or `firebase/auth` + `getReactNativePersistence(AsyncStorage)`) using that email + the same password convention.
  3. The Firebase SDK owns token storage, silent refresh, and persistence across app restarts — no custom session code to write at all.
  4. Every API call attaches `Authorization: Bearer <idToken>`; the new backend verifies with `verifyIdToken()` and reads claims off the token, same as the web fast path already does.
- `mustChangePassword` / `termsAcceptedAt` / consent gates: same underlying profile fields, new native screens instead of Next.js redirects.

Net effect: of the 1,129 lines in `auth.ts`, the demo-login table, identifier normalization, lockout, and profile-resolution logic (roughly 400–450 lines) relocate almost unchanged into a shared Cloud Function. The cookie-minting and Next-`cookies()`-reading code (roughly 300 lines) is replaced by standard Firebase client SDK behavior on the RN side, which is less code, not more, because the SDK does the work `auth.ts` currently does by hand.

## 3. New backend API surface — revised after auditing `firestore.rules`

The original version of this section assumed every Server Action needed to become a callable Cloud Function — a full REST/RPC layer standing in front of Firestore. That assumption was wrong, caught by actually reading `firestore.rules` (497 lines, already has a passing 34-test emulator suite) before building anything: **it already grants signed-in members direct read AND create access to their own data**, gated by `memberOwned(data)` matching `data.memberId` against the custom-claim `memberId` on the ID token. Members can already read/write `liftLogs`, `macroLogs`, `mealLogs`, `dayLogs`, `bodyMetricLogs`, `activityLogs`, `workoutSessions`, and `attendanceRecords` directly, both gym-scoped and root-mirrored. This means the Firestore **client SDK** (`@react-native-firebase/firestore`) can talk straight to Firestore from the RN app for a lot of what's needed, respecting the exact same rules the web app's Server Actions currently enforce via Admin SDK — no new API layer required for that traffic at all. This is also a genuine performance win over routing everything through a REST proxy.

It isn't true for everything, though. A dedicated audit (2026-07-20) checked every member-logging Server Action against "does a raw rules-compliant client write achieve the same outcome, or is there hidden server-side logic a raw write would silently skip?" Findings, each cited to `src/lib/firebase/actions/progress.ts` unless noted:

| Action | Verdict | Why |
|---|---|---|
| `saveMacroLog` (505-545) | **Safe as a direct client write** | Single deterministic-ID (`${memberId}_${date}`) upsert to `macroLogs`, no other collection touched, no side effect. |
| `logDayStatus` (395-456) | **Safe as a direct client write, with care** | Single-collection write (`dayLogs`), but currently does app-level format validation (`weekStart` regex, required `programId`) that rules don't enforce — the mobile client needs to replicate that validation itself, since Firestore rules can't. |
| `logLiftSet` (121-172) | **Needs to stay a callable** | Also upserts `workoutSessions` and `attendanceRecords` via `upsertImplicitWorkoutAttendance` (69-119) — a raw write to `liftLogs` alone silently skips attendance/session bookkeeping nothing else creates. |
| `syncOfflineLifts` (174-275) | **Needs to stay a callable** | Batch-aggregates offline logs into one attendance/session summary per member per day before a single atomic `db.batch()` write across three collections — real aggregation logic, not just a write. |
| `logBodyWeight` (282-338) | **Needs to stay a callable** | Writes `bodyMetricLogs` and best-effort mirrors the new weight onto the member's profile doc so dashboard reads stay current; a raw single write leaves the profile stale. |
| `clearDayLog` (467-492) | **Needs to stay a callable** | Deletes from both the legacy root `dayLogs` collection and the gym-scoped copy; a raw client delete only reaches the gym-scoped doc. |
| `logMeal` (564-619) | **Needs to stay a callable** | Writes `mealLogs` and separately increments the day's `macroLogs` totals via `FieldValue.increment` — a raw `mealLogs`-only write silently stops the macro dashboard from reflecting logged meals. |
| PT session lifecycle (`src/lib/firebase/actions/pt.ts`: `startPTSession`, `completePTSession`, `cancelPTSession`, `reschedulePTSession`, `logPTLiftSet`) | **Not part of the member-write model at all** | Staff-only under both the Server Actions and `firestore.rules` (`isStaffForGym`/`isAdmin`, not `memberOwned`). Drives `notifications` + FCM pushes with no trigger to replace that. Out of scope until trainer/owner mobile access is prioritized. |

Also confirmed while auditing: geofence "validation" referenced in old docs doesn't exist anywhere in the codebase — `progress.ts` only ever hardcodes `distanceMeters: null, geofenceStatus: "location_not_provided"`, there's no haversine/radius check in `src/` or `functions/src/` to replicate. And PR (personal record) detection is pure client-side UI (computed from already-fetched `liftLogs` in `member-progress-screen.tsx` and similar), never persisted or triggered server-side — trivial to reimplement in RN, not a backend dependency.

**Separately, and good news on its own:** `functions/src/index.ts` (1,959 lines) already has 28 `onCall` Cloud Functions covering every admin/owner-privileged mutation (member/staff/gym CRUD, PT plan assignment, packages, payments, billing activation, trainer management, dashboard stats) — none of that needs to be rebuilt; the RN app calls these directly once it has a native Firebase Functions client. One of them, `lookupLoginEmail` (`functions/src/index.ts:1204`), is very close to the identifier-resolution callable §2 called for — it resolves username/phone → auth email for both member and staff modes already. It's missing the demo-login shortcuts and lockout bookkeeping `auth.ts` has, but demo accounts are a dev/testing convenience, not a production requirement for the mobile app.

**Net result — the actual new backend work is small:** five new callable Cloud Functions (`logLiftSet`, `syncOfflineLifts`, `logBodyWeight`, `clearDayLog`, `logMeal` — mobile equivalents of the audited Server Actions above, sharing their exact write shape), reusing the 28 that already exist, reusing `lookupLoginEmail` as-is for auth. Not a from-scratch REST/RPC layer over 6,036 lines of Server Actions.

## 4. Data & offline strategy

- Firestore stays the database, and per §3, most reads go **directly through the Firestore client SDK** (`firebase/firestore`, the JS SDK per the §0 reversal), rules-enforced exactly like the collection audit describes — no REST proxy in between for member-owned/gym-visible reads (assigned programs, exercise catalog, lift/macro/meal/day/body-metric logs, notifications, PT sessions the member can see).
- The JS SDK's `initializeFirestore` with `persistentLocalCache` (React Native-compatible since Firestore JS SDK v9.19+, backed by AsyncStorage/SQLite under the hood) replaces Dexie's role rather than reimplementing IndexedDB-style caching by hand. **Revisit for `@react-native-firebase/firestore`'s native persistence** if/when the SDK swap in §0 happens — better background-sync behavior, same rules-enforced model.
- All Firebase access (auth, Firestore, functions) should live behind one data-access module in the Expo app from day one — not because it's needed yet, but because it's what makes the eventual `firebase` → `@react-native-firebase` swap in §0 a contained change instead of a rewrite touching every screen.
- Deterministic doc IDs (`macroLogs`, `dayLogs`, implicit lift sessions) are storage-format decisions, not client decisions — reused unchanged, and the mobile client needs to replicate the `${memberId}_${date}`-style ID convention itself for the writes it's allowed to make directly (per §3's `saveMacroLog`/`logDayStatus` rows).
- Optimistic-update UX for lift logging/attendance (a standing product requirement per CLAUDE.md) mostly falls out of Firestore's own local-write-then-sync model for direct writes; for the 5 write paths that go through a callable Cloud Function instead (§3), the mobile client still needs to apply an optimistic local update and reconcile on the callable's response, mirroring what `member-workout-screen.tsx`'s Dexie-queue pattern does today on web.

## 5. Repo shape

```
FitSplit/
  src/            (existing Next.js app — untouched, keeps deploying)
  functions/      (existing Cloud Functions — grows to host the new callable API)
  packages/
    core/         (done: extracted types, validation, workout-utils, split-library)
  mobile/         (not yet created: Expo app)
```

npm workspaces (`"workspaces": ["packages/*"]` in the root `package.json`) ties `packages/core` into `src/` today and will do the same for `mobile/` once it exists. Not Turborepo — no build-graph complexity yet with two consumers.

`packages/core` ships raw `.ts` source with no build step (`"main"`/`"types"` point straight at `src/index.ts`); Next.js is told to transpile it via `transpilePackages: ["@fitsplit/core"]` in `next.config.mjs`, since Next doesn't compile arbitrary `node_modules` packages by default. **Note for the Expo step:** Metro (React Native's bundler) has the same non-transpilation default for `node_modules` and needs its own equivalent configuration (or a package build step) — don't assume this "just works" on the mobile side without checking.

One JSON data file, `workouts.json` (the exercise catalog `split-library.ts` reads), is intentionally duplicated rather than shared — it's also imported directly by three web-only files (`actions/exercises.ts`, `actions/programs.ts`, `mock-data.ts`) that have no reason to ever be part of `packages/core`. Keeping one copy in `src/lib/` for those and one in `packages/core/src/` for `split-library.ts` avoided reaching `packages/core` back into `src/`, which would have undermined the point of the extraction. If this file needs to change, both copies need the edit until/unless it's worth a shared data-only subpackage.

## 6. Phased rollout (revised 2026-07-20 after the §3 audit)

1. **Extract `packages/core`** — types, Zod schemas, `workout-utils`, `split-library`. Zero risk: pure code motion, web app re-imports from the new path, no behavior change. Verifiable with `tsc --noEmit` + existing test suite. **Done 2026-07-20** — see the dated entry in `PROJECT_HANDOFF.md` for exact shape (npm workspaces, shim files at the old `src/` import paths so none of the ~140 existing importers changed).
2. **Audit the real backend API surface against `firestore.rules`** — **Done 2026-07-20.** Found the API layer originally planned in §3 was oversized: 28 admin/owner callables already exist, `lookupLoginEmail` already covers most of auth's identifier resolution, and most member-write Server Actions are safe as direct rules-enforced client-SDK writes. Only 5 new callables are actually needed.
3. **Build the 5 new callables** (`logLiftSetMobile`, `syncOfflineLiftsMobile`, `logBodyWeightMobile`, `clearDayLogMobile`, `logMealMobile`) in `functions/src/`. **Done 2026-07-20** — see the dated entry in `PROJECT_HANDOFF.md`. `tsc` compiles clean; not yet exercised against a running emulator (no `auth` emulator configured) or deployed — real functional verification happens once the mobile app is calling them in Phase 4. Demo-login support in `lookupLoginEmail` deferred — not a production requirement.
4. **Scaffold the Expo app** with the `firebase` JS SDK (per the §0 SDK reversal), behind one data-access module. Wire Firebase Auth sign-in end to end (via `lookupLoginEmail` + client-side sign-in) against one gated screen showing the signed-in user's real profile — first "does the whole stack work" milestone. **Done 2026-07-20** — see the dated entry in `PROJECT_HANDOFF.md`. Verified via `expo start --web` + Browser pane (no phone available in this environment) against real production `fitsplit-29215`, signed in as the demo member and rendered the real profile doc read directly through the Firestore client SDK. Metro's monorepo `@fitsplit/core` resolution actually verified (temporary smoke-test import), not just assumed.
5. **Read-only screens** (dashboard, progress, logs) — direct Firestore client-SDK reads against existing rules, no new backend needed per §3/§4. **Started 2026-07-20** — first screen done (`mobile/lib/programs.ts` + `HomeScreen.tsx`): today's assigned program + focused day + exercises, verified live against production. Progress/logs screens not yet built.
6. **Write-heavy flows** (lift logging, attendance, meals, body weight) — mix of direct client-SDK writes (`saveMacroLog`/`logDayStatus`-equivalent) and the 5 new callables from step 3.
7. **Push notifications** (`expo-notifications` or `@react-native-firebase/messaging`) — after core flows are stable, since it's additive and doesn't block anything else.
8. **Trainer/owner mobile access, PT flows** — deferred; `pt.ts`'s staff-only actions (§3) aren't part of the member-first rollout and can be scoped later.

## 7. Open decisions for later

- Callable Cloud Functions vs. a REST/tRPC layer for the new API — affects tooling but not this plan's structure.
- Styling approach for native screens (NativeWind vs. Tamagui vs. plain StyleSheet) — a UI decision, not an architecture one; defer until screen work starts.
- Whether `packages/core` eventually pulls in Turborepo, or stays plain workspaces — revisit once there's a third consumer or build times become a problem.
