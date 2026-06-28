# 11 · KNOWN ISSUES & GAPS (Tier 2)

`Generated: 2026-06-05 · Last updated: 2026-06-28`

> **Purpose.** This file aggregates all known bugs, incomplete functionalities, and technical debt across the FitSplit platform. It serves as the backlog for future maintenance and refactoring.

## High Priority Bugs

*None currently identified. Previous high-priority bugs (Trainer auth, PT privacy, Lockout mismatch) and all High/Moderate dependency vulnerabilities (Next.js, UUID, PostCSS, Vite/protobufjs transitive advisories, etc.) were resolved. Latest dependency audit on 2026-06-28 reports 0 root and 0 `/functions` vulnerabilities. T&C gate showing on every login (not first-time-only) resolved 2026-06-06.*

## Incomplete Functionalities

1. ~~**Muscle Target Descriptions in Mock Data**~~ — **RESOLVED 2026-06-28:** All 66 entries in `workouts.json` carried `muscle_target_description` already (added 2026-06-15). Confirmed complete.

2. ~~**Exercise JSON Catalog Deep Cleanup**~~ — **RESOLVED 2026-06-28:** All 66 entries in `src/lib/workouts.json` now carry per-entry `muscleGroup`, `equipment` (actual equipment: barbell/dumbbell/cable/machine/bodyweight/ez_bar/smith_machine), and `movementPattern` fields. The `mock-data.ts` mapper was also fixed: it was incorrectly assigning `mechanic` (Compound/Isolation) to the `equipment` field — it now reads `catalogExercise.equipment` directly and surfaces `movementPattern` on the `Exercise` type. `tsc --noEmit` clean.

3. **Billing & Stripe Integration**
   - **Issue:** Payment processing is currently mocked (cash approval flow works, Card/UPI are mock/integration-ready only).
   - **Impact:** B2C payments are not fully supported end-to-end.
   - **Fix Required:** Only implement if explicitly back on roadmap. Out of scope for current builds.

6. **Production Geofence Coordinates for Attendance** *(backlogged 2026-06-15)*
   - **Issue:** `validateGymGeofence` (`src/lib/firebase/actions/shared.ts`) reads `latitude`/`longitude`/`radiusMeters` from the gym doc (falling back to `SHG_GYM_*` env vars). SHG's gym doc has no coordinates set, so the function returns `geofenceStatus: "not_configured"` and **allows every check-in** — the attendance-integrity feature is effectively inert.
   - **Impact:** Geofenced attendance does not actually constrain check-ins until coordinates are entered. Members can start a workout/attendance session from anywhere.
   - **Fix Required:** Enter SHG's real lat/lng/radius in `/owner/settings` (or set `SHG_GYM_LATITUDE`/`SHG_GYM_LONGITUDE`/`SHG_GYM_RADIUS_METERS`). Data-entry task; no code change needed. Until then the feature is a no-op by design (fails open).

4. ~~**Security Rule Tests & Pre-commit Hooks**~~ — **RESOLVED 2026-06-28:** `.github/workflows/firestore-rules.yml` created. Triggers on push/PR to `main` when `firestore.rules` or the test script changes. Installs Node 22 + Java 21 (Temurin), runs `firebase emulators:exec --only firestore --project demo-fitsplit "npm run test:rules"` (34 tests). Husky/ESLint warning cleanup remains a separate item (low priority).

5. ~~**`phones` collection missing Firestore security rule**~~ — Fixed 2026-06-05: explicit `allow read, write: if false` block added to `firestore.rules` alongside the `usernames` rule.

## Architecture & Tech Debt

1. **Dual-Write Dominant Complexity (Root vs Gym-Scoped)** *(R4 — operational write pairs resolved 2026-06-28)*
   - **Issue:** Legacy root mirrors still exist and many read-models keep root fallbacks for migration safety.
   - **Impact:** Doubles write cost, invites drift, forces defensive read logic.
   - **Progress 2026-06-28:** Root writes removed from `members.ts` (activityEvents ×3), `staff.ts` (activityEvents ×2), `programs.ts` (programAssignments + notifications + activityEvents ×7), `pt.ts` (ptSessions, ptLiftLogs, liftLogs, notifications ×3), `exercises.ts` (exerciseCatalog, exerciseRequests, notifications), `contact.ts` (contactMessages, notifications). Gym-scoped writes via `mirrorGymScopedRecord` are now the sole path for all operational collections.
   - **Progress 2026-06-28:** `progress.ts` hot paths now write gym-scoped only for lift logs, body metrics, day logs, macro logs, activity logs, workout sessions, and attendance records. `syncOfflineLifts` now writes deterministic gym-scoped lift docs instead of root-only random IDs.
   - **Remaining:** Keep root fallbacks only until legacy data is backfilled or archived; then remove fallback queries collection by collection.
   - **Remaining:** `exercises.ts` lines 272/346/435 are intentional admin-global catalog writes, not dual-write pairs.

