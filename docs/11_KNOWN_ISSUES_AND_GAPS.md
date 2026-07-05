# 11 · KNOWN ISSUES & GAPS

> **Purpose.** This file aggregates all known bugs, incomplete functionalities, and technical debt across the FitSplit platform. It serves as the backlog for future maintenance and refactoring.

## High Priority Bugs
*(No active high-priority bugs at this time.)*

## Incomplete Functionalities

1. **Billing & Stripe Integration**
   - **Issue:** Payment processing is currently mocked (cash approval flow works, Card/UPI are mock/integration-ready only).
   - **Impact:** B2C payments are not fully supported end-to-end.
   - **Fix Required:** Only implement if explicitly back on roadmap. Out of scope for current builds.

## Architecture & Tech Debt

1. **Dual-Write Dominant Complexity (Root vs Gym-Scoped)** *(R4 — operational write pairs resolved 2026-06-28)*
   - **Issue:** Legacy root mirrors still exist and many read-models keep root fallbacks for migration safety.
   - **Impact:** Doubles write cost, invites drift, forces defensive read logic.
   - **Progress 2026-06-28:** Root writes removed from `members.ts` (activityEvents ×3), `staff.ts` (activityEvents ×2), `programs.ts` (programAssignments + notifications + activityEvents ×7), `pt.ts` (ptSessions, ptLiftLogs, liftLogs, notifications ×3), `exercises.ts` (exerciseCatalog, exerciseRequests, notifications), `contact.ts` (contactMessages, notifications). Gym-scoped writes via `mirrorGymScopedRecord` are now the sole path for all operational collections.
   - **Progress 2026-06-28:** `progress.ts` hot paths now write gym-scoped only for lift logs, body metrics, day logs, macro logs, activity logs, workout sessions, and attendance records. `syncOfflineLifts` now writes deterministic gym-scoped lift docs instead of root-only random IDs.
   - **Progress 2026-07-05:** `scripts/backfill-root-to-gym.mjs` and `docs/17_ROOT_BACKFILL_RUNBOOK.md` now cover the dry-run-first legacy root data copy into `gyms/{gymId}/...`; not run against production by agents.
   - **Remaining:** Run the backfill against production data, verify history, then archive/remove legacy root collections when safe.
   - **Remaining:** `exercises.ts` lines 272/346/435 are intentional admin-global catalog writes, not dual-write pairs.

2. **Collection-Group and Full-Collection Scans** *(audited in depth 2026-06-28 — see `docs/12_ARCHITECTURE_AUDIT_2026.md` Sections B, D, E)*
   - **`getMemberNotifications` / progress read-models:** Main member layout/profile/privacy call sites now pass `gymId` for direct gym-scoped reads. Remaining: remove root fallbacks after legacy backfill.

## Recently Resolved (July 2026)

*The following items were resolved in recent sprints (see `PROJECT_HANDOFF.md` for details).*

- **Attendance/workout session writers orphaned:** `logLiftSet` and `syncOfflineLifts` now upsert deterministic daily `workoutSessions` and `attendanceRecords` with `status: "completed"`.
- **Day completion/makeup writers orphaned:** `FocusedDayView` now exposes `completed`, `skipped`, and `modified` day-log states through the existing deterministic path.
- **Production Geofence Coordinates for Attendance:** explicit GPS check-in/start-workout actions removed; attendance now accrues from lift logging.
- **Exercise JSON Catalog Deep Cleanup:** All 66 entries carry correct `equipment`, `movementPattern`, and `muscleGroup` mapping.
- **Muscle Target Descriptions in Mock Data:** All 66 entries carry `muscle_target_description`.
- **Security Rule Tests & Pre-commit Hooks:** `.github/workflows/firestore-rules.yml` created.
- **`phones` collection missing Firestore security rule:** fixed via explicit `allow read, write: if false`.
- **Server Action vs Cloud Function Duplication:** All UI components migrated to SA-only; `functions.ts` trimmed.
- **Embedded Notices Array:** Wrapped in Firestore transaction.
- **Notification Type Union Drift:** Fixed dedicated icons.
- **Unused Code & Legacy CSS:** Removed `workoutSplitTemplates` and legacy CSS.
- **`syncOfflineLifts` Missing Gym-Scoped Mirror:** Now writes deterministic gym-scoped lift docs in one batch.
- **Notification Writes Are Sequential:** Introduced `batchMirrorGymScopedRecords` to batch-write multi-document flows.
- **Auth Profile Firestore Read on SSR:** Profile data is now embedded into the Firebase Session Cookie claims.
- **No B2B2C Gym Subscription Schema:** Added `subscription` to `GymWorkspace`.
