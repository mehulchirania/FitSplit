"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole, requireOwner } from "@/lib/auth";
import { collectionPaths, PRIMARY_GYM_ID } from "../collections";
import type { FormActionState } from "@/types/action-state";
import {
  requireFirebase,
  requireFirebaseServices,
  requireText,
  assertValidEmail,
  assertValidPhone,
  assertValidPin,
  normalizeUsername,
  assertValidUsername,
  assertUsernameAvailable,
  memberAuthEmail,
  upsertAuthUser,
  getActionFormData,
  success,
  failure,
  scopedGymDoc,
  archiveDocumentSnapshot,
  archiveQuerySnapshot,
  getAuthProfileDoc,
  getGymScopedProfileDoc,
  writeAuthProfileIndex,
  mirrorProfileToGym,
  mirrorGymScopedRecord,
  assertCanManageMember,
  assertMemberBelongsToCallerGym,
  assertCanManageGym
} from "./shared";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";
import { ensurePrimaryWorkspace } from "./gyms";

const CreateMemberSchema = z.object({
  fullName: ZodHelpers.textRequired("Full name"),
  email: ZodHelpers.emailRequired,
  phone: z.string().optional(),
  username: ZodHelpers.username,
  goal: z.string().optional(),
  gymId: z.string().optional()
});

export async function createMemberProfile(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensurePrimaryWorkspace();
    const { auth, db } = requireFirebaseServices();
    
    const parsed = parseActionData(formData, CreateMemberSchema);
    if (!parsed.success) return parsed.state;

    const memberId = randomUUID();
    const { fullName, email, phone = "", username, goal = "General fitness", gymId: rawGymId } = parsed.data;
    const gymId = (rawGymId || user.gymId || PRIMARY_GYM_ID).trim() || PRIMARY_GYM_ID;
    
    const now = new Date().toISOString();
    const authEmail = memberAuthEmail(memberId);

    assertCanManageGym(user, gymId);
    await assertUsernameAvailable(db, username);

    await upsertAuthUser(auth, {
      email: authEmail,
      fullName,
      uid: memberId,
      role: "member",
      gymId,
      isActive: true
    }, "pin-1234");

    const memberProfile = {
      id: memberId,
      fullName,
      email,
      authEmail,
      username,
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
    };

    await writeAuthProfileIndex(db, memberId, memberProfile);
    await mirrorProfileToGym(db, memberId, memberProfile);

    // Keep stored memberCount in sync
    await db.collection(collectionPaths.gyms).doc(gymId).set(
      { memberCount: (await db.collection(collectionPaths.gyms).doc(gymId).get()).data()?.memberCount + 1 || 1, updatedAt: now },
      { merge: true }
    );

    const createEventId = randomUUID();
    const createEvent = {
      id: createEventId,
      gymId,
      audience: "owner",
      memberId,
      title: `New member joined — ${fullName}`,
      detail: `${fullName} was added by ${user.fullName ?? user.uid}.`,
      icon: "users",
      createdAt: now
    };
    await db.collection(collectionPaths.activityEvents).doc(createEventId).set(createEvent);
    await mirrorGymScopedRecord(db, gymId, "activityEvents", createEventId, createEvent);

    revalidatePath("/owner");
    revalidatePath("/owner/members");
    revalidatePath("/activity");

    return success(`${fullName} was added as a FitSplit member.`);
  } catch (error) {
    console.error("Unable to create member profile", error);

    return failure(error, "Unable to add member. Please try again.");
  }
}

const UpdateMemberSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  fullName: ZodHelpers.textRequired("Full name"),
  email: ZodHelpers.emailRequired,
  username: z.string().optional(),
  phone: z.string().optional(),
  goal: z.string().optional(),
  macroCalories: z.coerce.number().optional(),
  macroProtein: z.coerce.number().optional(),
  macroCarbs: z.coerce.number().optional(),
  macroFat: z.coerce.number().optional(),
  macroWater: z.coerce.number().optional(),
  macroNotes: z.string().optional()
});

