import type { Exercise, Member, Membership, MuscleGroup } from "@/types/domain";
import {
  exerciseCatalogByMuscle as mockExerciseCatalogByMuscle,
  exercises as mockExercises,
  memberships as mockMemberships,
  members as mockMembers
} from "@/lib/mock-data";
import { collectionPaths, TITAN_GYM_ID } from "./collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "./admin";

export async function getMembersWithMemberships(): Promise<{
  members: Member[];
  memberships: Membership[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { members: mockMembers, memberships: mockMemberships, isPersisted: false };
  }

  let profileSnapshot;
  let db;

  try {
    db = getFirebaseAdminServices().db;
    profileSnapshot = await db
      .collection(collectionPaths.profiles)
      .where("defaultGymId", "==", TITAN_GYM_ID)
      .where("role", "==", "member")
      .where("isActive", "==", true)
      .get();
  } catch {
    return { members: mockMembers, memberships: mockMemberships, isPersisted: false };
  }

  if (profileSnapshot.empty) {
    return { members: mockMembers, memberships: mockMemberships, isPersisted: false };
  }

  const membershipSnapshot = await db
    .collection(collectionPaths.memberships)
    .where("gymId", "==", TITAN_GYM_ID)
    .get();

  const memberships: Membership[] = membershipSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      memberId: String(data.memberId),
      planName: String(data.planName ?? "Stored membership"),
      startDate: String(data.startDate),
      endDate: String(data.endDate),
      durationMonths: Number(data.durationMonths ?? 1),
      paymentReference: String(data.paymentReference ?? "")
    };
  });

  const members: Member[] = profileSnapshot.docs.map((doc) => {
    const data = doc.data();
    const membership = memberships.find((item) => item.memberId === doc.id);
    return {
      id: doc.id,
      fullName: String(data.fullName),
      email: String(data.email),
      phone: String(data.phone ?? ""),
      joinedAt: membership?.startDate ?? new Date().toISOString().slice(0, 10),
      avatarInitials: String(data.avatarInitials ?? "MB"),
      goal: String(data.goal ?? "Stored in Firebase")
    };
  });

  return { members, memberships, isPersisted: true };
}

export async function getExerciseCatalog(): Promise<{
  exercises: Exercise[];
  catalog: Array<{ muscleGroup: MuscleGroup; exercises: Exercise[] }>;
  isPersisted: boolean;
}> {
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
      .where("gymId", "==", TITAN_GYM_ID)
      .where("isActive", "==", true)
      .get();
  } catch {
    return {
      exercises: mockExercises,
      catalog: mockExerciseCatalogByMuscle,
      isPersisted: false
    };
  }

  if (snapshot.empty) {
    return {
      exercises: mockExercises,
      catalog: mockExerciseCatalogByMuscle,
      isPersisted: false
    };
  }

  const persistedExercises: Exercise[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: String(data.name),
      muscleGroup: String(data.muscleGroup ?? "Chest") as MuscleGroup,
      equipment: String(data.equipment ?? ""),
      instructions: String(data.instructions ?? ""),
      videoSource: String(data.videoSource ?? "none") as Exercise["videoSource"],
      videoUrl: String(data.videoUrl ?? ""),
      thumbnailUrl: String(
        data.thumbnailUrl ??
          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80"
      ),
      ownerOnly: true
    };
  });

  const allExercises = [...persistedExercises, ...mockExercises];
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
