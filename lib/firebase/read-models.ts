import { unstable_cache } from "next/cache";
import type {
  ActivityEvent,
  AttendanceRecord,
  BodyMetricLog,
  DayLog,
  Difficulty,
  Exercise,
  ExerciseRequest,
  GymNotice,
  GymNoticeType,
  GymWorkspace,
  LiftLog,
  Member,
  MuscleGroup,
  Notification,
  ProfileMetrics,
  ProgramAssignment,
  PTLiftLog,
  PTSession,
  SkipReason,
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
import { getExerciseThumbnail, isGenericExerciseThumbnail } from "@/lib/exercise-thumbnails";
import { collectionPaths, gymCollectionPath, gymScopedCollectionPaths, PRIMARY_GYM_ID, PRIMARY_OWNER_ID } from "./collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "./admin";

type FirestoreDb = ReturnType<typeof getFirebaseAdminServices>["db"];

function gymCollection(db: FirestoreDb, gymId: string, collection: Parameters<typeof gymCollectionPath>[1]) {
  return db.collection(gymCollectionPath(gymId, collection));
}

function mapProfileToMember(docId: string, data: Record<string, unknown>): Member {
  const name = String(data.fullName ?? "");
  const username =
    String(data.username ?? "").trim() ||
    String(data.phone ?? "").trim() ||
    String(data.email ?? "").trim() ||
    undefined;

  return {
    id: docId,
    fullName: name,
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    joinedAt: String(data.joinedAt ?? data.createdAt ?? new Date().toISOString().slice(0, 10)),
    avatarInitials: String(data.avatarInitials ?? (name.split(" ").map((p) => p[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "MB")),
    goal: String(data.goal ?? "General fitness"),
    staffType: data.staffType ? String(data.staffType) as Member["staffType"] : undefined,
    isActive: data.isActive !== false,
    username
  };
}

async function getMemberProfileDocument(db: FirestoreDb, memberId: string) {
  const scopedSnapshot = await db
    .collectionGroup(gymScopedCollectionPaths.members)
    .where("id", "==", memberId)
    .limit(1)
    .get();

  if (!scopedSnapshot.empty) {
    return scopedSnapshot.docs[0];
  }

  const legacyDoc = await db.collection(collectionPaths.profiles).doc(memberId).get();
  if (legacyDoc.exists) return legacyDoc;
  return db.collection(collectionPaths.authProfiles).doc(memberId).get();
}

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
    const [gymSnapshot, scopedMembersSnapshot, memberSnapshot] = await Promise.all([
      db.collection(collectionPaths.gyms).get(),
      db.collectionGroup(gymScopedCollectionPaths.members).get(),
      db
        .collection(collectionPaths.authProfiles)
        .where("role", "==", "member")
        .get()
    ]);

    if (gymSnapshot.empty) {
      return { gyms: mockGyms, isPersisted: false };
    }

    const gyms = gymSnapshot.docs
      .map((doc) => {
        const workspace = mapWorkspace(doc.id, doc.data());
        const memberIds = new Set<string>();

        scopedMembersSnapshot.docs
          .filter((memberDoc) => memberDoc.ref.parent.parent?.id === workspace.id)
          .forEach((memberDoc) => memberIds.add(memberDoc.id));

        memberSnapshot.docs
          .filter((memberDoc) => {
            const data = memberDoc.data();
            return (data.defaultGymId === workspace.id || data.gymId === workspace.id) && data.role === "member";
          })
          .forEach((memberDoc) => memberIds.add(memberDoc.id));

        return {
          ...workspace,
          memberCount: memberIds.size
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
      const [scopedMembers, rootMembers] = await Promise.all([
        gymCollection(db, slugDoc.id, "members").get(),
        db.collection(collectionPaths.authProfiles).where("role", "==", "member").where("defaultGymId", "==", slugDoc.id).get()
      ]);
      const memberIds = new Set([...scopedMembers.docs, ...rootMembers.docs].map((memberDoc) => memberDoc.id));
      return { gym: { ...mapWorkspace(slugDoc.id, slugDoc.data()), memberCount: memberIds.size }, isPersisted: true };
    }

    const [scopedMembers, rootMembers] = await Promise.all([
      gymCollection(db, doc.id, "members").get(),
      db.collection(collectionPaths.authProfiles).where("role", "==", "member").where("defaultGymId", "==", doc.id).get()
    ]);
    const memberIds = new Set([...scopedMembers.docs, ...rootMembers.docs].map((memberDoc) => memberDoc.id));
    return { gym: { ...mapWorkspace(doc.id, doc.data() ?? {}), memberCount: memberIds.size }, isPersisted: true };
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
    const scopedSnapshot = await gymCollection(db, gymId, "staff")
      .where("role", "==", "owner")
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.authProfiles)
          .where("defaultGymId", "==", gymId)
          .where("role", "==", "owner")
          .get()
      : scopedSnapshot;
    
    const owners: Member[] = snapshot.docs.map(doc => mapProfileToMember(doc.id, doc.data()));

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
      db.collection(collectionPaths.authProfiles).where("role", "==", "admin").limit(1).get(),
      db.collection(collectionPaths.authProfiles).doc(PRIMARY_OWNER_ID).get(),
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

async function getMembersUncached(gymId?: string): Promise<{
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
    const scopedSnapshot = await gymCollection(db, targetGymId, "members").get();
    profileSnapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.authProfiles)
          .where("defaultGymId", "==", targetGymId)
          .where("role", "==", "member")
          .get()
      : scopedSnapshot;
  } catch {
    return { members: mockMembers, isPersisted: false };
  }

  if (profileSnapshot.empty) {
    return { members: [], isPersisted: true };
  }

  const members: Member[] = profileSnapshot.docs.map((doc) => mapProfileToMember(doc.id, doc.data()));

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
    profileDoc = await getMemberProfileDocument(db, memberId);
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
  const username =
    String(data.username ?? "").trim() ||
    String(data.phone ?? "").trim() ||
    String(data.email ?? "").trim() ||
    undefined;
  const member: Member = {
    id: profileDoc.id,
    fullName: memberName,
    email: String(data.email),
    phone: String(data.phone ?? ""),
    joinedAt: String(data.joinedAt ?? data.createdAt ?? new Date().toISOString().slice(0, 10)),
    avatarInitials: String(data.avatarInitials ?? (memberName.split(" ").map((p) => p[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "MB")),
    goal: String(data.goal ?? "General fitness"),
    isActive: data.isActive !== false,
    username
  };

  return { member, isPersisted: true };
}

async function getExerciseCatalogUncached(gymId?: string): Promise<{
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
    const scopedSnapshot = await gymCollection(db, targetGymId, "exerciseCatalog")
      .where("isActive", "==", true)
      .get();
    snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.exerciseCatalog)
          .where("gymId", "==", targetGymId)
          .where("isActive", "==", true)
          .get()
      : scopedSnapshot;
  } catch {
    return {
      exercises: mockExercises,
      catalog: mockExerciseCatalogByMuscle,
      isPersisted: false
    };
  }

  const defaultExercisesById = new Map<string, Exercise>();
  const defaultExercisesByName = new Map<string, Exercise>();
  mockExercises.forEach((exercise) => defaultExercisesById.set(exercise.id, exercise));
  mockExercises.forEach((exercise) => defaultExercisesByName.set(exercise.name.toLowerCase().trim(), exercise));

  const persistedExercises: Array<Exercise & { skipDefaultOverride?: boolean }> = snapshot.docs.map((doc) => {
    const data = doc.data();
    const defaultExercise = defaultExercisesById.get(doc.id);
    const hasDefaultExercise = Boolean(defaultExercise) || defaultExercisesByName.has(String(data.name ?? "").toLowerCase().trim());
    const isMirroredDefault = data.mirroredFromRootCollection === true && data.scope !== "custom";
    const persistedVideoUrl = String(data.videoUrl ?? "").trim();
    const videoUrl = persistedVideoUrl || defaultExercise?.videoUrl || "";
    const persistedVideoSource = String(data.videoSource ?? "").trim() as Exercise["videoSource"];
    const gymVideoUrl = String(data.gymVideoUrl ?? "").trim();
    const persistedGymVideoSource = String(data.gymVideoSource ?? "").trim() as Exercise["gymVideoSource"];
    const muscleGroup = String(data.muscleGroup ?? "Chest") as MuscleGroup;
    const storedThumbnailUrl = String(data.thumbnailUrl ?? "").trim();
    return {
      id: doc.id,
      name: String(data.name),
      muscleGroup,
      equipment: String(data.equipment ?? ""),
      instructions: String(data.instructions ?? ""),
      videoSource: videoUrl ? (persistedVideoSource === "none" ? "youtube" : persistedVideoSource || "youtube") : "none",
      videoUrl,
      gymVideoUrl,
      gymVideoSource: gymVideoUrl ? (persistedGymVideoSource === "none" ? "youtube" : persistedGymVideoSource || "youtube") : "none",
      thumbnailUrl: isGenericExerciseThumbnail(storedThumbnailUrl)
        ? getExerciseThumbnail(String(data.name), muscleGroup)
        : storedThumbnailUrl,
      ownerOnly: true,
      source: (data.source === "custom" || data.source === "gym" || data.scope === "custom")
        ? "custom"
        : hasDefaultExercise ? "predefined" : "custom",
      showTutorial: data.showTutorial !== false,
      skipDefaultOverride: isMirroredDefault && hasDefaultExercise
    };
  });

  // Merge mock + persisted exercises. Use name-based deduplication so that
  // exercises added via createCatalogExercise don't appear twice alongside the
  // same entry from workouts.json (which uses stable slug IDs, not UUIDs).
  // Firebase-persisted version wins when names collide (it may have custom video/notes).
  // Mock exercises never carry gym-specific demo videos — strip gymVideoUrl so one
  // gym's demo footage is never visible to another gym's users.
  const exercisesByName = new Map<string, Exercise>();
  mockExercises.forEach((ex) => exercisesByName.set(ex.name.toLowerCase().trim(), { ...ex, gymVideoUrl: "", gymVideoSource: "none", source: "predefined" as const, showTutorial: true }));
  persistedExercises.forEach((ex) => {
    if (ex.skipDefaultOverride && exercisesByName.has(ex.name.toLowerCase().trim())) {
      return;
    }
    const { skipDefaultOverride: _skipDefaultOverride, ...cleanExercise } = ex;
    exercisesByName.set(ex.name.toLowerCase().trim(), cleanExercise);
  });
  const allExercises = Array.from(exercisesByName.values()).sort((left, right) =>
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
    const targetGymId = gymId ?? PRIMARY_GYM_ID;
    const scopedSnapshot = await gymCollection(db, targetGymId, "notifications")
      .where("recipientRole", "==", "owner")
      .get();
    if (!scopedSnapshot.empty) {
      snapshot = scopedSnapshot;
    } else {
      let query = db
        .collection(collectionPaths.notifications)
        .where("recipientRole", "==", "owner") as FirebaseFirestore.Query;
      if (gymId) {
        query = query.where("gymId", "==", gymId);
      }
      snapshot = await query.get();
    }
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
    const scopedSnapshot = await db
      .collectionGroup(gymScopedCollectionPaths.notifications)
      .where("recipientRole", "==", "admin")
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.notifications)
          .where("recipientRole", "==", "admin")
          .get()
      : scopedSnapshot;

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
    const scopedSnapshot = await db
      .collectionGroup(gymScopedCollectionPaths.notifications)
      .where("recipientId", "==", memberId)
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.notifications)
          .where("recipientId", "==", memberId)
          .get()
      : scopedSnapshot;
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

async function getWorkoutProgramsUncached(gymId?: string): Promise<{
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
    const scopedSnapshot = await gymCollection(db, targetGymId, "workoutPrograms")
      .where("isActive", "==", true)
      .get();
    snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.workoutPrograms)
          .where("gymId", "==", targetGymId)
          .where("isActive", "==", true)
          .get()
      : scopedSnapshot;
  } catch {
    return { programs: predefinedPrograms, isPersisted: false };
  }

  const predefinedProgramIds = new Set(predefinedPrograms.map((program) => program.id));
  const gymPrograms: WorkoutProgram[] = snapshot.docs
    .filter((doc) => {
      const data = doc.data();
      return !(data.mirroredFromRootCollection === true && data.scope !== "custom" && predefinedProgramIds.has(doc.id));
    })
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

export async function getBodyMetricLogsForMember(memberId: string): Promise<{
  logs: BodyMetricLog[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { logs: [], isPersisted: false };
  }
  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await db
      .collectionGroup(gymScopedCollectionPaths.bodyMetricLogs)
      .where("memberId", "==", memberId)
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.bodyMetricLogs)
          .where("memberId", "==", memberId)
          .get()
      : scopedSnapshot;
    const logs: BodyMetricLog[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          memberId: String(data.memberId ?? memberId),
          gymId: data.gymId ? String(data.gymId) : undefined,
          weightKg: Number(data.weightKg ?? 0),
          bodyFatPct: data.bodyFatPct != null ? Number(data.bodyFatPct) : undefined,
          notes: data.notes ? String(data.notes) : undefined,
          loggedAt: String(data.loggedAt ?? data.createdAt ?? new Date().toISOString())
        };
      })
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
    return { logs, isPersisted: true };
  } catch (error) {
    console.warn("getBodyMetricLogsForMember failed:", error);
    return { logs: [], isPersisted: false };
  }
}

