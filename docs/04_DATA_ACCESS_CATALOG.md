# 04 · DATA ACCESS CATALOG (Tier 1)

`Generated: 2026-06-05 · Commit: c0e1f4b`

> Replaces a REST "API catalog". Three surfaces: **Server Actions** (`lib/firebase/actions/*`,
> `"use server"`), **Cloud Functions** (`functions/src/index.ts`, callable via
> `lib/firebase/functions.ts`), and **Read-Models** (`lib/firebase/read-models/*`).
> R = reads, W = writes. "scoped+root" = dual-write to gym-scoped path and root mirror.

## Action vs Function overlap (read this first)

Several operations exist as **both** a Server Action and a Cloud Function. The UI predominantly
calls Server Actions (Admin SDK, no `allow:false` barrier because they run server-side). The
Cloud Functions are the canonical privileged surface that the `allow:false` rules assume.

| Operation | Server Action | Cloud Function |
|---|---|---|
| Create member | `createMemberProfile` `actions/members.ts:45` | `createMemberAccount` `index.ts:346` |
| Create staff | `createOwnerProfile` `actions/staff.ts:86` | `createStaffAccount` `index.ts:429`, `createTrainer` `index.ts:1272` |
| Create gym | `createGymWorkspace` `actions/gyms.ts:260` | `createGymWorkspace` `index.ts:483` |
| Update gym details | `updateGymDetails` `actions/gyms.ts:450` | `updateGymDetails` `index.ts:538` |
| Update gym logo | `updateGymLogo` `actions/gyms.ts:494` | `updateGymLogo` `index.ts:580` |
| Gym status | `setGymStatus` `actions/gyms.ts:544` | `setGymAccessStatus` `index.ts:614` |
| Toggle member | `toggleMemberAccess` `actions/members.ts:579`, `bulkToggleMemberAccess` `:641` | `toggleMemberAccess` `index.ts:694`, `bulkToggleMemberAccess` `:799` |
| Assign program | `assignProgramToMember` `actions/programs.ts:88`, `bulkAssignProgram` `:232` | `assignProgramToMember` `index.ts:744`, `bulkAssignProgram` `:841` |
| Delete member | `deleteMemberProfile` `actions/members.ts:713` | `archiveMemberAccount` `index.ts:1093` |
| Delete program | `deleteCustomWorkoutProgram` `actions/programs.ts:289` | `archiveCustomProgram` `index.ts:1133` |
| Delete gym | `deleteGymWorkspace`/`deleteGymWithMembers` `actions/gyms.ts:319,357` | `archiveGymWorkspace` `index.ts:1151` |
| Billing approve/reject | `approve/rejectPaymentRequestAction` `actions/billing.ts:85,148` | `approve/rejectPaymentRequest` `index.ts:1471,1530` |
| Submit payment | `submitPaymentRequestAction` `actions/member-billing.ts:12` | `submitPaymentRequest` `index.ts:1411` |
| Package CRUD | `savePackage`/`archivePackage` `actions/billing.ts:28,67` | `createOrUpdatePackage` `index.ts:1376` |
| Trainer visibility | `updateTrainerVisibilityAction` `actions/billing.ts:186` | `updateTrainerVisibility` `index.ts:1357` |

PT booking (`bookPTSession` action `actions/pt.ts:46`) overlaps the `assignPTPlan` CF
(`index.ts:912`); both write `ptSessions` with `sideEffectsMode:"trigger"` consumed by
`onPTPlanCreated`.

---

# A. Server Actions

### auth (lib/auth.ts — `"use server"`)
| Name | Source | Role gate | Collections | Notes |
|---|---|---|---|---|
| `resolveLoginIdentifier` | `:612` | public | authProfiles/profiles (R) | resolve identifier→email/role |
| `createLocalDemoSession` | `:668` | public (demo) | — | sets compatibility cookies |
| `loginWithCredentials` | `:707` | public | authProfiles(R), loginAttempts(RW) | Identity Toolkit REST; lockout |
| `createSession` | `:853` | public(token) | authProfiles(R) | verify id token → session cookie |
| `getCurrentUser` | `:895` | authed | authProfiles(R) | cached per request |
| `requireAuth`/`requireRole`/`requireOwner` | `:952,962,988` | guard | — | redirect on fail; `requireOwner` blocks non-owner staffType |
| `logoutUser` | `:998` | authed | — | clears cookies |
| `requestPasswordReset` | `:1003` | public | notifications(W) | notifies owner/admin |

