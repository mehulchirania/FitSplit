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

1. **Dual-Write Dominant Complexity (Root vs Gym-Scoped)**
   - **Issue:** Almost every collection is written twice (`mirrorGymScopedRecord`/`mirrorProfileToGym`), and every read-model falls back to root.
   - **Impact:** Doubles write cost, invites drift, forces defensive read logic.
   - **Fix Required:** Consolidate to gym-scoped data as the single source of truth, backfill root-only data, and remove root mirrors.

2. **Server Action vs Cloud Function Duplication**
   - **Issue:** Member/staff/gym operations exist as both Server Actions (used by UI) and Cloud Functions (often unused; `allow:false` rules assume CF).
   - **Impact:** Logic drift (e.g., side-effect handling differs).
   - **Fix Required:** Standardize on one surface per operation and treat the other as dead code.

3. **Collection-Group and Full-Collection Scans**
   - **Issue:** `getGymWorkspaces` and `generateAdminDashboardStats` iterate large collections without utilizing denormalized counters optimally.
   - **Impact:** Performance degradation as the platform scales.
   - **Fix Required:** Rely purely on `summaries/dashboard` and `gyms.memberCount`.

4. **Embedded Notices Array**
   - **Issue:** `addGymNotice` / `deleteGymNotice` read-modify-write the whole `gyms.notices[]` array.
   - **Impact:** Concurrent edits will clobber data.
   - **Fix Required:** Move to a subcollection or use array-union transactions.

5. ~~**Notification Type Union Drift**~~ — Fixed 2026-06-05 (R6): `payment_request_pending`, `payment_request_rejected`, and `data_deletion_request` are present in `src/types/domain.ts:435-440` with dedicated icons in `notification-list.tsx`.

6. **Unused Code & Legacy CSS**
   - **Issue:** `workoutSplitTemplates` declared but unused. Legacy CSS like `01-owner-members.css` and `ep-modal.css` are still floating in the repo.
   - **Fix Required:** Audit and remove dead CSS and unused Firestore collections.