export async function getDayLogsForMember(memberId: string, gymId?: string): Promise<{
  dayLogs: DayLog[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { dayLogs: [], isPersisted: false };
  }
  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = gymId
      ? await gymCollection(db, gymId, "dayLogs").where("memberId", "==", memberId).get()
      : await db
          .collectionGroup(gymScopedCollectionPaths.dayLogs)
          .where("memberId", "==", memberId)
          .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.dayLogs)
          .where("memberId", "==", memberId)
          .get()
      : scopedSnapshot;
    const validSkipReasons = new Set<string>(["rest", "no_time", "equipment", "sick", "other"]);
    const dayLogs: DayLog[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const rawReason = data.skipReason ? String(data.skipReason) : undefined;
        return {
          id: doc.id,
          memberId: String(data.memberId ?? memberId),
          gymId: data.gymId ? String(data.gymId) : undefined,
          programId: String(data.programId ?? ""),
          dayId: String(data.dayId ?? ""),
          weekStart: String(data.weekStart ?? ""),
          status: data.status === "modified" ? "modified" : "skipped",
          skipReason: rawReason && validSkipReasons.has(rawReason) ? (rawReason as SkipReason) : undefined,
          note: data.note ? String(data.note) : undefined,
          loggedAt: String(data.loggedAt ?? new Date().toISOString())
        } satisfies DayLog;
      })
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
    return { dayLogs, isPersisted: true };
  } catch (error) {
    console.warn("getDayLogsForMember failed:", error);
    return { dayLogs: [], isPersisted: false };
  }
}

