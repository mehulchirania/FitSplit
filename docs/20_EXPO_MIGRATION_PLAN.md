# 20 — Expo / React Native Migration Plan

Status: design plan, no implementation started. Written 2026-07-20.
Archive point: git tag `archive/nextjs-web-2026-07-20` on `main` (d7f6842) — permanent reference to the Next.js web app as it stood before this initiative. No files were moved or copied; the tag is a pointer, not a backup folder.

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
| `src/lib/firebase/actions/*` (18 files, Server Actions) | 6,036 | Rebuilt as callable HTTP endpoints — Next.js Server Actions have no RN transport |
| `src/lib/firebase/read-models/*` (12 files) | 2,374 | Rebuilt behind the same new API; Next's `unstable_cache`/`revalidateTag` has no RN equivalent, replaced by React Query on the client |
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

## 3. New backend API surface

Every Server Action becomes a callable Cloud Function (or a REST/tRPC layer on top of them — decide when this phase starts). The action's existing internal shape barely changes:
1. `requireRole`/`requireAuth` — reimplemented once as "decode + verify the bearer ID token, check claims," used by both the new API and optionally kept for web if web is ever moved off Server Actions too (out of scope here).
2. `parseActionData` + Zod — reused as-is, the schemas don't care about transport.
3. `requireFirebase()` / Admin SDK writes — unchanged.
4. `success()`/`failure()` envelope — unchanged shape, just returned as JSON instead of a Server Action result.
5. Cache invalidation (`revalidateGymTags()`) — has no meaning for a mobile client; replaced by React Query cache invalidation driven by the same tag names, client-side.

This is the largest genuinely new chunk of work in the whole initiative — it's backend work, not UI work, and it's a prerequisite before any native screen can read or write real data.

## 4. Data & offline strategy

- Firestore stays the database. The Firestore JS SDK has first-class React Native support with its own offline persistence (`initializeFirestore` with `persistentLocalCache`), which can replace Dexie's role rather than reimplementing IndexedDB-style caching by hand.
- Deterministic doc IDs (`macroLogs`, `dayLogs`, implicit lift sessions) are storage-format decisions, not client decisions — reused unchanged.
- Optimistic-update UX for lift logging/attendance (a standing product requirement per CLAUDE.md) is rebuilt using React Query's optimistic mutation pattern against the new API, mirroring today's client-side optimistic pattern conceptually but implemented fresh.

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

## 6. Phased rollout

1. **Extract `packages/core`** — types, Zod schemas, `workout-utils`, `split-library`. Zero risk: pure code motion, web app re-imports from the new path, no behavior change. Verifiable with `tsc --noEmit` + existing test suite. **Done 2026-07-20** — see the dated entry in `PROJECT_HANDOFF.md` for exact shape (npm workspaces, shim files at the old `src/` import paths so none of the ~140 existing importers changed).
2. **Build the API layer** — wrap existing Server Action logic as callable/HTTP endpoints with bearer-token auth. Ships independently of any mobile UI; can be verified with curl/Postman against a real gym before a single native screen exists.
3. **Extract the shared identifier-resolution callable** from `auth.ts`, prove it against the current web login flow first (lowest-risk place to catch regressions), then reuse it from the RN app.
4. **Scaffold the Expo app**, wire native Firebase Auth sign-in end to end against one gated screen (e.g. member dashboard, read-only) before building anything else.
5. **Read-only screens first** (dashboard, progress, logs) — proves the API + auth + data layer without touching the offline/optimistic-write complexity.
6. **Write-heavy flows** (lift logging, attendance, PT) — last, because they carry the offline-sync and optimistic-update risk that read-only screens don't.
7. **Push notifications** (`expo-notifications`) — after core flows are stable, since it's additive and doesn't block anything else.

## 7. Open decisions for later

- Callable Cloud Functions vs. a REST/tRPC layer for the new API — affects tooling but not this plan's structure.
- Styling approach for native screens (NativeWind vs. Tamagui vs. plain StyleSheet) — a UI decision, not an architecture one; defer until screen work starts.
- Whether `packages/core` eventually pulls in Turborepo, or stays plain workspaces — revisit once there's a third consumer or build times become a problem.