### members (actions/members.ts)
| Name | Source | Role gate | Collections (R/W) | Side effects |
|---|---|---|---|---|
| `createMemberProfile` | `:45` | `requireOwner` | authProfiles, members, gyms, usernames, activityEvents (W, txn) | creates Auth user `pin-1234`; memberCount++ |
| `updateMemberProfile` | `:173` | `requireRole[admin,owner]` | authProfiles, members, usernames (W, txn) | updates Auth user |
| `updateOwnerMemberContext` | `:303` | `requireRole[admin,owner]` | authProfiles, members (W) | extended profile fields |
| `updateProfileMetrics` | `:414` | `requireAuth` + `assertCanManageMember` | authProfiles, members (W) | self or owner; member can't set trainer |
| `saveMemberAiTrainerNote` | `:484` | `requireAuth` | members (W) | injury/AI note |
| `changeMemberPin` | `:523` | `requireAuth` (member) | Auth (W) | verifies current PIN via REST |
| `toggleMemberAccess` | `:579` | `requireOwner` | authProfiles, members, Auth, activityEvents (W) | enable/disable |
| `bulkToggleMemberAccess` | `:641` | `requireOwner` | same (batch) | JSON memberIds |
| `assignTrainerToMember` | `:678` | `requireRole[admin,owner]` | authProfiles, members (W) | free-text trainer name |
| `deleteMemberProfile` | `:713` | `requireOwner` | members + all member-owned collections (archive+delete), Auth | cascade; D6 race guard |

### staff (actions/staff.ts)
| Name | Source | Role gate | Collections | Side effects |
|---|---|---|---|---|
| `changeStaffPassword` | `:48` | `requireAuth` (non-member) | Auth, authProfiles (W) | clears `mustChangePassword` |
| `createOwnerProfile` | `:86` | `requireRole[admin]` | authProfiles, staff, Auth, activityEvents (W) | new staff; `mustChangePassword:true` |
| `updateStaffProfile` | `:177` | `requireRole[admin]` | authProfiles, staff (W) | name/phone/staffType |
| `deleteGymStaffProfile` | `:216` | `requireRole[admin]` | staff/authProfiles (archive+delete), Auth | |
| `changeAdminEmail` | `:262` | admin-self | Auth, authProfiles (W) | |
| `updateAdminDisplayName` | `:293` | admin-self | Auth, authProfiles (W) | |
| `resetPassword` | `:332` | `requireOwner` + `assertMemberBelongsToCallerGym` | Auth, authProfiles, activityEvents (W) | PIN or password reset; force change |

### gyms (actions/gyms.ts)
| Name | Source | Role gate | Collections | Side effects |
|---|---|---|---|---|
| `ensurePrimaryWorkspace` | `:140` | (internal) | gyms, authProfiles, members, staff, Auth (W) | seeds SHG + demo accounts |
| `createGymWorkspace` | `:260` | `requireRole[admin]` | gyms (W) | slug uniqueness |
| `deleteGymWorkspace` | `:319` | `requireRole[admin]` | gyms + subcollections (archive+delete) | blocks if profiles assigned; protects `shg` |
| `deleteGymWithMembers` | `:357` | `requireRole[admin]` | gyms + members + member data (archive+delete), Auth | |
| `updateGymDetails` | `:450` | `requireRole[admin,owner]` | gyms (W) | owner only own gym |
| `updateGymLogo` | `:494` | `requireRole[admin,owner]` | Storage, gyms (W) | PNG ≤900KB |
| `setGymStatus` | `:544` | `requireRole[admin]` | gyms, authProfiles, members, staff, Auth (W) | cascades active flag |
| `addGymNotice`/`deleteGymNotice` | `:609,645` | `requireOwner` | gyms.notices[] (W) | embedded array |

### programs (actions/programs.ts)
| Name | Source | Role gate | Collections | Side effects |
|---|---|---|---|---|
| `assignProgramToMember` | `:88` | `requireRole[admin,owner]` + member-belongs | programAssignments, notifications, activityEvents (W scoped+root) | FCM push; cancels prior active |
| `generateAndAssignProgram` | `:197` | `requireRole[admin,owner]` | reads programs, delegates to assign | heuristic pick (`pickProgramWithoutAi`) |
| `bulkAssignProgram` | `:232` | `requireRole[admin,owner]` | programAssignments (W) | JSON memberIds |
| `deleteCustomWorkoutProgram` | `:289` | `requireOwner` | workoutPrograms (archive+delete) | |
| `updateCustomWorkoutProgram` | `:336` | `requireOwner` | workoutPrograms (W) | resolves exercise ids |
| `createCustomWorkoutProgram` | `:427` | `requireOwner` | workoutPrograms (W) | multi-day JSON |
| `createAndAssignCustomProgram` | `:545` | `requireRole[admin,owner]` | workoutPrograms, programAssignments, notifications, activityEvents (W) | create + assign in one |

