import type {
  ActivityEvent,
  AttendanceRecord,
  Difficulty,
  Exercise,
  GymNotice,
  GymNoticeType,
  GymWorkspace,
  LiftLog,
  Member,
  MuscleGroup,
  Notification,
  ProfileMetrics,
  ProgramAssignment,
  SiteLink,
  WorkoutSession,
  WorkoutProgram,
  ContactMessage
} from "@/types/domain";

import {
  assignments as mockAssignments,
  attendanceRecords as mockAttendanceRecords,
  exerciseCatalogByMuscle as mockExerciseCatalogByMuscle,
  exercises as mockExercises,
  gyms as mockGyms,
  members as mockMembers,
  notifications as mockNotifications,
  programs as mockPrograms,
  workoutSessions as mockWorkoutSessions
} from "@/lib/mock-data";
import { collectionPaths, PRIMARY_GYM_ID, PRIMARY_OWNER_ID } from "./collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "./admin";

function normalizeGymStatus(status: unknown): GymWorkspace["status"] {
  const value = String(status ?? "active");
  if (value === "paused" || value === "inactive") {
    return value;
  }
  return "active";
}

function mapWorkspace(docId: string, data: Record<string, unknown>): GymWorkspace {
  const rawNotices = Array.isArray(data.notices) ? data.notices : [];
  const notices: GymNotice[] = rawNotices
    .filter((n): n is Record<string, unknown> => n != null && typeof n === "object")
    .map((n, i): GymNotice => ({
      id: String(n.id ?? `notice-${i}`),
      type: (["rule", "tip", "reminder", "announcement"] as const).includes(n.type as GymNoticeType)
        ? (n.type as GymNoticeType)
        : "tip",
      title: String(n.title ?? ""),
      body: n.body ? String(n.body) : undefined,
      isActive: n.isActive !== false,
      order: Number(n.order ?? i),
      createdAt: String(n.createdAt ?? ""),
    }))
    .filter((n) => n.title && n.isActive)
    .sort((a, b) => a.order - b.order);

  return {
    id: docId,
    name: String(data.name ?? "Stored gym"),
    slug: String(data.slug ?? docId),
    ownerName: String(data.ownerName ?? "Gym owner"),
    ownerUserId: String(data.ownerUserId ?? ""),
    status: normalizeGymStatus(data.status),
    expiryWarningDays: Number(data.expiryWarningDays ?? 7),
    memberCount: Number(data.memberCount ?? 0),
    logoUrl: data.logoUrl ? String(data.logoUrl) : docId === PRIMARY_GYM_ID ? "/shg-gym-logo.jpeg" : undefined,
    logoPath: data.logoPath ? String(data.logoPath) : undefined,
    location: data.location ? String(data.location) : undefined,
    phone: data.phone ? String(data.phone) : undefined,
    email: data.email ? String(data.email) : undefined,
    instagram: data.instagram ? String(data.instagram) : undefined,
    linkedin: data.linkedin ? String(data.linkedin) : undefined,
    youtube: data.youtube ? String(data.youtube) : undefined,
    latitude: data.latitude != null ? Number(data.latitude) : undefined,
    longitude: data.longitude != null ? Number(data.longitude) : undefined,
    radiusMeters: data.radiusMeters != null ? Number(data.radiusMeters) : undefined,
    notices: notices.length > 0 ? notices : undefined,
  };
}

function trainingNotificationCopy(title: string, body: string) {
  const combined = `${title} ${body}`.toLowerCase();

  if (combined.includes("membership") || combined.includes("renew")) {
    return {
      title: "Training profile follow-up",
      body: "Review this member's profile and assigned workout plan in FitSplit."
    };
  }

  return { title, body };
}

function sanitizeNotification(notification: Notification): Notification {
  const copy = trainingNotificationCopy(notification.title, notification.body);
  return { ...notification, title: copy.title, body: copy.body };
}

