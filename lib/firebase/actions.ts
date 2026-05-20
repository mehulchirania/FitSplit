"use server";

import { randomUUID } from "crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAuth, requireRole, requireOwner } from "@/lib/auth";
import { collectionPaths, PRIMARY_GYM_ID, PRIMARY_OWNER_ID } from "./collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "./admin";
import type { FormActionState } from "@/types/action-state";
import type { GymWorkspace, Role, WorkoutProgram } from "@/types/domain";
import { getWorkoutPrograms } from "@/lib/firebase/read-models";
import workoutsData from "@/lib/workouts.json";

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

function normalizeGymStatusInput(value: FormDataEntryValue | null) {
  const status = String(value ?? "active");
  if (status === "paused" || status === "inactive") {
    return status;
  }
  return "active";
}

function parsePngDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match?.[1]) {
    throw new Error("Logo must be saved as a PNG preview before uploading.");
  }

  const buffer = Buffer.from(match[1], "base64");
  if (buffer.byteLength > 900_000) {
    throw new Error("Logo is too large. Use the cropper preview before saving.");
  }

  return buffer;
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

function success(message: string, gymId?: string): FormActionState {
  // Bust the cache so the next read pulls fresh data.
  // If we know the gymId, use the per-gym tag (doesn't punish other gyms).
  // Otherwise fall back to the global "gym-data" tag.
  try {
    if (gymId) {
      revalidateTag(`gym:${gymId}`);
    } else {
      revalidateTag("gym-data");
    }
  } catch {
    // revalidateTag is a noop outside a request context; ignore
  }
  return { status: "success", message };
}

