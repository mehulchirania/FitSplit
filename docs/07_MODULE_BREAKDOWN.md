# 07 · MODULE BREAKDOWN (Tier 1)

`Generated: 2026-06-05 · Commit: a0be3a8`

> Module-by-module map for working on FitSplit without loading the whole repo. For each module:
> its screens, the collections it touches, the actions/functions/read-models it uses, supporting
> services, a complexity estimate (1-10), refactor priority, dependencies, and test coverage.
> Complexity is a relative engineering estimate, not a measured metric.

| Module | Screens | Collections touched | Actions / Functions / Read-models | Owner services | Complexity | Refactor priority | Dependencies | Test coverage |
|---|---|---|---|---|---|---|---|---|
| **Auth & Session** | landing login, `/profile`, `/suspended` | authProfiles, profiles, usernames, loginAttempts | `src/lib/auth.ts` (login/session/guards); CF `lookupLoginEmail`, `blockLockedAccounts` | Firebase Auth, Identity Toolkit REST, cookies | 9 | **High** — trainer-role gap (`auth.ts:306`), dual lockout key mismatch | Firebase Admin, middleware | `src/lib/__tests__/validation.test.ts` (Zod helpers) |
| **Routing/Shell** | all (`src/app/layout.tsx`, role layouts) | gyms, workoutSessions | `middleware.ts`; read-models `getGymDetail`, `getActiveWorkoutSessions` | next/headers, cookies | 4 | Low | Auth | none found |
| **Members (owner)** | `/owner/members`, `/owner/members/[id]`, `/trainer/members` | members, authProfiles, usernames, gyms, activityEvents + member-owned cascade | actions `members.ts`*; CF `createMemberAccount`,`toggleMemberAccess`,`bulk*`,`archiveMemberAccount`; read-models `getMembers*`,`getMemberWithProfile`,`getMembersForTrainer` | Auth, archive helpers | 8 | Medium | Auth, Programs, Billing | none found |
| **Staff/Trainers** | `/owner/trainers`, `/admin/gyms/[id]` | staff, authProfiles | actions `staff.ts`; CF `createStaffAccount`,`createTrainer`,`assignTrainerToPTMember`,`updateTrainerVisibility`,`archiveStaffAccount`; read-models `getTrainersForGym`,`getOwnersForGym` | Auth | 7 | **High** — role/staffType duality | Auth, PT | none found |
| **Programs** | `/owner/programs`, `/admin/programs`, `/member/programs`, member day view | workoutPrograms, programAssignments, notifications, activityEvents | actions `programs.ts`; CF `assignProgramToMember`,`bulkAssignProgram`,`archiveCustomProgram`,`onProgramAssignmentCreated`; read-models `getWorkoutPrograms`,`get*Assignment*` | `src/lib/split-library.ts`, `src/lib/workouts.json`, mock-data | 8 | Medium | Exercises, Members | none found |
| **Exercises/Catalog** | `/owner/exercises`, `/admin/exercises`, `/member/exercises` | exerciseCatalog (gym+global), exerciseRequests, notifications | actions `exercises.ts`; read-models `getExerciseCatalog`,`getPendingExerciseRequests` | `exercise-thumbnails`, `workouts.json` | 7 | Medium — global vs gym dedup complexity | Programs | none found |
| **Workout console / logging** | `/member`, `/member/programs/[id]/day/[dayId]` | liftLogs, workoutSessions, attendanceRecords, dayLogs, bodyMetricLogs, macroLogs, activityLogs | actions `progress.ts`; read-models `progress.ts`,`sessions.ts` | Dexie offline-db, Zustand store, geofence, `src/lib/ai.ts` insights | 9 | Medium | Members, Programs, Exercises | `src/lib/__tests__/workout-utils.test.ts` |
| **Personal Training** | `/owner/training`, `/owner/training/session/[id]`, `/owner/training/trainer/[id]`, `/member/pt-history`, `/trainer` | ptSessions, ptLiftLogs, liftLogs(dual), notifications | actions `pt.ts`; CF `assignPTPlan`,`onPTPlanCreated`,`notifyUpcomingPTSessions`,`autoExpireAbandonedPTSessions`; read-models `pt.ts` | FullCalendar, FCM | 9 | **High** — root rule privacy gap, broad staff write | Members, Staff, Exercises | none found |
| **Billing/Membership** | `/owner/billing`, `/owner/packages`, `/member/membership`, `/admin/billing`(placeholder) | packages, memberships, paymentRequests, members(denorm), notifications, summaries | actions `billing.ts`,`member-billing.ts`; CF package/payment/membership/`processMembershipExpiries`,`generateGymDashboardStats`; read-models `billing.ts` | — | 8 | Medium — action/CF duplication | Members | none found |
| **Notifications/Activity** | bell dropdown, `/owner/notifications`, `/activity` | notifications, activityEvents, contactMessages | actions `notifications.ts`,`contact.ts`; read-models `notifications.ts`,`activity.ts` | FCM (`sendPushToMember`) | 6 | Medium — notification `type` union drift | all modules (emit) | none found |
| **Gym admin/settings** | `/admin/gyms`,`/admin/gyms/[id]/edit`, `/owner/settings`, `/admin` | gyms, authProfiles, archives, platformSummaries | actions `gyms.ts`; CF gym CRUD/`archiveGymWorkspace`,`generateAdminDashboardStats`; read-models `gyms.ts` | Storage (logos), geofence config | 7 | Medium | Auth, Members | none found |
| **Reports/Dashboard** | `/owner`, `/owner/reports`, `/admin` | summaries, members, workoutSessions, ptSessions, paymentRequests | read-models `getGymDashboardSummary`,`getRecentSessionCounts`,`getGymFloorLoadMap`; CF stat generators | Recharts | 6 | Low | Members, PT, Billing | none found |
| **Contact/Inbox** | landing footer, `/admin/inbox` | contactMessages, notifications | actions `contact.ts`; read-models `getContactMessages`,`getUnread*` | — | 3 | Low | Notifications | none found |
| **PWA/Offline** | service worker, install, bottom nav | (local IndexedDB) → liftLogs | `src/lib/offline-db.ts`, `syncOfflineLifts` | Dexie, service worker | 6 | Medium | Workout console | none found |

