# FitSplit Firestore Structure

FitSplit is moving to a gym-first Firestore model. The first level tenant document is always:

```text
gyms/{gymId}
```

Everything owned by that gym lives below that document. Global collections should be limited to platform/admin lookup data and reusable FitSplit templates.

## Gym Skeleton

```text
gyms/{gymId}
  id
  name
  slug
  abbreviation
  status
  logoUrl
  logoPath
  location
  phone
  email
  geofence: {
    latitude
    longitude
    radiusMeters
  }
  notices[]
  createdAt
  updatedAt

  members/{memberId}
    id
    authUid
    fullName
    username
    email
    authEmail
    phone
    role: "member"
    defaultGymId
    isActive
    assignedTrainer
    avatarUrl
    avatarInitials
    goal
    fitnessGoals
    medicalNotes
    injuryNotes
    primarySlot
    secondarySlot
    metrics: {
      age
      gender
      dob
      heightCm
      weightKg
    }
    macroNutritionTarget
    coachNote
    coachNoteUpdatedAt
    createdAt
    updatedAt

  staff/{staffId}
    id
    authUid
    fullName
    username
    email
    authEmail
    role: "owner"
    staffType: "owner" | "trainer" | "staff"
    defaultGymId
    isActive
    imageUrl
    mustChangePassword
    createdAt
    updatedAt

  exerciseCatalog/{exerciseId}
    id
    gymId
    name
    muscleGroup
    primaryMuscles[]
    secondaryMuscles[]
    equipment
    instructions
    videoUrl
    videoSource
    gymVideoUrl
    gymVideoSource
    thumbnailUrl
    source: "global" | "gym" | "custom"
    isActive
    createdBy
    createdAt
    updatedAt

  workoutPrograms/{programId}
    id
    gymId
    title
    description
    goal
    difficulty
    daysPerWeek
    splitType
    source: "predefined" | "gym" | "custom" | "ai"
    isActive
    days[]
    createdBy
    createdAt
    updatedAt

  programAssignments/{assignmentId}
    id
    gymId
    memberId
    programId
    assignedAt
    status
    createdBy
    createdAt
    updatedAt

  liftLogs/{logId}
    id
    gymId
    memberId
    exerciseId
    programId
    dayId
    weight
    sets
    reps
    sessionId
    loggedAt
    createdAt
    updatedAt

  bodyMetricLogs/{logId}
    id
    gymId
    memberId
    weightKg
    bodyFatPct
    notes
    loggedAt
    createdAt

  dayLogs/{logId}
    memberId
    gymId
    programId
    dayId
    weekStart
    status
    skipReason
    note
    loggedAt
    updatedAt

  notifications/{notificationId}
    id
    gymId
    recipientRole
    recipientId
    type
    title
    body
    readAt
    createdAt

  activityEvents/{eventId}
    id
    gymId
    audience
    actorId
    targetId
    memberId
    title
    detail
    icon
    createdAt

  workoutSessions/{sessionId}
    id
    gymId
    memberId
    status
    attendance
    startedAt
    endedAt
    updatedAt

  attendanceRecords/{recordId}
    id
    gymId
    memberId
    sessionId
    checkInAt
    checkOutAt
    latitude
    longitude
    deviceInfo
    geofenceStatus
    createdAt
    updatedAt

  contactMessages/{messageId}
    id
    gymId
    name
    mobile
    email
    body
    status
    createdAt
    updatedAt
```

## Global Collections

Keep these at root:

```text
authProfiles/{uid}
exerciseCatalog/{exerciseId}
workoutPrograms/{programId}
archives/{archiveId}
```

`authProfiles/{uid}` is the lightweight auth/session index used by login and session lookup. It should contain only fields needed to authenticate, route, and enforce access quickly: `id`, `authUid`, `username`, `authEmail`, `email`, `phone`, `fullName`, `role`, `staffType`, `defaultGymId`, `gymId`, `isActive`, `mustChangePassword`, login lockout fields, timestamps, and `authIndexOnly: true`.

Full member and staff records are gym-scoped source-of-truth documents:

```text
gyms/{gymId}/members/{memberId}
gyms/{gymId}/staff/{staffId}
```

`profiles/{uid}` is now a legacy fallback only. It should remain empty after migration and should not receive new writes.

Root `exerciseCatalog` and `workoutPrograms` are the FitSplit-owned default libraries. They are editable only by admins. Gym owners should not mutate these defaults; owner-created exercises and workout plans belong under `gyms/{gymId}/exerciseCatalog` and `gyms/{gymId}/workoutPrograms`.

`archives/{archiveId}` stores deleted entities before removal. Archive records include `entityType`, `originalPath`, `gymId`, `deletedBy`, `archivedAt`, `retentionDays`, `retentionExpiresAt`, and the original `data` payload. Retention is 60 days; configure Firestore TTL on `retentionExpiresAt` when ready.

Optional future global collections:

```text
platformSettings/{docId}
```

## Migration Rules

1. Root `authProfiles` is the auth/session index.
2. Root `profiles` is legacy fallback only and should remain empty.
3. Member profiles write to `gyms/{gymId}/members`.
4. Owner/trainer/staff profiles write to `gyms/{gymId}/staff`.
5. Gym-owned operational collections live under `gyms/{gymId}/{collection}`.
6. Reads prefer gym-scoped data plus root defaults, then fall back to root legacy records only where needed for old data.
7. New custom exercises and programs write only to the gym directory.
8. Default exercises and programs write only to root collections and require admin access.
9. Deletes archive the record first with a 60-day `retentionExpiresAt`.
10. Root tenant-owned operational collections should stay empty. Remaining root `notifications` may be global/admin notifications only.

## Migration Script

Use the tenant cleanup script when old root-level tenant data appears:

```bash
npm run migrate:tenant-cleanup
npm run migrate:tenant-cleanup -- --write
```

The script:

1. Builds `authProfiles` from legacy root profiles and gym-scoped member/staff records.
2. Mirrors full member/staff data into `gyms/{gymId}/members` and `gyms/{gymId}/staff`.
3. Moves tenant-owned operational docs into `gyms/{gymId}/{collection}`.
4. Keeps default exercises in root `exerciseCatalog` with global/default scope.
5. Moves custom exercises and custom programs into the owning gym directory.
6. Deletes migrated legacy root tenant documents.

## Migration Command

Dry run:

```bash
npm run migrate:gym-scoped
```

Write data:

```bash
npm run migrate:gym-scoped -- --write
```
