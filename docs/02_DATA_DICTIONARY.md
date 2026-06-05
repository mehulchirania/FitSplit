# 02 · DATA DICTIONARY (Tier 1) — THE core doc

`Generated: 2026-06-05 · Commit: c0e1f4b`

> Supersedes `FIRESTORE_STRUCTURE.md`. One entry per Firestore collection / subcollection.
> Field tables list **observed** fields (from write sites + read mappers + `types/domain.ts`).
> **Declared vs used:** a collection key in `collections.ts` is *declared*; "Reads/Writes"
> sections show whether it is *actually used*.
>
> **Dual-storage note (applies to nearly all gym-scoped collections).** Most collections are
> written to BOTH `gyms/{gymId}/<name>` and a root mirror `<name>` (with a `gymId` field) via
> `mirrorGymScopedRecord`/`mirrorProfileToGym` (`actions/shared.ts:315-415`). Read-models prefer
> the gym-scoped copy and fall back to root. Each entry notes this where relevant.

## Collection inventory

**Declared gym-scoped** (`collections.ts:35-64`): members, staff, exerciseCatalog,
exerciseRequests, workoutPrograms, workoutSplitTemplates, notifications, liftLogs,
programAssignments, activityEvents, workoutSessions, attendanceRecords, bodyMetricLogs,
dayLogs, ptSessions, ptLiftLogs, macroLogs, activityLogs, packages, memberships,
paymentRequests, summaries.

**Declared root** (`collections.ts:1-33`): gyms, profiles (legacy), authProfiles, memberships,
exerciseCatalog, exerciseRequests, workoutPrograms, notifications, workoutSplitTemplates,
liftLogs, programAssignments, activityEvents, workoutSessions, contactMessages, siteLinks,
attendanceRecords, bodyMetricLogs, dayLogs, archives, ptSessions, ptLiftLogs, macroLogs,
activityLogs, usernames, platformSummaries. Plus `loginAttempts` (used in code, not in
`collections.ts` — `lib/auth.ts:575`, `firestore.rules:441`).

---

## gyms  *(root)*
- **Scope:** root `gyms/{gymId}` (`collections.ts:2`, `collections.ts:71`).
- **Purpose:** tenant root document — gym profile, branding, geofence, notices, settings.
- **Example document:**
```json
{
  "id": "shg", "name": "Sri Shakthi Hanuman Gym", "slug": "shg",
  "ownerUserId": "santosh-shg", "ownerId": "santosh-shg", "status": "active",
  "expiryWarningDays": 7, "memberCount": 12, "logoUrl": "/shg-gym-logo.jpeg",
  "logoPath": "gym-logos/shg/logo-512.png", "location": "…", "locationUrl": "https://maps…",
  "phone": "…", "email": "…", "instagram": "", "linkedin": "", "youtube": "",
  "latitude": 12.9, "longitude": 77.6, "radiusMeters": 150,
  "trainerMemberVisibility": "assigned_only",
  "notices": [{ "id": "…", "type": "tip", "title": "…", "body": "…", "isActive": true, "order": 1, "createdAt": "…" }]
}
```
- **Fields:** `GymWorkspace` type (`types/domain.ts:41-74`). Key: `status` `active|paused|inactive`;
  `trainerMemberVisibility` `assigned_only|all_pt_members|all_members` (`types/domain.ts:13`);
  `expiryWarningDays` (default 7); geofence `latitude/longitude/radiusMeters`; `notices[]`
  (embedded `GymNotice`, `types/domain.ts:31-39`).
- **Relationships:** parent of all gym-scoped subcollections; `ownerUserId`/`ownerId` → `authProfiles`.
- **Reads:** `read-models/gyms.ts:18-120` (`getGymWorkspaces`, `getGymDetail`, `getPrimaryWorkspace`);
  geofence read `actions/shared.ts:481-495`.
- **Writes:** `ensurePrimaryWorkspace` (`actions/gyms.ts:140`); `createGymWorkspace`
  (`actions/gyms.ts:260` / CF `functions/src/index.ts:483`); `updateGymDetails`
  (`actions/gyms.ts:450` / CF `:538`); `updateGymLogo` (`actions/gyms.ts:494` / CF `:580`);
  `setGymStatus`/`setGymAccessStatus` (`actions/gyms.ts:544` / CF `:614`); notices
  `addGymNotice`/`deleteGymNotice` (`actions/gyms.ts:609,645`); `memberCount` increment on member
  create/delete (`actions/members.ts:138`, `functions/src/index.ts:396,1123`);
  `updateTrainerVisibilityAction` (`actions/billing.ts:186`).