\* `members.ts` actions overlap the privileged CFs (see [04 §Action vs Function overlap](04_DATA_ACCESS_CATALOG.md)).

## Suggested module load order for a cold AI session

1. `00_AI_CONTEXT.md` (always).
2. The module's row above → open the cited action/read-model file(s) + its `02_DATA_DICTIONARY`
   collection entries.
3. `05_AUTHORIZATION_MATRIX.md` row for the feature.
4. `06_USER_JOURNEYS.md` flow if the change spans multiple steps.

## Cross-cutting helpers (load when editing any write path)

- `src/lib/firebase/actions/shared.ts` — guards, mirroring, archiving, geofence, FCM, cache tags.
- `src/lib/firebase/actions/validation.ts` — Zod helpers + `parseActionData`.
- `src/lib/firebase/read-models/shared.ts` — `gymCollection`, `mapProfileToMember`, `gymTag`.
- `src/lib/firebase/collections.ts` — all path constants.
- `functions/src/index.ts` top (`:40-344`) — CF helpers mirror the action helpers.

## Test coverage note

Vitest is configured (`vitest.config.ts`, `include: ["src/lib/**/*.test.ts","src/lib/**/*.spec.ts"]`).
Only two project test files exist: `src/lib/__tests__/validation.test.ts` and
`src/lib/__tests__/workout-utils.test.ts`. Every other module is **untested** ("none found").
See [10_REFACTORING_ROADMAP](10_REFACTORING_ROADMAP.md) for the coverage gap.