export async function getLiftLogsForMember(memberId: string, gymId?: string): Promise<{
  liftLogs: LiftLog[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { liftLogs: [], isPersisted: false };
  }

  let snapshot;

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = gymId
      ? await gymCollection(db, gymId, "liftLogs").where("memberId", "==", memberId).get()
      : await db
          .collectionGroup(gymScopedCollectionPaths.liftLogs)
          .where("memberId", "==", memberId)
          .get();
    snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.liftLogs)
          .where("memberId", "==", memberId)
          .get()
      : scopedSnapshot;
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

export async function getProgramAssignmentForMember(memberId: string, gymId?: string): Promise<{
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
    const scopedSnapshot = gymId
      ? await gymCollection(db, gymId, "programAssignments")
          .where("memberId", "==", memberId)
          .where("status", "==", "active")
          .limit(1)
          .get()
      : await db
          .collectionGroup(gymScopedCollectionPaths.programAssignments)
          .where("memberId", "==", memberId)
          .where("status", "==", "active")
          .limit(1)
          .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.programAssignments)
          .where("memberId", "==", memberId)
          .where("status", "==", "active")
          .limit(1)
          .get()
      : scopedSnapshot;

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
    const scopedSnapshot = await gymCollection(db, targetGymId, "programAssignments")
      .where("status", "==", "active")
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.programAssignments)
          .where("gymId", "==", targetGymId)
          .where("status", "==", "active")
          .get()
      : scopedSnapshot;

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
    const scopedSnapshot = await gymCollection(db, targetGymId, "activityEvents")
      .where("audience", "==", audience)
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.activityEvents)
          .where("gymId", "==", targetGymId)
          .where("audience", "==", audience)
          .get()
      : scopedSnapshot;
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
    const doc = await getMemberProfileDocument(db, memberId);

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
        assignedTrainer: String(data.assignedTrainer ?? fallback.assignedTrainer ?? ""),
        coachNote: data.coachNote ? String(data.coachNote) : undefined,
        coachNoteUpdatedAt: data.coachNoteUpdatedAt ? String(data.coachNoteUpdatedAt) : undefined,
        coachNoteUpdatedByName: data.coachNoteUpdatedByName ? String(data.coachNoteUpdatedByName) : undefined
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
    doc = await getMemberProfileDocument(db, memberId);
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
    assignedTrainer: String(data.assignedTrainer ?? fallbackProfile.assignedTrainer ?? ""),
    coachNote: data.coachNote ? String(data.coachNote) : undefined,
    coachNoteUpdatedAt: data.coachNoteUpdatedAt ? String(data.coachNoteUpdatedAt) : undefined,
    coachNoteUpdatedByName: data.coachNoteUpdatedByName ? String(data.coachNoteUpdatedByName) : undefined
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
    const scopedSnapshot = await gymCollection(db, targetGymId, "workoutSessions")
      .where("status", "==", "active")
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.workoutSessions)
          .where("gymId", "==", targetGymId)
          .where("status", "==", "active")
          .get()
      : scopedSnapshot;
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
    const scopedSnapshot = await db
      .collectionGroup(gymScopedCollectionPaths.attendanceRecords)
      .where("memberId", "==", memberId)
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.attendanceRecords)
          .where("memberId", "==", memberId)
          .get()
      : scopedSnapshot;
    
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
    const scopedSnapshot = await db
      .collectionGroup(gymScopedCollectionPaths.contactMessages)
      .orderBy("createdAt", "desc")
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.contactMessages)
          .orderBy("createdAt", "desc")
          .get()
      : scopedSnapshot;
    
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