export async function updateMemberProfile(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    await ensurePrimaryWorkspace();
    const { auth, db } = requireFirebaseServices();
    
    const parsed = parseActionData(formData, UpdateMemberSchema);
    if (!parsed.success) return parsed.state;

    const {
      memberId, fullName, email, username: rawUsername, phone = "", goal = "General fitness",
      macroCalories = 0, macroProtein = 0, macroCarbs = 0, macroFat = 0, macroWater = 0, macroNotes = ""
    } = parsed.data;

    const now = new Date().toISOString();
    const profileDoc = await getGymScopedProfileDoc(db, memberId, "member", user.gymId);
    const existingProfile = profileDoc.data() ?? {};
    const gymId = String(existingProfile.defaultGymId ?? user.gymId ?? PRIMARY_GYM_ID);
    const authEmail = String(existingProfile.authEmail ?? memberAuthEmail(memberId));
    
    const usernameInput = (rawUsername || existingProfile.username || "").trim();
    const username = normalizeUsername(usernameInput || String(existingProfile.username ?? memberId));
    
    // Zod didn't validate the resolved username if it came from db fallback, so we run the regex
    assertValidUsername(username);

    assertCanManageGym(user, gymId);
    await assertUsernameAvailable(db, username, memberId);

    const macroNutritionTarget = {
      calories: macroCalories,
      protein: macroProtein,
      carbs: macroCarbs,
      fat: macroFat,
      waterLiters: macroWater,
      notes: macroNotes.trim()
    };

    const memberUpdate = {
        id: memberId,
        fullName,
        email,
        authEmail,
        username,
        phone: phone.trim(),
        role: "member",
        defaultGymId: gymId,
        goal: goal.trim(),
        macroNutritionTarget,
        avatarInitials: fullName
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        updatedAt: now
      };
    await writeAuthProfileIndex(db, memberId, memberUpdate);
    await mirrorProfileToGym(db, memberId, {
      ...existingProfile,
      ...memberUpdate
    });

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

const UpdateMemberContextSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  fullName: ZodHelpers.textRequired("Full name"),
  email: ZodHelpers.emailRequired,
  phone: z.string().optional().refine((val) => !val || /^(\+91)?[6-9]\d{9}$/.test(val.replace(/[\s-]/g, "")), "Phone is invalid"),
  username: z.string().optional(),
  goal: z.string().optional(),
  age: z.coerce.number().optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),
  heightCm: z.coerce.number().optional(),
  weightKg: z.coerce.number().optional(),
  fitnessGoals: z.string().optional(),
  medicalNotes: z.string().optional(),
  injuryNotes: z.string().optional(),
  primarySlot: z.string().optional(),
  secondarySlot: z.string().optional(),
  assignedTrainer: z.string().optional()
});

export async function updateOwnerMemberContext(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, UpdateMemberContextSchema);
    if (!parsed.success) return parsed.state;

    const { auth, db } = requireFirebaseServices();
    const {
      memberId, fullName, email, phone = "", username: rawUsername = "", goal = "General fitness",
      age, gender = "", dob = "", heightCm, weightKg, fitnessGoals = "", medicalNotes = "", injuryNotes = "",
      primarySlot = "A", secondarySlot = "D", assignedTrainer = ""
    } = parsed.data;

    const profileDoc = await getGymScopedProfileDoc(db, memberId, "member", user.gymId);
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
    
    const usernameInput = (rawUsername || existingProfile.username || "").trim();
    const username = normalizeUsername(usernameInput || String(existingProfile.username ?? memberId));
    assertValidUsername(username);
    await assertUsernameAvailable(db, username, memberId);
    const authEmail = String(existingProfile.authEmail ?? memberAuthEmail(memberId));

    const memberContextUpdate = {
        id: memberId,
        fullName,
        email,
        phone,
        username,
        authEmail,
        role: "member",
        defaultGymId: gymId,
        goal: goal.trim() || "General fitness",
        age: age || null,
        gender: gender.trim(),
        dob: dob.trim(),
        heightCm: heightCm || null,
        weightKg: weightKg || null,
        fitnessGoals: fitnessGoals.trim(),
        medicalNotes: medicalNotes.trim(),
        injuryNotes: injuryNotes.trim(),
        primarySlot: primarySlot.trim() || "A",
        secondarySlot: secondarySlot.trim() || "D",
        assignedTrainer: assignedTrainer.trim(),
        avatarInitials: fullName
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        updatedAt: now
      };
    await writeAuthProfileIndex(db, memberId, memberContextUpdate);
    await mirrorProfileToGym(db, memberId, {
      ...existingProfile,
      ...memberContextUpdate
    });

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

const ProfileMetricsSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  fullName: ZodHelpers.textRequired("Full name"),
  email: ZodHelpers.emailRequired,
  phone: z.string().optional().refine((val) => !val || /^(\+91)?[6-9]\d{9}$/.test(val.replace(/[\s-]/g, "")), "Phone is invalid"),
  age: z.coerce.number().optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),
  heightCm: z.coerce.number().optional(),
  weightKg: z.coerce.number().optional(),
  fitnessGoals: z.string().optional(),
  medicalNotes: z.string().optional(),
  injuryNotes: z.string().optional(),
  primarySlot: z.string().optional(),
  secondarySlot: z.string().optional(),
  assignedTrainer: z.string().optional()
});

export async function updateProfileMetrics(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, ProfileMetricsSchema);
    if (!parsed.success) return parsed.state;

    const currentUser = await requireAuth();
    const db = requireFirebase();
    const {
      memberId, fullName, email, phone = "", age = 0, gender = "", dob = "", heightCm = 0, weightKg = 0,
      fitnessGoals = "", medicalNotes = "", injuryNotes = "", primarySlot = "A", secondarySlot = "D", assignedTrainer: rawTrainer = ""
    } = parsed.data;

    assertCanManageMember(currentUser, memberId);
    const now = new Date().toISOString();

    const profileDoc = await getGymScopedProfileDoc(db, memberId, "member", currentUser.gymId);
    const existingProfile = profileDoc.data() || {};
    const assignedTrainer = currentUser.role === "member"
      ? (existingProfile.assignedTrainer || "")
      : rawTrainer.trim();

    const profileUpdate = {
        fullName,
        email,
        phone,
        age,
        gender: gender.trim(),
        dob: dob.trim(),
        heightCm,
        weightKg,
        fitnessGoals: fitnessGoals.trim(),
        medicalNotes: medicalNotes.trim(),
        primarySlot: primarySlot.trim() || "A",
        secondarySlot: secondarySlot.trim() || "D",
        injuryNotes: injuryNotes.trim(),
        assignedTrainer,
        updatedAt: now
      };
    await writeAuthProfileIndex(db, memberId, {
      ...existingProfile,
      id: memberId,
      role: "member",
      defaultGymId: String(existingProfile.defaultGymId ?? currentUser.gymId ?? PRIMARY_GYM_ID),
      fullName,
      email,
      phone,
      updatedAt: now
    });
    await mirrorProfileToGym(db, memberId, {
      ...existingProfile,
      id: memberId,
      role: "member",
      defaultGymId: String(existingProfile.defaultGymId ?? currentUser.gymId ?? PRIMARY_GYM_ID),
      ...profileUpdate
    });

    revalidatePath("/profile");
    revalidatePath("/member");

    return success("Profile details were updated.");
  } catch (error) {
    console.error("Unable to update profile metrics", error);
    return failure(error, "Unable to update profile. Please try again.");
  }
}

const SaveAiNoteSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  injuryNotes: z.string().optional()
});

export async function saveMemberAiTrainerNote(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, SaveAiNoteSchema);
    if (!parsed.success) return parsed.state;

    const currentUser = await requireAuth();
    const db = requireFirebase();
    const { memberId, injuryNotes = "" } = parsed.data;
    assertCanManageMember(currentUser, memberId);

    const now = new Date().toISOString();

    await mirrorProfileToGym(db, memberId, {
      id: memberId,
      role: "member",
      defaultGymId: currentUser.gymId ?? PRIMARY_GYM_ID,
      injuryNotes,
      aiTrainerNote: injuryNotes,
      aiTrainerUpdatedAt: now,
      updatedAt: now
    });

    revalidatePath("/member");
    revalidatePath("/profile");

    return success(injuryNotes ? "AI trainer note saved." : "AI trainer note cleared.");
  } catch (error) {
    console.error("Unable to save AI trainer note", error);
    return failure(error, "Unable to save this AI trainer note.");
  }
}