export async function getGymWorkspaces(): Promise<{
  gyms: GymWorkspace[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { gyms: mockGyms, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const [gymSnapshot, memberSnapshot] = await Promise.all([
      db.collection(collectionPaths.gyms).get(),
      db
        .collection(collectionPaths.profiles)
        .where("role", "==", "member")
        .where("isActive", "==", true)
        .get()
    ]);

    if (gymSnapshot.empty) {
      return { gyms: mockGyms, isPersisted: false };
    }

    const gyms = gymSnapshot.docs
      .map((doc) => {
        const workspace = mapWorkspace(doc.id, doc.data());
        return {
          ...workspace,
          memberCount: memberSnapshot.docs.filter(
            (memberDoc) => memberDoc.data().defaultGymId === workspace.id
          ).length
        };
      });

    if (gyms.length === 0) {
      return { gyms: mockGyms, isPersisted: false };
    }

    return { gyms, isPersisted: true };
  } catch {
    return { gyms: mockGyms, isPersisted: false };
  }
}

export async function getPrimaryWorkspace(): Promise<{
  gym: GymWorkspace;
  isPersisted: boolean;
}> {
  const { gyms, isPersisted } = await getGymWorkspaces();
  return {
    gym: gyms.find((workspace) => workspace.slug === PRIMARY_GYM_ID || workspace.id === PRIMARY_GYM_ID) ?? gyms[0],
    isPersisted
  };
}

export async function getGymDetail(gymId: string): Promise<{
  gym: GymWorkspace | null;
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    const gym = mockGyms.find(g => g.id === gymId || g.slug === gymId) ?? null;
    return { gym, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const doc = await db.collection(collectionPaths.gyms).doc(gymId).get();
    
    if (!doc.exists) {
      // Try by slug
      const slugQuery = await db.collection(collectionPaths.gyms).where("slug", "==", gymId).limit(1).get();
      if (slugQuery.empty) return { gym: null, isPersisted: true };
      const slugDoc = slugQuery.docs[0];
      if (!slugDoc) return { gym: null, isPersisted: true };
      return { gym: mapWorkspace(slugDoc.id, slugDoc.data()), isPersisted: true };
    }

    return { gym: mapWorkspace(doc.id, doc.data() ?? {}), isPersisted: true };
  } catch {
    return { gym: null, isPersisted: false };
  }
}

export async function getOwnersForGym(gymId: string): Promise<{
  owners: Member[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    if (gymId !== PRIMARY_GYM_ID) {
      return { owners: [], isPersisted: false };
    }

    return {
      owners: [
        {
          id: PRIMARY_OWNER_ID,
          fullName: "Santosh SHG",
          email: "santosh-shg@fitsplit.app",
          phone: "",
          joinedAt: "2026-05-01",
          avatarInitials: "SO",
          goal: "owner",
          staffType: "owner",
          isActive: true
        },
        {
          id: "shg-trainer-1",
          fullName: "Ravi Kumar",
          email: "shg-trainer-1@fitsplit.app",
          phone: "",
          joinedAt: "2026-05-01",
          avatarInitials: "RK",
          goal: "trainer",
          staffType: "trainer",
          isActive: true
        },
        {
          id: "shg-trainer-2",
          fullName: "Priya Nair",
          email: "shg-trainer-2@fitsplit.app",
          phone: "",
          joinedAt: "2026-05-01",
          avatarInitials: "PN",
          goal: "trainer",
          staffType: "trainer",
          isActive: true
        }
      ],
      isPersisted: false
    };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection(collectionPaths.profiles)
      .where("defaultGymId", "==", gymId)
      .where("role", "==", "owner")
      .get();
    
    const owners: Member[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        fullName: String(data.fullName),
        email: String(data.email),
        phone: String(data.phone ?? ""),
        joinedAt: String(data.joinedAt ?? data.createdAt ?? new Date().toISOString().slice(0, 10)),
        avatarInitials: String(data.avatarInitials ?? "OW"),
        goal: String(data.staffType ?? "owner"),
        staffType: String(data.staffType ?? "owner") as Member["staffType"],
        isActive: data.isActive !== false
      };
    });

    return { owners, isPersisted: true };
  } catch {
    return { owners: [], isPersisted: false };
  }
}