### exercises (actions/exercises.ts)
| Name | Source | Role gate | Collections | Side effects |
|---|---|---|---|---|
| `requestCatalogExercise` | `:30` | `requireOwner` | exerciseRequests, notifications (W) | notifies admin |
| `approveCatalogExerciseRequest` | `:100` | `requireRole[admin]` | exerciseCatalog (W), exerciseRequests (W) | creates exercise |
| `rejectCatalogExerciseRequest` | `:180` | `requireRole[admin]` | exerciseRequests (W) | |
| `createCatalogExercise` | `:226` | `requireOwner` | exerciseCatalog (gym or global) (W) | admin→global, owner→gym |
| `updateCatalogExercise` | `:297` | `requireOwner` | exerciseCatalog (W) | non-admin can't edit default |
| `setGymExerciseVideo` | `:364` | `requireOwner` | exerciseCatalog (W) | |
| `resetExerciseVideos` | `:401` | `requireOwner` | exerciseCatalog (W) | from workouts.json defaults |
| `setExerciseTutorialVisibility` | `:467` | `requireOwner` | exerciseCatalog (W) | |
| `setMuscleGroupTutorialVisibility` | `:502` | `requireOwner` | exerciseCatalog (W batch) | |

### progress (actions/progress.ts)
| Name | Source | Role gate | Collections | Side effects |
|---|---|---|---|---|
| `logLiftSet` | `:57` | `requireAuth` + `assertCanManageMember` | liftLogs (W) | |
| `syncOfflineLifts` | `:108` | `requireAuth` | liftLogs (W batch) | Dexie sync |
| `logBodyWeight` | `:154` | `requireAuth` + member-belongs | bodyMetricLogs (W), members (mirror) | |
| `updateCoachNote` | `:223` | `requireRole[admin,owner]` + member-belongs | members (W) | |
| `logDayStatus` | `:267` | `requireAuth` | dayLogs (W upsert) | skip/modify + makeup |
| `clearDayLog` | `:337` | `requireAuth` | dayLogs (delete) | |
| `saveMacroLog` | `:375` | `requireAuth` + `assertCanManageMember` | macroLogs (W upsert) | |
| `updateMakeupStatus` | `:422` | `requireAuth` | dayLogs (W) | added/dismissed |
| `logActivity` | `:466` | `requireAuth` + `assertCanManageMember` | activityLogs (W) | stretch/cardio |
| `startWorkoutSession` | `:526` | `requireAuth` + `assertCanManageMember` | workoutSessions, attendanceRecords (W) | **geofence check** |
| `endWorkoutSession` | `:615` | `requireAuth` + `assertCanManageMember` | workoutSessions, attendanceRecords (W) | check-out |

### pt (actions/pt.ts) — all gated by `requireGymStaff` (admin or any gym staff)
| Name | Source | Collections | Side effects |
|---|---|---|---|
| `bookPTSession` | `:46` | ptSessions (W scoped+root, `sideEffectsMode:"trigger"`) | FCM push; notification via `onPTPlanCreated` trigger |
| `startPTSession` | `:137` | ptSessions (W) | status→active; same-gym check |
| `logPTLiftSet` | `:194` | ptLiftLogs (W) + **liftLogs dual-write** `source:"trainer"` | session must be active |
| `completePTSession` | `:283` | ptSessions, notifications (W) | FCM push |
| `cancelPTSession` | `:359` | ptSessions, notifications (W) | |
| `reschedulePTSession` | `:435` | ptSessions, notifications (W) | resets `notified24h/1h` |

### billing (actions/billing.ts — owner; member-billing.ts — member)
| Name | Source | Role gate | Collections | Side effects |
|---|---|---|---|---|
| `savePackage` | `billing.ts:28` | `requireOwner` (same gym) | packages (W) | |
| `archivePackage` | `billing.ts:67` | `requireOwner` | packages (W) | isActive=false |
| `approvePaymentRequestAction` | `billing.ts:85` | `requireOwner` | paymentRequests, memberships, members, authProfiles, notifications (W batch) | activates membership; denormalises |
| `rejectPaymentRequestAction` | `billing.ts:148` | `requireOwner` | paymentRequests, notifications (W) | |
| `updateTrainerVisibilityAction` | `billing.ts:186` | `requireOwner` | gyms (W) | |
| `submitPaymentRequestAction` | `member-billing.ts:12` | `requireRole[member]` | paymentRequests, notifications (W) | guards duplicate pending |