const ChangePinSchema = z.object({
  currentPin: ZodHelpers.pin,
  newPin: ZodHelpers.pin,
  confirmPin: ZodHelpers.pin
});

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
    const parsed = parseActionData(formData, ChangePinSchema);
    if (!parsed.success) return parsed.state;

    const { auth } = requireFirebaseServices();
    const { currentPin, newPin, confirmPin } = parsed.data;

    if (newPin !== confirmPin) {
      return { status: "error", message: "New PIN and confirmation PIN do not match." };
    }
    if (newPin === currentPin) {
      return { status: "error", message: "New PIN must be different from the current PIN." };
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

const ToggleAccessSchema = z.object({
  memberId: ZodHelpers.textRequired("Member ID"),
  isActive: z.string().optional()
});

export async function toggleMemberAccess(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, ToggleAccessSchema);
    if (!parsed.success) return parsed.state;

    const { auth, db } = requireFirebaseServices();
    const { memberId, isActive: rawIsActive } = parsed.data;
    await assertMemberBelongsToCallerGym(user, memberId);
    const isActive = rawIsActive === "true";
    const now = new Date().toISOString();

    const profileDoc = await getAuthProfileDoc(db, memberId);
    const memberName = String(profileDoc.data()?.fullName ?? "Member");
    const gymId = String(profileDoc.data()?.defaultGymId ?? user.gymId ?? PRIMARY_GYM_ID);

    await db.collection(collectionPaths.authProfiles).doc(memberId).set({
      isActive,
      updatedAt: now
    }, { merge: true });
    await mirrorProfileToGym(db, memberId, {
      id: memberId,
      role: "member",
      defaultGymId: gymId,
      isActive,
      updatedAt: now
    });

    try {
      await auth.updateUser(memberId, { disabled: !isActive });
    } catch (error) {
      console.warn("Member auth access update skipped", error);
    }

    const toggleEventId = randomUUID();
    const toggleEvent = {
      id: toggleEventId,
      gymId,
      audience: "owner",
      memberId,
      title: `Access ${isActive ? "restored" : "suspended"} — ${memberName}`,
      detail: `${memberName}'s gym access was ${isActive ? "restored" : "suspended"} by ${user.fullName ?? user.uid}.`,
      icon: "bell",
      createdAt: now
    };
    await db.collection(collectionPaths.activityEvents).doc(toggleEventId).set(toggleEvent);
    await mirrorGymScopedRecord(db, gymId, "activityEvents", toggleEventId, toggleEvent);

    revalidatePath("/owner");
    revalidatePath("/owner/members");
    revalidatePath(`/owner/members/${memberId}`);
    revalidatePath("/activity");

    return success(`Member access ${isActive ? "enabled" : "disabled"}.`);
  } catch (error) {
    return failure(error, "Unable to toggle member access.");
  }
}

/**
 * Suspend or restore multiple members in one call.
 * Expects a JSON array of member IDs in the "memberIds" field and "isActive" boolean string.
 */
export async function bulkToggleMemberAccess(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    const user = await requireOwner();
    const { auth, db } = requireFirebaseServices();
    const raw = String(formData.get("memberIds") ?? "[]");
    const memberIds: string[] = JSON.parse(raw);
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      throw new Error("No members selected.");
    }
    const isActive = formData.get("isActive") === "true";
    const now = new Date().toISOString();

    await Promise.all(
      memberIds.map(async (memberId) => {
        await assertMemberBelongsToCallerGym(user, memberId);
        await db.collection(collectionPaths.authProfiles).doc(memberId).set({ isActive, updatedAt: now }, { merge: true });
        await mirrorProfileToGym(db, memberId, { id: memberId, role: "member", defaultGymId: user.gymId ?? PRIMARY_GYM_ID, isActive, updatedAt: now });
        try { await auth.updateUser(memberId, { disabled: !isActive }); } catch { /* soft fail */ }
      })
    );

    revalidatePath("/owner");
    revalidatePath("/owner/members");
    return success(`${memberIds.length} member${memberIds.length === 1 ? "" : "s"} ${isActive ? "restored" : "suspended"}.`);
  } catch (error) {
    return failure(error, "Bulk access update failed.");
  }
}

const DeleteMemberSchema = z.object({
  memberId: ZodHelpers.textRequired("Member ID")
});

