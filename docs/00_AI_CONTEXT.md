# 00 · AI CONTEXT (Tier 0 — load this every session)

`Generated: 2026-06-05 · Commit: c0e1f4b`

> Condensed everything. Hard cap ~8k tokens. Links out to deeper docs — does not
> duplicate their detail. If a fact here matters to your task, confirm it in the
> linked Tier-1 doc and against code before acting.

## What FitSplit is

Firebase-backed, multi-gym operations + personal-training platform. Next.js 15 App
Router PWA deployed on Firebase App Hosting. One platform, many gyms; the pilot gym is
**SHG** (`shg`). See [01_ARCHITECTURE](01_ARCHITECTURE.md).

## Hard constraints (do not violate)

1. **No REST / no `/api` routes.** All reads = Server Components calling read-models
   (`lib/firebase/read-models/*`). All mutations = Server Actions (`lib/firebase/actions/*`)
   **or** Cloud Functions callables (`lib/firebase/functions.ts` → `functions/src/index.ts`).
2. **Privileged writes go through Cloud Functions (Admin SDK).** Member/staff creation,
   program assignment, access toggles, billing approval, gym archive. Firestore rules set
   the corresponding direct client writes to `allow: false`.
3. **Multi-tenancy is gym-first.** Most data lives under `gyms/{gymId}/...`. Every read/write
   is partitioned by `gymId`. There is **also a parallel root-level copy** of most
   collections (dual-write legacy) — see [02_DATA_DICTIONARY](02_DATA_DICTIONARY.md) and the
   debt note in [10_REFACTORING_ROADMAP](10_REFACTORING_ROADMAP.md).
4. **Server Actions are the actual write path in the app today.** Most UI calls Server
   Actions in `lib/firebase/actions/*` (which use the Admin SDK directly), not the callable
   Cloud Functions. The callables in `functions/src/index.ts` mirror many of the same
   operations and are the canonical "privileged write" surface, but several are not yet
   wired to UI. See [04_DATA_ACCESS_CATALOG](04_DATA_ACCESS_CATALOG.md) §"Action vs Function overlap".

## Roles

`Role = "admin" | "owner" | "trainer" | "member"` — `types/domain.ts:3`.

| Role | Scope | Notes |
|---|---|---|
| `admin` | platform-wide | manages gyms, global catalog/programs, inbox |
| `owner` | one gym | members, programs, PT, billing, settings. `staffType` distinguishes `owner`/`trainer`/`staff` |
| `trainer` | one gym | first-class role in rules/middleware/Functions, BUT `lib/auth.ts` session resolution does **not** accept role `trainer` (see ⚠️ below) |
| `member` | self | workout console, logging, progress, PT history |

⚠️ **Trainer role caveat.** Demo trainers are modelled as `role:"owner"` + `staffType:"trainer"`
(`lib/auth.ts:78-95`). `createStaffAccount`/`createTrainer` create real `role:"trainer"`
accounts (`functions/src/index.ts:449,1291`), but `toProfile` (`lib/auth.ts:299-323`) and the
cookie fallback (`lib/auth.ts:909`) only accept `admin|owner|member` — so a pure
`role:"trainer"` account currently cannot establish a session. Tracked in
[DISCREPANCIES](DISCREPANCIES.md) / [10_REFACTORING_ROADMAP](10_REFACTORING_ROADMAP.md).

## Auth & sessions

- Login: `loginWithCredentials` (`lib/auth.ts:707`). Demo accounts hard-coded
  (`lib/auth.ts:61-240`); password `password` (staff) / PIN `1234` (members, stored as
  `pin-1234`). Real auth via Firebase Identity Toolkit REST → session cookie.
- Session cookie `fitsplit-session`: 2h default, 14d "remember me" (`lib/auth.ts:19-20`).
- Compatibility cookies `fitsplit-role|username|gym-id|member-id` drive middleware routing
  (`lib/auth.ts:422-436`, `middleware.ts:37-46`).
- Guards: `requireAuth`, `requireRole`, `requireOwner` (`lib/auth.ts:952-996`). `requireOwner`
  blocks `staffType !== "owner"` from destructive owner actions (`lib/auth.ts:991`).
- Login lockout: 5 fails → 15 min (`lib/auth.ts:509-510`), enforced both server-side and via
  the `blockLockedAccounts` Auth blocking trigger (`functions/src/index.ts:1905`).

## Routing (`middleware.ts`)

`/admin`→admin · `/owner`→owner+admin · `/trainer`→trainer+owner · `/member`→member ·
`/profile`,`/activity`,`/about`→any authed (`middleware.ts:3-11`). Role home redirects
`middleware.ts:13-18`. Owner topbar is suppressed for `/owner/*` (component-level).

## Collections (names only — detail in [02_DATA_DICTIONARY](02_DATA_DICTIONARY.md))

**Gym-scoped** `gyms/{gymId}/…` (`collections.ts:35-64`): `members`, `staff`,
`exerciseCatalog`, `exerciseRequests`, `workoutPrograms`, `workoutSplitTemplates`,
`notifications`, `liftLogs`, `programAssignments`, `activityEvents`, `workoutSessions`,
`attendanceRecords`, `bodyMetricLogs`, `dayLogs`, `ptSessions`, `ptLiftLogs`, `macroLogs`,
`activityLogs`, `packages`, `memberships`, `paymentRequests`, `summaries`.

**Root-level** (`collections.ts:1-33`): `gyms`, `authProfiles` (auth/session index),
`profiles` (legacy), `usernames` (uniqueness index), `archives` (60-day soft-delete),
`platformSummaries`, `loginAttempts`, plus **root mirrors** of most gym-scoped collections
(legacy dual-write). FitSplit **global** library lives at root `exerciseCatalog` /
`workoutPrograms` (admin-only writes).

## Core workflows (detail in [06_USER_JOURNEYS](06_USER_JOURNEYS.md))

- **Member creation** — owner → `createMemberAccount` CF or `createMemberProfile` action →
  Auth user (`pin-1234`) + `authProfiles` + `gyms/{id}/members` + username reservation txn.
- **Program assignment** — `assignProgramToMember`; cancels prior active assignment, writes
  assignment + member notification + activity event (+FCM push). CF version fires side-effects
  via the `onProgramAssignmentCreated` trigger (`sideEffectsMode: "trigger"`).
- **Live workout** — member `startWorkoutSession` (geofenced) → `logLiftSet` (offline via
  Dexie, synced by `syncOfflineLifts`) → `endWorkoutSession`. Attendance recorded alongside.
- **PT** — `bookPTSession`/`assignPTPlan` → `startPTSession` → `logPTLiftSet`
  (**dual-writes** to `ptLiftLogs` + `liftLogs` with `source:"trainer"`) → `completePTSession`.
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

- **read-model** = server-side cached Firestore read (`lib/firebase/read-models/*`,
  uses `unstable_cache` + `react.cache`).
- **dual-write / mirror** = same doc written to both root and `gyms/{gymId}/…`
  (`mirrorGymScopedRecord`, `mirrorProfileToGym`).
- **scope** on exercises/programs: `default`/`predefined` (global) vs `custom` (gym).
- **staffType** = sub-type of an `owner`-role staff doc: `owner|trainer|staff`.
- **compatibility cookies** = the non-session cookies middleware reads for routing.

## Where to look

Data model → `02`/`03`. "How is X written/read?" → `04`. "Who can do X?" → `05`.
"What happens end-to-end?" → `06`. "Where do I change module Y?" → `07`. Screens → `09`.
Known bugs/debt/security → `10` + `DISCREPANCIES.md`.