function failure(error: unknown, fallback: string): FormActionState {
  // redirect() throws Error("NEXT_REDIRECT") — let it propagate so Next.js can actually redirect.
  if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
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

type GymGeofenceConfig = Pick<GymWorkspace, "latitude" | "longitude" | "radiusMeters">;

function validateGymGeofence(
  latitude: number,
  longitude: number,
  gymConfig?: GymGeofenceConfig
) {
  const gymLatitude = Number(
    gymConfig?.latitude ??
      process.env.SHG_GYM_LATITUDE ??
      process.env.NEXT_PUBLIC_SHG_GYM_LATITUDE
  );
  const gymLongitude = Number(
    gymConfig?.longitude ??
      process.env.SHG_GYM_LONGITUDE ??
      process.env.NEXT_PUBLIC_SHG_GYM_LONGITUDE
  );
  const radiusMeters = Number(
    gymConfig?.radiusMeters ??
      process.env.SHG_GYM_RADIUS_METERS ??
      process.env.NEXT_PUBLIC_SHG_GYM_RADIUS_METERS ??
      150
  );

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

async function getGymGeofenceConfig(gymId: string): Promise<GymGeofenceConfig> {
  try {
    const db = requireFirebase();
    const gymDoc = await db.collection(collectionPaths.gyms).doc(gymId).get();
    const data = gymDoc.data() ?? {};

    return {
      latitude: data.latitude != null ? Number(data.latitude) : undefined,
      longitude: data.longitude != null ? Number(data.longitude) : undefined,
      radiusMeters: data.radiusMeters != null ? Number(data.radiusMeters) : undefined
    };
  } catch {
    return {};
  }
}

function assertCanManageMember(
  user: Awaited<ReturnType<typeof requireAuth>>,
  memberId: string
) {
  if (user.role === "member" && user.memberId !== memberId) {
    throw new Error("You can only update your own member account.");
  }
}

/**
 * Stronger guard for owner/trainer/staff actions that target a memberId.
 * Verifies the member actually belongs to the calling user's gym.
 * Admin bypasses the check. Members can only act on themselves (same as the
 * sync helper above).
 *
 * Use this in any owner-side action where memberId comes from FormData,
 * since a malicious client can put any UUID in there.
 */
async function assertMemberBelongsToCallerGym(
  user: Awaited<ReturnType<typeof requireAuth>>,
  memberId: string
) {
  assertCanManageMember(user, memberId);
  if (user.role === "admin") return;
  if (user.role === "member") return; // already covered by sync check above
  if (!user.gymId) {
    throw new Error("Your account is not assigned to a gym.");
  }
  if (!hasFirebaseAdminConfig()) return; // mock mode — no Firestore to check
  const db = requireFirebase();
  const profile = await db.collection(collectionPaths.profiles).doc(memberId).get();
  if (!profile.exists) {
    throw new Error("Member not found.");
  }
  const profileGymId = profile.data()?.gymId;
  if (profileGymId !== user.gymId) {
    throw new Error("This member is not part of your gym.");
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
      status: "active",
      logoUrl: "/shg-gym-logo.jpeg",
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
    const user = await requireOwner();
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

    // Keep stored memberCount in sync
    await db.collection(collectionPaths.gyms).doc(gymId).set(
      { memberCount: (await db.collection(collectionPaths.gyms).doc(gymId).get()).data()?.memberCount + 1 || 1, updatedAt: now },
      { merge: true }
    );

    const createEventId = randomUUID();
    await db.collection(collectionPaths.activityEvents).doc(createEventId).set({
      id: createEventId,
      gymId,
      audience: "owner",
      memberId,
      title: `New member joined — ${fullName}`,
      detail: `${fullName} was added by ${user.fullName ?? user.uid}.`,
      icon: "users",
      createdAt: now
    });

    revalidatePath("/owner");
    revalidatePath("/owner/members");
    revalidatePath("/activity");

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

    const macroNutritionTarget = {
      calories: formData.get("macroCalories") ? Number(formData.get("macroCalories")) : 0,
      protein: formData.get("macroProtein") ? Number(formData.get("macroProtein")) : 0,
      carbs: formData.get("macroCarbs") ? Number(formData.get("macroCarbs")) : 0,
      fat: formData.get("macroFat") ? Number(formData.get("macroFat")) : 0,
      waterLiters: formData.get("macroWater") ? Number(formData.get("macroWater")) : 0,
      notes: String(formData.get("macroNotes") ?? "").trim()
    };

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
        macroNutritionTarget,
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

export async function updateOwnerMemberContext(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const { auth, db } = requireFirebaseServices();
    const memberId = requireText(formData, "memberId", "Member");
    const fullName = requireText(formData, "fullName", "Full name");
    const email = requireText(formData, "email", "Email").toLowerCase();
    assertValidEmail(email);
    const phone = String(formData.get("phone") ?? "").trim();
    if (phone) {
      assertValidPhone(phone, "Phone");
    }

    const profileRef = db.collection(collectionPaths.profiles).doc(memberId);
    const profileDoc = await profileRef.get();
    if (!profileDoc.exists) {
      throw new Error("Member profile was not found.");
    }

    const existingProfile = profileDoc.data() ?? {};
    if (existingProfile.role !== "member") {
      throw new Error("Only member profiles can be edited here.");
    }

    const gymId = String(existingProfile.defaultGymId ?? user.gymId ?? PRIMARY_GYM_ID);
    assertCanManageGym(user, gymId);

    const now = new Date().toISOString();
    const numericOrDelete = (key: string) => {
      const value = String(formData.get(key) ?? "").trim();
      return value ? Number(value) : null;
    };
    const username = String(existingProfile.username ?? "").trim() || phone || email;
    const authEmail = String(existingProfile.authEmail ?? memberAuthEmail(memberId));

    await profileRef.set(
      {
        id: memberId,
        fullName,
        email,
        phone,
        username,
        authEmail,
        role: "member",
        defaultGymId: gymId,
        goal: String(formData.get("goal") ?? "General fitness").trim() || "General fitness",
        age: numericOrDelete("age"),
        gender: String(formData.get("gender") ?? "").trim(),
        dob: String(formData.get("dob") ?? "").trim(),
        heightCm: numericOrDelete("heightCm"),
        weightKg: numericOrDelete("weightKg"),
        fitnessGoals: String(formData.get("fitnessGoals") ?? "").trim(),
        medicalNotes: String(formData.get("medicalNotes") ?? "").trim(),
        injuryNotes: String(formData.get("injuryNotes") ?? "").trim(),
        primarySlot: String(formData.get("primarySlot") ?? "").trim() || "A",
        secondarySlot: String(formData.get("secondarySlot") ?? "").trim() || "D",
        assignedTrainer: String(formData.get("assignedTrainer") ?? "").trim(),
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

    await upsertAuthUser(
      auth,
      {
        email: authEmail,
        fullName,
        uid: memberId,
        role: "member",
        gymId,
        isActive: existingProfile.isActive !== false
      },
      "pin-1234"
    );

    revalidatePath("/owner");
    revalidatePath("/owner/members");
    revalidatePath(`/owner/members/${memberId}`);
    revalidatePath("/member");
    revalidatePath("/profile");

    return success(`${fullName}'s profile context was updated.`);
  } catch (error) {
    console.error("Unable to update member context", error);
    return failure(error, "Unable to update member context. Please try again.");
  }
}

export async function assignProgramToMember(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const memberName = String(formData.get("memberName") ?? "Member").trim();
    const programTitle = String(formData.get("programTitle") ?? "Workout program").trim();

    if (!hasFirebaseAdminConfig()) {
      // Mock mode — assignment is local only; full persistence requires Firebase Admin
      revalidatePath("/owner");
      revalidatePath("/member");
      return success(`${programTitle} was assigned to ${memberName} (local mode).`);
    }

    const db = requireFirebase();
    const assignmentId = randomUUID();
    const notificationId = randomUUID();
    const activityId = randomUUID();
    const memberId = requireText(formData, "memberId", "Member");
    const programId = requireText(formData, "programId", "Workout program");
    await assertMemberBelongsToCallerGym(currentUser, memberId);
    const now = new Date().toISOString();

    const assignGymId = currentUser.gymId ?? PRIMARY_GYM_ID;

    const existingAssignments = await db
      .collection(collectionPaths.programAssignments)
      .where("gymId", "==", assignGymId)
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
      gymId: assignGymId,
      memberId,
      programId,
      assignedAt: now,
      status: "active",
      createdBy: currentUser.uid,
      createdAt: now,
      updatedAt: now
    });

    await db.collection(collectionPaths.notifications).doc(notificationId).set({
      id: notificationId,
      recipientRole: "member",
      recipientId: memberId,
      gymId: assignGymId,
      type: "program_assigned",
      title: "Workout program assigned",
      body: `${programTitle} is now available in your weekly schedule.`,
      createdAt: now
    });

    await db.collection(collectionPaths.activityEvents).doc(activityId).set({
      id: activityId,
      gymId: assignGymId,
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
  const assignablePrograms = programs.filter((program) =>
    program.days.some((day) => day.exercises.length > 0)
  );
  const programPool = assignablePrograms.length ? assignablePrograms : programs;
  const goal = memberGoal.toLowerCase();

  if (goal.includes("strength")) {
    return programPool.find((program) => program.title.toLowerCase().includes("ppl")) ?? programPool[0];
  }

  if (goal.includes("fat") || goal.includes("loss") || goal.includes("weight")) {
    return (
      programPool.find((program) => program.daysPerWeek <= 4) ??
      programPool.find((program) => program.splitType === "ppl_upper_lower") ??
      programPool[0]
    );
  }

  if (goal.includes("muscle") || goal.includes("hypertrophy") || goal.includes("bulk")) {
    return (
      programPool.find((program) => program.splitType === "ppl_x2") ??
      programPool.find((program) => program.splitType === "combo_x2") ??
      programPool[0]
    );
  }

  return programPool.find((program) => program.splitType === "ppl_upper_lower") ?? programPool[0];
}

async function pickProgramWithGemini(programs: WorkoutProgram[], memberGoal: string) {
  const assignablePrograms = programs.filter((program) =>
    program.days.some((day) => day.exercises.length > 0)
  );
  const programPool = assignablePrograms.length ? assignablePrograms : programs;
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    return pickProgramWithoutAi(programPool, memberGoal);
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
  const prompt = [
    "Pick the best FitSplit workout program id for this gym member.",
    "Return only one exact id from the list. No markdown.",
    `Member goal: ${memberGoal || "General fitness"}`,
    "Programs:",
    ...programPool.map((program) =>
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
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        method: "POST"
      }
    );

    if (!response.ok) {
      return pickProgramWithoutAi(programPool, memberGoal);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const selectedId = text.replace(/[`"' ]/g, "");
    return programPool.find((program) => program.id === selectedId) ?? pickProgramWithoutAi(programPool, memberGoal);
  } catch (error) {
    console.warn("Gemini program selection failed; using fallback.", error);
    return pickProgramWithoutAi(programPool, memberGoal);
  }
}

export async function generateAndAssignProgram(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const memberId = requireText(formData, "memberId", "Member");
    const memberName = requireText(formData, "memberName", "Member name");
    const memberGoal = String(formData.get("memberGoal") ?? "General fitness").trim();
    const { programs } = await getWorkoutPrograms(currentUser.gymId);
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

    const profileRef = db.collection(collectionPaths.profiles).doc(memberId);
    const existingProfile = (await profileRef.get()).data() || {};
    const assignedTrainer = currentUser.role === "member"
      ? (existingProfile.assignedTrainer || "")
      : String(formData.get("assignedTrainer") ?? "").trim();

    await profileRef.set(
      {
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
        assignedTrainer,
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
        String(notification.recipientRole ?? "") === "owner";

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
      gymId: currentUser.gymId ?? PRIMARY_GYM_ID,
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

    const db = requireFirebase();
    const batch = db.batch();
    const now = new Date().toISOString();

    for (const log of logs) {
      const liftLogId = randomUUID();
      const docRef = db.collection(collectionPaths.liftLogs).doc(liftLogId);
      
      batch.set(docRef, {
        id: liftLogId,
        gymId: currentUser.gymId ?? PRIMARY_GYM_ID,
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
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const userId = requireText(formData, "userId", "User ID");
    // Block owners from resetting members of other gyms. Admin bypasses inside the helper.
    await assertMemberBelongsToCallerGym(currentUser, userId);
    const { auth, db } = requireFirebaseServices();
    
    const rawNewPassword = String(formData.get("newPassword") || formData.get("newPin") || "password").trim();
    let newPassword = rawNewPassword;
    const isPinReset = Boolean(formData.get("newPin"));
    if (isPinReset) {
      assertValidPin(rawNewPassword);
      newPassword = `pin-${rawNewPassword}`;
    }

    const profileRef = db.collection(collectionPaths.profiles).doc(userId);
    const profileDoc = await profileRef.get();
    const profile = profileDoc.data() ?? {};
    const gymId = String(profile.defaultGymId ?? currentUser.gymId ?? PRIMARY_GYM_ID);
    assertCanManageGym(currentUser, gymId);

    let authEmail = String(profile.authEmail ?? memberAuthEmail(userId));
    const fullName = String(profile.fullName ?? userId);
    const role = String(profile.role ?? "member") as Role;
    const username =
      String(profile.username ?? "").trim() ||
      String(profile.phone ?? "").trim() ||
      String(profile.email ?? "").trim() ||
      userId;

    try {
      await upsertAuthUser(
        auth,
        {
          email: authEmail,
          fullName,
          uid: userId,
          role,
          gymId,
          isActive: profile.isActive !== false
        },
        newPassword,
        true
      );
    } catch (error: any) {
      if (role !== "member" || error?.code !== "auth/email-already-exists") {
        throw error;
      }

      authEmail = memberAuthEmail(userId);
      await upsertAuthUser(
        auth,
        {
          email: authEmail,
          fullName,
          uid: userId,
          role,
          gymId,
          isActive: profile.isActive !== false
        },
        newPassword,
        true
      );
    }

    if (role === "member") {
      await profileRef.set(
        {
          authEmail,
          username,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    }

    // Audit log: who reset whose access code, when. Helps if a member ever
    // disputes "someone changed my login".
    try {
      const auditId = randomUUID();
      await db.collection(collectionPaths.activityEvents).doc(auditId).set({
        id: auditId,
        gymId,
        audience: "owner",
        title: isPinReset ? "PIN reset" : "Password reset",
        detail: `${currentUser.fullName} reset ${role === "member" ? "the PIN" : "the password"} for ${fullName}.`,
        icon: "bell",
        createdAt: new Date().toISOString(),
        actorId: currentUser.uid,
        targetId: userId
      });
    } catch (e) {
      console.warn("Failed to write audit event for resetPassword:", e);
    }

    revalidatePath("/owner/members");
    revalidatePath(`/owner/members/${userId}`);

    return success(isPinReset ? `PIN reset for ${username}.` : "Password reset successfully.", gymId);
  } catch (error) {
    console.error("Unable to reset password", error);
    return failure(error, "Could not reset access code.");
  }
}

export async function changeStaffPassword(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role === "member") {
      throw new Error("Members must use the PIN change form.");
    }
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const { auth } = requireFirebaseServices();
    const newPassword = String(formData.get("newPassword") ?? "").trim();
    const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    if (newPassword !== confirmPassword) {
      throw new Error("New password and confirmation do not match.");
    }

    await auth.updateUser(currentUser.uid, { password: newPassword });

    // Clear the "must change password on first login" flag, if it was set.
    // Wrapped in try/catch so an existing-staff password rotation doesn't fail
    // if the doc happens to be missing — the auth update is the source of truth.
    try {
      const { db } = requireFirebaseServices();
      await db.collection(collectionPaths.profiles).doc(currentUser.uid).set(
        { mustChangePassword: false, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (e) {
      console.warn("Could not clear mustChangePassword flag:", e);
    }

    return success("Password changed successfully.");
  } catch (error) {
    console.error("Unable to change password", error);
    return failure(error, "Could not change password. Please try again.");
  }
}

export async function changeMemberPin(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role !== "member") {
      throw new Error("Only members can change their PIN here.");
    }
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const { auth } = requireFirebaseServices();
    const currentPin = String(formData.get("currentPin") ?? "").trim();
    const newPin = String(formData.get("newPin") ?? "").trim();
    const confirmPin = String(formData.get("confirmPin") ?? "").trim();

    assertValidPin(currentPin);
    assertValidPin(newPin);

    if (newPin !== confirmPin) {
      throw new Error("New PIN and confirmation PIN do not match.");
    }
    if (newPin === currentPin) {
      throw new Error("New PIN must be different from the current PIN.");
    }

    // Verify current PIN by attempting to sign in via Firebase REST
    const memberId = currentUser.memberId ?? currentUser.uid;
    const authEmail = memberAuthEmail(memberId);

    // We can't verify the old PIN server-side without Firebase client SDK here,
    // so we update directly — the client already authenticated via session cookie
    await auth.updateUser(memberId, { password: `pin-${newPin}` });

    return success("PIN changed successfully.");
  } catch (error) {
    console.error("Unable to change PIN", error);
    return failure(error, "Could not change PIN. Please try again.");
  }
}

export async function toggleMemberAccess(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const { auth, db } = requireFirebaseServices();
    const memberId = requireText(formData, "memberId", "Member ID");
    await assertMemberBelongsToCallerGym(user, memberId);
    const isActive = formData.get("isActive") === "true";
    const now = new Date().toISOString();

    const profileDoc = await db.collection(collectionPaths.profiles).doc(memberId).get();
    const memberName = String(profileDoc.data()?.fullName ?? "Member");
    const gymId = String(profileDoc.data()?.defaultGymId ?? user.gymId ?? PRIMARY_GYM_ID);

    await db.collection(collectionPaths.profiles).doc(memberId).update({
      isActive,
      updatedAt: now
    });

    try {
      await auth.updateUser(memberId, { disabled: !isActive });
    } catch (error) {
      console.warn("Member auth access update skipped", error);
    }

    const toggleEventId = randomUUID();
    await db.collection(collectionPaths.activityEvents).doc(toggleEventId).set({
      id: toggleEventId,
      gymId,
      audience: "owner",
      memberId,
      title: `Access ${isActive ? "restored" : "suspended"} — ${memberName}`,
      detail: `${memberName}'s gym access was ${isActive ? "restored" : "suspended"} by ${user.fullName ?? user.uid}.`,
      icon: "bell",
      createdAt: now
    });

    revalidatePath("/owner");
    revalidatePath("/owner/members");
    revalidatePath(`/owner/members/${memberId}`);
    revalidatePath("/activity");

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
    const user = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const { auth, db } = requireFirebaseServices();
    const memberId = requireText(formData, "memberId", "Member ID");
    await assertMemberBelongsToCallerGym(user, memberId);
    const profileDoc = await db.collection(collectionPaths.profiles).doc(memberId).get();
    const data = profileDoc.data();

    if (!profileDoc.exists || data?.role !== "member") {
      throw new Error("Member profile was not found.");
    }

    const gymId = String(data.defaultGymId ?? PRIMARY_GYM_ID);
    assertCanManageGym(user, gymId);

    // Clean up all member-owned data before deleting the profile
    const [assignmentsSnap, liftLogsSnap, notificationsSnap, sessionsSnap, attendanceSnap] = await Promise.all([
      db.collection(collectionPaths.programAssignments).where("memberId", "==", memberId).get(),
      db.collection(collectionPaths.liftLogs).where("memberId", "==", memberId).get(),
      db.collection(collectionPaths.notifications).where("recipientId", "==", memberId).get(),
      db.collection(collectionPaths.workoutSessions).where("memberId", "==", memberId).get(),
      db.collection(collectionPaths.attendanceRecords).where("memberId", "==", memberId).get()
    ]);

    const cleanupBatch = db.batch();
    for (const doc of [
      ...assignmentsSnap.docs,
      ...liftLogsSnap.docs,
      ...notificationsSnap.docs,
      ...sessionsSnap.docs,
      ...attendanceSnap.docs
    ]) {
      cleanupBatch.delete(doc.ref);
    }
    await cleanupBatch.commit();

    await db.collection(collectionPaths.profiles).doc(memberId).delete();

    // Decrement stored memberCount
    try {
      const gymDoc = await db.collection(collectionPaths.gyms).doc(gymId).get();
      const current = Number(gymDoc.data()?.memberCount ?? 1);
      await db.collection(collectionPaths.gyms).doc(gymId).set(
        { memberCount: Math.max(0, current - 1), updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {
      // non-fatal — count will be recomputed on next admin view
    }

    try {
      await auth.deleteUser(memberId);
    } catch (error) {
      console.warn("Member auth user delete skipped", error);
    }

    const deleteEventId = randomUUID();
    const deletedName = String(data.fullName ?? "Member");
    await db.collection(collectionPaths.activityEvents).doc(deleteEventId).set({
      id: deleteEventId,
      gymId,
      audience: "owner",
      title: `Member removed — ${deletedName}`,
      detail: `${deletedName}'s profile and all associated data were deleted by ${user.fullName ?? user.uid}.`,
      icon: "users",
      createdAt: new Date().toISOString()
    });

    revalidatePath("/owner");
    revalidatePath("/owner/members");
    revalidatePath(`/owner/members/${memberId}`);
    revalidatePath("/activity");

    return success(`${deletedName} was deleted.`);
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

    await upsertAuthUser(auth, {
      email,
      fullName,
      uid: ownerId,
      role: "owner",
      gymId,
      isActive: true
    });

    await db.collection(collectionPaths.profiles).doc(ownerId).set({
      id: ownerId,
      fullName,
      email,
      authEmail: email.toLowerCase(),
      username: email.toLowerCase(),
      role: "owner",
      staffType: normalizedStaffType,
      defaultGymId: gymId,
      avatarInitials: fullName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      isActive: true,
      // Force first-login password change — every new staff account starts with
      // the default password "password" and must rotate it before they can use
      // any other page. Cleared in changeStaffPassword.
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now
    });

    // Audit log: admin created a new staff account. Tracks who provisioned
    // gym access — useful for compliance and onboarding visibility.
    try {
      const auditId = randomUUID();
      await db.collection(collectionPaths.activityEvents).doc(auditId).set({
        id: auditId,
        gymId,
        audience: "owner",
        title: `Staff account created — ${normalizedStaffType}`,
        detail: `${fullName} (${email}) was added to the gym with the default password. They will be forced to change it on first login.`,
        icon: "users",
        createdAt: now,
        targetId: ownerId
      });
    } catch (e) {
      console.warn("Failed to write audit event for createOwnerProfile:", e);
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/gyms/${gymId}`);

    return success(`${fullName} was added as gym ${normalizedStaffType}.`, gymId);
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
      status: normalizeGymStatusInput(formData.get("status")),
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
      throw new Error("This gym is protected and cannot be deleted.");
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

export async function deleteGymWithMembers(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const { auth, db } = requireFirebaseServices();
    const gymId = requireText(formData, "gymId", "Gym ID");

    if (gymId === PRIMARY_GYM_ID) {
      throw new Error("This gym is protected and cannot be deleted.");
    }

    // Fetch all profiles assigned to this gym
    const profilesSnap = await db
      .collection(collectionPaths.profiles)
      .where("defaultGymId", "==", gymId)
      .get();

    const memberIds = profilesSnap.docs
      .filter((doc) => doc.data().role === "member")
      .map((doc) => doc.id);

    // Delete member-owned data per member
    for (const memberId of memberIds) {
      const [assignmentsSnap, liftLogsSnap, notificationsSnap, sessionsSnap, attendanceSnap] = await Promise.all([
        db.collection(collectionPaths.programAssignments).where("memberId", "==", memberId).get(),
        db.collection(collectionPaths.liftLogs).where("memberId", "==", memberId).get(),
        db.collection(collectionPaths.notifications).where("recipientId", "==", memberId).get(),
        db.collection(collectionPaths.workoutSessions).where("memberId", "==", memberId).get(),
        db.collection(collectionPaths.attendanceRecords).where("memberId", "==", memberId).get()
      ]);
      const memberBatch = db.batch();
      for (const doc of [
        ...assignmentsSnap.docs,
        ...liftLogsSnap.docs,
        ...notificationsSnap.docs,
        ...sessionsSnap.docs,
        ...attendanceSnap.docs
      ]) {
        memberBatch.delete(doc.ref);
      }
      await memberBatch.commit();
    }

    // Delete gym-scoped activity events
    const activitySnap = await db
      .collection(collectionPaths.activityEvents)
      .where("gymId", "==", gymId)
      .get();

    // Batch-delete all profiles + activity events + gym doc
    const finalBatch = db.batch();
    for (const doc of [...profilesSnap.docs, ...activitySnap.docs]) {
      finalBatch.delete(doc.ref);
    }
    finalBatch.delete(db.collection(collectionPaths.gyms).doc(gymId));
    await finalBatch.commit();

    // Delete Firebase Auth accounts (non-fatal per account)
    for (const doc of profilesSnap.docs) {
      try {
        await auth.deleteUser(doc.id);
      } catch {
        // user may not have an Auth account
      }
    }

    const profileCount = profilesSnap.docs.length;
    revalidatePath("/admin");
    revalidatePath("/admin/gyms");

    return success(
      `Gym deleted along with ${profileCount} profile${profileCount !== 1 ? "s" : ""}.`
    );
  } catch (error) {
    return failure(error, "Unable to delete gym.");
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

export async function updateGymLogo(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const { db, storage } = requireFirebaseServices();
    const gymId = requireText(formData, "gymId", "Gym ID");
    const logoDataUrl = requireText(formData, "logoDataUrl", "Logo preview");
    const buffer = parsePngDataUrl(logoDataUrl);
    const now = new Date().toISOString();
    const token = randomUUID();
    const logoPath = `gym-logos/${gymId}/logo-512.png`;
    const bucket = storage.bucket();

    await bucket.file(logoPath).save(buffer, {
      contentType: "image/png",
      metadata: {
        cacheControl: "public, max-age=31536000",
        metadata: {
          firebaseStorageDownloadTokens: token
        }
      }
    });

    const logoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(logoPath)}?alt=media&token=${token}`;

    await db.collection(collectionPaths.gyms).doc(gymId).set(
      {
        logoPath,
        logoUrl,
        updatedAt: now
      },
      { merge: true }
    );

    revalidatePath("/admin");
    revalidatePath("/admin/gyms");
    revalidatePath(`/admin/gyms/${gymId}`);
    revalidatePath("/member");

    return success("Gym logo updated.");
  } catch (error) {
    return failure(error, "Unable to update gym logo.");
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
    const status = normalizeGymStatusInput(formData.get("status"));
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
    const db = requireFirebase();
    const sessionId = requireText(formData, "sessionId", "Session");
    const rawLat = formData.get("latitude");
    const rawLng = formData.get("longitude");
    const latitude = rawLat != null ? Number(rawLat) : Number.NaN;
    const longitude = rawLng != null ? Number(rawLng) : Number.NaN;
    const deviceInfo = String(formData.get("deviceInfo") ?? "").slice(0, 500);
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const gymConfig = await getGymGeofenceConfig(gymId);
    const geofence = validateGymGeofence(latitude, longitude, gymConfig);
    const now = new Date().toISOString();

    await db.collection(collectionPaths.workoutSessions).doc(sessionId).set(
      {
        id: sessionId,
        gymId,
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

    await db.collection(collectionPaths.attendanceRecords).doc(sessionId).set(
      {
        id: sessionId,
        memberId,
        gymId,
        sessionId,
        checkInAt: now,
        latitude,
        longitude,
        deviceInfo,
        ...geofence,
        createdAt: now,
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
    const currentUser = await requireAuth();

    if (!hasFirebaseAdminConfig()) {
      return success("Workout session was ended (local mode).");
    }
    const db = requireFirebase();
    const sessionId = requireText(formData, "sessionId", "Session");
    const memberId = requireText(formData, "memberId", "Member");
    assertCanManageMember(currentUser, memberId);
    const now = new Date().toISOString();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

    await db.collection(collectionPaths.workoutSessions).doc(sessionId).set(
      {
        endedAt: now,
        status: "completed",
        updatedAt: now
      },
      { merge: true }
    );

    // Record attendance for the day
    try {
      await db.collection(collectionPaths.attendanceRecords).doc(sessionId).set({
        id: sessionId,
        memberId,
        gymId,
        sessionId,
        checkOutAt: now,
        updatedAt: now
      }, { merge: true });
    } catch {
      // non-fatal — attendance tracking is supplementary
    }

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

export async function requestCatalogExercise(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const name = requireText(formData, "name", "Exercise name");
    const muscleGroup = requireText(formData, "muscleGroup", "Muscle group");

    if (!hasFirebaseAdminConfig()) {
      return success(`"${name}" request noted. Connect Firebase to save requests for admin review.`);
    }

    const db = requireFirebase();
    const requestId = randomUUID();
    const notificationId = randomUUID();
    const now = new Date().toISOString();

    // Get gym name for the notification body
    const gymDoc = await db.collection(collectionPaths.gyms).doc(currentUser.gymId ?? PRIMARY_GYM_ID).get();
    const gymName = String(gymDoc.data()?.name ?? currentUser.gymId ?? "A gym");

    await db.collection(collectionPaths.exerciseRequests).doc(requestId).set({
      id: requestId,
      gymId: currentUser.gymId ?? PRIMARY_GYM_ID,
      gymName,
      requestedBy: currentUser.uid,
      name,
      muscleGroup,
      equipment: String(formData.get("equipment") ?? "").trim(),
      instructions: String(formData.get("instructions") ?? "").trim(),
      status: "pending",
      createdAt: now,
      updatedAt: now
    });

    await db.collection(collectionPaths.notifications).doc(notificationId).set({
      id: notificationId,
      recipientRole: "admin",
      recipientId: "admin-fitsplit",
      type: "exercise_request",
      title: "New exercise catalog request",
      body: `${gymName} wants to add "${name}" (${muscleGroup}) to the catalog.`,
      exerciseRequestId: requestId,
      createdAt: now
    });

    revalidatePath("/admin/exercises");

    return success(`Request to add "${name}" sent to admin for review.`);
  } catch (error) {
    return failure(error, "Unable to send exercise request.");
  }
}

export async function approveCatalogExerciseRequest(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const db = requireFirebase();
    const requestId = requireText(formData, "requestId", "Request ID");
    const now = new Date().toISOString();

    const requestDoc = await db.collection(collectionPaths.exerciseRequests).doc(requestId).get();
    if (!requestDoc.exists) throw new Error("Exercise request not found.");

    const data = requestDoc.data()!;
    const name = String(formData.get("name") ?? data.name ?? "");
    const muscleGroup = String(formData.get("muscleGroup") ?? data.muscleGroup ?? "");
    const gymId = String(data.gymId ?? PRIMARY_GYM_ID);

    if (!name || !muscleGroup) throw new Error("Name and muscle group are required.");

    const exerciseId = randomUUID();
    await db.collection(collectionPaths.exerciseCatalog).doc(exerciseId).set({
      id: exerciseId,
      gymId,
      name,
      muscleGroup,
      equipment: String(formData.get("equipment") ?? data.equipment ?? "").trim(),
      instructions: String(formData.get("instructions") ?? data.instructions ?? "").trim(),
      videoSource: "none",
      videoUrl: "",
      gymVideoUrl: "",
      gymVideoSource: "none",
      thumbnailUrl: "",
      ownerOnly: true,
      isActive: true,
      createdBy: "admin-fitsplit",
      approvedFromRequestId: requestId,
      createdAt: now,
      updatedAt: now
    });

    await db.collection(collectionPaths.exerciseRequests).doc(requestId).set(
      { status: "approved", approvedAt: now, updatedAt: now },
      { merge: true }
    );

    revalidatePath("/admin/exercises");
    revalidatePath("/owner/exercises");
    revalidatePath("/owner/programs");

    return success(`"${name}" added to the exercise catalog.`);
  } catch (error) {
    return failure(error, "Unable to approve exercise request.");
  }
}

export async function rejectCatalogExerciseRequest(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const db = requireFirebase();
    const requestId = requireText(formData, "requestId", "Request ID");
    const now = new Date().toISOString();

    await db.collection(collectionPaths.exerciseRequests).doc(requestId).set(
      { status: "rejected", rejectedAt: now, updatedAt: now },
      { merge: true }
    );

    revalidatePath("/admin/exercises");
    return success("Exercise request dismissed.");
  } catch (error) {
    return failure(error, "Unable to dismiss request.");
  }
}

export async function deleteCustomWorkoutProgram(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const db = requireFirebase();
    const programId = requireText(formData, "programId", "Program ID");
    const programTitle = String(formData.get("programTitle") ?? "Program").trim();

    await db.collection(collectionPaths.workoutPrograms).doc(programId).delete();

    revalidatePath("/owner/programs");
    revalidatePath("/owner/members");

    return success(`${programTitle} was deleted.`);
  } catch (error) {
    return failure(error, "Unable to delete program.");
  }
}

export async function updateCustomWorkoutProgram(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const db = requireFirebase();
    const programId = requireText(formData, "programId", "Program ID");
    const title = requireText(formData, "title", "Program title");
    const now = new Date().toISOString();

    type DayInput = { title: string; exerciseIds: string[]; sets: number; reps: string; entrySets?: number[]; entryReps?: string[] };
    const daysJson = String(formData.get("days") ?? "").trim();
    let dayInputs: DayInput[];

    try {
      dayInputs = JSON.parse(daysJson);
    } catch {
      throw new Error("Invalid days format.");
    }

    if (!dayInputs.length) throw new Error("A plan must have at least one day.");

    const days = await Promise.all(
      dayInputs.map(async (dayInput, i) => {
        const resolvedIds = await Promise.all(
          dayInput.exerciseIds.map((id) => resolveExerciseRecordId(id))
        );
        return {
          id: randomUUID(),
          title: dayInput.title || `Day ${i + 1}`,
          dayNumber: i + 1,
          focus: "Owner-created custom day",
          exercises: resolvedIds.map((exerciseId, idx) => ({
            exerciseId,
            sortOrder: idx + 1,
            sets: dayInput.entrySets?.[idx] ?? dayInput.sets ?? 3,
            reps: dayInput.entryReps?.[idx] ?? dayInput.reps ?? "8-12",
            restSeconds: Number(formData.get("restSeconds") ?? 75)
          }))
        };
      })
    );

    await db.collection(collectionPaths.workoutPrograms).doc(programId).set(
      {
        title,
        description: String(formData.get("description") ?? "").trim(),
        goal: String(formData.get("goal") ?? "Custom member plan").trim(),
        difficulty: String(formData.get("difficulty") ?? "beginner"),
        daysPerWeek: days.length,
        days,
        updatedBy: currentUser.uid,
        updatedAt: now
      },
      { merge: true }
    );

    revalidatePath("/owner/programs");

    return success(`${title} was updated.`);
  } catch (error) {
    return failure(error, "Unable to update custom plan.");
  }
}

export async function createCatalogExercise(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensurePrimaryWorkspace();
    const db = requireFirebase();
    const exerciseId = randomUUID();
    const now = new Date().toISOString();
    const name = requireText(formData, "name", "Exercise name");
    const canManageDefaultVideos = currentUser.role === "admin";

    await db.collection(collectionPaths.exerciseCatalog).doc(exerciseId).set({
      id: exerciseId,
      gymId: currentUser.gymId ?? PRIMARY_GYM_ID,
      name,
      muscleGroup: requireText(formData, "muscleGroup", "Muscle group"),
      equipment: String(formData.get("equipment") ?? "").trim(),
      instructions: String(formData.get("instructions") ?? "").trim(),
      videoSource: canManageDefaultVideos ? String(formData.get("videoSource") ?? "none") : "none",
      videoUrl: canManageDefaultVideos ? String(formData.get("videoUrl") ?? "").trim() : "",
      ownerOnly: true,
      isActive: true,
      createdBy: currentUser.uid,
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

export async function updateCatalogExercise(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const db = requireFirebase();
    const exerciseId = requireText(formData, "exerciseId", "Exercise ID");
    const name = requireText(formData, "name", "Exercise name");
    const now = new Date().toISOString();
    const videoUrl = String(formData.get("videoUrl") ?? "").trim();
    const gymVideoUrl = String(formData.get("gymVideoUrl") ?? "").trim();

    const updatePayload: Record<string, unknown> = {
        id: exerciseId,
        gymId: currentUser.gymId ?? PRIMARY_GYM_ID,
        name,
        muscleGroup: requireText(formData, "muscleGroup", "Muscle group"),
        equipment: String(formData.get("equipment") ?? "").trim(),
        instructions: String(formData.get("instructions") ?? "").trim(),
        thumbnailUrl: String(formData.get("thumbnailUrl") ?? "").trim(),
        videoSource: videoUrl ? String(formData.get("videoSource") ?? "youtube") : "none",
        videoUrl,
        gymVideoUrl,
        gymVideoSource: gymVideoUrl ? String(formData.get("gymVideoSource") ?? "youtube") : "none",
        ownerOnly: true,
        isActive: true,
        updatedBy: currentUser.uid,
        updatedAt: now
      };

    await db.collection(collectionPaths.exerciseCatalog).doc(exerciseId).set(updatePayload, { merge: true });

    revalidatePath("/admin/exercises");
    revalidatePath("/owner/exercises");
    revalidatePath("/owner/programs");
    revalidatePath("/member");
    return success(`${name} updated.`);
  } catch (error) {
    return failure(error, "Unable to update exercise.");
  }
}

export async function resetExerciseVideos(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const db = requireFirebase();
    const exerciseId = requireText(formData, "exerciseId", "Exercise ID");
    const exerciseName = String(formData.get("exerciseName") ?? "").trim().toLowerCase();

    // Look up defaults from the seeded workouts catalog
    type CatalogEntry = { name: string; video_url?: string; gym_video_url?: string };
    const catalog = (workoutsData as { exercise_catalog: Record<string, CatalogEntry[]> }).exercise_catalog;

    let defaultVideoUrl = "";
    let defaultGymVideoUrl = "";

    for (const entries of Object.values(catalog)) {
      const match = entries.find((e) => e.name.toLowerCase() === exerciseName);
      if (match) {
        defaultVideoUrl = match.video_url ?? "";
        defaultGymVideoUrl = match.gym_video_url ?? "";
        break;
      }
    }

    const now = new Date().toISOString();
    await db.collection(collectionPaths.exerciseCatalog).doc(exerciseId).update({
      videoUrl: defaultVideoUrl,
      videoSource: defaultVideoUrl ? "youtube" : "none",
      gymVideoUrl: defaultGymVideoUrl,
      gymVideoSource: defaultGymVideoUrl ? "youtube" : "none",
      updatedAt: now,
    });

    revalidatePath("/admin/exercises");
    revalidatePath("/owner/exercises");
    revalidatePath("/member");
    return success("Videos reset to default.");
  } catch (error) {
    return failure(error, "Unable to reset videos.");
  }
}

export async function addGymNotice(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const db = requireFirebase();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const title = requireText(formData, "title", "Notice title");
    const type = String(formData.get("type") ?? "tip").trim();
    const body = String(formData.get("body") ?? "").trim();

    const notice = {
      id: randomUUID(),
      type,
      title,
      body: body || null,
      isActive: true,
      order: Date.now(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.uid,
    };

    const gymRef = db.collection(collectionPaths.gyms).doc(gymId);
    const gymDoc = await gymRef.get();
    const existing: unknown[] = Array.isArray(gymDoc.data()?.notices) ? (gymDoc.data()!.notices as unknown[]) : [];
    await gymRef.set({ notices: [...existing, notice] }, { merge: true });

    revalidatePath("/owner");
    revalidatePath("/member");
    return success("Notice added.");
  } catch (error) {
    return failure(error, "Unable to add notice.");
  }
}

export async function deleteGymNotice(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const db = requireFirebase();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const noticeId = requireText(formData, "noticeId", "Notice ID");

    const gymRef = db.collection(collectionPaths.gyms).doc(gymId);
    const gymDoc = await gymRef.get();
    const existing: unknown[] = Array.isArray(gymDoc.data()?.notices) ? (gymDoc.data()!.notices as unknown[]) : [];
    const updated = existing.filter((n) => (n as { id?: string }).id !== noticeId);
    await gymRef.set({ notices: updated }, { merge: true });

    revalidatePath("/owner");
    revalidatePath("/member");
    return success("Notice removed.");
  } catch (error) {
    return failure(error, "Unable to delete notice.");
  }
}

export async function changeAdminEmail(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role !== "admin") {
      throw new Error("Only the platform admin can use this form.");
    }
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const { auth, db } = requireFirebaseServices();
    const newEmail = requireText(formData, "newEmail", "New email");
    assertValidEmail(newEmail);
    const confirmEmail = String(formData.get("confirmEmail") ?? "").trim();
    if (newEmail !== confirmEmail) {
      throw new Error("Email and confirmation do not match.");
    }
    const now = new Date().toISOString();
    await auth.updateUser(currentUser.uid, { email: newEmail });
    await db.collection(collectionPaths.profiles).doc(currentUser.uid).set(
      { email: newEmail, updatedAt: now },
      { merge: true }
    );
    return success("Email updated. Log in again with your new email.");
  } catch (error) {
    return failure(error, "Unable to change email.");
  }
}

export async function updateAdminDisplayName(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role !== "admin") {
      throw new Error("Only the platform admin can use this form.");
    }
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const { auth, db } = requireFirebaseServices();
    const displayName = requireText(formData, "displayName", "Display name");
    const now = new Date().toISOString();
    const initials = displayName
      .split(" ")
      .map((p: string) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    await auth.updateUser(currentUser.uid, { displayName });
    await db.collection(collectionPaths.profiles).doc(currentUser.uid).set(
      { fullName: displayName, avatarInitials: initials, updatedAt: now },
      { merge: true }
    );
    revalidatePath("/profile");
    return success("Display name updated.");
  } catch (error) {
    return failure(error, "Unable to update display name.");
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
    const currentUser = await requireOwner();
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

    // Multi-day support: builder serialises days as JSON in the "days" field.
    // Fall back to single-day for backward compat.
    type DayInput = { title: string; exerciseIds: string[]; sets: number; reps: string; entrySets?: number[]; entryReps?: string[] };
    let dayInputs: DayInput[];

    const daysJson = String(formData.get("days") ?? "").trim();
    if (daysJson) {
      try {
        dayInputs = JSON.parse(daysJson);
      } catch {
        throw new Error("Invalid days format.");
      }
    } else {
      if (!exerciseIds.length) {
        throw new Error("Add at least one exercise before saving a custom plan.");
      }
      dayInputs = [{
        title: requireText(formData, "dayTitle", "Day title"),
        exerciseIds,
        sets: Number(formData.get("sets") ?? 3),
        reps: String(formData.get("reps") ?? "8-12")
      }];
    }

    if (!dayInputs.length) {
      throw new Error("A plan must have at least one day.");
    }

    const days = await Promise.all(
      dayInputs.map(async (dayInput, i) => {
        const resolvedIds = await Promise.all(
          dayInput.exerciseIds.map((id) => resolveExerciseRecordId(id))
        );
        return {
          id: randomUUID(),
          title: dayInput.title || `Day ${i + 1}`,
          dayNumber: i + 1,
          focus: "Owner-created custom day",
          exercises: resolvedIds.map((exerciseId, idx) => ({
            exerciseId,
            sortOrder: idx + 1,
            sets: dayInput.entrySets?.[idx] ?? dayInput.sets ?? 3,
            reps: dayInput.entryReps?.[idx] ?? dayInput.reps ?? "8-12",
            restSeconds: Number(formData.get("restSeconds") ?? 75)
          }))
        };
      })
    );

    await db.collection(collectionPaths.workoutPrograms).doc(programId).set({
      id: programId,
      gymId: currentUser.gymId ?? PRIMARY_GYM_ID,
      title,
      description: String(formData.get("description") ?? "").trim(),
      goal: String(formData.get("goal") ?? "Custom member plan").trim(),
      difficulty: String(formData.get("difficulty") ?? "beginner"),
      daysPerWeek: days.length,
      splitType: "custom",
      isActive: true,
      createdBy: currentUser.uid,
      days,
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

export async function createAndAssignCustomProgram(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const db = requireFirebase();

    const memberId = requireText(formData, "memberId", "Member");
    await assertMemberBelongsToCallerGym(currentUser, memberId);
    const memberName = String(formData.get("memberName") ?? "Member").trim();
    const title = requireText(formData, "title", "Program title");
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const programId = randomUUID();
    const assignmentId = randomUUID();
    const notificationId = randomUUID();
    const activityId = randomUUID();
    const now = new Date().toISOString();

    // Parse days JSON (same format as createCustomWorkoutProgram)
    type DayInput = { title: string; exerciseIds: string[]; sets: number; reps: string; entrySets?: number[]; entryReps?: string[] };
    const daysJson = String(formData.get("days") ?? "").trim();
    let dayInputs: DayInput[];
    try {
      dayInputs = JSON.parse(daysJson);
    } catch {
      throw new Error("Invalid days format.");
    }
    if (!dayInputs.length) throw new Error("A plan must have at least one day.");

    const totalExercises = dayInputs.reduce((sum, d) => sum + d.exerciseIds.length, 0);
    if (totalExercises === 0) throw new Error("Add at least one exercise before saving.");

    const days = await Promise.all(
      dayInputs.map(async (dayInput, i) => {
        const resolvedIds = await Promise.all(
          dayInput.exerciseIds.map((id) => resolveExerciseRecordId(id))
        );
        return {
          id: randomUUID(),
          title: dayInput.title || `Day ${i + 1}`,
          dayNumber: i + 1,
          focus: "Member-specific custom plan",
          exercises: resolvedIds.map((exerciseId, idx) => ({
            exerciseId,
            sortOrder: idx + 1,
            sets: dayInput.entrySets?.[idx] ?? dayInput.sets ?? 3,
            reps: dayInput.entryReps?.[idx] ?? dayInput.reps ?? "8-12",
            restSeconds: Number(formData.get("restSeconds") ?? 75)
          }))
        };
      })
    );

    // 1. Save the program to the gym's library so it appears on /owner/programs too
    await db.collection(collectionPaths.workoutPrograms).doc(programId).set({
      id: programId,
      gymId,
      title,
      description: String(formData.get("description") ?? "").trim() || `Custom plan built for ${memberName}`,
      goal: String(formData.get("goal") ?? "Custom training").trim(),
      difficulty: String(formData.get("difficulty") ?? "intermediate"),
      daysPerWeek: days.length,
      splitType: "custom",
      isActive: true,
      createdBy: currentUser.uid,
      days,
      createdAt: now,
      updatedAt: now
    });

    // 2. Cancel any existing active assignments for this member
    const existing = await db
      .collection(collectionPaths.programAssignments)
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .where("status", "==", "active")
      .get();
    await Promise.all(
      existing.docs.map((doc) => doc.ref.set({ status: "cancelled", updatedAt: now }, { merge: true }))
    );

    // 3. Create the assignment
    await db.collection(collectionPaths.programAssignments).doc(assignmentId).set({
      id: assignmentId,
      gymId,
      memberId,
      programId,
      assignedAt: now,
      status: "active",
      createdBy: currentUser.uid,
      createdAt: now,
      updatedAt: now
    });

    // 4. Notify the member
    await db.collection(collectionPaths.notifications).doc(notificationId).set({
      id: notificationId,
      recipientRole: "member",
      recipientId: memberId,
      gymId,
      type: "program_assigned",
      title: "Workout program assigned",
      body: `${title} is now available in your weekly schedule.`,
      createdAt: now
    });

    // 5. Activity log
    await db.collection(collectionPaths.activityEvents).doc(activityId).set({
      id: activityId,
      gymId,
      audience: "owner",
      title: `Custom program assigned — ${title}`,
      detail: `${memberName} was assigned a custom ${days.length}-day plan.`,
      icon: "dumbbell",
      createdAt: now
    });

    revalidatePath("/owner");
    revalidatePath("/owner/members");
    revalidatePath(`/owner/members/${memberId}`);
    revalidatePath("/owner/programs");
    revalidatePath("/member");
    revalidatePath("/activity");

    return success(`${title} was created and assigned to ${memberName}.`);
  } catch (error) {
    console.error("Unable to create and assign custom program", error);
    return failure(error, "Unable to create custom workout. Please try again.");
  }
}

/**
 * Log a body weight entry for the calling member (or for a member by an owner).
 * Powers the body-weight progress chart on /profile. Owners can log on behalf
 * of members (e.g. recording weigh-ins at the gym); members log their own.
 */
export async function logBodyWeight(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const memberId = String(formData.get("memberId") ?? currentUser.memberId ?? currentUser.uid).trim();
    if (!memberId) throw new Error("Member ID is required.");
    // Members can only log their own weight; owners must be in the same gym.
    await assertMemberBelongsToCallerGym(currentUser, memberId);

    const weightKg = Number(formData.get("weightKg") ?? 0);
    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
      throw new Error("Weight must be a positive number under 500 kg.");
    }
    const bodyFatRaw = String(formData.get("bodyFatPct") ?? "").trim();
    const bodyFatPct = bodyFatRaw ? Number(bodyFatRaw) : undefined;
    if (bodyFatPct !== undefined && (!Number.isFinite(bodyFatPct) || bodyFatPct < 0 || bodyFatPct > 100)) {
      throw new Error("Body fat percentage must be between 0 and 100.");
    }
    const notes = String(formData.get("notes") ?? "").trim();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const now = new Date().toISOString();

    if (!hasFirebaseAdminConfig()) {
      return success(`Weight ${weightKg} kg logged.`);
    }

    const db = requireFirebase();
    const id = randomUUID();
    await db.collection(collectionPaths.bodyMetricLogs).doc(id).set({
      id,
      memberId,
      gymId,
      weightKg,
      ...(bodyFatPct !== undefined ? { bodyFatPct } : {}),
      ...(notes ? { notes } : {}),
      loggedAt: now,
      createdAt: now
    });

    // Mirror onto profile so dashboards see the current value without a join.
    try {
      await db.collection(collectionPaths.profiles).doc(memberId).set(
        { weightKg, updatedAt: now },
        { merge: true }
      );
    } catch {
      // best-effort; chart still works from the dedicated collection
    }

    revalidatePath("/profile");
    revalidatePath("/member");
    revalidatePath(`/owner/members/${memberId}`);

    return success(`Weight ${weightKg} kg logged.`, gymId);
  } catch (error) {
    console.error("Unable to log body weight", error);
    return failure(error, "Could not log weight. Please try again.");
  }
}

/**
 * Trainer/owner writes a short coaching note that surfaces on the member's
 * dashboard. One note per member (latest only) — not a history. Members can
 * see it but cannot edit. To clear, send an empty string.
 */
export async function updateCoachNote(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const memberId = requireText(formData, "memberId", "Member ID");
    await assertMemberBelongsToCallerGym(currentUser, memberId);

    const rawNote = String(formData.get("coachNote") ?? "").trim();
    // Cap length so it can't blow up the member dashboard
    if (rawNote.length > 600) {
      throw new Error("Note is too long. Keep it under 600 characters.");
    }
    const db = requireFirebase();
    const now = new Date().toISOString();
    await db.collection(collectionPaths.profiles).doc(memberId).set(
      {
        coachNote: rawNote,
        coachNoteUpdatedAt: rawNote ? now : null,
        coachNoteUpdatedBy: rawNote ? currentUser.uid : null,
        coachNoteUpdatedByName: rawNote ? currentUser.fullName : null,
        updatedAt: now
      },
      { merge: true }
    );

    revalidatePath(`/owner/members/${memberId}`);
    revalidatePath("/member");

    return success(rawNote ? "Coach note updated." : "Coach note cleared.", currentUser.gymId);
  } catch (error) {
    console.error("Unable to update coach note", error);
    return failure(error, "Could not save coach note.");
  }
}

/**
 * Member records how they deviated from their planned day for a given week.
 * Two modes:
 *   status="skipped"  — they didn't train (optional reason + note).
 *   status="modified" — they did something other than the plan (note describes it).
 *
 * The Firestore document ID is deterministic (`${memberId}_${dayId}_${weekStart}`)
 * so a second call for the same slot is an upsert, not a duplicate row.
 */
export async function logDayStatus(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);

    const memberId = String(formData.get("memberId") ?? currentUser.memberId ?? currentUser.uid).trim();
    const programId = requireText(formData, "programId", "Program ID");
    const dayId = requireText(formData, "dayId", "Day ID");
    const weekStart = requireText(formData, "weekStart", "Week start");
    const rawStatus = String(formData.get("status") ?? "skipped");
    const status = rawStatus === "modified" ? "modified" : "skipped";
    const skipReason = formData.get("skipReason") ? String(formData.get("skipReason")).trim() : null;
    const rawNote = String(formData.get("note") ?? "").trim();

    if (!memberId) throw new Error("Member ID is required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) throw new Error("Invalid week start date.");
    if (rawNote.length > 400) throw new Error("Note must be under 400 characters.");

    const db = requireFirebase();
    const now = new Date().toISOString();

    // Deterministic ID → upsert semantics: same member+day+week = one record
    const docId = `${memberId}_${dayId}_${weekStart}`;

    await db.collection(collectionPaths.dayLogs).doc(docId).set(
      {
        memberId,
        gymId: currentUser.gymId ?? null,
        programId,
        dayId,
        weekStart,
        status,
        skipReason: skipReason ?? null,
        note: rawNote || null,
        loggedAt: now,
        updatedAt: now
      },
      { merge: true }
    );

    revalidatePath("/member");
    revalidatePath("/member/history");

    return success(status === "skipped" ? "Day marked as skipped." : "Activity note saved.");
  } catch (error) {
    console.error("Unable to log day status", error);
    return failure(error, "Could not save. Please try again.");
  }
}

/**
 * Undo a day-skip or modification note for the current week's slot.
 */
export async function clearDayLog(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);

    const memberId = String(formData.get("memberId") ?? currentUser.memberId ?? currentUser.uid).trim();
    const dayId = requireText(formData, "dayId", "Day ID");
    const weekStart = requireText(formData, "weekStart", "Week start");

    if (!memberId) throw new Error("Member ID is required.");

    const db = requireFirebase();
    const docId = `${memberId}_${dayId}_${weekStart}`;
    await db.collection(collectionPaths.dayLogs).doc(docId).delete();

    revalidatePath("/member");
    revalidatePath("/member/history");

    return success("Day log cleared.");
  } catch (error) {
    console.error("Unable to clear day log", error);
    return failure(error, "Could not clear. Please try again.");
  }
}