### contact / notifications
| Name | Source | Role gate | Collections | Side effects |
|---|---|---|---|---|
| `submitContactMessage` | `contact.ts:64` | public | contactMessages, notifications (W) | notifies admin |
| `getUnreadMessageCount` | `contact.ts:120` | public | contactMessages (R) | |
| `markContactMessageRead` | `contact.ts:138` | `requireRole[admin]` | contactMessages (W) | |
| `clearUserNotifications` | `notifications.ts:14` | `requireAuth` | notifications (W readAt) | recipient-scoped |
| `saveFcmToken` | `notifications.ts:70` | `requireAuth` | authProfiles (W) | enables push |

---

# B. Cloud Functions (functions/src/index.ts, region asia-south1)

All callables resolve the caller via `getCallableUser` (requires auth + valid role token,
`:133`). `assertCanManageGym` (`:152`) = admin, or owner whose `gymId` matches.

### onCall (callable)
| Function | Source | Auth gate | Collections (W) | Side effects / notes |
|---|---|---|---|---|
| `createMemberAccount` | `:346` | manage-gym | Auth, authProfiles, members, gyms, activityEvents | username+phone uniqueness; rollback Auth on error |
| `createStaffAccount` | `:429` | admin only | Auth, authProfiles, staff | trainer→role `trainer`; `mustChangePassword` |
| `createGymWorkspace` | `:483` | admin only | gyms | slug uniqueness |
| `updateGymDetails` | `:538` | admin only | gyms | incl geofence + visibility |
| `updateGymLogo` | `:580` | admin only | Storage, gyms | PNG ≤900KB |
| `setGymAccessStatus` | `:614` | admin only | gyms, authProfiles, members, staff, Auth | cascade |
| `archiveStaffAccount` | `:663` | admin only | staff/authProfiles (archive+delete), Auth | |
| `toggleMemberAccess` | `:694` | manage-gym | authProfiles, members, Auth | |
| `resetMemberPin` | `:717` | manage-gym | Auth | PIN default 1234 |
| `resetStaffPassword` | `:729` | admin only | Auth, authProfiles | force change |
| `assignProgramToMember` | `:744` | manage-gym | programAssignments (`sideEffectsMode:"trigger"`) | trigger fires notif/activity/push |
| `bulkToggleMemberAccess` | `:799` | manage-gym | authProfiles, members, Auth | per-member failures collected |
| `bulkAssignProgram` | `:841` | manage-gym | programAssignments | |
| `assignPTPlan` | `:912` | manage-gym | ptSessions (`sideEffectsMode:"trigger"`) | validates trainer in gym |
| `archiveMemberAccount` | `:1093` | manage-gym | members + member data (archive+delete), Auth | cascade |
| `archiveCustomProgram` | `:1133` | manage-gym | workoutPrograms (archive+delete) | |
| `archiveGymWorkspace` | `:1151` | admin only | gym + subcollections (archive+delete), Auth | protects `shg` |
| `lookupLoginEmail` | `:1197` | **public** | authProfiles (R) | resolve username/phone→Auth email |
| `createTrainer` | `:1272` | manage-gym | Auth, authProfiles, staff | role `trainer`, `assignedMemberIds:[]` |
| `assignTrainerToPTMember` | `:1311` | manage-gym | members, authProfiles, staff (W batch) | sets isPT + assignedMemberIds |
| `updateTrainerVisibility` | `:1357` | manage-gym | gyms | |
| `createOrUpdatePackage` | `:1376` | manage-gym | packages | |
| `submitPaymentRequest` | `:1411` | member-self or manage-gym | paymentRequests, notifications | notifies owner |
| `approvePaymentRequest` | `:1471` | manage-gym | memberships, paymentRequests, members, authProfiles, notifications | activates membership |
| `rejectPaymentRequest` | `:1530` | manage-gym | paymentRequests, notifications | |
| `activateOrRenewMembership` | `:1562` | manage-gym | memberships, members, authProfiles | direct activate |
| `generateGymDashboardStats` | `:1598` | manage-gym | summaries (W) | `computeGymDashboard` |
| `generateAdminDashboardStats` | `:1655` | admin only | platformSummaries (W) | cross-gym counts |