- **Deletes:** `deleteGymWorkspace`/`deleteGymWithMembers` (`actions/gyms.ts:319,357`),
  `archiveGymWorkspace` CF (`functions/src/index.ts:1151`). Primary gym `shg` protected
  (`actions/gyms.ts:332`, `functions/src/index.ts:1157`).
- **Security rules:** read `isGymUser`; create/delete admin; update admin or owner
  (`firestore.rules:101-104`).
- **Tenant isolation:** the gym doc *is* the tenant boundary; rules scope by `gymId` param.
- **Indexes:** none specific.
- **Migration risks:** `notices` stored as an embedded array — concurrent edits can clobber
  (read-modify-write in `addGymNotice`).

## authProfiles  *(root)*
- **Scope:** root `authProfiles/{uid}` (`collections.ts:8`).
- **Purpose:** lightweight auth/session lookup index + denormalised profile snapshot. Source of
  truth for login resolution and many cross-cutting reads.
- **Fields (observed):** `id`, `authUid`, `email`, `authEmail`, `username`, `phone`, `fullName`,
  `role`, `staffType`, `defaultGymId`, `gymId`, `isActive`, `mustChangePassword`, `authIndexOnly`,
  `updatedAt` (`actions/shared.ts:335-355`). Also carries denormalised member fields when mirrored:
  `membershipStatus`, `membershipEndDate`, `currentPackageName` (`functions/src/index.ts:1508-1510`),
  `assignedTrainerId`, `isPT` (`functions/src/index.ts:1337-1339`), `fcmToken`/`fcmTokenUpdatedAt`
  (`actions/notifications.ts:81`), `primarySlot`/`secondarySlot`, body metrics, coach note, lockout
  fields `failedLoginAttempts`/`lockedUntil`/`lastFailedLoginAt` (`lib/auth.ts:540-564`),
  soft-delete `isDeleted`/`deletedAt` (`actions/members.ts:743`).
- **Relationships:** `defaultGymId` → `gyms`; mirrors `gyms/{gymId}/members|staff`.
- **Reads:** login (`lib/auth.ts:325-420`), `getMemberProfileDocument` (`read-models/shared.ts:47`),
  trainers/owners/floor-load reads (`read-models/members.ts`, `read-models/gyms.ts`).
- **Writes:** `writeAuthProfileIndex` (`actions/shared.ts:357`), `authProfilePayload`
  (`actions/shared.ts:335`); many actions + CFs (member/staff create, toggle, billing approve).
- **Security rules:** read admin/owner-for-gym/trainer-for-gym/self; create/delete admin or
  owner-for-member; self-update limited to a whitelist of fields (`firestore.rules:305-319`).
- **Tenant isolation:** `profileGym(data)` (`firestore.rules:69`) used in rule checks; writes are
  Admin-SDK.
- **Indexes:** queries on `username`, `phone`, `email`, `authEmail`, `defaultGymId`+`role`
  (login & lists). `profiles` composite index in `firestore.indexes.json` (defaultGymId+role+isActive).
- **Migration risks:** denormalised fields can drift from the gym-scoped member/staff doc; both
  must be updated together (the actions do this).

## profiles  *(root, legacy)*
- **Scope:** root `profiles/{uid}` (`collections.ts:3-5`).
- **Purpose:** legacy profile collection. Kept only as a migration fallback.
- **Reads:** fallback in login & profile resolution (`lib/auth.ts:331`, `read-models/shared.ts:59`).
- **Writes:** none active (delete-only cleanup, e.g. `actions/members.ts:803`).
- **Security rules:** read admin/owner/self; all writes `allow:false` (`firestore.rules:321-326`).
- **Tenant isolation:** via `profileGym`.
- **Migration risks:** treat as read-only legacy; do not write here.

## usernames  *(root)*
- **Scope:** root `usernames/{normalizedUsername}` (`collections.ts:29-30`).
- **Purpose:** atomic username-uniqueness index. Doc id = normalized username.
- **Fields:** `profileId`, `reservedAt` (`actions/members.ts:124`).
- **Writes:** reserved/released inside member create/update transactions
  (`actions/members.ts:114-148, 244-256`).
- **Security rules:** read/write `allow:false` (`firestore.rules:445`) — Admin SDK only.

## loginAttempts  *(root)* ⚠️ not in collections.ts
- **Scope:** root `loginAttempts/{normalizedIdentifier-or-email}`.
- **Purpose:** identifier-based login lockout counter (fires before email resolution).
- **Fields:** `failedLoginAttempts`, `lockedUntil`, `lastFailedLoginAt` (`lib/auth.ts:585-609`).
- **Reads/Writes:** `lib/auth.ts:569-609`; read by `blockLockedAccounts` CF keyed on email
  (`functions/src/index.ts:1912`).