export async function getPendingExerciseRequests(): Promise<{
  requests: ExerciseRequest[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { requests: [], isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await db
      .collectionGroup(gymScopedCollectionPaths.exerciseRequests)
      .where("status", "==", "pending")
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.exerciseRequests)
          .where("status", "==", "pending")
          .get()
      : scopedSnapshot;

    const requests: ExerciseRequest[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          gymId: String(data.gymId ?? ""),
          gymName: data.gymName ? String(data.gymName) : undefined,
          requestedBy: String(data.requestedBy ?? ""),
          name: String(data.name ?? ""),
          muscleGroup: String(data.muscleGroup ?? ""),
          equipment: data.equipment ? String(data.equipment) : undefined,
          instructions: data.instructions ? String(data.instructions) : undefined,
          status: "pending" as const,
          createdAt: String(data.createdAt ?? new Date().toISOString()),
          updatedAt: data.updatedAt ? String(data.updatedAt) : undefined
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { requests, isPersisted: true };
  } catch {
    return { requests: [], isPersisted: false };
  }
}

export async function getUnreadContactMessageCount(): Promise<number> {
  if (!hasFirebaseAdminConfig()) {
    return 0;
  }

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await db
      .collectionGroup(gymScopedCollectionPaths.contactMessages)
      .where("status", "==", "unread")
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.contactMessages)
          .where("status", "==", "unread")
          .get()
      : scopedSnapshot;

    return snapshot.size;
  } catch {
    return 0;
  }
}