export async function getRoleSummary(): Promise<{
  adminName: string;
  ownerName: string;
  ownerAccess: string;
  isPersisted: boolean;
}> {
  const fallback = {
    adminName: "FitSplit Admin",
    ownerName: "Santosh SHG",
    ownerAccess: "Sri Shakthi Hanuman Gym"
  };

  if (!hasFirebaseAdminConfig()) {
    return { ...fallback, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const [adminSnapshot, ownerDoc, gymDoc] = await Promise.all([
      db.collection(collectionPaths.profiles).where("role", "==", "admin").limit(1).get(),
      db.collection(collectionPaths.profiles).doc(PRIMARY_OWNER_ID).get(),
      db.collection(collectionPaths.gyms).doc(PRIMARY_GYM_ID).get()
    ]);
    return {
      adminName: String(adminSnapshot.docs[0]?.data().fullName ?? fallback.adminName),
      ownerName: String(ownerDoc.data()?.fullName ?? fallback.ownerName),
      ownerAccess: String(gymDoc.data()?.name ?? fallback.ownerAccess),
      isPersisted: true
    };
  } catch {
    return { ...fallback, isPersisted: false };
  }
}

export async function getMembers(gymId?: string): Promise<{
  members: Member[];
  isPersisted: boolean;
}> {
  const targetGymId = gymId ?? PRIMARY_GYM_ID;

  if (!hasFirebaseAdminConfig()) {
    return { members: mockMembers, isPersisted: false };
  }

  let profileSnapshot;
  let db;

  try {
    db = getFirebaseAdminServices().db;
    profileSnapshot = await db
      .collection(collectionPaths.profiles)
      .where("defaultGymId", "==", targetGymId)
      .where("role", "==", "member")
      .get();
  } catch {
    return { members: mockMembers, isPersisted: false };
  }

  if (profileSnapshot.empty) {
    return { members: [], isPersisted: true };
  }

  const members: Member[] = profileSnapshot.docs.map((doc) => {
    const data = doc.data();
    const name = String(data.fullName ?? "");
    return {
      id: doc.id,
      fullName: name,
      email: String(data.email),
      phone: String(data.phone ?? ""),
      joinedAt: String(data.joinedAt ?? data.createdAt ?? new Date().toISOString().slice(0, 10)),
      avatarInitials: String(data.avatarInitials ?? (name.split(" ").map((p) => p[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "MB")),
      goal: String(data.goal ?? "General fitness"),
      isActive: data.isActive !== false
    };
  });

  return { members, isPersisted: true };
}

export async function getMemberDetail(memberId: string): Promise<{
  member: Member | null;
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    const member = mockMembers.find((item) => item.id === memberId) ?? null;
    return {
      member,
      isPersisted: false
    };
  }

  let db;
  let profileDoc;

  try {
    db = getFirebaseAdminServices().db;
    profileDoc = await db.collection(collectionPaths.profiles).doc(memberId).get();
  } catch {
    const member = mockMembers.find((item) => item.id === memberId) ?? null;
    return {
      member,
      isPersisted: false
    };
  }

  if (!profileDoc.exists) {
    const member = mockMembers.find((item) => item.id === memberId) ?? null;
    return {
      member,
      isPersisted: false
    };
  }

  const data = profileDoc.data() ?? {};

  if (data.role !== "member") {
    return { member: null, isPersisted: true };
  }

  const memberName = String(data.fullName ?? "");
  const member: Member = {
    id: profileDoc.id,
    fullName: memberName,
    email: String(data.email),
    phone: String(data.phone ?? ""),
    joinedAt: String(data.joinedAt ?? data.createdAt ?? new Date().toISOString().slice(0, 10)),
    avatarInitials: String(data.avatarInitials ?? (memberName.split(" ").map((p) => p[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "MB")),
    goal: String(data.goal ?? "General fitness"),
    isActive: data.isActive !== false
  };

  return { member, isPersisted: true };
}

export async function getExerciseCatalog(gymId?: string): Promise<{
  exercises: Exercise[];
  catalog: Array<{ muscleGroup: MuscleGroup; exercises: Exercise[] }>;
  isPersisted: boolean;
}> {
  const targetGymId = gymId ?? PRIMARY_GYM_ID;

  if (!hasFirebaseAdminConfig()) {
    return {
      exercises: mockExercises,
      catalog: mockExerciseCatalogByMuscle,
      isPersisted: false
    };
  }

  let snapshot;

  try {
    const { db } = getFirebaseAdminServices();
    snapshot = await db
      .collection(collectionPaths.exerciseCatalog)
      .where("gymId", "==", targetGymId)
      .where("isActive", "==", true)
      .get();
  } catch {
    return {
      exercises: mockExercises,
      catalog: mockExerciseCatalogByMuscle,
      isPersisted: false
    };
  }

  const defaultExercisesById = new Map<string, Exercise>();
  mockExercises.forEach((exercise) => defaultExercisesById.set(exercise.id, exercise));

  const persistedExercises: Exercise[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    const defaultExercise = defaultExercisesById.get(doc.id);
    const persistedVideoUrl = String(data.videoUrl ?? "").trim();
    const videoUrl = persistedVideoUrl || defaultExercise?.videoUrl || "";
    const persistedVideoSource = String(data.videoSource ?? "").trim() as Exercise["videoSource"];
    const gymVideoUrl = String(data.gymVideoUrl ?? "").trim();
    const persistedGymVideoSource = String(data.gymVideoSource ?? "").trim() as Exercise["gymVideoSource"];
    return {
      id: doc.id,
      name: String(data.name),
      muscleGroup: String(data.muscleGroup ?? "Chest") as MuscleGroup,
      equipment: String(data.equipment ?? ""),
      instructions: String(data.instructions ?? ""),
      videoSource: videoUrl ? (persistedVideoSource === "none" ? "youtube" : persistedVideoSource || "youtube") : "none",
      videoUrl,
      gymVideoUrl,
      gymVideoSource: gymVideoUrl ? (persistedGymVideoSource === "none" ? "youtube" : persistedGymVideoSource || "youtube") : "none",
      thumbnailUrl: String(
        data.thumbnailUrl ??
          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80"
      ),
      ownerOnly: true
    };
  });

  const exercisesById = new Map<string, Exercise>();
  mockExercises.forEach((exercise) => exercisesById.set(exercise.id, exercise));
  persistedExercises.forEach((exercise) => exercisesById.set(exercise.id, exercise));
  const allExercises = Array.from(exercisesById.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  const muscleGroups = Array.from(
    new Set(allExercises.map((exercise) => exercise.muscleGroup))
  );

  return {
    exercises: allExercises,
    catalog: muscleGroups.map((muscleGroup) => ({
      muscleGroup,
      exercises: allExercises.filter((exercise) => exercise.muscleGroup === muscleGroup)
    })),
    isPersisted: true
  };
}

export async function getOwnerNotifications(gymId?: string): Promise<{
  notifications: Notification[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return {
      notifications: mockNotifications.filter(
        (notification) => notification.recipientRole === "owner"
      ).map(sanitizeNotification),
      isPersisted: false
    };
  }

  let snapshot;

  try {
    const { db } = getFirebaseAdminServices();
    let query = db
      .collection(collectionPaths.notifications)
      .where("recipientRole", "==", "owner") as FirebaseFirestore.Query;
    if (gymId) {
      query = query.where("gymId", "==", gymId);
    }
    snapshot = await query.get();
  } catch {
    return {
      notifications: mockNotifications.filter(
        (notification) => notification.recipientRole === "owner"
      ).map(sanitizeNotification),
      isPersisted: false
    };
  }

  if (snapshot.empty) {
    return { notifications: [], isPersisted: true };
  }

  const notifications: Notification[] = snapshot.docs
    .map((doc) => {
      const data = doc.data();
        const copy = trainingNotificationCopy(
          String(data.title ?? "Notification"),
          String(data.body ?? "")
        );

        return {
          id: doc.id,
          recipientRole: String(data.recipientRole ?? "owner") as Notification["recipientRole"],
          recipientId: String(data.recipientId ?? ""),
          type: String(data.type ?? "membership_expiring_soon") as Notification["type"],
          title: copy.title,
          body: copy.body,
        createdAt: String(data.createdAt ?? new Date().toISOString()),
        readAt: data.readAt ? String(data.readAt) : undefined
      };
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return { notifications, isPersisted: true };
}

export async function getAdminNotifications(): Promise<{
  notifications: Notification[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { notifications: [], isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection(collectionPaths.notifications)
      .where("recipientRole", "==", "admin")
      .get();

    const notifications: Notification[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          recipientRole: "admin" as Notification["recipientRole"],
          recipientId: String(data.recipientId ?? ""),
          type: String(data.type ?? "password_reset_request") as Notification["type"],
          title: String(data.title ?? "Notification"),
          body: String(data.body ?? ""),
          createdAt: String(data.createdAt ?? new Date().toISOString()),
          readAt: data.readAt ? String(data.readAt) : undefined
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { notifications, isPersisted: true };
  } catch {
    return { notifications: [], isPersisted: false };
  }
}

export async function getMemberNotifications(memberId: string): Promise<{
  notifications: Notification[];
  isPersisted: boolean;
}> {
  const fallback = mockNotifications.filter(
    (notification) => notification.recipientId === memberId
  ).map(sanitizeNotification);

  if (!hasFirebaseAdminConfig()) {
    return { notifications: fallback, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection(collectionPaths.notifications)
      .where("recipientId", "==", memberId)
      .get();
    const notifications: Notification[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
          const copy = trainingNotificationCopy(
            String(data.title ?? "Notification"),
            String(data.body ?? "")
          );

          return {
            id: doc.id,
            recipientRole: String(data.recipientRole ?? "member") as Notification["recipientRole"],
            recipientId: String(data.recipientId ?? memberId),
            type: String(data.type ?? "program_assigned") as Notification["type"],
            title: copy.title,
            body: copy.body,
          createdAt: String(data.createdAt ?? new Date().toISOString()),
          readAt: data.readAt ? String(data.readAt) : undefined
        };
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return { notifications, isPersisted: true };
  } catch {
    return { notifications: fallback, isPersisted: false };
  }
}

export async function getWorkoutPrograms(gymId?: string): Promise<{
  programs: WorkoutProgram[];
  isPersisted: boolean;
}> {
  const targetGymId = gymId ?? PRIMARY_GYM_ID;
  const predefinedPrograms: WorkoutProgram[] = mockPrograms
    .filter((program) => program.days.some((day) => day.exercises.length > 0))
    .map((program) => ({
      ...program,
      source: "predefined"
    }));

  if (!hasFirebaseAdminConfig()) {
    return { programs: predefinedPrograms, isPersisted: false };
  }

  let snapshot;

  try {
    const { db } = getFirebaseAdminServices();
    snapshot = await db
      .collection(collectionPaths.workoutPrograms)
      .where("gymId", "==", targetGymId)
      .where("isActive", "==", true)
      .get();
  } catch {
    return { programs: predefinedPrograms, isPersisted: false };
  }

  const gymPrograms: WorkoutProgram[] = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: String(data.title ?? "Stored program"),
        description: String(data.description ?? ""),
        goal: String(data.goal ?? "Structured training"),
        difficulty: String(data.difficulty ?? "intermediate") as Difficulty,
        daysPerWeek: Number(data.daysPerWeek ?? 1),
        source: "gym" as const,
        splitType: String(data.splitType ?? "custom") as WorkoutProgram["splitType"],
        days: Array.isArray(data.days) ? data.days : []
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));

  const programsById = new Map<string, WorkoutProgram>();
  predefinedPrograms.forEach((program) => programsById.set(program.id, program));
  gymPrograms.forEach((program) => programsById.set(program.id, program));

  const programs = Array.from(programsById.values()).sort((left, right) => {
    if (left.source !== right.source) {
      return left.source === "predefined" ? -1 : 1;
    }

    return left.title.localeCompare(right.title);
  });

  return { programs, isPersisted: true };
}

export async function getLiftLogsForMember(memberId: string): Promise<{
  liftLogs: LiftLog[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { liftLogs: [], isPersisted: false };
  }

  let snapshot;

  try {
    const { db } = getFirebaseAdminServices();
    snapshot = await db
      .collection(collectionPaths.liftLogs)
      .where("memberId", "==", memberId)
      .get();
  } catch {
    return { liftLogs: [], isPersisted: false };
  }

  if (snapshot.empty) {
    return { liftLogs: [], isPersisted: true };
  }

  const liftLogs: LiftLog[] = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        memberId: String(data.memberId ?? memberId),
        exerciseId: String(data.exerciseId ?? ""),
        weight: Number(data.weight ?? 0),
        sets: Number(data.sets ?? 1),
        reps: String(data.reps ?? ""),
        sessionId: String(data.sessionId ?? ""),
        loggedAt: String(data.loggedAt ?? data.createdAt ?? new Date().toISOString())
      };
    })
    .sort((left, right) => right.loggedAt.localeCompare(left.loggedAt));

  return { liftLogs, isPersisted: true };
}

export async function getProgramAssignmentForMember(memberId: string): Promise<{
  assignment: ProgramAssignment | null;
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return {
      assignment:
        mockAssignments.find(
          (assignment) => assignment.memberId === memberId && assignment.status === "active"
        ) ?? null,
      isPersisted: false
    };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection(collectionPaths.programAssignments)
      .where("memberId", "==", memberId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { assignment: null, isPersisted: true };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      assignment: {
        id: doc.id,
        memberId: String(data.memberId ?? ""),
        programId: String(data.programId ?? ""),
        assignedAt: String(data.assignedAt ?? new Date().toISOString()),
        status: String(data.status ?? "active") as ProgramAssignment["status"]
      },
      isPersisted: true
    };
  } catch {
    return {
      assignment:
        mockAssignments.find(
          (assignment) => assignment.memberId === memberId && assignment.status === "active"
        ) ?? null,
      isPersisted: false
    };
  }
}

export async function getActiveProgramAssignments(gymId?: string): Promise<{
  assignments: ProgramAssignment[];
  isPersisted: boolean;
}> {
  const targetGymId = gymId ?? PRIMARY_GYM_ID;
  const fallback = mockAssignments.filter((assignment) => assignment.status === "active");

  if (!hasFirebaseAdminConfig()) {
    return { assignments: fallback, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection(collectionPaths.programAssignments)
      .where("gymId", "==", targetGymId)
      .where("status", "==", "active")
      .get();

    const assignments: ProgramAssignment[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        memberId: String(data.memberId ?? ""),
        programId: String(data.programId ?? ""),
        assignedAt: String(data.assignedAt ?? new Date().toISOString()),
        status: String(data.status ?? "active") as ProgramAssignment["status"]
      };
    });

    return { assignments, isPersisted: true };
  } catch {
    return { assignments: fallback, isPersisted: false };
  }
}

export async function getActivityEvents(audience: "owner" | "member", memberId?: string, gymId?: string): Promise<{
  events: ActivityEvent[];
  isPersisted: boolean;
}> {
  const fallback: ActivityEvent[] =
    audience === "member"
      ? [
          {
            id: "fallback-member-training",
            audience: "member",
            memberId,
            title: "Training profile updated",
            detail: "Your member profile now reflects the latest owner update.",
            icon: "bell",
            createdAt: "2026-05-04T11:10:00+05:30"
          },
          {
            id: "fallback-member-program",
            audience: "member",
            memberId,
            title: "New workout plan assigned",
            detail: "PPL + Upper/Lower is available in your member portal.",
            icon: "dumbbell",
            createdAt: "2026-05-03T17:15:00+05:30"
          }
        ]
      : [
          {
            id: "fallback-owner-member",
            audience: "owner",
            title: 'New member added - "Aarav Sharma"',
            detail: "Training profile created for Sri Shakthi Hanuman Gym.",
            icon: "users",
            createdAt: "2026-05-04T10:30:00+05:30"
          },
          {
            id: "fallback-owner-plan",
            audience: "owner",
            title: "New workout plan created - Custom split v1",
            detail: "Owner-created custom plan is ready for assignment.",
            icon: "dumbbell",
            createdAt: "2026-05-04T09:45:00+05:30"
          }
        ];

  if (!hasFirebaseAdminConfig()) {
    return { events: fallback, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const targetGymId = gymId ?? PRIMARY_GYM_ID;
    const snapshot = await db
      .collection(collectionPaths.activityEvents)
      .where("gymId", "==", targetGymId)
      .where("audience", "==", audience)
      .get();
    const events = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          audience: String(data.audience ?? audience) as ActivityEvent["audience"],
          memberId: data.memberId ? String(data.memberId) : undefined,
          title: String(data.title ?? "Activity"),
          detail: String(data.detail ?? ""),
          icon: String(data.icon ?? "activity") as ActivityEvent["icon"],
          createdAt: String(data.createdAt ?? new Date().toISOString())
        };
      })
      .filter((event) => audience === "owner" || !memberId || event.memberId === memberId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return { events, isPersisted: true };
  } catch {
    return { events: fallback, isPersisted: false };
  }
}

export async function getProfileMetrics(memberId: string): Promise<{
  profile: ProfileMetrics;
  isPersisted: boolean;
}> {
  const fallbackMember = mockMembers.find((member) => member.id === memberId) ?? mockMembers[0];
  const fallback: ProfileMetrics = {
    fullName: fallbackMember.fullName,
    email: fallbackMember.email,
    phone: fallbackMember.phone,
    age: 29,
    gender: "",
    dob: "",
    heightCm: 174,
    weightKg: 72,
    fitnessGoals: fallbackMember.goal,
    medicalNotes: "",
    primarySlot: "A",
    secondarySlot: "D",
    injuryNotes: "",
    assignedTrainer: ""
  };

  if (!hasFirebaseAdminConfig()) {
    return { profile: fallback, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const doc = await db.collection(collectionPaths.profiles).doc(memberId).get();

    if (!doc.exists) {
      return { profile: fallback, isPersisted: !hasFirebaseAdminConfig() };
    }

    const data = doc.data() ?? {};
    return {
      profile: {
        fullName: String(data.fullName ?? fallback.fullName),
        email: String(data.email ?? fallback.email),
        phone: String(data.phone ?? fallback.phone),
        age: data.age ? Number(data.age) : fallback.age,
        gender: String(data.gender ?? fallback.gender ?? ""),
        dob: String(data.dob ?? fallback.dob ?? ""),
        heightCm: data.heightCm ? Number(data.heightCm) : fallback.heightCm,
        weightKg: data.weightKg ? Number(data.weightKg) : fallback.weightKg,
        fitnessGoals: String(data.fitnessGoals ?? data.goal ?? fallback.fitnessGoals ?? ""),
        medicalNotes: String(data.medicalNotes ?? fallback.medicalNotes ?? ""),
        primarySlot: String(data.primarySlot ?? fallback.primarySlot ?? "A") as ProfileMetrics["primarySlot"],
        secondarySlot: String(data.secondarySlot ?? fallback.secondarySlot ?? "D") as ProfileMetrics["secondarySlot"],
        injuryNotes: String(data.injuryNotes ?? fallback.injuryNotes ?? ""),
        assignedTrainer: String(data.assignedTrainer ?? fallback.assignedTrainer ?? "")
      },
      isPersisted: true
    };
  } catch {
    return { profile: fallback, isPersisted: false };
  }
}

export async function getMemberWithProfile(memberId: string): Promise<{
  member: Member | null;
  profile: ProfileMetrics;
  isPersisted: boolean;
}> {
  const fallbackMember = mockMembers.find((m) => m.id === memberId) ?? mockMembers[0];
  const fallbackProfile: ProfileMetrics = {
    fullName: fallbackMember.fullName,
    email: fallbackMember.email,
    phone: fallbackMember.phone,
    age: 29,
    gender: "",
    dob: "",
    heightCm: 174,
    weightKg: 72,
    fitnessGoals: fallbackMember.goal,
    medicalNotes: "",
    primarySlot: "A",
    secondarySlot: "D",
    injuryNotes: "",
    assignedTrainer: ""
  };

  if (!hasFirebaseAdminConfig()) {
    return {
      member: fallbackMember,
      profile: fallbackProfile,
      isPersisted: false
    };
  }

  let doc;
  try {
    const { db } = getFirebaseAdminServices();
    doc = await db.collection(collectionPaths.profiles).doc(memberId).get();
  } catch {
    return { member: fallbackMember, profile: fallbackProfile, isPersisted: false };
  }

  if (!doc.exists) {
    return { member: fallbackMember, profile: fallbackProfile, isPersisted: false };
  }

  const data = doc.data() ?? {};

  if (data.role !== "member") {
    return { member: null, profile: fallbackProfile, isPersisted: true };
  }

  const member: Member = {
    id: doc.id,
    fullName: String(data.fullName),
    email: String(data.email),
    phone: String(data.phone ?? ""),
    joinedAt: String(data.joinedAt ?? data.createdAt ?? new Date().toISOString().slice(0, 10)),
    avatarInitials: String(data.avatarInitials ?? "MB"),
    goal: String(data.goal ?? ""),
    isActive: data.isActive !== false
  };

  const profile: ProfileMetrics = {
    fullName: String(data.fullName ?? fallbackProfile.fullName),
    email: String(data.email ?? fallbackProfile.email),
    phone: String(data.phone ?? fallbackProfile.phone),
    age: data.age ? Number(data.age) : fallbackProfile.age,
    gender: String(data.gender ?? fallbackProfile.gender ?? ""),
    dob: String(data.dob ?? fallbackProfile.dob ?? ""),
    heightCm: data.heightCm ? Number(data.heightCm) : fallbackProfile.heightCm,
    weightKg: data.weightKg ? Number(data.weightKg) : fallbackProfile.weightKg,
    fitnessGoals: String(data.fitnessGoals ?? data.goal ?? fallbackProfile.fitnessGoals ?? ""),
    medicalNotes: String(data.medicalNotes ?? fallbackProfile.medicalNotes ?? ""),
    primarySlot: String(data.primarySlot ?? fallbackProfile.primarySlot ?? "A") as ProfileMetrics["primarySlot"],
    secondarySlot: String(data.secondarySlot ?? fallbackProfile.secondarySlot ?? "D") as ProfileMetrics["secondarySlot"],
    injuryNotes: String(data.injuryNotes ?? fallbackProfile.injuryNotes ?? ""),
    assignedTrainer: String(data.assignedTrainer ?? fallbackProfile.assignedTrainer ?? "")
  };

  return { member, profile, isPersisted: true };
}

export async function getSiteLinks(): Promise<{
  links: SiteLink[];
  isPersisted: boolean;
}> {
  const fallback: SiteLink[] = [
    { id: "instagram", label: "Instagram profile", href: "#" },
    { id: "linkedin", label: "LinkedIn profile", href: "#" },
    { id: "youtube", label: "YouTube profile", href: "#" },
    { id: "email", label: "mehul@example.com", href: "mailto:mehul@example.com" }
  ];

  if (!hasFirebaseAdminConfig()) {
    return { links: fallback, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db.collection(collectionPaths.siteLinks).get();
    const links = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          label: String(data.label ?? doc.id),
          href: String(data.href ?? "#")
        };
      })
      .sort((left, right) => left.id.localeCompare(right.id));

    return { links: links.length ? links : fallback, isPersisted: links.length > 0 };
  } catch {
    return { links: fallback, isPersisted: false };
  }
}

export async function getActiveWorkoutSessions(gymId?: string): Promise<{
  sessions: WorkoutSession[];
  isPersisted: boolean;
}> {
  const targetGymId = gymId ?? PRIMARY_GYM_ID;

  if (!hasFirebaseAdminConfig()) {
    return { sessions: [], isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection(collectionPaths.workoutSessions)
      .where("gymId", "==", targetGymId)
      .where("status", "==", "active")
      .get();
    const sessions: WorkoutSession[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        memberId: String(data.memberId ?? ""),
        gymId: data.gymId ? String(data.gymId) : undefined,
        startedAt: String(data.startedAt ?? new Date().toISOString()),
        endedAt: data.endedAt ? String(data.endedAt) : undefined,
        status: "active"
      };
    });

    return { sessions, isPersisted: true };
  } catch {
    return { sessions: [], isPersisted: false };
  }
}

