# 11 · KNOWN ISSUES & GAPS (Tier 2)

`Generated: 2026-06-05 · Last updated: 2026-07-06`

> **Purpose.** This file aggregates all known bugs, incomplete functionalities, and technical debt across the FitSplit platform. It serves as the backlog for future maintenance and refactoring.

## High Priority Bugs

1. ~~**Attendance/workout session writers are orphaned**~~ — **RESOLVED 2026-07-02:** `logLiftSet` and `syncOfflineLifts` now upsert deterministic daily `workoutSessions` and `attendanceRecords` with `status: "completed"` and `geofenceStatus: "location_not_provided"`. This makes owner attendance trends accrue from actual lift logging without requiring a separate Start/Finish UI.

2. ~~**Day completion/makeup writers are orphaned**~~ - **RESOLVED 2026-07-03:** `FocusedDayView` now exposes `completed`, `skipped`, and `modified` day-log states through the existing deterministic `logDayStatus`/`clearDayLog` path. Completion is first-class in history and the workout calendar; lift logs still also count as trained days.

*Previously resolved high-priority bugs remain resolved: Trainer auth, PT privacy, lockout mismatch, high/moderate dependency vulnerabilities, and the first-login T&C gate behavior.*

## Incomplete Functionalities

1. ~~**Muscle Target Descriptions in Mock Data**~~ — **RESOLVED 2026-06-28:** All 66 entries in `workouts.json` carried `muscle_target_description` already (added 2026-06-15). Confirmed complete.

2. ~~**Exercise JSON Catalog Deep Cleanup**~~ — **RESOLVED 2026-06-28:** All 66 entries in `src/lib/workouts.json` now carry per-entry `muscleGroup`, `equipment` (actual equipment: barbell/dumbbell/cable/machine/bodyweight/ez_bar/smith_machine), and `movementPattern` fields. The `mock-data.ts` mapper was also fixed: it was incorrectly assigning `mechanic` (Compound/Isolation) to the `equipment` field — it now reads `catalogExercise.equipment` directly and surfaces `movementPattern` on the `Exercise` type. `tsc --noEmit` clean.

3. **Billing & Stripe Integration**
   - **Issue:** Payment processing is currently mocked (cash approval flow works, Card/UPI are mock/integration-ready only).
   - **Impact:** B2C payments are not fully supported end-to-end.
   - **Fix Required:** Only implement if explicitly back on roadmap. Out of scope for current builds.

6. ~~**Production Geofence Coordinates for Attendance**~~ � **SUPERSEDED 2026-07-02:** explicit GPS check-in/start-workout actions were removed after they had no live UI caller. Attendance now accrues from lift logging with `geofenceStatus: "location_not_provided"`.

4. ~~**Security Rule Tests & Pre-commit Hooks**~~ — **RESOLVED 2026-06-28:** `.github/workflows/firestore-rules.yml` created. Triggers on push/PR to `main` when `firestore.rules` or the test script changes. Installs Node 22 + Java 21 (Temurin), runs `firebase emulators:exec --only firestore --project demo-fitsplit "npm run test:rules"` (34 tests). Husky/ESLint warning cleanup remains a separate item (low priority).

5. ~~**`phones` collection missing Firestore security rule**~~ — Fixed 2026-06-05: explicit `allow read, write: if false` block added to `firestore.rules` alongside the `usernames` rule.

## Architecture & Tech Debt

1. **Dual-Write Dominant Complexity (Root vs Gym-Scoped)** *(R4 — operational write pairs resolved 2026-06-28)*
   - **Issue:** Legacy root mirrors still exist and many read-models keep root fallbacks for migration safety.
   - **Impact:** Doubles write cost, invites drift, forces defensive read logic.
   - **Progress 2026-06-28:** Root writes removed from `members.ts` (activityEvents ×3), `staff.ts` (activityEvents ×2), `programs.ts` (programAssignments + notifications + activityEvents ×7), `pt.ts` (ptSessions, ptLiftLogs, liftLogs, notifications ×3), `exercises.ts` (exerciseCatalog, exerciseRequests, notifications), `contact.ts` (contactMessages, notifications). Gym-scoped writes via `mirrorGymScopedRecord` are now the sole path for all operational collections.
   - **Progress 2026-06-28:** `progress.ts` hot paths now write gym-scoped only for lift logs, body metrics, day logs, macro logs, activity logs, workout sessions, and attendance records. `syncOfflineLifts` now writes deterministic gym-scoped lift docs instead of root-only random IDs.
   - **Progress 2026-07-05:** `scripts/backfill-root-to-gym.mjs` and `docs/17_ROOT_BACKFILL_RUNBOOK.md` now cover the dry-run-first legacy root data copy into `gyms/{gymId}/...`; not run against production by agents.
   - **Remaining:** Run the backfill against production data, verify history, then archive/remove legacy root collections when safe.
   - **Remaining:** `exercises.ts` lines 272/346/435 are intentional admin-global catalog writes, not dual-write pairs.

