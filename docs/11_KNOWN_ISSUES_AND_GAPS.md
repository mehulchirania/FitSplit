# 11 · KNOWN ISSUES & GAPS (Tier 2)

`Generated: 2026-06-05`

> **Purpose.** This file aggregates all known bugs, incomplete functionalities, and technical debt across the FitSplit platform. It serves as the backlog for future maintenance and refactoring.

## High Priority Bugs

1. **Trainer Role Authentication Failures**
   - **Issue:** `createStaffAccount` and `createTrainer` create `role:"trainer"` users, but the session authentication middleware (`lib/auth.ts:306`) and cookie fallback only accept `admin|owner|member`.
   - **Impact:** A pure trainer cannot log in via the app session path. (Currently masked because demo trainers are `role:"owner"` + `staffType:"trainer"`).
   - **Fix Required:** Add `"trainer"` to accepted-role checks in `lib/auth.ts` and ensure `/trainer` routes work end-to-end.

2. **Root PT Collections Privacy Leak**
   - **Issue:** Root `ptSessions` and `ptLiftLogs` Firestore rules (`firestore.rules:424,432`) let any gym member read **any** PT session/lift log in that gym. 
   - **Impact:** Privacy leak. (The gym-scoped path is correctly restricted to the owning member).
   - **Fix Required:** Tighten root rules to `resource.data.memberId == memberId()` or deprecate the root PT mirror entirely.

3. **Lockout Key Mismatch Weakens Brute-Force Defense**
   - **Issue:** Identifier-based locks are written to `loginAttempts/{rawIdentifier}` (`lib/auth.ts:589`), but the Auth blocking trigger reads `loginAttempts/{email}` (`functions/src/index.ts:1912`).
   - **Impact:** Direct-SDK sign-ins may bypass identifier locks.
   - **Fix Required:** Standardize on a single key (lowercased email) across both paths.

## Incomplete Functionalities

1. **Muscle Target Descriptions in Mock Data**
   - **Issue:** `lib/workouts.json` has 66 exercises, but they lack the `muscleTargetDescription` field. 
   - **Impact:** The exercise detail UI pill won't render descriptions for mock exercises, only for those manually patched in Firestore.
   - **Fix Required:** One-pass fill of all 66 entries with specific muscle focus (e.g. "Targets the lateral and long head of the triceps…").

2. **Exercise JSON Catalog Deep Cleanup**
   - **Issue:** Mock data in `lib/workouts.json` lacks normalized `muscleGroup`, `equipment`, or `movementPattern` fields on individual entries.
   - **Impact:** Slower parsing; relies on top-level keys. 
   - **Fix Required:** Add per-entry fields, deduplicate across groups, and cross-reference every `exerciseId` in `gyms/*/workoutPrograms` against the JSON IDs.

3. **Billing & Stripe Integration**
   - **Issue:** Payment processing is currently mocked (cash approval flow works, Card/UPI are mock/integration-ready only).
   - **Impact:** B2C payments are not fully supported end-to-end.
   - **Fix Required:** Only implement if explicitly back on roadmap. Out of scope for current builds.

4. **Security Rule Tests & Pre-commit Hooks**
   - **Issue:** Need `@firebase/rules-unit-testing` and an emulator in CI to test Firestore rules before deploy. Husky baseline is added but ESLint warnings need cleanup.
   - **Impact:** CI/CD pipeline does not validate Firestore rules automatically.

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

5. **Notification Type Union Drift**
   - **Issue:** Billing code emits `payment_request_pending`/`payment_request_rejected` which aren't in `types/domain.ts` union.
   - **Impact:** UI may fall back to default icons or fail to render properly.
   - **Fix Required:** Add types to union and notification-list icon map.

6. **Unused Code & Legacy CSS**
   - **Issue:** `workoutSplitTemplates` declared but unused. Legacy CSS like `01-owner-members.css` and `ep-modal.css` are still floating in the repo.
   - **Fix Required:** Audit and remove dead CSS and unused Firestore collections.