- **Security rules:** `allow:false` (`firestore.rules:441`).
- **Note:** the server-action path keys lockout docs by raw identifier; the blocking trigger keys
  by email — see [DISCREPANCIES](DISCREPANCIES.md).

## archives  *(root)*
- **Scope:** root `archives/{entityType_origId_ts_rand}` (`collections.ts:24`).
- **Purpose:** soft-delete archive with 60-day retention.
- **Fields:** `id`, `entityType`, `originalId`, `originalPath`, `gymId`, `reason`, `deletedBy`,
  `archivedAt`, `retentionDays:60`, `retentionExpiresAt`, `data` (full snapshot)
  (`actions/shared.ts:248-260`).
- **Writes:** `archiveDocumentSnapshot`/`archiveQuerySnapshot` (`actions/shared.ts:235-281`),
  CF `archiveSnapshot` (`functions/src/index.ts:285`).
- **Deletes:** daily `purgeExpiredArchives` where `retentionExpiresAt <= now`
  (`functions/src/index.ts:1752`).
- **Security rules:** read admin; write `allow:false` (`firestore.rules:455-458`).

## platformSummaries  *(root)*
- **Scope:** root `platformSummaries/main` (`collections.ts:31-32`).
- **Purpose:** cross-gym admin aggregate (totals).
- **Fields:** `totalGyms`, `totalMembers`, `totalTrainers`, `lastComputedAt`
  (`functions/src/index.ts:1672-1675`).
- **Writes:** `generateAdminDashboardStats` CF (`functions/src/index.ts:1655`).
- **Security rules:** read admin; write `allow:false` (`firestore.rules:450-453`).

---

## members  *(gym-scoped)*
- **Scope:** `gyms/{gymId}/members/{memberId}` (`collections.ts:36`). Mirror of member's
  `authProfiles` doc.
- **Purpose:** canonical gym member record (identity, body metrics, training context, denormalised
  membership + PT fields).
- **Example document:**
```json
{
  "id": "uuid", "fullName": "Aarav Sharma", "email": "aarav@example.com",
  "authEmail": "uuid@members.fitsplit.app", "username": "aarav", "phone": "+91 …",
  "role": "member", "defaultGymId": "shg", "gymId": "shg", "goal": "Build muscle",
  "avatarInitials": "AS", "isActive": true, "joinedAt": "2026-05-01",
  "isPT": true, "assignedTrainerId": "trainer-uid",
  "membershipStatus": "active", "membershipEndDate": "2026-12-31", "currentPackageName": "Monthly",
  "primarySlot": "A", "secondarySlot": "D", "coachNote": "…", "macroNutritionTarget": { "calories": 2200 }
}
```
- **Fields:** `MemberProfile` (`types/domain.ts:85-135`). Self-editable subset: `age, heightCm,
  weightKg, goal, fitnessGoals, phone, updatedAt` (`firestore.rules:116-117`).
- **Relationships:** child of `gyms`; `assignedTrainerId` → staff; mirrored to `authProfiles`.
- **Reads:** `read-models/members.ts` (`getMembers`, `getMemberDetail`, `getMemberWithProfile`,
  `getProfileMetrics`, `getMembersForTrainer` `:374`), floor-load (`read-models/gyms.ts:234`).
- **Writes:** `createMemberProfile` (`actions/members.ts:45`) / `createMemberAccount` CF
  (`functions/src/index.ts:346`); `updateMemberProfile`/`updateOwnerMemberContext`/
  `updateProfileMetrics` (`actions/members.ts:173,303,414`); `assignTrainerToMember`
  (`actions/members.ts:678`) / `assignTrainerToPTMember` CF (`:1311`); coach note
  (`actions/progress.ts:223`); billing denormalise (`actions/billing.ts:127`,
  `functions/src/index.ts:1509`); toggle access (`actions/members.ts:579`).
- **Deletes:** `deleteMemberProfile` (`actions/members.ts:713`), `archiveMemberAccount` CF
  (`functions/src/index.ts:1093`) — cascade deletes member-owned data + archives.
- **Security rules:** read admin/owner/trainer/self; create+delete `allow:false`; update
  admin/owner or self-with-field-whitelist (`firestore.rules:106-119`).
- **Tenant isolation:** path `gyms/{gymId}/members`; rule fns scope by gymId; actions call
  `assertMemberBelongsToCallerGym` (`actions/shared.ts:515`).
- **Indexes:** `members` composite `assignedTrainerId+isPT` (trainer visibility, `firestore.indexes.json`).
- **Migration risks:** must stay in sync with `authProfiles` mirror; trainer-visibility query needs
  `isPT`/`assignedTrainerId` populated.

