"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth";
import { collectionPaths, PRIMARY_GYM_ID, PRIMARY_OWNER_ID } from "./collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "./admin";
import type { FormActionState } from "@/types/action-state";
import type { Role, WorkoutProgram } from "@/types/domain";
import { getWorkoutPrograms } from "@/lib/firebase/read-models";

function requireFirebase() {
  if (!hasFirebaseAdminConfig()) {
    throw new Error(
      "Firebase Admin is not configured. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY in .env.local."
    );
  }

  return getFirebaseAdminServices().db;
}

function requireFirebaseServices() {
  if (!hasFirebaseAdminConfig()) {
    throw new Error(
      "Firebase Admin is not configured. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY in .env.local."
    );
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

function assertValidEmail(email: string, label = "Email") {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${label} is invalid.`);
  }
}

function assertValidPhone(phone: string, label = "Mobile number") {
  const compact = phone.replace(/[\s-]/g, "");
  if (!/^(\+91)?[6-9]\d{9}$/.test(compact)) {
    throw new Error(`${label} is invalid.`);
  }
}

function assertValidPin(pin: string) {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error("PIN must be exactly 4 numeric digits.");
  }
}

function memberAuthEmail(memberId: string) {
  return `${memberId}@members.fitsplit.app`;
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

function distanceInMeters(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const radius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function validateGymGeofence(latitude: number, longitude: number) {
  const gymLatitude = Number(process.env.SHG_GYM_LATITUDE ?? process.env.NEXT_PUBLIC_SHG_GYM_LATITUDE);
  const gymLongitude = Number(process.env.SHG_GYM_LONGITUDE ?? process.env.NEXT_PUBLIC_SHG_GYM_LONGITUDE);
  const radiusMeters = Number(process.env.SHG_GYM_RADIUS_METERS ?? process.env.NEXT_PUBLIC_SHG_GYM_RADIUS_METERS ?? 150);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Location permission is required to start workout attendance.");
  }

  if (!Number.isFinite(gymLatitude) || !Number.isFinite(gymLongitude)) {
    return {
      distanceMeters: null,
      geofenceStatus: "not_configured" as const,
      radiusMeters
    };
  }

  const distanceMeters = distanceInMeters(gymLatitude, gymLongitude, latitude, longitude);

  if (distanceMeters > radiusMeters) {
    throw new Error(`You must be inside the gym radius to check in. Current distance is ${Math.round(distanceMeters)}m.`);
  }

  return {
    distanceMeters: Math.round(distanceMeters),
    geofenceStatus: "inside" as const,
    radiusMeters
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

function assertCanManageGym(user: Awaited<ReturnType<typeof requireAuth>>, gymId: string) {
  if (user.role === "admin") {
    return;
  }

  if (user.role === "owner" && user.gymId === gymId) {
    return;
  }

  throw new Error("You can only manage records for your assigned gym.");
}

function slugifyGymName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

const demoMembers = [
  {
    id: "member-aarav",
    fullName: "Aarav Sharma",
    email: "aarav@example.com",
    username: "aarav@example.com",
    phone: "+91 98765 43210",
    avatarInitials: "AS",
    goal: "Build lean muscle"
  },
  {
    id: "member-meera",
    fullName: "Meera Iyer",
    email: "meera@example.com",
    username: "meera@example.com",
    phone: "+91 98765 42109",
    avatarInitials: "MI",
    goal: "Improve strength"
  },
  {
    id: "member-kabir",
    fullName: "Kabir Khan",
    email: "kabir@example.com",
    username: "kabir@example.com",
    phone: "+91 98765 41098",
    avatarInitials: "KK",
    goal: "Fat loss and conditioning"
  },
  {
    id: "member-nisha",
    fullName: "Nisha Rao",
    email: "nisha@example.com",
    username: "nisha@example.com",
    phone: "+91 98765 40987",
    avatarInitials: "NR",
    goal: "Beginner fitness"
  },
  {
    id: "member-mehul",
    fullName: "Mehul Chirania",
    email: "mehul@example.com",
    username: "mehulchirania",
    phone: "+91 9688227039",
    avatarInitials: "MC",
    goal: "Improve strength and mobility"
  }
];

const demoTrainers = [
  {
    id: "shg-trainer-1",
    fullName: "Ravi Kumar",
    email: "shg-trainer-1@fitsplit.app",
    username: "shg-trainer-1",
    avatarInitials: "RK"
  },
  {
    id: "shg-trainer-2",
    fullName: "Priya Nair",
    email: "shg-trainer-2@fitsplit.app",
    username: "shg-trainer-2",
    avatarInitials: "PN"
  }
];

export async function ensurePrimaryWorkspace() {
  const db = requireFirebase();
  const gymRef = db.collection(collectionPaths.gyms).doc(PRIMARY_GYM_ID);
  const ownerRef = db.collection(collectionPaths.profiles).doc(PRIMARY_OWNER_ID);
  const now = new Date().toISOString();

  await gymRef.set(
    {
      id: PRIMARY_GYM_ID,
      name: "Sri Shakthi Hanuman Gym",
      slug: PRIMARY_GYM_ID,
      ownerUserId: PRIMARY_OWNER_ID,
      expiryWarningDays: 7,
      status: "pilot",
      updatedAt: now
    },
    { merge: true }
  );

  await ownerRef.set(
    {
      id: PRIMARY_OWNER_ID,
      fullName: "Santosh SHG",
      email: "santosh-shg@fitsplit.app",
      authEmail: "santosh-shg@fitsplit.app",
      username: "santosh-shg",
      role: "owner",
      staffType: "owner",
      defaultGymId: PRIMARY_GYM_ID,
      isActive: true,
      updatedAt: now
    },
    { merge: true }
  );

  for (const member of demoMembers) {
    await db.collection(collectionPaths.profiles).doc(member.id).set(
      {
        ...member,
        authEmail: member.email.toLowerCase(),
        role: "member",
        defaultGymId: PRIMARY_GYM_ID,
        isActive: true,
        joinedAt: now.slice(0, 10),
        updatedAt: now
      },
      { merge: true }
    );
  }

  for (const trainer of demoTrainers) {
    await db.collection(collectionPaths.profiles).doc(trainer.id).set(
      {
        ...trainer,
        authEmail: trainer.email.toLowerCase(),
        role: "owner",
        staffType: "trainer",
        defaultGymId: PRIMARY_GYM_ID,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      { merge: true }
    );
  }

  const adminRef = db.collection(collectionPaths.profiles).doc("admin-fitsplit");
  await adminRef.set(
    {
      id: "admin-fitsplit",
      fullName: "Admin",
      email: "admin@fitsplit.app",
      username: "admin",
      role: "admin",
      defaultGymId: PRIMARY_GYM_ID,
      isActive: true,
      updatedAt: now
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
    gymId: PRIMARY_GYM_ID, 
    isActive: true 
  }, "password", true);
  
  await upsertAuthUser(auth, {
    email: "santosh-shg@fitsplit.app", 
    fullName: "Santosh SHG", 
    uid: PRIMARY_OWNER_ID, 
    role: "owner", 
    gymId: PRIMARY_GYM_ID, 
    isActive: true 
  }, "password", true);
  
  await Promise.all([
    ...demoMembers.map((member) =>
      upsertAuthUser(auth, {
        email: member.email,
        fullName: member.fullName,
        uid: member.id,
        role: "member",
        gymId: PRIMARY_GYM_ID,
        isActive: true
      }, "pin-1234", true)
    ),
    ...demoTrainers.map((trainer) =>
      upsertAuthUser(auth, {
        email: trainer.email,
        fullName: trainer.fullName,
        uid: trainer.id,
        role: "owner",
        gymId: PRIMARY_GYM_ID,
        isActive: true
      }, "password", true)
    )
  ]);
}

export async function createMemberProfile(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensurePrimaryWorkspace();
    const { auth, db } = requireFirebaseServices();
    const memberId = randomUUID();
    const fullName = requireText(formData, "fullName", "Full name");
    const email = requireText(formData, "email", "Email").toLowerCase();
    assertValidEmail(email);
    const phone = String(formData.get("phone") ?? "").trim();
    const goal = String(formData.get("goal") ?? "General fitness").trim() || "General fitness";
    const gymId = String(formData.get("gymId") ?? user.gymId ?? PRIMARY_GYM_ID).trim() || PRIMARY_GYM_ID;
    const now = new Date().toISOString();
    const authEmail = memberAuthEmail(memberId);

    assertCanManageGym(user, gymId);

    await upsertAuthUser(auth, {
      email: authEmail,
      fullName,
      uid: memberId,
      role: "member",
      gymId,
      isActive: true
    }, "pin-1234");

    await db.collection(collectionPaths.profiles).doc(memberId).set({
      id: memberId,
      fullName,
      email,
      authEmail,
      username: phone || email,
      phone,
      role: "member",
      defaultGymId: gymId,
      goal,
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
    const user = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensurePrimaryWorkspace();
    const { auth, db } = requireFirebaseServices();
    const memberId = requireText(formData, "memberId", "Member");
    const fullName = requireText(formData, "fullName", "Full name");
    const email = requireText(formData, "email", "Email").toLowerCase();
    assertValidEmail(email);
    const now = new Date().toISOString();
    const profileDoc = await db.collection(collectionPaths.profiles).doc(memberId).get();
    const existingProfile = profileDoc.data() ?? {};
    const gymId = String(existingProfile.defaultGymId ?? user.gymId ?? PRIMARY_GYM_ID);
    const authEmail = String(existingProfile.authEmail ?? memberAuthEmail(memberId));

    assertCanManageGym(user, gymId);

    await db.collection(collectionPaths.profiles).doc(memberId).set(
      {
        id: memberId,
        fullName,
        email,
        authEmail,
        username: String(formData.get("phone") ?? "").trim() || email,
        phone: String(formData.get("phone") ?? "").trim(),
        role: "member",
        defaultGymId: gymId,
        goal: String(formData.get("goal") ?? "General fitness").trim(),
        avatarInitials: fullName
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        updatedAt: now
      },
      { merge: true }
    );

    await upsertAuthUser(auth, { 
      email: authEmail,
      fullName, 
      uid: memberId, 
      role: "member", 
      gymId, 
      isActive: existingProfile.isActive !== false
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

    await ensurePrimaryWorkspace();
    const db = requireFirebase();
    const assignmentId = randomUUID();
    const notificationId = randomUUID();
    const activityId = randomUUID();
    const memberId = requireText(formData, "memberId", "Member");
    const programId = requireText(formData, "programId", "Workout program");
    const now = new Date().toISOString();

    const existingAssignments = await db
      .collection(collectionPaths.programAssignments)
      .where("gymId", "==", PRIMARY_GYM_ID)
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
      gymId: PRIMARY_GYM_ID,
      memberId,
      programId,
      assignedAt: now,
      status: "active",
      createdBy: PRIMARY_OWNER_ID,
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
      gymId: PRIMARY_GYM_ID,
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

function pickProgramWithoutAi(programs: WorkoutProgram[], memberGoal: string) {
  const goal = memberGoal.toLowerCase();

  if (goal.includes("strength")) {
    return programs.find((program) => program.title.toLowerCase().includes("ppl")) ?? programs[0];
  }

  if (goal.includes("fat") || goal.includes("loss") || goal.includes("weight")) {
    return (
      programs.find((program) => program.daysPerWeek <= 4) ??
      programs.find((program) => program.splitType === "ppl_upper_lower") ??
      programs[0]
    );
  }

  if (goal.includes("muscle") || goal.includes("hypertrophy") || goal.includes("bulk")) {
    return (
      programs.find((program) => program.splitType === "ppl_x2") ??
      programs.find((program) => program.splitType === "combo_x2") ??
      programs[0]
    );
  }

  return programs.find((program) => program.splitType === "ppl_upper_lower") ?? programs[0];
}

async function pickProgramWithGemini(programs: WorkoutProgram[], memberGoal: string) {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    return pickProgramWithoutAi(programs, memberGoal);
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const prompt = [
    "Pick the best FitSplit workout program id for this gym member.",
    "Return only one exact id from the list. No markdown.",
    `Member goal: ${memberGoal || "General fitness"}`,
    "Programs:",
    ...programs.map((program) =>
      `- ${program.id}: ${program.title}; goal=${program.goal}; days=${program.daysPerWeek}; difficulty=${program.difficulty}; split=${program.splitType}`
    )
  ].join("\n");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 32, temperature: 0.2 }
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      }
    );

    if (!response.ok) {
      return pickProgramWithoutAi(programs, memberGoal);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const selectedId = text.replace(/[`"' ]/g, "");
    return programs.find((program) => program.id === selectedId) ?? pickProgramWithoutAi(programs, memberGoal);
  } catch (error) {
    console.warn("Gemini program selection failed; using fallback.", error);
    return pickProgramWithoutAi(programs, memberGoal);
  }
}

export async function generateAndAssignProgram(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const memberId = requireText(formData, "memberId", "Member");
    const memberName = requireText(formData, "memberName", "Member name");
    const memberGoal = String(formData.get("memberGoal") ?? "General fitness").trim();
    const { programs } = await getWorkoutPrograms();
    const selectedProgram = await pickProgramWithGemini(programs, memberGoal);

    if (!selectedProgram) {
      throw new Error("No workout programs are available to assign.");
    }

    const assignmentData = new FormData();
    assignmentData.set("memberId", memberId);
    assignmentData.set("memberName", memberName);
    assignmentData.set("programId", selectedProgram.id);
    assignmentData.set("programTitle", selectedProgram.title);
    return assignProgramToMember(previousStateOrFormData, assignmentData);
  } catch (error) {
    console.error("Unable to generate and assign program", error);
    return failure(error, "Unable to generate a workout assignment.");
  }
}