export async function getAttendanceRecords(memberId: string): Promise<{
  records: AttendanceRecord[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return {
      records: mockAttendanceRecords.filter(r => r.memberId === memberId),
      isPersisted: false
    };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection(collectionPaths.attendanceRecords)
      .where("memberId", "==", memberId)
      .get();
    
    const records: AttendanceRecord[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        memberId: String(data.memberId),
        gymId: data.gymId ? String(data.gymId) : undefined,
        sessionId: data.sessionId ? String(data.sessionId) : undefined,
        checkInAt: String(data.checkInAt),
        checkOutAt: data.checkOutAt ? String(data.checkOutAt) : undefined,
        latitude: data.latitude != null ? Number(data.latitude) : undefined,
        longitude: data.longitude != null ? Number(data.longitude) : undefined,
        deviceInfo: data.deviceInfo ? String(data.deviceInfo) : undefined,
        distanceMeters: data.distanceMeters != null ? Number(data.distanceMeters) : undefined,
        geofenceStatus: data.geofenceStatus
          ? String(data.geofenceStatus) as AttendanceRecord["geofenceStatus"]
          : undefined,
        radiusMeters: data.radiusMeters != null ? Number(data.radiusMeters) : undefined
      };
    });

    return { records, isPersisted: true };
  } catch {
    return {
      records: mockAttendanceRecords.filter(r => r.memberId === memberId),
      isPersisted: false
    };
  }
}

export async function getContactMessages(): Promise<{
  messages: ContactMessage[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { messages: [], isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection(collectionPaths.contactMessages)
      .orderBy("createdAt", "desc")
      .get();
    
    const messages: ContactMessage[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: String(data.name),
        mobile: String(data.mobile),
        email: data.email ? String(data.email) : undefined,
        body: String(data.body),
        status: String(data.status ?? "unread") as ContactMessage["status"],
        createdAt: String(data.createdAt),
        updatedAt: String(data.updatedAt)
      };
    });

    return { messages, isPersisted: true };
  } catch {
    return { messages: [], isPersisted: false };
  }
}

export async function getUnreadContactMessageCount(): Promise<number> {
  if (!hasFirebaseAdminConfig()) {
    return 0;
  }

  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection(collectionPaths.contactMessages)
      .where("status", "==", "unread")
      .get();

    return snapshot.size;
  } catch {
    return 0;
  }
}