## staff  *(gym-scoped)*
- **Scope:** `gyms/{gymId}/staff/{userId}` (`collections.ts:37`). Mirror of staff `authProfiles`.
- **Purpose:** gym staff record (owners + trainers). `staffType` `owner|trainer|staff`.
- **Fields:** like member profile plus `staffType`, `mustChangePassword`, `assignedMemberIds[]`
  (trainers) (`functions/src/index.ts:1293-1299`).
- **Reads:** `getTrainersForGym`/`getOwnersForGym` (`read-models/members.ts:317`,
  `read-models/gyms.ts:122`); owner lookups in billing CFs (`functions/src/index.ts:1450`).
- **Writes:** `createOwnerProfile` (`actions/staff.ts:86`) / `createStaffAccount`+`createTrainer`
  CF (`functions/src/index.ts:429,1272`); `updateStaffProfile` (`actions/staff.ts:177`);
  `assignTrainerToPTMember` updates `assignedMemberIds` (`functions/src/index.ts:1345`).
- **Deletes:** `deleteGymStaffProfile` (`actions/staff.ts:216`), `archiveStaffAccount` CF (`:663`).
- **Security rules:** read admin/staff-for-gym/self; create/update/delete `allow:false`
  (`firestore.rules:121-126`).
- **Tenant isolation:** path-scoped; writes Admin-SDK.
- **Migration risks:** role vs staffType duality (owner-role + trainer-staffType vs trainer-role).

## exerciseCatalog  *(gym-scoped + root global)*
- **Scope:** `gyms/{gymId}/exerciseCatalog/{id}` (gym custom) AND root `exerciseCatalog/{id}`
  (FitSplit global, `gymId:"global"`, `scope:"default"`) (`collections.ts:11,38`).
- **Purpose:** exercise definitions (name, muscle group, equipment, instructions, videos).
- **Fields:** `Exercise` (`types/domain.ts:264-288`) + `scope` `default|custom`, `gymId`,
  `isActive`, `showTutorial`, `gymVideoUrl/gymVideoSource`, `approvedFromRequestId`
  (`actions/exercises.ts:135-153, 253-270`).
- **Reads:** `getExerciseCatalog`/`getExerciseCatalogUncached` (`read-models/exercises.ts:15`) —
  merges mock defaults + persisted, dedupes by name.
- **Writes:** `createCatalogExercise`/`updateCatalogExercise` (`actions/exercises.ts:226,297`);
  `setGymExerciseVideo` (`:364`); `resetExerciseVideos` (`:401`); tutorial visibility
  (`:467,502`); approval pipeline `approveCatalogExerciseRequest` (`:100`).
- **Security rules (gym):** read `isGymUser`; write admin or owner-for-gym (`firestore.rules:128-131`).
  **(root):** read signed-in; write admin only (`firestore.rules:328-331`).
- **Tenant isolation:** gym copy path-scoped; root copy is shared global (intentional).
- **Indexes:** `exerciseCatalog` `gymId+isActive` (`firestore.indexes.json`).
- **Migration risks:** name-collision dedup logic in read-model; gym custom overrides global by name.

## exerciseRequests  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/exerciseRequests/{id}` + root mirror (`collections.ts:12,39`).
- **Purpose:** owner-submitted requests for new catalog exercises; admin approves/rejects.
- **Fields:** `ExerciseRequest` (`types/domain.ts:382-394`): `gymId`, `gymName`, `requestedBy`,
  `name`, `muscleGroup`, `equipment?`, `instructions?`, `status` `pending|approved|rejected`.
- **Reads:** `getPendingExerciseRequests` (`read-models/exercises.ts:132`).
- **Writes:** `requestCatalogExercise` (`actions/exercises.ts:30`); approve/reject
  (`:100,180`).
- **Security rules (gym):** read/create `isGymUser`; update/delete admin or owner
  (`firestore.rules:241-245`). **(root):** read/create signed-in; update/delete admin or owner
  (`firestore.rules:414-418`).

## workoutPrograms  *(gym-scoped + root global)*
- **Scope:** `gyms/{gymId}/workoutPrograms/{id}` (custom) + root global (`collections.ts:12,40`).
- **Purpose:** multi-day workout program definitions.
- **Fields:** `WorkoutProgram` (`types/domain.ts:308-338`): `splitType`
  `ppl_x2|ppl_upper_lower|bro_split|combo_x2|custom`, `days[]` (`WorkoutDay`→`WorkoutExercise`),
  `source` `predefined|gym`, `isActive`, `scope`.
