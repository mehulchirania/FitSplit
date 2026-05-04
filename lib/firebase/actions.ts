"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { collectionPaths, TITAN_GYM_ID, TITAN_OWNER_ID } from "./collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "./admin";
import type { FormActionState } from "@/types/action-state";

function requireFirebase() {
  if (!hasFirebaseAdminConfig()) {
    throw new Error("Firebase Admin is not configured. Add .env.local values first.");
  }

  return getFirebaseAdminServices().db;
}

function requireText(formData: FormData, key: string, label = key) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

function getActionFormData(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
) {
  return maybeFormData ?? (previousStateOrFormData as FormData);
}

function success(message: string): FormActionState {
  return { status: "success", message };
}

function failure(error: unknown, fallback: string): FormActionState {
  return {
    status: "error",
    message: error instanceof Error ? error.message : fallback
  };
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

export async function createMemberProfile(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensureTitanWorkspace();
    const db = requireFirebase();
    const memberId = randomUUID();
    const fullName = requireText(formData, "fullName", "Full name");
    const email = requireText(formData, "email", "Email");
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
      joinedAt: now.slice(0, 10),
      createdAt: now,
      updatedAt: now
    });

    revalidatePath("/owner");
    revalidatePath("/owner/members");

    return success(`${fullName} was added as a FitSplit member.`);
  } catch (error) {
    console.error("Unable to create member profile", error);

    return failure(error, "Unable to add member. Please try again.");
  }
}

export async function updateMemberProfile(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensureTitanWorkspace();
    const db = requireFirebase();
    const memberId = requireText(formData, "memberId", "Member");
    const fullName = requireText(formData, "fullName", "Full name");
    const email = requireText(formData, "email", "Email");
    const now = new Date().toISOString();

    await db.collection(collectionPaths.profiles).doc(memberId).set(
      {
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
        updatedAt: now
      },
      { merge: true }
    );

    revalidatePath("/owner");
    revalidatePath("/owner/members");
    revalidatePath(`/owner/members/${memberId}`);
    revalidatePath("/member");

    return success(`${fullName}'s member details were updated.`);
  } catch (error) {
    console.error("Unable to update member profile", error);
    return failure(error, "Unable to update member details. Please try again.");
  }
}

export async function updateProfileMetrics(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensureTitanWorkspace();
    const db = requireFirebase();
    const memberId = requireText(formData, "memberId", "Member");
    const fullName = requireText(formData, "fullName", "Full name");
    const email = requireText(formData, "email", "Email");
    const now = new Date().toISOString();

    await db.collection(collectionPaths.profiles).doc(memberId).set(
      {
        id: memberId,
        fullName,
        email,
        phone: String(formData.get("phone") ?? "").trim(),
        age: Number(formData.get("age") ?? 0),
        heightCm: Number(formData.get("heightCm") ?? 0),
        weightKg: Number(formData.get("weightKg") ?? 0),
        role: "member",
        defaultGymId: TITAN_GYM_ID,
        isActive: true,
        updatedAt: now
      },
      { merge: true }
    );

    revalidatePath("/profile");
    revalidatePath("/member");

    return success("Profile details were updated.");
  } catch (error) {
    console.error("Unable to update profile metrics", error);
    return failure(error, "Unable to update profile. Please try again.");
  }
}

export async function logLiftSet(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensureTitanWorkspace();
    const db = requireFirebase();
    const liftLogId = randomUUID();
    const memberId = requireText(formData, "memberId", "Member");
    const exerciseId = requireText(formData, "exerciseId", "Exercise");
    const weight = Number(formData.get("weight") ?? 0);
    const sets = Number(formData.get("sets") ?? 1);
    const reps = requireText(formData, "reps", "Reps");
    const sessionId = String(formData.get("sessionId") ?? "").trim() || randomUUID();
    const now = new Date().toISOString();

    if (weight < 0 || sets < 1) {
      throw new Error("Lift log values are invalid.");
    }

    await db.collection(collectionPaths.liftLogs).doc(liftLogId).set({
      id: liftLogId,
      gymId: TITAN_GYM_ID,
      memberId,
      exerciseId,
      weight,
      sets,
      reps,
      sessionId,
      loggedAt: now,
      createdAt: now,
      updatedAt: now
    });

    revalidatePath("/member");
    revalidatePath(`/owner/members/${memberId}`);

    return success("Lift entry was logged.");
  } catch (error) {
    console.error("Unable to log lift set", error);
    return failure(error, "Unable to log lift. Please try again.");
  }
}

