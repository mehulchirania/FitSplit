# 00 · AI CONTEXT (Tier 0 — load this every session)

`Generated: 2026-06-05 · Last updated: 2026-07-02`

> Condensed everything. Hard cap ~8k tokens. Links out to deeper docs — does not
> duplicate their detail. If a fact here matters to your task, confirm it in the
> linked Tier-1 doc and against code before acting.

## What FitSplit is

Firebase-backed, multi-gym operations + personal-training platform. Next.js 16 App
Router PWA deployed on Firebase App Hosting. One platform, many gyms; the pilot gym is
**SHG** (`shg`). See [01_ARCHITECTURE](01_ARCHITECTURE.md).

## Hard constraints (do not violate)

1. **No app REST layer.** App data reads = Server Components calling read-models
   (`src/lib/firebase/read-models/*`). The only route handler is `/api/health` (`src/app/api/health/route.ts`) for probes. All mutations = Server Actions (`src/lib/firebase/actions/*`)
   **or** Cloud Functions callables (`src/lib/firebase/functions.ts` → `functions/src/index.ts`).
2. **Privileged writes go through Cloud Functions (Admin SDK).** Member/staff creation,
   program assignment, access toggles, billing approval, gym archive. Firestore rules set
   the corresponding direct client writes to `allow: false`.
3. **Multi-tenancy is gym-first.** Most data lives under `gyms/{gymId}/...`. Every read/write
   is partitioned by `gymId`. Parallel root-level mirrors are legacy migration debt;
   R4 cleanup is complete for hot operational write pairs, including progress/offline logging.
   See [12_ARCHITECTURE_AUDIT_2026](12_ARCHITECTURE_AUDIT_2026.md).
4. **Server Actions are the actual write path in the app today.** Most UI calls Server
   Actions in `src/lib/firebase/actions/*` (which use the Admin SDK directly), not the callable
   Cloud Functions. The callables in `functions/src/index.ts` mirror many of the same
   operations and are the canonical "privileged write" surface, but several are not yet
   wired to UI. See [04_DATA_ACCESS_CATALOG](04_DATA_ACCESS_CATALOG.md) §"Action vs Function overlap".

## Roles

`Role = "admin" | "owner" | "trainer" | "member"` — `src/types/domain.ts:3`.

| Role | Scope | Notes |
|---|---|---|
| `admin` | platform-wide | manages gyms, global catalog/programs, inbox |
| `owner` | one gym | members, programs, PT, billing, settings. `staffType` distinguishes `owner`/`trainer`/`staff` |
| `trainer` | one gym | first-class role in rules/proxy/Functions; session resolution now accepts role `trainer` (fixed 2026-06-05, see note below) |
| `member` | self | workout console, logging, progress, PT history |

**Trainer role (fixed 2026-06-05).** A pure `role:"trainer"` account **can now establish a
session** — `toProfile` (`src/lib/auth.ts:306`) and the cookie fallback (`src/lib/auth.ts:893`)
accept `admin|owner|trainer|member`. Demo trainers are still modelled as `role:"owner"` +
`staffType:"trainer"` (`src/lib/auth.ts:78-95`) for historical reasons, but that's no longer a
hard requirement. (Was DISCREPANCIES B1 / roadmap R1.)

## Auth & sessions

- Login: `loginWithCredentials` (`src/lib/auth.ts:707`). Demo accounts hard-coded
  (`src/lib/auth.ts:61-240`); password `password` (staff) / PIN `1234` (members, stored as
  `pin-1234`). Real auth via Firebase Identity Toolkit REST → session cookie.
- Session cookie `fitsplit-session`: 2h default, 14d "remember me" (`src/lib/auth.ts:19-20`).
- Compatibility cookies `fitsplit-role|username|gym-id|member-id` drive proxy routing
  (`src/lib/auth.ts`, `src/proxy.ts`).
- Guards: `requireAuth`, `requireRole`, `requireOwner` (`src/lib/auth.ts:952-996`). `requireOwner`
  blocks `staffType !== "owner"` from destructive owner actions (`src/lib/auth.ts:991`).
- Login lockout: 5 fails → 15 min (`src/lib/auth.ts:509-510`), enforced both server-side and via
  the `blockLockedAccounts` Auth blocking trigger (`functions/src/index.ts:1905`).

## Routing (`src/proxy.ts`)

`/admin`→admin · `/owner`→owner+admin · `/trainer`→trainer+owner · `/member`→member ·
`/profile`,`/activity`→any authed; `/about`,`/privacy`,`/terms`→public (`src/proxy.ts`).
Role home redirects live in `src/proxy.ts`. Owner topbar is suppressed for `/owner/*` (component-level).