- **Reads:** `getWorkoutPrograms`/`Uncached` (`read-models/programs.ts:14`) — merges predefined
  (`lib/workouts.json` via `mock-data`/`split-library`) + gym custom, dedupes.
- **Writes:** `createCustomWorkoutProgram`/`updateCustomWorkoutProgram`/`createAndAssignCustomProgram`
  (`actions/programs.ts:427,336,545`).
- **Deletes:** `deleteCustomWorkoutProgram` (`actions/programs.ts:289`), `archiveCustomProgram` CF
  (`functions/src/index.ts:1133`).
- **Security rules (gym):** read `isGymUser`; write admin or owner (`firestore.rules:133-136`).
  **(root):** read signed-in; write admin (`firestore.rules:333-336`).

## workoutSplitTemplates  *(gym-scoped + root)* — declared, low usage
- **Scope:** `gyms/{gymId}/workoutSplitTemplates/{id}` + root (`collections.ts:14,41`).
- **Purpose:** split templates. **Declared** in collections + rules; no active read/write site
  found in this pass (split logic lives in `lib/split-library.ts` / `workouts.json`). ⚠️ likely
  orphaned — see [10_REFACTORING_ROADMAP](10_REFACTORING_ROADMAP.md).
- **Security rules (gym):** read `isGymUser`; write admin/owner (`firestore.rules:138-141`).
  **(root):** read signed-in; write admin (`firestore.rules:338-341`).

## programAssignments  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/programAssignments/{id}` + root (`collections.ts:16,42`).
- **Purpose:** which program a member is currently assigned. One active per member.
- **Fields:** `ProgramAssignment` (`types/domain.ts:340-346`) + `gymId`, `programTitle`,
  `memberName`, `createdBy`, `sideEffectsMode` (CF trigger flag, `functions/src/index.ts:784`).
- **Reads:** `getProgramAssignmentForMember`/`getActiveProgramAssignments`
  (`read-models/programs.ts:148,219`).
- **Writes:** `assignProgramToMember`/`bulkAssignProgram`/`generateAndAssignProgram`/
  `createAndAssignCustomProgram` (`actions/programs.ts:88,232,197,545`) and CF equivalents
  (`functions/src/index.ts:744,841`). New assignment cancels prior active ones.
- **Security rules:** read admin/owner/member/trainer; create/update/delete `allow:false`
  (`firestore.rules:190-194`, root `:364-367`).
- **Tenant isolation:** path-scoped + `assertMemberBelongsToCallerGym`.

## liftLogs  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/liftLogs/{id}` + root (`collections.ts:15,43`).
- **Purpose:** individual logged sets. Member self-logged or trainer-logged (PT dual-write).
- **Fields:** `LiftLog` (`types/domain.ts:396-411`): `memberId`, `exerciseId`, `weight`, `sets`,
  `reps`, `sessionId`, `loggedAt`, `source` `member|trainer`, `ptSessionId?`, `loggedByTrainerId?`.
- **Reads:** `getLiftLogsForMember` (`read-models/progress.ts:103`), calendar
  (`read-models/progress.ts:168`).
- **Writes:** `logLiftSet`/`syncOfflineLifts` (`actions/progress.ts:57,108`); **PT dual-write**
  `logPTLiftSet` (`actions/pt.ts:252-269`).
- **Security rules:** read admin/owner/trainer/owner-of-record; create requires `gymId==gymId` and
  admin/owner/member-scoped or trainer; update/delete admin/owner/member
  (`firestore.rules:159-167`, root `:358-362`).
- **Indexes:** `liftLogs` collection-group `memberId+loggedAt desc` (`firestore.indexes.json`).

## bodyMetricLogs  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/bodyMetricLogs/{id}` + root (`collections.ts:23,49`).
- **Purpose:** weight / body-fat entries.
- **Fields:** `BodyMetricLog` (`types/domain.ts:413-421`): `weightKg`, `bodyFatPct?`, `notes?`,
  `loggedAt`.
- **Reads:** `getBodyMetricLogsForMember` (`read-models/progress.ts:7`).
- **Writes:** `logBodyWeight` (`actions/progress.ts:154`) — also mirrors `weightKg` onto profile.
- **Security rules:** read admin/owner/member/trainer; create `gymId==gymId`+scoped; update/delete
  admin/owner/member (`firestore.rules:219-223`, root `:402-406`).

## dayLogs  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/dayLogs/{memberId_dayId_weekStart}` + root (`collections.ts:23,50`).
- **Purpose:** per-week skip/modify record for a program day; deterministic id = upsert.
- **Fields:** `DayLog` (`types/domain.ts:571-590`): `status` `skipped|modified`, `skipReason?`,
  `note?`, `makeupExerciseIds?`, `makeupStatus?` `pending|added|dismissed`, `makeupTargetDayId?`.