2. ~~**Server Action vs Cloud Function Duplication**~~ — **RESOLVED 2026-06-28 (R5):** All 11 UI components migrated from CF-primary/SA-fallback to SA-only. `functions.ts` trimmed to ~80 lines (archive, lookup, stats, membership activation CFs only). Server Actions are now the sole write path for all member/staff/gym/program/PT operations.

3. **Collection-Group and Full-Collection Scans** *(audited in depth 2026-06-28 — see `docs/12_ARCHITECTURE_AUDIT_2026.md` Sections B, D, E)*
   - ~~**`getGymWorkspaces`:** Does 3 parallel full-collection scans (gyms + collectionGroup members + authProfiles by role).~~ **RESOLVED 2026-06-28:** now reads only `gyms` and uses denormalized `memberCount`.
   - ~~**`getGymDetail`:** Fetches all member documents for a gym just to count them.~~ **RESOLVED 2026-06-28:** now uses `mapWorkspace(...).memberCount` from the gym doc.
   - **`getMemberNotifications` / progress read-models:** Main member layout/profile/privacy call sites now pass `gymId` for direct gym-scoped reads. ~~Progress history pagination~~ **RESOLVED 2026-06-29:** `getLiftLogsForMember` (limit 500), `getDayLogsForMember` (limit 365), `getBodyMetricLogsForMember` (limit 365) now add `.orderBy("loggedAt","desc").limit(N)` to both scoped and collectionGroup paths. Remaining: remove root fallbacks after legacy backfill.
   - ~~**`getGymFloorLoadMap`:** Calls 4 `*Uncached` functions + authProfiles scan on every render.~~ **RESOLVED 2026-06-29:** switched to `getMembers`, `getWorkoutPrograms`, `getExerciseCatalog` (all `unstable_cache`-backed). `getActiveProgramAssignments` already used React `cache()`.

4. ~~**Embedded Notices Array**~~ — **RESOLVED 2026-06-28:** `addGymNotice` and `deleteGymNotice` now wrap their array modifications in a Firestore transaction to prevent concurrent edits from clobbering data.

5. ~~**Notification Type Union Drift**~~ — Fixed 2026-06-05 (R6): `payment_request_pending`, `payment_request_rejected`, and `data_deletion_request` are present in `src/types/domain.ts:435-440` with dedicated icons in `notification-list.tsx`.

6. ~~**Unused Code & Legacy CSS**~~ — **RESOLVED 2026-06-28:** Removed `workoutSplitTemplates` from `collections.ts` and deleted dead legacy CSS (`01-owner-members.css` and `ep-modal.css`).

7. ~~**`syncOfflineLifts` Missing Gym-Scoped Mirror + Non-Idempotent IDs**~~ — **RESOLVED 2026-06-28:** offline lift sync now writes deterministic gym-scoped lift docs in one batch. It reuses the offline/client ID when present and falls back to a stable composite ID.

8. ~~**Notification Writes Are Sequential, Not Batched**~~ — **RESOLVED 2026-06-28:** Introduced `batchMirrorGymScopedRecords` in `actions/shared.ts` to batch-write multi-document flows. Implemented in `programs.ts` to batch assignment, notification, and activity logs in a single Firestore transaction.

9. ~~**Auth Profile Firestore Read on Every SSR Request**~~ — **RESOLVED 2026-06-28:** `requireRole()` and `getCurrentUser()` now read profile data embedded directly into the Firebase Session Cookie claims (injected at login via `beforeUserSignedIn` blocking function). Firestore is only queried as a fallback for legacy sessions.

10. ~~**No B2B2C Gym Subscription Schema**~~ — **RESOLVED 2026-06-28:** Added `subscription: { tier, billedUntil, stripeCustomerId }` to `GymWorkspace` type and `mapWorkspace` parser to prepare for B2B billing integrations.
