"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth";
import { collectionPaths, TITAN_GYM_ID, TITAN_OWNER_ID } from "./collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "./admin";
import type { FormActionState } from "@/types/action-state";
import type { Role } from "@/types/domain";

function requireFirebase() {
  if (!hasFirebaseAdminConfig()) {
    throw new Error("Firebase Admin is not configured. Add .env.local values first.");
  }

  return getFirebaseAdminServices().db;
}

function requireFirebaseServices() {
  if (!hasFirebaseAdminConfig()) {
    throw new Error("Firebase Admin is not configured. Add .env.local values first.");
  }

  return getFirebaseAdminServices();
}

function requireText(formData: FormData, key: string, label = key) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

async function upsertAuthUser(
  auth: ReturnType<typeof getFirebaseAdminServices>["auth"],
  user: { email: string; fullName: string; uid: string; role: Role; gymId: string; isActive: boolean },
  defaultPassword = "password",
  forceResetPassword = false
) {
  try {
    const updateData: any = {
      email: user.email,
      displayName: user.fullName,
      disabled: !user.isActive
    };
    
    if (forceResetPassword) {
      updateData.password = defaultPassword;
    }

    await auth.updateUser(user.uid, updateData);
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        emailVerified: true,
        displayName: user.fullName,
        password: defaultPassword,
        disabled: !user.isActive
      });
    } else {
      throw error;
    }
  }

  await auth.setCustomUserClaims(user.uid, {
    gymId: user.gymId,
    role: user.role,
    ...(user.role === "member" ? { memberId: user.uid } : {})
  });
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

function assertCanManageMember(
  user: Awaited<ReturnType<typeof requireAuth>>,
  memberId: string
) {
  if (user.role === "member" && user.memberId !== memberId) {
    throw new Error("You can only update your own member account.");
  }
}