- **Reads:** `getDayLogsForMember`/calendar (`read-models/progress.ts:47,168`).
- **Writes:** `logDayStatus`/`clearDayLog`/`updateMakeupStatus` (`actions/progress.ts:267,337,422`).
- **Security rules:** read admin/owner/member/trainer; create scoped; update/delete admin/owner/member
  (`firestore.rules:225-229`, root `:408-412`).

## workoutSessions  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/workoutSessions/{id}` + root (`collections.ts:18,47`).
- **Purpose:** a member workout session (start→end), with embedded attendance/geofence snapshot.
- **Fields:** `WorkoutSession` (`types/domain.ts:518-529`): `status` `active|completed`,
  `startedAt`, `endedAt?`, `programDayId?`, `programId?`, `dayTitle?`, plus embedded `attendance`
  object on write (`actions/progress.ts:564-571`).
- **Reads:** `getActiveWorkoutSessions`/`getRecentSessionCounts` (`read-models/sessions.ts:8,55`).
- **Writes:** `startWorkoutSession`/`endWorkoutSession` (`actions/progress.ts:526,615`).
- **Security rules:** read admin/owner/member/trainer; create scoped; update keeps memberId/gymId
  fixed; delete admin/owner (`firestore.rules:204-211`, root `:377-384`).
- **Indexes:** `workoutSessions` `status+startedAt` (`firestore.indexes.json`).

## attendanceRecords  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/attendanceRecords/{id}` + root (`collections.ts:21,48`). Id == sessionId.
- **Purpose:** check-in/out + geofence audit for a session.
- **Fields:** `AttendanceRecord` (`types/domain.ts:531-544`): `checkInAt`, `checkOutAt?`,
  `latitude/longitude`, `distanceMeters?`, `geofenceStatus` `inside|not_configured|location_not_provided`,
  `radiusMeters?`.
- **Reads:** `getAttendanceRecords` (`read-models/sessions.ts:108`).
- **Writes:** `startWorkoutSession` (check-in) / `endWorkoutSession` (check-out)
  (`actions/progress.ts:584-601,654-669`).
- **Security rules:** read admin/owner/member; create scoped; update/delete admin/owner
  (`firestore.rules:213-217`, root `:391-395`).

## macroLogs  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/macroLogs/{memberId_date}` + root (`collections.ts:27,54`).
- **Purpose:** daily macro/water log (one per member per day; upsert).
- **Fields:** `MacroLog` (`types/domain.ts:453-465`): `date`, `protein`, `carbs`, `fat`, `water`,
  `loggedAt`.
- **Reads:** `getMacroLogForMember`/`getMacroLogsForMember` (`read-models/progress.ts:227,259`).
- **Writes:** `saveMacroLog` (`actions/progress.ts:375`).
- **Security rules:** read admin/owner/member/trainer; create scoped (no trainer); update/delete
  admin/owner/member (`firestore.rules:169-177`). *(No root-level rule block — root copy relies on
  admin-SDK writes; see [DISCREPANCIES](DISCREPANCIES.md).)*

## activityLogs  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/activityLogs/{id}` + root (`collections.ts:28,55`).
- **Purpose:** stretch/cardio session log.
- **Fields:** `ActivityLog` (`types/domain.ts:471-490`): `type` `stretch|cardio`, `name`,
  `duration?`, `distance?`, `notes?`, `source`, `loggedByTrainerId?`, `ptSessionId?`.
- **Reads:** `getActivityLogsForMember` (`read-models/progress.ts:296`).
- **Writes:** `logActivity` (`actions/progress.ts:466`).
- **Security rules:** read admin/owner/member/trainer; create scoped or trainer; update/delete
  admin/owner/member/trainer (`firestore.rules:179-188`). *(No root-level rule block — see DISCREPANCIES.)*

## activityEvents  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/activityEvents/{id}` + root (`collections.ts:17,46`).
- **Purpose:** system audit/activity feed for owner & member dashboards.
- **Fields:** `ActivityEvent` (`types/domain.ts:423-431`): `audience` `owner|member`, `memberId?`,
  `title`, `detail`, `icon` `activity|bell|dumbbell|users`, `createdAt`.
- **Reads:** `getActivityEvents` (`read-models/activity.ts:7`).
- **Writes:** system-generated by many actions/CFs (member create/toggle/delete, program assign,
  staff create, password reset) — e.g. `actions/members.ts:142`, `functions/src/index.ts:415`.
- **Security rules:** read admin/owner/member-self; create/update/delete `allow:false`
  (`firestore.rules:196-202`, root `:369-375`).