export async function updateProfileMetrics(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const currentUser = await requireAuth();
    await ensurePrimaryWorkspace();
    const db = requireFirebase();
    const memberId = requireText(formData, "memberId", "Member");
    assertCanManageMember(currentUser, memberId);
    const fullName = requireText(formData, "fullName", "Full name");
    const email = requireText(formData, "email", "Email");
    assertValidEmail(email);
    const phone = String(formData.get("phone") ?? "").trim();
    if (phone) {
      assertValidPhone(phone, "Phone");
    }
    const now = new Date().toISOString();

    await db.collection(collectionPaths.profiles).doc(memberId).set(
      {
        id: memberId,
        fullName,
        email,
        phone,
        age: Number(formData.get("age") ?? 0),
        gender: String(formData.get("gender") ?? "").trim(),
        dob: String(formData.get("dob") ?? "").trim(),
        heightCm: Number(formData.get("heightCm") ?? 0),
        weightKg: Number(formData.get("weightKg") ?? 0),
        fitnessGoals: String(formData.get("fitnessGoals") ?? "").trim(),
        medicalNotes: String(formData.get("medicalNotes") ?? "").trim(),
        primarySlot: String(formData.get("primarySlot") ?? "A"),
        secondarySlot: String(formData.get("secondarySlot") ?? "D"),
        injuryNotes: String(formData.get("injuryNotes") ?? "").trim(),
        assignedTrainer: String(formData.get("assignedTrainer") ?? "").trim(),
        role: "member",
        defaultGymId: PRIMARY_GYM_ID,
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

export async function saveMemberAiTrainerNote(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const currentUser = await requireAuth();
    const db = requireFirebase();
    const memberId = requireText(formData, "memberId", "Member");
    assertCanManageMember(currentUser, memberId);

    const injuryNotes = String(formData.get("injuryNotes") ?? "").trim();
    const now = new Date().toISOString();

    await db.collection(collectionPaths.profiles).doc(memberId).set(
      {
        injuryNotes,
        aiTrainerNote: injuryNotes,
        aiTrainerUpdatedAt: now,
        updatedAt: now
      },
      { merge: true }
    );

    revalidatePath("/member");
    revalidatePath("/profile");

    return success(injuryNotes ? "AI trainer note saved." : "AI trainer note cleared.");
  } catch (error) {
    console.error("Unable to save AI trainer note", error);
    return failure(error, "Unable to save this AI trainer note.");
  }
}

export async function clearUserNotifications(notificationIds: string[]): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const db = requireFirebase();
    const scopedIds = notificationIds
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 20);

    if (scopedIds.length === 0) {
      return success("No notifications to clear.");
    }

    const now = new Date().toISOString();
    const batch = db.batch();

    for (const notificationId of scopedIds) {
      const notificationRef = db.collection(collectionPaths.notifications).doc(notificationId);
      const notificationDoc = await notificationRef.get();
      const notification = notificationDoc.data();

      if (!notificationDoc.exists || !notification) {
        continue;
      }

      const isMemberNotification =
        currentUser.role === "member" &&
        String(notification.recipientId ?? "") === (currentUser.memberId ?? currentUser.uid);
      const isOwnerNotification =
        (currentUser.role === "owner" || currentUser.role === "admin") &&
        String(notification.recipientRole ?? "") === "owner" &&
        String(notification.recipientId ?? "").includes(currentUser.gymId);

      if (currentUser.role === "admin" || isMemberNotification || isOwnerNotification) {
        batch.set(notificationRef, { readAt: now }, { merge: true });
      }
    }

    await batch.commit();
    revalidatePath("/member");
    revalidatePath("/owner");
    revalidatePath("/admin");

    return success("Notifications cleared.");
  } catch (error) {
    console.error("Unable to clear notifications", error);
    return failure(error, "Unable to clear notifications.");
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
    await ensurePrimaryWorkspace();
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
      gymId: PRIMARY_GYM_ID,
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

    await ensurePrimaryWorkspace();
    const db = requireFirebase();
    const batch = db.batch();
    const now = new Date().toISOString();

    for (const log of logs) {
      const liftLogId = randomUUID();
      const docRef = db.collection(collectionPaths.liftLogs).doc(liftLogId);
      
      batch.set(docRef, {
        id: liftLogId,
        gymId: PRIMARY_GYM_ID,
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
    const rawNewPassword = String(formData.get("newPassword") || formData.get("newPin") || "password").trim();
    let newPassword = rawNewPassword;
    if (formData.get("newPin")) {
      assertValidPin(rawNewPassword);
      newPassword = `pin-${rawNewPassword}`;
    }
    
    await auth.updateUser(userId, { password: newPassword });

    return success(`Access code reset to '${rawNewPassword}'.`);
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
    
    try {
      await auth.updateUser(memberId, { disabled: !isActive });
    } catch (error) {
      console.warn("Member auth access update skipped", error);
    }
    
    revalidatePath("/owner/members");
    revalidatePath(`/owner/members/${memberId}`);
    
    return success(`Member access ${isActive ? "enabled" : "disabled"}.`);
  } catch (error) {
    return failure(error, "Unable to toggle member access.");
  }
}

export async function deleteMemberProfile(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const { auth, db } = requireFirebaseServices();
    const memberId = requireText(formData, "memberId", "Member ID");
    const profileDoc = await db.collection(collectionPaths.profiles).doc(memberId).get();
    const data = profileDoc.data();

    if (!profileDoc.exists || data?.role !== "member") {
      throw new Error("Member profile was not found.");
    }

    const gymId = String(data.defaultGymId ?? PRIMARY_GYM_ID);
    assertCanManageGym(user, gymId);

    await db.collection(collectionPaths.profiles).doc(memberId).delete();

    try {
      await auth.deleteUser(memberId);
    } catch (error) {
      console.warn("Member auth user delete skipped", error);
    }

    revalidatePath("/owner");
    revalidatePath("/owner/members");
    revalidatePath(`/owner/members/${memberId}`);

    return success(`${String(data.fullName ?? "Member")} was deleted.`);
  } catch (error) {
    console.error("Unable to delete member", error);
    return failure(error, "Unable to delete member.");
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
    assertValidEmail(email);
    const gymId = requireText(formData, "gymId", "Gym ID");
    const staffType = String(formData.get("staffType") ?? "owner").trim();
    const normalizedStaffType = ["owner", "trainer", "staff"].includes(staffType) ? staffType : "owner";
    const now = new Date().toISOString();

    await db.collection(collectionPaths.profiles).doc(ownerId).set({
      id: ownerId,
      fullName,
      email,
      authEmail: email.toLowerCase(),
      username: email.toLowerCase(),
      role: "owner",
      staffType: normalizedStaffType,
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

    return success(`${fullName} was added as gym ${normalizedStaffType}.`);
  } catch (error) {
    return failure(error, "Unable to create gym staff profile.");
  }
}

export async function createGymWorkspace(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const db = requireFirebase();
    const name = requireText(formData, "name", "Gym name");
    const requestedSlug = String(formData.get("slug") ?? "").trim();
    const slug = slugifyGymName(requestedSlug || name);

    if (!slug) {
      throw new Error("Gym slug is invalid.");
    }

    const now = new Date().toISOString();
    const gymRef = db.collection(collectionPaths.gyms).doc(slug);
    const existing = await gymRef.get();

    if (existing.exists) {
      throw new Error("A gym with this slug already exists.");
    }

    await gymRef.set({
      id: slug,
      name,
      slug,
      ownerName: "",
      ownerUserId: "",
      expiryWarningDays: 7,
      status: String(formData.get("status") ?? "active"),
      location: String(formData.get("location") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      instagram: "",
      linkedin: "",
      youtube: "",
      createdAt: now,
      updatedAt: now
    });

    revalidatePath("/admin");
    revalidatePath("/admin/gyms");

    return success(`${name} was added.`);
  } catch (error) {
    return failure(error, "Unable to create gym.");
  }
}

export async function deleteGymWorkspace(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const { db } = requireFirebaseServices();
    const gymId = requireText(formData, "gymId", "Gym ID");

    if (gymId === PRIMARY_GYM_ID) {
      throw new Error("Sri Shakthi Hanuman Gym is the active pilot gym and cannot be deleted.");
    }

    const assignedProfiles = await db
      .collection(collectionPaths.profiles)
      .where("defaultGymId", "==", gymId)
      .limit(1)
      .get();

    if (!assignedProfiles.empty) {
      throw new Error("Remove or reassign gym staff and members before deleting this gym.");
    }

    await db.collection(collectionPaths.gyms).doc(gymId).delete();

    revalidatePath("/admin");
    revalidatePath("/admin/gyms");

    return success("Gym was removed.");
  } catch (error) {
    return failure(error, "Unable to remove gym.");
  }
}

export async function deleteGymStaffProfile(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const { auth, db } = requireFirebaseServices();
    const userId = requireText(formData, "userId", "User ID");
    const gymId = requireText(formData, "gymId", "Gym ID");

    await db.collection(collectionPaths.profiles).doc(userId).delete();

    try {
      await auth.deleteUser(userId);
    } catch (error: any) {
      if (error?.code !== "auth/user-not-found") {
        throw error;
      }
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/gyms/${gymId}`);

    return success("Gym staff access was deleted.");
  } catch (error) {
    return failure(error, "Unable to delete gym staff.");
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
    const { auth, db } = requireFirebaseServices();
    const gymId = requireText(formData, "gymId", "Gym ID");
    const status = requireText(formData, "status", "Status") as any;
    const isActive = status === "active";
    const now = new Date().toISOString();

    await db.collection(collectionPaths.gyms).doc(gymId).update({
      status,
      updatedAt: now
    });

    const profileSnapshot = await db
      .collection(collectionPaths.profiles)
      .where("defaultGymId", "==", gymId)
      .where("role", "in", ["owner", "member"])
      .get();

    const batch = db.batch();

    for (const profileDoc of profileSnapshot.docs) {
      batch.update(profileDoc.ref, {
        isActive,
        updatedAt: now
      });
    }

    await batch.commit();

    await Promise.all(
      profileSnapshot.docs.map(async (profileDoc) => {
        try {
          await auth.updateUser(profileDoc.id, { disabled: !isActive });
        } catch (error: any) {
          if (error?.code !== "auth/user-not-found") {
            throw error;
          }
        }
      })
    );

    revalidatePath("/admin");
    revalidatePath(`/admin/gyms/${gymId}`);

    return success(`Gym ${isActive ? "activated" : "deactivated"}. Staff and member access ${isActive ? "enabled" : "disabled"}.`);
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
    await ensurePrimaryWorkspace();
    const db = requireFirebase();
    const sessionId = requireText(formData, "sessionId", "Session");
    const latitude = Number(formData.get("latitude"));
    const longitude = Number(formData.get("longitude"));
    const deviceInfo = String(formData.get("deviceInfo") ?? "").slice(0, 500);
    const geofence = validateGymGeofence(latitude, longitude);
    const now = new Date().toISOString();

    await db.collection(collectionPaths.workoutSessions).doc(sessionId).set(
      {
        id: sessionId,
        gymId: PRIMARY_GYM_ID,
        memberId,
        attendance: {
          latitude,
          longitude,
          deviceInfo,
          timestamp: now,
          ...geofence
        },
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
    await ensurePrimaryWorkspace();
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
    const db = requireFirebase();
    const messageId = randomUUID();
    const notificationId = randomUUID();
    const now = new Date().toISOString();
    const source = String(formData.get("source") ?? "").trim();
    const isCompactFooter = source === "footer-compact";
    const email = String(formData.get("email") ?? "").trim();
    const name = isCompactFooter ? email || "Website visitor" : requireText(formData, "name", "Name");
    const mobile = isCompactFooter ? "" : requireText(formData, "mobile", "Mobile number");
    const body = requireText(formData, "body", "Message");
    if (!isCompactFooter) {
      assertValidPhone(mobile);
    }
    if (email) {
      assertValidEmail(email);
    } else if (isCompactFooter) {
      throw new Error("Email is required.");
    }
    if (body.length < 10) {
      throw new Error("Message must be at least 10 characters.");
    }

    await db.collection(collectionPaths.contactMessages).doc(messageId).set({
      id: messageId,
      gymId: PRIMARY_GYM_ID,
      name,
      mobile,
      email,
      body,
      status: "unread",
      createdAt: now,
      updatedAt: now
    });

    await db.collection(collectionPaths.notifications).doc(notificationId).set({
      id: notificationId,
      recipientRole: "admin",
      recipientId: "admin-fitsplit",
      type: "contact_message",
      title: "New landing page message",
      body: `${name} sent a contact request.`,
      contactMessageId: messageId,
      createdAt: now
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/inbox");
    revalidatePath("/activity");

    return success("Message sent. We will get back to you soon.");
  } catch (error) {
    console.error("Unable to submit contact message", error);
    return failure(error, "Unable to send message. Please try again.");
  }
}

export async function getUnreadMessageCount(): Promise<number> {
  if (!hasFirebaseAdminConfig()) {
    return 0;
  }

  try {
    const db = requireFirebase();
    const snapshot = await db
      .collection(collectionPaths.contactMessages)
      .where("status", "==", "unread")
      .get();
    
    return snapshot.size;
  } catch {
    return 0;
  }
}

export async function markContactMessageRead(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const messageId = requireText(formData, "messageId", "Message ID");
    const db = requireFirebase();
    const now = new Date().toISOString();

    await db.collection(collectionPaths.contactMessages).doc(messageId).set(
      {
        status: "read",
        updatedAt: now
      },
      { merge: true }
    );

    revalidatePath("/admin/inbox");

    return success("Message marked as read.");
  } catch (error) {
    return failure(error, "Unable to update message.");
  }
}

export async function createCatalogExercise(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensurePrimaryWorkspace();
    const db = requireFirebase();
    const exerciseId = randomUUID();
    const now = new Date().toISOString();
    const name = requireText(formData, "name", "Exercise name");

    await db.collection(collectionPaths.exerciseCatalog).doc(exerciseId).set({
      id: exerciseId,
      gymId: PRIMARY_GYM_ID,
      name,
      muscleGroup: requireText(formData, "muscleGroup", "Muscle group"),
      equipment: String(formData.get("equipment") ?? "").trim(),
      instructions: String(formData.get("instructions") ?? "").trim(),
      videoSource: String(formData.get("videoSource") ?? "none"),
      videoUrl: String(formData.get("videoUrl") ?? "").trim(),
      ownerOnly: true,
      isActive: true,
      createdBy: PRIMARY_OWNER_ID,
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
    await ensurePrimaryWorkspace();
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
      gymId: PRIMARY_GYM_ID,
      title,
      description: String(formData.get("description") ?? "").trim(),
      goal: String(formData.get("goal") ?? "Custom member plan").trim(),
      difficulty: String(formData.get("difficulty") ?? "beginner"),
      daysPerWeek: Number(formData.get("daysPerWeek") ?? 1),
      splitType: "custom",
      isActive: true,
      createdBy: PRIMARY_OWNER_ID,
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