## Collections (names only — detail in [02_DATA_DICTIONARY](02_DATA_DICTIONARY.md))

**Gym-scoped** `gyms/{gymId}/…` (`collections.ts:35-64`): `members`, `staff`,
`exerciseCatalog`, `exerciseRequests`, `workoutPrograms`,
`notifications`, `liftLogs`, `programAssignments`, `activityEvents`, `workoutSessions`,
`attendanceRecords`, `bodyMetricLogs`, `dayLogs`, `ptSessions`, `ptLiftLogs`, `macroLogs`,
`activityLogs`, `packages`, `memberships`, `paymentRequests`, `summaries`.

**Root-level** (`collections.ts:1-33`): `gyms`, `authProfiles` (auth/session index),
`profiles` (legacy), `usernames` (uniqueness index), `archives` (60-day soft-delete),
`platformSummaries`, `loginAttempts`, plus legacy **root mirrors** of some gym-scoped collections.
FitSplit **global** library lives at root `exerciseCatalog` /
`workoutPrograms` (admin-only writes).

## Core workflows (detail in [06_USER_JOURNEYS](06_USER_JOURNEYS.md))

- **Member creation** — owner → `createMemberAccount` CF or `createMemberProfile` action →
  Auth user (`pin-1234`) + `authProfiles` + `gyms/{id}/members` + username reservation txn.
- **Program assignment** — `assignProgramToMember`; cancels prior active assignment, writes
  assignment + member notification + activity event (+FCM push). CF version fires side-effects
  via the `onProgramAssignmentCreated` trigger (`sideEffectsMode: "trigger"`).
- **Live workout / attendance** — `logLiftSet` and `syncOfflineLifts` are the reliable
  member writer path today. They upsert deterministic daily `workoutSessions` and
  `attendanceRecords` with `geofenceStatus:"location_not_provided"` so owner attendance
  trends accrue from actual lift logs. Current member day status is handled via
  `FocusedDayView` -> `logDayStatus` / `clearDayLog` for skip/modified notes.
- **PT** — `bookPTSession`/`assignPTPlan` → `startPTSession` → `logPTLiftSet`
  (trainer-set history also appears in member lift history with `source:"trainer"`) → `completePTSession`.
  Scheduled reminders + auto-expire of abandoned sessions.
- **Billing** — member `submitPaymentRequest` → owner `approvePaymentRequest` creates a
  `memberships` doc + denormalises `membershipStatus`/`membershipEndDate` onto member.
- **Exercise requests** — owner requests → admin approves → added to catalog.
- **Notifications** — role-scoped; member push via FCM token on `authProfiles.fcmToken`.

## Key business rules (full list in [08_BUSINESS_RULES](08_BUSINESS_RULES.md))

- PT plan default 30 days; end = start + duration − 1 (`actions/pt.ts:80-82`).
- Login lockout 5/15min; session 2h/14d.
- Geofence default radius 150m; status `inside`/`not_configured`/`location_not_provided`
  (`actions/shared.ts:434-479`).
- Archive retention 60 days (`actions/shared.ts:231-233`); purged daily.
- Membership expiry warning default 7 days (`actions/gyms.ts:151`); daily expiry sweep.
- Username 3-32 chars `[a-z0-9._-]`; PIN exactly 4 digits (`actions/shared.ts:52-66`).
- Abandoned PT session auto-cancel after 6h active (`functions/src/index.ts:1862`).

## Terminology

- **read-model** = server-side cached Firestore read (`src/lib/firebase/read-models/*`,
  uses `unstable_cache` + `react.cache`).
- **root mirror / dual-write debt** = legacy pattern where the same doc is written to root and
  `gyms/{gymId}/…`; use the 2026 audit before changing these paths.
- **scope** on exercises/programs: `default`/`predefined` (global) vs `custom` (gym).
- **staffType** = sub-type of an `owner`-role staff doc: `owner|trainer|staff`.
- **compatibility cookies** = the non-session cookies `src/proxy.ts` reads for routing.

## Where to look

Data model → `02`/`03`. "How is X written/read?" → `04`. "Who can do X?" → `05`.
"What happens end-to-end?" → `06`. "Where do I change module Y?" → `07`. Screens → `09`.
Known bugs/debt/security → `10`, `11`, `12_ARCHITECTURE_AUDIT_2026.md`,
`14_PRODUCT_REFINEMENT_AUDIT_2026-07-02.md`, and `DISCREPANCIES.md`.