## notifications  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/notifications/{id}` + root (`collections.ts:13,42`).
- **Purpose:** role-scoped notifications with deep-link `actionHref`.
- **Fields:** `Notification` (`types/domain.ts:348-380`): `recipientRole`, `recipientId`,
  `type` (16 union values incl. PT + membership), `title`, `body`, `createdAt`, `readAt?`,
  `actionHref?`, `memberId?`, `ptSessionId?`, `exerciseRequestId?`. Some writes use
  `recipientUserId` (rules accept both, `firestore.rules:147-148`). Billing CFs add
  `payment_request_pending|rejected` types not in the domain union (see DISCREPANCIES).
- **Reads:** `getOwnerNotifications`/`getAdminNotifications`/`getMemberNotifications`
  (`read-models/notifications.ts:36,94,133`).
- **Writes:** many actions/CFs; deterministic ids for trigger-created ones
  (`program_assignment_*`, `pt_plan_*`, `functions/src/index.ts:992,1051`). `clearUserNotifications`
  marks `readAt` (`actions/notifications.ts:14`); `saveFcmToken` (`:70`).
- **Security rules (gym):** read admin/owner/trainer/recipient-self; create admin/owner; update
  admin/owner or recipient-self limited to `read/readAt/updatedAt`; delete admin/owner
  (`firestore.rules:143-157`, root `:343-356`).
- **Indexes:** `recipientRole+createdAt`, `gymId+recipientRole+createdAt`, `recipientId`
  collection-group (`firestore.indexes.json`).

## ptSessions  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/ptSessions/{id}` + root mirror (`collections.ts:25,52`).
- **Purpose:** PT booking/plan between trainer and member; also drives live PT console.
- **Fields:** `PTSession` (`types/domain.ts:610-634`): `trainerId`, `memberId`, `scheduledAt`,
  `durationMinutes`, `planStartDate/EndDate/DurationDays`, `status`
  `scheduled|active|completed|cancelled`, `plannedExercises[]`, `notes?`, `cancelReason?`,
  reminder flags `notified24h/notified1h`, `sideEffectsMode`.
- **Reads:** `read-models/pt.ts` (`getAllPTSessionsForGym`, `getPTSessionsForTrainer/Member`,
  `getPTSessionDetail`).
- **Writes:** `bookPTSession`/`startPTSession`/`completePTSession`/`cancelPTSession`/
  `reschedulePTSession` (`actions/pt.ts:46,137,283,359,435`); `assignPTPlan` CF (`:912`);
  scheduled reminders + auto-expire (`functions/src/index.ts:1765,1859`).
