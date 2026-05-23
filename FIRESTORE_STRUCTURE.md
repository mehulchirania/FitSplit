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
profiles/{uid}
exerciseCatalog/{exerciseId}
workoutPrograms/{programId}
archives/{archiveId}
```

Temporary auth/profile index used by login and session lookup. This keeps auth fast while the app migrates. Each profile should also be mirrored to `gyms/{gymId}/members/{uid}` or `gyms/{gymId}/staff/{uid}`.

Root `exerciseCatalog` and `workoutPrograms` are the FitSplit-owned default libraries. They are editable only by admins. Gym owners should not mutate these defaults; owner-created exercises and workout plans belong under `gyms/{gymId}/exerciseCatalog` and `gyms/{gymId}/workoutPrograms`.

`archives/{archiveId}` stores deleted entities before removal. Archive records include `entityType`, `originalPath`, `gymId`, `deletedBy`, `archivedAt`, `retentionDays`, `retentionExpiresAt`, and the original `data` payload. Retention is 60 days; configure Firestore TTL on `retentionExpiresAt` when ready.

Optional future global collections:

```text
platformSettings/{docId}
```

## Migration Rules

1. Root `profiles` remains as the auth index for now.
2. Member profiles mirror to `gyms/{gymId}/members`.
3. Owner/trainer/staff profiles mirror to `gyms/{gymId}/staff`.
4. Gym-owned operational collections live under `gyms/{gymId}/{collection}`.
5. Reads should prefer gym-scoped custom data plus root defaults, then fall back to root legacy records during migration.
6. New custom exercises and programs should write only to the gym directory.
7. Default exercises and programs should write only to root collections and require admin access.
8. Deletes should archive the record first with a 60-day `retentionExpiresAt`.
9. Once migration is verified, root operational legacy records can be archived/deleted, leaving only `profiles`, default catalogs/programs, archives, and platform settings at root.

## Migration Command

Dry run:

```bash
npm run migrate:gym-scoped
```

Write data:

```bash
npm run migrate:gym-scoped -- --write
```