### onDocumentCreated (triggers)
| Function | Source | Trigger | Effect |
|---|---|---|---|
| `onProgramAssignmentCreated` | `:977` | `programAssignments/{id}` create | if `sideEffectsMode:"trigger"`: member notification + owner activity + FCM (idempotent by id) |
| `onPTPlanCreated` | `:1034` | `ptSessions/{id}` create | if trigger: `pt_session_booked` notification + activity + FCM |

### onSchedule (cron)
| Function | Source | Schedule | Effect |
|---|---|---|---|
| `processMembershipExpiries` | `:1688` | every 24h | sets `expired`/`expiring_soon`, one notification per transition |
| `purgeExpiredArchives` | `:1752` | every 24h | deletes archives past `retentionExpiresAt` |
| `notifyUpcomingPTSessions` | `:1765` | every 60 min | 24h & 1h PT reminders (member + trainer), sets `notified24h/1h` |
| `autoExpireAbandonedPTSessions` | `:1859` | 02:00 IST daily | cancels sessions `active` > 6h |

### Auth blocking trigger
| Function | Source | Trigger | Effect |
|---|---|---|---|
| `blockLockedAccounts` | `:1905` | `beforeUserSignedIn` | blocks sign-in if `loginAttempts/{email}.lockedUntil` in future; fails open on error |

---

# C. Read-Models (lib/firebase/read-models/*)

All fall back to mock data / empty when `hasFirebaseAdminConfig()` is false. Cached via
`unstable_cache` (tag `gym:{gymId}:{collection}`) and/or `react.cache`.

### gyms.ts
`getGymWorkspaces` `:18` · `getPrimaryWorkspace` `:73` · `getGymDetail` `:84` ·
`getOwnersForGym` `:122` · `getRoleSummary` `:192` · `getGymFloorLoadMap` `:234` (slot occupancy).

### members.ts
`getMembers` `:52` / `getMembersUncached` `:16` · `getMemberDetail` `:113` ·
`getProfileMetrics` `:175` · `getMemberWithProfile` `:228` · `getTrainersForGym` `:357` ·
`getMembersForTrainer` `:396` (visibility-aware).

### programs.ts
`getWorkoutPrograms` `:128` / `Uncached` `:14` (merge predefined + custom) ·
`getProgramAssignmentForMember` `:148` · `getActiveProgramAssignments` `:219`.

### exercises.ts
`getExerciseCatalog` `:122` / `Uncached` `:15` (merge mock + persisted) ·
`getPendingExerciseRequests` `:132`.

### progress.ts
`getBodyMetricLogsForMember` `:7` · `getDayLogsForMember` `:47` · `getLiftLogsForMember` `:103` ·
`getMemberCalendarData` `:168` · `getMacroLogForMember` `:227` · `getMacroLogsForMember` `:259` ·
`getActivityLogsForMember` `:296`.

### sessions.ts
`getActiveWorkoutSessions` `:8` · `getRecentSessionCounts` `:55` · `getAttendanceRecords` `:108`.

### pt.ts
`getAllPTSessionsForGym` `:77` · `getPTSessionsForTrainer` `:98` · `getPTSessionsForMember` `:118` ·
`getPTSessionDetail` `:136` · `getPTLiftLogsForSession` `:156`.

### notifications.ts
`getOwnerNotifications` `:36` · `getAdminNotifications` `:94` · `getMemberNotifications` `:133` ·
`getUnreadContactMessageCount` `:176` · `getContactMessages` `:203`.

### activity.ts / misc.ts / billing.ts
`getActivityEvents` `activity.ts:7` · `getSiteLinks` `misc.ts:6` ·
`getPackages` `billing.ts:69` · `getPaymentRequests`/`getPendingPaymentRequests` `:97,104` ·
`getPaymentRequestsForMember` `:119` · `getMembershipsForMember` `:128` ·
`getGymDashboardSummary` `:150`.

## Error handling & retries

- Server Actions wrap in try/catch → `failure(error, fallback)` returns
  `{status:"error", message}` (`actions/shared.ts:218`); `NEXT_REDIRECT` is re-thrown.
- Read-models fail soft (return mock/empty) so a page never crashes on a Firestore error.
- Cloud Functions throw `HttpsError` (mapped to client error codes). Scheduled functions use
  `retryCount:0`.
- FCM (`sendPushToMember`) never throws and prunes stale tokens (`actions/shared.ts:643-662`).