- **Security rules (gym):** read admin/staff/own-member; create/update admin/staff; delete
  admin/owner (`firestore.rules:249-256`). **(root):** read admin/owner-trainer-of-gym/**any member
  of gym**; write admin/owner/trainer of gym (`firestore.rules:420-428`) — note members can read
  *any* session in their gym at root (privacy gap, see DISCREPANCIES/roadmap).
- **Indexes:** collection-group `gymId+scheduledAt`, `trainerId+scheduledAt`, `memberId+scheduledAt`;
  collection `status+notified24h+scheduledAt`, `status+notified1h+scheduledAt`, `status+startedAt`.

## ptLiftLogs  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/ptLiftLogs/{id}` + root (`collections.ts:26,53`).
- **Purpose:** sets logged by a trainer during a PT session. Dual-written to `liftLogs`.
- **Fields:** `PTLiftLog` (`types/domain.ts:646-659`): `ptSessionId`, `memberId`, `trainerId`,
  `exerciseId`, `exerciseName?`, `weight`, `sets`, `reps`, `notes?`, `loggedAt`.
- **Reads:** `getPTLiftLogsForSession` (`read-models/pt.ts:147`).
- **Writes:** `logPTLiftSet` (`actions/pt.ts:248`).
- **Security rules (gym):** read admin/staff/own-member; create/update/delete admin/staff
  (`firestore.rules:258-264`). **(root):** like ptSessions (`firestore.rules:430-438`).
- **Indexes:** collection-group `ptSessionId+loggedAt`.

## packages  *(gym-scoped)*
- **Scope:** `gyms/{gymId}/packages/{id}` (`collections.ts:57`).
- **Purpose:** membership package definitions set by owner.
- **Fields:** `Package` (`types/domain.ts:172-188`): `name`, `durationMonths`, `price`, `currency`,
  `includesPT?`, `ptSessionsIncluded?`, `isActive`.
- **Reads:** `getPackages` (`read-models/billing.ts:69`).
- **Writes:** `savePackage`/`archivePackage` (`actions/billing.ts:28,67`); `createOrUpdatePackage`
  CF (`functions/src/index.ts:1376`).
- **Security rules:** read admin/owner/member; write admin/owner; trainers no access
  (`firestore.rules:269-273`).

## memberships  *(gym-scoped, also root key)*
- **Scope:** `gyms/{gymId}/memberships/{id}` (`collections.ts:59`; root key declared `:9` but
  active path is gym-scoped).
- **Purpose:** one record per membership period; denormalised snapshot kept on member doc.
- **Fields:** `Membership` (`types/domain.ts:226-243`): `planName`, `startDate`, `endDate`,
  `durationMonths`, `status`, `paymentRequestId?`, `activatedAt?`.
- **Reads:** `getMembershipsForMember` (`read-models/billing.ts:128`).
- **Writes:** created on approval `approvePaymentRequestAction` (`actions/billing.ts:113`) /
  `approvePaymentRequest`+`activateOrRenewMembership` CF (`functions/src/index.ts:1497,1581`).
- **Security rules:** read admin/owner/own-member; create/update/delete `allow:false`; trainers no
  access (`firestore.rules:276-282`).
- **Indexes:** `memberships` `gymId+endDate`, `memberId+createdAt` (`firestore.indexes.json`).

## paymentRequests  *(gym-scoped)*
- **Scope:** `gyms/{gymId}/paymentRequests/{id}` (`collections.ts:61`).
- **Purpose:** member-raised payment/renewal requests; owner approves to activate membership.
- **Fields:** `PaymentRequest` (`types/domain.ts:198-217`): `memberId`, `packageId`, `amount`,
  `currency`, `method` `cash|card|upi|other`, `status` `pending|approved|rejected|cancelled`,
  `requestedAt`, `resolvedAt?`, `membershipId?`.
- **Reads:** `getPaymentRequests`/`getPendingPaymentRequests`/`getPaymentRequestsForMember`
  (`read-models/billing.ts:97,104,119`).
- **Writes:** `submitPaymentRequestAction` (`actions/member-billing.ts:12`) /
  `submitPaymentRequest` CF (`:1411`); resolution `approve/reject` (`actions/billing.ts:85,148`,
  CF `:1471,1530`).
- **Security rules:** read admin/owner/own-member; create admin/owner/own-member; update/delete
  `allow:false`; trainers no access (`firestore.rules:285-294`).
- **Indexes:** `status+requestedAt`, `memberId+requestedAt`, `memberId+packageId+status`,
  `status+resolvedAt` (`firestore.indexes.json`).

## summaries  *(gym-scoped)*
- **Scope:** `gyms/{gymId}/summaries/dashboard` (single doc) (`collections.ts:63`).
- **Purpose:** pre-computed owner dashboard stats.
- **Fields:** `DashboardSummary` (`types/domain.ts:250-262`): totals, expiring/expired counts,
  pending payments, revenue MTD, `lastComputedAt`.
- **Reads:** `getGymDashboardSummary` (`read-models/billing.ts:150`).
- **Writes:** `generateGymDashboardStats` CF → `computeGymDashboard` (`functions/src/index.ts:1598,1606`).
- **Security rules:** read admin/owner; write `allow:false` (`firestore.rules:297-300`).

## contactMessages  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/contactMessages/{id}` + root (`collections.ts:19,51`).
- **Purpose:** landing-page contact form submissions → admin inbox.
- **Fields:** `ContactMessage` (`types/domain.ts:546-555`): `name`, `mobile`, `email?`, `body`,
  `status` `unread|read`.
- **Reads:** `getContactMessages`/`getUnreadContactMessageCount` (`read-models/notifications.ts:203,176`),
  `getUnreadMessageCount` (`actions/contact.ts:120`).
- **Writes:** `submitContactMessage` (`actions/contact.ts:64`, public create); `markContactMessageRead`
  (`:138`).
- **Security rules (gym):** create `true` (public); read/update/delete admin or staff-for-gym
  (`firestore.rules:231-234`). **(root):** create `true`; read/update/delete admin or owner
  (`firestore.rules:386-389`).

## siteLinks  *(gym-scoped + root)*
- **Scope:** `gyms/{gymId}/siteLinks/{id}` + root (`collections.ts:20,48`).
- **Purpose:** public social/site links.
- **Fields:** `SiteLink` (`types/domain.ts:433-437`): `label`, `href`.
- **Reads:** `getSiteLinks` (`read-models/misc.ts:6`).
- **Writes:** ⚠️ no write site found in this pass (likely seeded/manual). 
- **Security rules:** read `true`; write admin or owner (`firestore.rules:236-239`, root `:397-400`).