export async function startWorkoutSession(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensureTitanWorkspace();
    const db = requireFirebase();
    const memberId = requireText(formData, "memberId", "Member");
    const sessionId = requireText(formData, "sessionId", "Session");
    const now = new Date().toISOString();

    await db.collection(collectionPaths.workoutSessions).doc(sessionId).set(
      {
        id: sessionId,
        gymId: TITAN_GYM_ID,
        memberId,
        startedAt: now,
        status: "active",
        updatedAt: now
      },
      { merge: true }
    );

    revalidatePath("/member");
    revalidatePath("/owner");

    return success("Workout session was started.");
  } catch (error) {
    console.error("Unable to start workout session", error);
    return failure(error, "Unable to start workout. Please try again.");
  }
}

export async function endWorkoutSession(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensureTitanWorkspace();
    const db = requireFirebase();
    const sessionId = requireText(formData, "sessionId", "Session");
    const now = new Date().toISOString();

    await db.collection(collectionPaths.workoutSessions).doc(sessionId).set(
      {
        endedAt: now,
        status: "completed",
        updatedAt: now
      },
      { merge: true }
    );

    revalidatePath("/member");
    revalidatePath("/owner");

    return success("Workout session was ended.");
  } catch (error) {
    console.error("Unable to end workout session", error);
    return failure(error, "Unable to end workout. Please try again.");
  }
}

export async function submitContactMessage(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensureTitanWorkspace();
    const db = requireFirebase();
    const messageId = randomUUID();
    const now = new Date().toISOString();

    await db.collection(collectionPaths.contactMessages).doc(messageId).set({
      id: messageId,
      gymId: TITAN_GYM_ID,
      name: requireText(formData, "name", "Name"),
      number: requireText(formData, "number", "Number"),
      requirement: requireText(formData, "requirement", "Requirement"),
      email: String(formData.get("email") ?? "").trim(),
      status: "new",
      createdAt: now,
      updatedAt: now
    });

    revalidatePath("/about");

    return success("Message was sent.");
  } catch (error) {
    console.error("Unable to submit contact message", error);
    return failure(error, "Unable to send message. Please try again.");
  }
}

export async function createCatalogExercise(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensureTitanWorkspace();
    const db = requireFirebase();
    const exerciseId = randomUUID();
    const now = new Date().toISOString();
    const name = requireText(formData, "name", "Exercise name");

    await db.collection(collectionPaths.exerciseCatalog).doc(exerciseId).set({
      id: exerciseId,
      gymId: TITAN_GYM_ID,
      name,
      muscleGroup: requireText(formData, "muscleGroup", "Muscle group"),
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

    return success(`${name} was added to the exercise catalog.`);
  } catch (error) {
    console.error("Unable to create catalog exercise", error);
    return failure(error, "Unable to save exercise. Please try again.");
  }
}

async function resolveExerciseRecordId(sourceExerciseId: string) {
  const db = requireFirebase();
  const sourceExercise = await db
    .collection(collectionPaths.exerciseCatalog)
    .doc(sourceExerciseId)
    .get();

  return sourceExercise.exists ? sourceExercise.id : sourceExerciseId;
}

export async function createCustomWorkoutProgram(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensureTitanWorkspace();
    const db = requireFirebase();
    const programId = randomUUID();
    const now = new Date().toISOString();
    const title = requireText(formData, "title", "Program title");
    const exerciseIds = formData
      .getAll("exerciseIds")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!exerciseIds.length) {
      throw new Error("Add at least one exercise before saving a custom plan.");
    }

    const databaseExerciseIds = await Promise.all(
      exerciseIds.map((exerciseId) => resolveExerciseRecordId(exerciseId))
    );

    await db.collection(collectionPaths.workoutPrograms).doc(programId).set({
      id: programId,
      gymId: TITAN_GYM_ID,
      title,
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
          title: requireText(formData, "dayTitle", "Day title"),
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

    return success(`${title} was saved to workout programs.`);
  } catch (error) {
    console.error("Unable to create custom workout program", error);
    return failure(error, "Unable to save custom plan. Please try again.");
  }
}