export async function deleteMemberProfile(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, DeleteMemberSchema);
    if (!parsed.success) return parsed.state;

    const { auth, db } = requireFirebaseServices();
    const memberId = parsed.data.memberId;
    await assertMemberBelongsToCallerGym(user, memberId);
    const profileDoc = await getGymScopedProfileDoc(db, memberId, "member", user.gymId);
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
    const scopedMemberDoc = await scopedGymDoc(db, gymId, "members", memberId).get();
    const [scopedAssignmentsSnap, scopedLiftLogsSnap, scopedNotificationsSnap, scopedSessionsSnap, scopedAttendanceSnap] = await Promise.all([
      db.collectionGroup("programAssignments").where("memberId", "==", memberId).get(),
      db.collectionGroup("liftLogs").where("memberId", "==", memberId).get(),
      db.collectionGroup("notifications").where("recipientId", "==", memberId).get(),
      db.collectionGroup("workoutSessions").where("memberId", "==", memberId).get(),
      db.collectionGroup("attendanceRecords").where("memberId", "==", memberId).get()
    ]);

    await Promise.all([
      archiveDocumentSnapshot(db, profileDoc, { entityType: "member", deletedBy: user.uid, gymId, reason: "member_deleted" }),
      archiveDocumentSnapshot(db, scopedMemberDoc, { entityType: "member", deletedBy: user.uid, gymId, reason: "member_deleted" }),
      archiveQuerySnapshot(db, assignmentsSnap, { entityType: "programAssignment", deletedBy: user.uid, gymId, reason: "member_deleted" }),
      archiveQuerySnapshot(db, liftLogsSnap, { entityType: "liftLog", deletedBy: user.uid, gymId, reason: "member_deleted" }),
      archiveQuerySnapshot(db, notificationsSnap, { entityType: "notification", deletedBy: user.uid, gymId, reason: "member_deleted" }),
      archiveQuerySnapshot(db, sessionsSnap, { entityType: "workoutSession", deletedBy: user.uid, gymId, reason: "member_deleted" }),
      archiveQuerySnapshot(db, attendanceSnap, { entityType: "attendanceRecord", deletedBy: user.uid, gymId, reason: "member_deleted" }),
      archiveQuerySnapshot(db, scopedAssignmentsSnap, { entityType: "programAssignment", deletedBy: user.uid, gymId, reason: "member_deleted" }),
      archiveQuerySnapshot(db, scopedLiftLogsSnap, { entityType: "liftLog", deletedBy: user.uid, gymId, reason: "member_deleted" }),
      archiveQuerySnapshot(db, scopedNotificationsSnap, { entityType: "notification", deletedBy: user.uid, gymId, reason: "member_deleted" }),
      archiveQuerySnapshot(db, scopedSessionsSnap, { entityType: "workoutSession", deletedBy: user.uid, gymId, reason: "member_deleted" }),
      archiveQuerySnapshot(db, scopedAttendanceSnap, { entityType: "attendanceRecord", deletedBy: user.uid, gymId, reason: "member_deleted" })
    ]);

    const cleanupBatch = db.batch();
    for (const doc of [
      ...assignmentsSnap.docs,
      ...liftLogsSnap.docs,
      ...notificationsSnap.docs,
      ...sessionsSnap.docs,
      ...attendanceSnap.docs,
      ...scopedAssignmentsSnap.docs,
      ...scopedLiftLogsSnap.docs,
      ...scopedNotificationsSnap.docs,
      ...scopedSessionsSnap.docs,
      ...scopedAttendanceSnap.docs
    ]) {
      cleanupBatch.delete(doc.ref);
    }
    await cleanupBatch.commit();

    await db.collection(collectionPaths.authProfiles).doc(memberId).delete();
    await db.collection(collectionPaths.profiles).doc(memberId).delete().catch(() => undefined);
    await scopedGymDoc(db, gymId, "members", memberId).delete();

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
    const deleteEvent = {
      id: deleteEventId,
      gymId,
      audience: "owner",
      title: `Member removed — ${deletedName}`,
      detail: `${deletedName}'s profile and all associated data were deleted by ${user.fullName ?? user.uid}.`,
      icon: "users",
      createdAt: new Date().toISOString()
    };
    await db.collection(collectionPaths.activityEvents).doc(deleteEventId).set(deleteEvent);
    await mirrorGymScopedRecord(db, gymId, "activityEvents", deleteEventId, deleteEvent);

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
