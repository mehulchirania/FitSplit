"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { exercises } from "@/lib/mock-data";
import { collectionPaths, TITAN_GYM_ID, TITAN_OWNER_ID } from "./collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "./admin";

function requireFirebase() {
  if (!hasFirebaseAdminConfig()) {
    throw new Error("Firebase Admin is not configured. Add .env.local values first.");
  }

  return getFirebaseAdminServices().db;
}

function requireText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function addMonths(dateValue: string, months: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCMonth(date.getUTCMonth() + months);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

async function ensureTitanWorkspace() {
  const db = requireFirebase();
  const gymRef = db.collection(collectionPaths.gyms).doc(TITAN_GYM_ID);
  const ownerRef = db.collection(collectionPaths.profiles).doc(TITAN_OWNER_ID);

  await gymRef.set(
    {
      id: TITAN_GYM_ID,
      name: "Titan V2 Fitness",
      slug: TITAN_GYM_ID,
      ownerUserId: TITAN_OWNER_ID,
      expiryWarningDays: 7,
      status: "pilot",
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  await ownerRef.set(
    {
      id: TITAN_OWNER_ID,
      fullName: "Titan V2 Owner",
      email: "owner@titanv2.local",
      role: "owner",
      defaultGymId: TITAN_GYM_ID,
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
}

export async function createMemberWithMembership(formData: FormData) {
  await ensureTitanWorkspace();
  const db = requireFirebase();
  const memberId = randomUUID();
  const membershipId = randomUUID();
  const fullName = requireText(formData, "fullName");
  const email = requireText(formData, "email");
  const startDate = requireText(formData, "startDate");
  const durationMonths = Number(formData.get("durationMonths") ?? 1);
  const endDate = addMonths(startDate, durationMonths);
  const now = new Date().toISOString();

  await db.collection(collectionPaths.profiles).doc(memberId).set({
    id: memberId,
    fullName,
    email,
    phone: String(formData.get("phone") ?? "").trim(),
    role: "member",
    defaultGymId: TITAN_GYM_ID,
    goal: String(formData.get("goal") ?? "General fitness").trim(),
    avatarInitials: fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    isActive: true,
    createdAt: now,
    updatedAt: now
  });

  await db.collection(collectionPaths.memberships).doc(membershipId).set({
    id: membershipId,
    gymId: TITAN_GYM_ID,
    memberId,
    planName: `${durationMonths} Month Membership`,
    startDate,
    endDate,
    durationMonths,
    paymentReference: String(formData.get("paymentReference") ?? "").trim(),
    createdBy: TITAN_OWNER_ID,
    createdAt: now,
    updatedAt: now
  });

  revalidatePath("/owner");
  revalidatePath("/owner/members");
}

export async function renewMemberMembership(formData: FormData) {
  await ensureTitanWorkspace();
  const db = requireFirebase();
  const membershipId = randomUUID();
  const notificationId = randomUUID();
  const memberId = requireText(formData, "memberId");
  const startDate = requireText(formData, "startDate");
  const durationMonths = Number(formData.get("durationMonths") ?? 1);

  if (![1, 3, 6, 12].includes(durationMonths)) {
    throw new Error("durationMonths must be 1, 3, 6, or 12.");
  }

  const endDate = addMonths(startDate, durationMonths);
  const paymentReference = String(formData.get("paymentReference") ?? "").trim();
  const now = new Date().toISOString();

  await db.collection(collectionPaths.memberships).doc(membershipId).set({
    id: membershipId,
    gymId: TITAN_GYM_ID,
    memberId,
    planName: `${durationMonths} Month Renewal`,
    startDate,
    endDate,
    durationMonths,
    paymentReference,
    createdBy: TITAN_OWNER_ID,
    createdAt: now,
    updatedAt: now,
    type: "renewal"
  });

  await db.collection(collectionPaths.notifications).doc(notificationId).set({
    id: notificationId,
    recipientRole: "member",
    recipientId: memberId,
    type: "membership_renewed",
    title: "Membership renewed",
    body: `Your membership has been renewed until ${endDate}.`,
    createdAt: now
  });

  revalidatePath("/owner");
  revalidatePath("/owner/members");
  revalidatePath(`/owner/members/${memberId}`);
  revalidatePath("/member");
}

export async function createCatalogExercise(formData: FormData) {
  await ensureTitanWorkspace();
  const db = requireFirebase();
  const exerciseId = randomUUID();
  const now = new Date().toISOString();

  await db.collection(collectionPaths.exerciseCatalog).doc(exerciseId).set({
    id: exerciseId,
    gymId: TITAN_GYM_ID,
    name: requireText(formData, "name"),
    muscleGroup: requireText(formData, "muscleGroup"),
    equipment: String(formData.get("equipment") ?? "").trim(),
    instructions: String(formData.get("instructions") ?? "").trim(),
    videoSource: String(formData.get("videoSource") ?? "none"),
    videoUrl: String(formData.get("videoUrl") ?? "").trim(),
    ownerOnly: true,
    isActive: true,
    createdBy: TITAN_OWNER_ID,
    createdAt: now,
    updatedAt: now
  });

  revalidatePath("/owner/exercises");
}

async function resolveExerciseRecordId(sourceExerciseId: string) {
  const db = requireFirebase();
  const sourceExercise = exercises.find((exercise) => exercise.id === sourceExerciseId);

  if (!sourceExercise) {
    return sourceExerciseId;
  }

  const existing = await db
    .collection(collectionPaths.exerciseCatalog)
    .where("gymId", "==", TITAN_GYM_ID)
    .where("name", "==", sourceExercise.name)
    .limit(1)
    .get();

  if (!existing.empty) {
    return existing.docs[0].id;
  }

  const exerciseId = randomUUID();
  const now = new Date().toISOString();
  await db.collection(collectionPaths.exerciseCatalog).doc(exerciseId).set({
    id: exerciseId,
    gymId: TITAN_GYM_ID,
    name: sourceExercise.name,
    muscleGroup: sourceExercise.muscleGroup,
    equipment: sourceExercise.equipment,
    instructions: sourceExercise.instructions,
    videoSource: sourceExercise.videoSource,
    videoUrl: sourceExercise.videoUrl,
    thumbnailUrl: sourceExercise.thumbnailUrl,
    ownerOnly: true,
    isActive: true,
    createdBy: TITAN_OWNER_ID,
    createdAt: now,
    updatedAt: now
  });

  return exerciseId;
}

export async function createCustomWorkoutProgram(formData: FormData) {
  await ensureTitanWorkspace();
  const db = requireFirebase();
  const programId = randomUUID();
  const now = new Date().toISOString();
  const exerciseIds = formData
    .getAll("exerciseIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const databaseExerciseIds = await Promise.all(
    exerciseIds.map((exerciseId) => resolveExerciseRecordId(exerciseId))
  );

  await db.collection(collectionPaths.workoutPrograms).doc(programId).set({
    id: programId,
    gymId: TITAN_GYM_ID,
    title: requireText(formData, "title"),
    description: String(formData.get("description") ?? "").trim(),
    goal: String(formData.get("goal") ?? "Custom member plan").trim(),
    difficulty: String(formData.get("difficulty") ?? "beginner"),
    daysPerWeek: Number(formData.get("daysPerWeek") ?? 1),
    splitType: "custom",
    isActive: true,
    createdBy: TITAN_OWNER_ID,
    days: [
      {
        id: randomUUID(),
        title: requireText(formData, "dayTitle"),
        dayNumber: 1,
        focus: "Owner-created custom day",
        exercises: databaseExerciseIds.map((exerciseId, index) => ({
          exerciseId,
          sortOrder: index + 1,
          sets: Number(formData.get("sets") ?? 3),
          reps: String(formData.get("reps") ?? "8-12"),
          restSeconds: Number(formData.get("restSeconds") ?? 75)
        }))
      }
    ],
    createdAt: now,
    updatedAt: now
  });

  revalidatePath("/owner/programs");
}