export type SlotLoad = {
  slotId: "A" | "B" | "C" | "D";
  label: string;
  time: string;
  memberCount: number;
  exercises: { exerciseName: string; count: number }[];
};

export async function getGymFloorLoadMap(gymId: string): Promise<{
  slots: SlotLoad[];
}> {
  // 1. Fetch active assignments in gym
  const [
    { assignments },
    { members },
    { programs },
    { exercises }
  ] = await Promise.all([
    getActiveProgramAssignments(gymId),
    getMembersUncached(gymId),
    getWorkoutProgramsUncached(gymId),
    getExerciseCatalogUncached(gymId)
  ]);

  // 2. Fetch all profiles to find slots for members
  const memberSlots: Record<string, { primary: string; secondary: string }> = {};
  
  if (hasFirebaseAdminConfig()) {
    try {
      const { db } = getFirebaseAdminServices();
      const snapshot = await db.collection(collectionPaths.authProfiles).where("defaultGymId", "==", gymId).get();
      snapshot.forEach(doc => {
        const data = doc.data();
        memberSlots[doc.id] = {
          primary: String(data.primarySlot || "A"),
          secondary: String(data.secondarySlot || "D")
        };
      });
    } catch (e) {
      console.error("Failed to query profiles for floor load mapping", e);
    }
  }

  // Fallback slots from mock data or default
  members.forEach(member => {
    if (!memberSlots[member.id]) {
      const code = member.fullName.charCodeAt(0) % 4;
      const slotsList = ["A", "B", "C", "D"];
      memberSlots[member.id] = {
        primary: slotsList[code],
        secondary: slotsList[(code + 2) % 4]
      };
    }
  });

  // 3. Initialize aggregator structure
  const slotDetails = {
    A: { label: "Slot A", time: "6 AM - 10 AM", memberCount: 0, exercises: {} as Record<string, number> },
    B: { label: "Slot B", time: "10 AM - 12 PM", memberCount: 0, exercises: {} as Record<string, number> },
    C: { label: "Slot C", time: "4 PM - 6 PM", memberCount: 0, exercises: {} as Record<string, number> },
    D: { label: "Slot D", time: "6 PM - 9 PM", memberCount: 0, exercises: {} as Record<string, number> }
  };

  // 4. For each active program assignment, find what exercises they are doing and accumulate
  assignments.forEach(assignment => {
    const memberId = assignment.memberId;
    const programId = assignment.programId;
    const slots = memberSlots[memberId] || { primary: "A", secondary: "D" };

    const program = programs.find(p => p.id === programId);
    if (!program) return;

    // Increment member headcount in these slots
    if (slots.primary && slotDetails[slots.primary as keyof typeof slotDetails]) {
      slotDetails[slots.primary as keyof typeof slotDetails].memberCount += 1;
    }
    if (slots.secondary && slots.secondary !== slots.primary && slotDetails[slots.secondary as keyof typeof slotDetails]) {
      slotDetails[slots.secondary as keyof typeof slotDetails].memberCount += 1;
    }

    // Accumulate exercises across their program days into both preferred slots
    program.days.forEach(day => {
      day.exercises.forEach(we => {
        const ex = exercises.find(e => e.id === we.exerciseId);
        const name = ex?.name || "Exercise";

        // Increment count in slots
        [slots.primary, slots.secondary].forEach(slotId => {
          if (slotId && slotDetails[slotId as keyof typeof slotDetails]) {
            const slot = slotDetails[slotId as keyof typeof slotDetails];
            slot.exercises[name] = (slot.exercises[name] || 0) + 1;
          }
        });
      });
    });
  });

  // 5. Format into final list
  const slots: SlotLoad[] = (["A", "B", "C", "D"] as const).map(id => {
    const s = slotDetails[id];
    const exerciseList = Object.entries(s.exercises)
      .map(([exerciseName, count]) => ({ exerciseName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5 congested exercises

    return {
      slotId: id,
      label: s.label,
      time: s.time,
      memberCount: s.memberCount,
      exercises: exerciseList
    };
  });

  return { slots };
}

// ─── Cached exports ──────────────────────────────────────────────────────────
// Each cached read also gets a per-gym tag (`gym:${gymId}`) so a mutation in one
// gym doesn't invalidate caches for other gyms. A global "gym-data" tag stays as
// a safety-net fallback for actions that don't know their gymId.
//
// TTLs are safety nets — actions call revalidateTag() to bust immediately.

function gymTag(gymId?: string) {
  return gymId ? `gym:${gymId}` : "gym:default";
}

export async function getMembers(gymId?: string) {
  return unstable_cache(
    getMembersUncached,
    ["read:getMembers", gymId ?? "default"],
    { tags: ["members", "gym-data", gymTag(gymId)], revalidate: 60 }
  )(gymId);
}

export async function getExerciseCatalog(gymId?: string) {
  return unstable_cache(
    getExerciseCatalogUncached,
    ["read:getExerciseCatalog", gymId ?? "default"],
    { tags: ["exercises", "gym-data", gymTag(gymId)], revalidate: 300 }
  )(gymId);
}

export async function getWorkoutPrograms(gymId?: string) {
  return unstable_cache(
    getWorkoutProgramsUncached,
    ["read:getWorkoutPrograms", gymId ?? "default"],
    { tags: ["programs", "gym-data", gymTag(gymId)], revalidate: 120 }
  )(gymId);
}

// ─── Personal Training read models ───────────────────────────────────────────

function mapPTSession(docId: string, data: Record<string, unknown>): PTSession {
  return {
    id: String(data.id ?? docId),
    gymId: String(data.gymId ?? ""),
    memberId: String(data.memberId ?? ""),
    memberName: data.memberName ? String(data.memberName) : undefined,
    trainerId: String(data.trainerId ?? ""),
    trainerName: data.trainerName ? String(data.trainerName) : undefined,
    scheduledAt: String(data.scheduledAt ?? ""),
    durationMinutes: Number(data.durationMinutes ?? 60),
    status: (data.status ?? "scheduled") as PTSession["status"],
    startedAt: data.startedAt ? String(data.startedAt) : undefined,
    endedAt: data.endedAt ? String(data.endedAt) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
    cancelReason: data.cancelReason ? String(data.cancelReason) : undefined,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined
  };
}

function mapPTLiftLog(docId: string, data: Record<string, unknown>): PTLiftLog {
  return {
    id: String(data.id ?? docId),
    gymId: String(data.gymId ?? ""),
    ptSessionId: String(data.ptSessionId ?? ""),
    memberId: String(data.memberId ?? ""),
    trainerId: String(data.trainerId ?? ""),
    exerciseId: String(data.exerciseId ?? ""),
    exerciseName: data.exerciseName ? String(data.exerciseName) : undefined,
    weight: Number(data.weight ?? 0),
    sets: Number(data.sets ?? 1),
    reps: String(data.reps ?? ""),
    notes: data.notes ? String(data.notes) : undefined,
    loggedAt: String(data.loggedAt ?? "")
  };
}

/**
 * All PT sessions for a gym, ordered by scheduledAt descending.
 * Used by the owner /owner/training hub and by trainers.
 */
async function getAllPTSessionsForGymUncached(gymId: string): Promise<PTSession[]> {
  const { db } = getFirebaseAdminServices();
  const snap = await gymCollection(db, gymId, "ptSessions")
    .orderBy("scheduledAt", "desc")
    .get();
  return snap.docs.map((d) => mapPTSession(d.id, d.data() as Record<string, unknown>));
}

export async function getAllPTSessionsForGym(gymId: string): Promise<PTSession[]> {
  return unstable_cache(
    getAllPTSessionsForGymUncached,
    ["read:getAllPTSessionsForGym", gymId],
    { tags: ["pt-sessions", gymTag(gymId)], revalidate: 30 }
  )(gymId);
}

/**
 * All PT sessions where trainerId === the given trainer UID.
 * Trainers see their own schedule here; owners see this per trainer.
 */
async function getPTSessionsForTrainerUncached(gymId: string, trainerId: string): Promise<PTSession[]> {
  const { db } = getFirebaseAdminServices();
  const snap = await gymCollection(db, gymId, "ptSessions")
    .where("trainerId", "==", trainerId)
    .orderBy("scheduledAt", "desc")
    .get();
  return snap.docs.map((d) => mapPTSession(d.id, d.data() as Record<string, unknown>));
}

export async function getPTSessionsForTrainer(gymId: string, trainerId: string): Promise<PTSession[]> {
  return unstable_cache(
    getPTSessionsForTrainerUncached,
    ["read:getPTSessionsForTrainer", gymId, trainerId],
    { tags: ["pt-sessions", gymTag(gymId)], revalidate: 30 }
  )(gymId, trainerId);
}

/**
 * All PT sessions for a specific member (their history + upcoming).
 */
async function getPTSessionsForMemberUncached(gymId: string, memberId: string): Promise<PTSession[]> {
  const { db } = getFirebaseAdminServices();
  const snap = await gymCollection(db, gymId, "ptSessions")
    .where("memberId", "==", memberId)
    .orderBy("scheduledAt", "desc")
    .get();
  return snap.docs.map((d) => mapPTSession(d.id, d.data() as Record<string, unknown>));
}

export async function getPTSessionsForMember(gymId: string, memberId: string): Promise<PTSession[]> {
  return unstable_cache(
    getPTSessionsForMemberUncached,
    ["read:getPTSessionsForMember", gymId, memberId],
    { tags: ["pt-sessions", gymTag(gymId)], revalidate: 30 }
  )(gymId, memberId);
}

/**
 * Fetch a single PT session by ID (reads from root collection for speed).
 */
async function getPTSessionDetailUncached(ptSessionId: string): Promise<PTSession | null> {
  const { db } = getFirebaseAdminServices();
  const snap = await db.collection(collectionPaths.ptSessions).doc(ptSessionId).get();
  if (!snap.exists) return null;
  return mapPTSession(snap.id, snap.data() as Record<string, unknown>);
}

export async function getPTSessionDetail(ptSessionId: string): Promise<PTSession | null> {
  return unstable_cache(
    getPTSessionDetailUncached,
    ["read:getPTSessionDetail", ptSessionId],
    { tags: ["pt-sessions"], revalidate: 15 }
  )(ptSessionId);
}

/**
 * All PT lift logs for a session, ordered by loggedAt ascending.
 */
async function getPTLiftLogsForSessionUncached(gymId: string, ptSessionId: string): Promise<PTLiftLog[]> {
  const { db } = getFirebaseAdminServices();
  const snap = await gymCollection(db, gymId, "ptLiftLogs")
    .where("ptSessionId", "==", ptSessionId)
    .orderBy("loggedAt", "asc")
    .get();
  return snap.docs.map((d) => mapPTLiftLog(d.id, d.data() as Record<string, unknown>));
}

export async function getPTLiftLogsForSession(gymId: string, ptSessionId: string): Promise<PTLiftLog[]> {
  return unstable_cache(
    getPTLiftLogsForSessionUncached,
    ["read:getPTLiftLogsForSession", gymId, ptSessionId],
    { tags: ["pt-lift-logs", gymTag(gymId)], revalidate: 15 }
  )(gymId, ptSessionId);
}

/**
 * All trainers (staff with staffType "trainer") for a gym.
 * Used to populate the trainer assignment dropdown when booking.
 */
async function getTrainersForGymUncached(gymId: string): Promise<Member[]> {
  const { db } = getFirebaseAdminServices();
  const snap = await gymCollection(db, gymId, "staff")
    .where("staffType", "==", "trainer")
    .get();
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: String(data.id ?? d.id),
      fullName: String(data.fullName ?? ""),
      email: String(data.email ?? ""),
      phone: String(data.phone ?? ""),
      joinedAt: String(data.joinedAt ?? data.createdAt ?? ""),
      avatarInitials: String(data.avatarInitials ?? String(data.fullName ?? "").slice(0, 2).toUpperCase()),
      goal: String(data.goal ?? ""),
      isActive: Boolean(data.isActive ?? true),
      username: data.username ? String(data.username) : undefined,
      staffType: "trainer" as const
    };
  });
}

export async function getTrainersForGym(gymId: string): Promise<Member[]> {
  return unstable_cache(
    getTrainersForGymUncached,
    ["read:getTrainersForGym", gymId],
    { tags: ["staff", gymTag(gymId)], revalidate: 60 }
  )(gymId);
}