export async function ensureTitanWorkspace() {
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
      fullName: "titan-owner-1",
      email: "owner@titanv2.local",
      username: "titan-owner-1",
      role: "owner",
      defaultGymId: TITAN_GYM_ID,
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  const mehulRef = db.collection(collectionPaths.profiles).doc("member-mehul");
  await mehulRef.set(
    {
      id: "member-mehul",
      fullName: "Mehul Chirania",
      email: "mehul@example.com",
      username: "mehulchirania",
      role: "member",
      defaultGymId: TITAN_GYM_ID,
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  const adminRef = db.collection(collectionPaths.profiles).doc("admin-fitsplit");
  await adminRef.set(
    {
      id: "admin-fitsplit",
      fullName: "Admin",
      email: "admin@fitsplit.app",
      username: "admin",
      role: "admin",
      defaultGymId: TITAN_GYM_ID,
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  // Seed Auth - Force password reset for demo users to ensure they match requirements
  const { auth } = getFirebaseAdminServices();
  
  await upsertAuthUser(auth, { 
    email: "admin@fitsplit.app", 
    fullName: "Admin", 
    uid: "admin-fitsplit", 
    role: "admin", 
    gymId: TITAN_GYM_ID, 
    isActive: true 
  }, "password", true);
  
  await upsertAuthUser(auth, { 
    email: "owner@titanv2.local", 
    fullName: "titan-owner-1", 
    uid: TITAN_OWNER_ID, 
    role: "owner", 
    gymId: TITAN_GYM_ID, 
    isActive: true 
  }, "password", true);
  
  await upsertAuthUser(auth, { 
    email: "mehul@example.com", 
    fullName: "Mehul Chirania", 
    uid: "member-mehul", 
    role: "member", 
    gymId: TITAN_GYM_ID, 
    isActive: true 
  }, "123456", true);
}

export async function createMemberProfile(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensureTitanWorkspace();
    const { auth, db } = requireFirebaseServices();
    const memberId = randomUUID();
    const fullName = requireText(formData, "fullName", "Full name");
    const email = requireText(formData, "email", "Email");
    const now = new Date().toISOString();

    await db.collection(collectionPaths.profiles).doc(memberId).set({
      id: memberId,
      fullName,
      email,
      authEmail: email.toLowerCase(),
      username: email.toLowerCase(),
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

    await upsertAuthUser(auth, { 
      email, 
      fullName, 
      uid: memberId, 
      role: "member", 
      gymId: TITAN_GYM_ID, 
      isActive: true 
    }, "123456");

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
    await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensureTitanWorkspace();
    const { auth, db } = requireFirebaseServices();
    const memberId = requireText(formData, "memberId", "Member");
    const fullName = requireText(formData, "fullName", "Full name");
    const email = requireText(formData, "email", "Email");
    const now = new Date().toISOString();

    await db.collection(collectionPaths.profiles).doc(memberId).set(
      {
        id: memberId,
        fullName,
        email,
        authEmail: email.toLowerCase(),
        username: email.toLowerCase(),
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

    await upsertAuthUser(auth, { 
      email, 
      fullName, 
      uid: memberId, 
      role: "member", 
      gymId: TITAN_GYM_ID, 
      isActive: true 
    });

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

export async function assignProgramToMember(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const memberName = String(formData.get("memberName") ?? "Member").trim();
    const programTitle = String(formData.get("programTitle") ?? "Workout program").trim();

    if (!hasFirebaseAdminConfig()) {
      // Mock mode — assignment is local only; full persistence requires Firebase Admin
      revalidatePath("/owner");
      revalidatePath("/member");
      return success(`${programTitle} was assigned to ${memberName} (local mode).`);
    }

    await ensureTitanWorkspace();
    const db = requireFirebase();
    const assignmentId = randomUUID();
    const notificationId = randomUUID();
    const activityId = randomUUID();
    const memberId = requireText(formData, "memberId", "Member");
    const programId = requireText(formData, "programId", "Workout program");
    const now = new Date().toISOString();

    const existingAssignments = await db
      .collection(collectionPaths.programAssignments)
      .where("gymId", "==", TITAN_GYM_ID)
      .where("memberId", "==", memberId)
      .where("status", "==", "active")
      .get();

    await Promise.all(
      existingAssignments.docs.map((doc) =>
        doc.ref.set({ status: "cancelled", updatedAt: now }, { merge: true })
      )
    );

    await db.collection(collectionPaths.programAssignments).doc(assignmentId).set({
      id: assignmentId,
      gymId: TITAN_GYM_ID,
      memberId,
      programId,
      assignedAt: now,
      status: "active",
      createdBy: TITAN_OWNER_ID,
      createdAt: now,
      updatedAt: now
    });

    await db.collection(collectionPaths.notifications).doc(notificationId).set({
      id: notificationId,
      recipientRole: "member",
      recipientId: memberId,
      type: "program_assigned",
      title: "Workout program assigned",
      body: `${programTitle} is now available in your weekly schedule.`,
      createdAt: now
    });

    await db.collection(collectionPaths.activityEvents).doc(activityId).set({
      id: activityId,
      gymId: TITAN_GYM_ID,
      audience: "owner",
      title: `Program assigned - ${programTitle}`,
      detail: `${memberName} now has ${programTitle} as the active weekly schedule.`,
      icon: "dumbbell",
      createdAt: now
    });

    revalidatePath("/owner");
    revalidatePath("/owner/members");
    revalidatePath(`/owner/members/${memberId}`);
    revalidatePath("/member");
    revalidatePath("/activity");

    return success(`${programTitle} was assigned to ${memberName}.`);
  } catch (error) {
    console.error("Unable to assign program to member", error);
    return failure(error, "Unable to assign workout program. Please try again.");
  }
}

export async function updateProfileMetrics(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const currentUser = await requireAuth();
    await ensureTitanWorkspace();
    const db = requireFirebase();
    const memberId = requireText(formData, "memberId", "Member");
    assertCanManageMember(currentUser, memberId);
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
    const currentUser = await requireAuth();
    const memberId = requireText(formData, "memberId", "Member");
    assertCanManageMember(currentUser, memberId);

    if (!hasFirebaseAdminConfig()) {
      // Mock mode — lift is saved client-side optimistically
      return success("Lift entry was logged (local mode).");
    }
    await ensureTitanWorkspace();
    const db = requireFirebase();
    const liftLogId = randomUUID();
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

export async function syncOfflineLifts(logs: any[]): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role === "member") {
      for (const log of logs) {
        assertCanManageMember(currentUser, String(log.memberId ?? ""));
      }
    }

    await ensureTitanWorkspace();
    const db = requireFirebase();
    const batch = db.batch();
    const now = new Date().toISOString();

    for (const log of logs) {
      const liftLogId = randomUUID();
      const docRef = db.collection(collectionPaths.liftLogs).doc(liftLogId);
      
      batch.set(docRef, {
        id: liftLogId,
        gymId: TITAN_GYM_ID,
        memberId: log.memberId,
        exerciseId: log.exerciseId,
        weight: Number(log.weight),
        sets: Number(log.sets),
        reps: log.reps,
        sessionId: log.sessionId || randomUUID(),
        loggedAt: log.loggedAt || now,
        createdAt: now,
        updatedAt: now
      });
    }

    await batch.commit();

    revalidatePath("/member");

    return success(`${logs.length} offline lift(s) synced.`);
  } catch (error) {
    console.error("Unable to sync offline lifts", error);
    return failure(error, "Unable to sync offline lifts.");
  }
}

export async function resetPassword(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const userId = requireText(formData, "userId", "User ID");
    const { auth } = requireFirebaseServices();
    
    // We can also handle a "newPin" or "newPassword" field if provided, otherwise default to "password"
    const newPassword = String(formData.get("newPassword") || formData.get("newPin") || "password").trim();
    
    await auth.updateUser(userId, { password: newPassword });

    return success(`Access code reset to '${newPassword}'.`);
  } catch (error) {
    console.error("Unable to reset password", error);
    return failure(error, "Could not reset access code.");
  }
}

export async function toggleMemberAccess(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const { auth, db } = requireFirebaseServices();
    const memberId = requireText(formData, "memberId", "Member ID");
    const isActive = formData.get("isActive") === "true";
    
    await db.collection(collectionPaths.profiles).doc(memberId).update({
      isActive,
      updatedAt: new Date().toISOString()
    });
    
    await auth.updateUser(memberId, { disabled: !isActive });
    
    revalidatePath("/owner/members");
    revalidatePath(`/owner/members/${memberId}`);
    
    return success(`Member access ${isActive ? "enabled" : "disabled"}.`);
  } catch (error) {
    return failure(error, "Unable to toggle member access.");
  }
}

export async function createOwnerProfile(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const { auth, db } = requireFirebaseServices();
    const ownerId = randomUUID();
    const fullName = requireText(formData, "fullName", "Full name");
    const email = requireText(formData, "email", "Email");
    const gymId = requireText(formData, "gymId", "Gym ID");
    const now = new Date().toISOString();

    await db.collection(collectionPaths.profiles).doc(ownerId).set({
      id: ownerId,
      fullName,
      email,
      authEmail: email.toLowerCase(),
      username: email.toLowerCase(),
      role: "owner",
      defaultGymId: gymId,
      isActive: true,
      createdAt: now,
      updatedAt: now
    });

    await upsertAuthUser(auth, { 
      email, 
      fullName, 
      uid: ownerId, 
      role: "owner", 
      gymId, 
      isActive: true 
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/gyms/${gymId}`);

    return success(`Owner ${fullName} created successfully.`);
  } catch (error) {
    return failure(error, "Unable to create owner profile.");
  }
}

export async function updateGymDetails(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const db = requireFirebase();
    const gymId = requireText(formData, "gymId", "Gym ID");
    
    const updateData: any = {
      name: requireText(formData, "name", "Gym name"),
      location: String(formData.get("location") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      instagram: String(formData.get("instagram") ?? "").trim(),
      linkedin: String(formData.get("linkedin") ?? "").trim(),
      youtube: String(formData.get("youtube") ?? "").trim(),
      updatedAt: new Date().toISOString()
    };

    await db.collection(collectionPaths.gyms).doc(gymId).update(updateData);

    revalidatePath("/admin");
    revalidatePath(`/admin/gyms/${gymId}`);

    return success("Gym details updated successfully.");
  } catch (error) {
    return failure(error, "Unable to update gym details.");
  }
}

export async function setGymStatus(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const db = requireFirebase();
    const gymId = requireText(formData, "gymId", "Gym ID");
    const status = requireText(formData, "status", "Status") as any;

    await db.collection(collectionPaths.gyms).doc(gymId).update({
      status,
      updatedAt: new Date().toISOString()
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/gyms/${gymId}`);

    return success(`Gym status set to ${status}.`);
  } catch (error) {
    return failure(error, "Unable to update gym status.");
  }
}

export async function startWorkoutSession(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const currentUser = await requireAuth();
    const memberId = requireText(formData, "memberId", "Member");
    assertCanManageMember(currentUser, memberId);

    if (!hasFirebaseAdminConfig()) {
      // Mock mode — just confirm success locally
      return success("Workout session was started (local mode).");
    }
    await ensureTitanWorkspace();
    const db = requireFirebase();
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
    await requireAuth();

    if (!hasFirebaseAdminConfig()) {
      return success("Workout session was ended (local mode).");
    }
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