2. ~~**Server Action vs Cloud Function Duplication**~~ — **RESOLVED 2026-06-28 (R5):** All 11 UI components migrated from CF-primary/SA-fallback to SA-only. `functions.ts` trimmed to ~80 lines (archive, lookup, stats, membership activation CFs only). Server Actions are now the sole write path for all member/staff/gym/program/PT operations.

3. **Collection-Group and Full-Collection Scans** *(audited in depth 2026-06-28 — see `docs/12_ARCHITECTURE_AUDIT_2026.md` Sections B, D, E)*
   - ~~**`getGymWorkspaces`:** Does 3 parallel full-collection scans (gyms + collectionGroup members + authProfiles by role).~~ **RESOLVED 2026-06-28:** now reads only `gyms` and uses denormalized `memberCount`.
   - ~~**`getGymDetail`:** Fetches all member documents for a gym just to count them.~~ **RESOLVED 2026-06-28:** now uses `mapWorkspace(...).memberCount` from the gym doc.
   - **`getMemberNotifications` / progress read-models:** Main member layout/profile/privacy call sites now pass `gymId` for direct gym-scoped notification/body-metric reads. Remaining work: remove migration fallbacks after legacy backfill and add windows/pagination for lifetime progress history.
   - **`getGymFloorLoadMap`:** Calls 4 `*Uncached` functions + authProfiles scan on every render. Fix: add server-side cache, use cached function variants.

4. **Embedded Notices Array**
   - **Issue:** `addGymNotice` / `deleteGymNotice` read-modify-write the whole `gyms.notices[]` array.
   - **Impact:** Concurrent edits will clobber data.
   - **Fix Required:** Move to a subcollection or use array-union transactions.

5. ~~**Notification Type Union Drift**~~ — Fixed 2026-06-05 (R6): `payment_request_pending`, `payment_request_rejected`, and `data_deletion_request` are present in `src/types/domain.ts:435-440` with dedicated icons in `notification-list.tsx`.

6. **Unused Code & Legacy CSS**
   - **Issue:** `workoutSplitTemplates` declared but unused. Legacy CSS like `01-owner-members.css` and `ep-modal.css` are still floating in the repo.
   - **Fix Required:** Audit and remove dead CSS and unused Firestore collections.

7. ~~**`syncOfflineLifts` Missing Gym-Scoped Mirror + Non-Idempotent IDs**~~ — **RESOLVED 2026-06-28:** offline lift sync now writes deterministic gym-scoped lift docs in one batch. It reuses the offline/client ID when present and falls back to a stable composite ID.

8. **Notification Writes Are Sequential, Not Batched** *(discovered 2026-06-28)*
   - **Issue:** Multi-notification events (PT booking = 3 notifications, program assign = 2) write each notification with a separate `await mirrorGymScopedRecord()` call — N sequential round-trips.
   - **Fix Required:** Add `batchMirrorGymScopedRecords()` helper in `actions/shared.ts`. See `docs/12_ARCHITECTURE_AUDIT_2026.md` Section F.

9. **Auth Profile Firestore Read on Every SSR Request** *(discovered 2026-06-28)*
   - **Issue:** `requireRole()` reads `authProfiles/{uid}` on every server-rendered page. Next.js `cache()` deduplicates within a request but not across requests from the same user.
   - **Fix Required:** Embed `isActive`, `gymId`, `memberId` in session cookie claims at login; `requireRole()` reads cookie instead of Firestore. See `docs/12_ARCHITECTURE_AUDIT_2026.md` Section I.

10. **No B2B2C Gym Subscription Schema** *(discovered 2026-06-28)*
    - **Issue:** The `gyms/{gymId}` document has no subscription tier, billing cycle, or payment method. Onboarding a new gym is a manual admin operation.
    - **Fix Required:** Add `subscription: { tier, billedUntil, stripeCustomerId }` to gym doc before B2B sales begin. See `docs/12_ARCHITECTURE_AUDIT_2026.md` Section L2.
