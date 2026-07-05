# 17 · Root → Gym-Scoped Backfill Runbook

`Generated: 2026-07-05 · Closes T2 from docs/16_FABLE_AUDIT_2026-07-05.md (finding F3)`

> **Purpose.** Read-model root fallbacks were removed from hot paths (T1, 2026-07-05).
> Any operational data that still lives only in a legacy root collection
> (`/liftLogs`, `/dayLogs`, etc.) is now invisible to the app. This runbook copies
> that legacy data into the canonical `gyms/{gymId}/<collection>` path using
> `scripts/backfill-root-to-gym.mjs`, without touching root documents.

## What this does not do

It does not delete or modify root documents, and it does not run automatically.
Archiving/removing root collections after a verified backfill is a separate,
later step (tracked as a follow-up in the go-live checklist, `docs/16_FABLE_AUDIT_2026-07-05.md` §5).

## Collections covered

`liftLogs`, `bodyMetricLogs`, `dayLogs`, `macroLogs`, `activityLogs`,
`workoutSessions`, `attendanceRecords`, `ptSessions`, `ptLiftLogs`,
`notifications`, `contactMessages`, `exerciseRequests`, `memberships`,
`paymentRequests`, `activityEvents`, `packages`.

Excluded on purpose: `exerciseCatalog` and `workoutPrograms` are intentional
global catalogs (not gym-scoped data). `authProfiles`, `usernames`, `phones`,
`loginAttempts`, `archives` are intentionally root-only indexes/records.

## Prerequisites

- Firebase Admin credentials available as env vars (same ones
  `src/lib/firebase/admin.ts` uses), either in the shell or in `.env.local`:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (service account), **or**
  - `GOOGLE_APPLICATION_CREDENTIALS` pointing at a service account JSON file
    (application default credentials).
- Run from the repo root so `.env.local` resolves via `process.cwd()`.
- Node with ESM support (script is a plain `.mjs`, no build step, no extra deps
  beyond `firebase-admin` which is already a project dependency).

## Step 1 — Dry run (default, no writes)

```bash
npm run backfill:root
```

Or target specific collections / a non-default gym:

```bash
node scripts/backfill-root-to-gym.mjs --collections=liftLogs,dayLogs
node scripts/backfill-root-to-gym.mjs --gym=shg
```

### Reading the report

For each collection the script prints a line and the final summary table has
one row per collection with:

| Column | Meaning |
|---|---|
| `rootDocs` | Total documents currently in the root collection. |
| `alreadyScoped` | Root docs whose gym-scoped counterpart (`gyms/{gymId}/<collection>/{sameId}`) already exists — these are no-ops even under `--apply` (merge just re-confirms the same data). |
| `wouldCopy` (dry run) / `copied` (apply) | Root docs that would be / were written to the gym-scoped path. |
| `noGymIdOnDoc` | Root docs with no usable `gymId` field on the document — the script fell back to the default gym id (`shg`, or `--gym` override). Review this count before applying; a large number may mean the data belongs to a different gym than the default. |
| `errors` | Batch commit failures. Should be 0. Investigate before re-running with `--apply` if not. |

`rootDocs` empty for a collection just means "nothing to do" — that's fine and
expected for collections that never had legacy root writes.

## Step 2 — Apply

Once the dry-run report looks correct (in particular, `noGymIdOnDoc` counts
make sense for a single-gym pilot):

```bash
node scripts/backfill-root-to-gym.mjs --apply
```

Or scoped the same way as the dry run:

```bash
node scripts/backfill-root-to-gym.mjs --collections=liftLogs,dayLogs --apply
```

Writes go to `gyms/{gymId}/<collection>/{sameDocId}` using
`set(..., { merge: true })`, with `gymId` and `mirroredFromRootCollection: true`
added to the document — the same shape `mirrorGymScopedRecord`
(`src/lib/firebase/actions/shared.ts:416`) produces for live writes, so
backfilled docs are indistinguishable from normal mirrored docs. Writes are
batched at ~400 ops per batch (Firestore's hard limit is 500).

**Idempotent by construction:** because the doc id and merge semantics are
fixed, running `--apply` multiple times (e.g. after new root data appears, or
to retry after a batch error) never creates duplicates and never clobbers
fields written by the live app in the meantime — `merge: true` only overwrites
fields present in the backfilled payload.

## Step 3 — Post-apply verification

1. Re-run the dry run for the same collections — `wouldCopy` should now be 0
   and `alreadyScoped` should equal `rootDocs` (minus any doc whose gymId
   resolution genuinely differs).
2. Spot-check in Firestore console: pick a member id known to have pre-June
   history, confirm `gyms/shg/liftLogs` (and `dayLogs`, `bodyMetricLogs`) now
   contain docs for that member with `mirroredFromRootCollection: true`.
3. Spot-check in the app: log in as that member (or as `mehulchirania` /
   `member-mehul` in the pilot gym) and confirm historical lift/progress data
   now renders on `/member/progress` and related pages that previously showed
   nothing for that period.
4. For `notifications`: confirm the admin bell (`/admin`) still shows both new
   and legacy items — `getAdminNotifications` already reads via
   `collectionGroup(gymScopedCollectionPaths.notifications)` (T1 fix), so
   backfilled docs surface automatically once copied.

## Rollback

Not needed. Root documents are never modified or deleted by this script —
only new/merged gym-scoped copies are written. If a backfill run produced
wrong data (e.g. wrong `--gym` override), the fix is to re-run `--apply` with
the correct gym id; the previous incorrect gym-scoped docs are orphaned
copies under the wrong gym and can be deleted manually from the Firestore
console (root data is unaffected either way).

## Follow-up (out of scope here)

After the backfill is verified in production, archive (do not immediately
delete) the now-redundant root collections per the existing `archives/{id}`
60-day-retention pattern used elsewhere in the app (see `actions/shared.ts`
archive helpers). That archival step is intentionally not part of this
runbook or script.
