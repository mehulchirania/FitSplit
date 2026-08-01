/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
"use server";

import { randomUUID } from "crypto";
import { requireAuth, requireRole, requireOwner } from "@/lib/auth";
import { collectionPaths, PRIMARY_GYM_ID } from "../collections";
import type { FormActionState } from "@/types/action-state";
import type { Role } from "@/types/domain";
import {
  requireFirebase,
  requireFirebaseServices,
  requireText,
  assertValidEmail,
  assertValidPin,
  memberAuthEmail,
  upsertAuthUser,
  getActionFormData,
  success,
  failure,
  scopedGymDoc,
  archiveDocumentSnapshot,
  getAuthProfileDoc,
  writeAuthProfileIndex,
  mirrorProfileToGym,
  mirrorGymScopedRecord,
  assertMemberBelongsToCallerGym,
  assertCanManageGym,
  parsePngDataUrl,
  patchUserClaims
} from "./shared";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";

const CreateStaffSchema = z.object({
  fullName: ZodHelpers.textRequired("Full name"),
  email: ZodHelpers.emailRequired,
  phone: ZodHelpers.textRequired("Phone number"),
  gymId: ZodHelpers.textRequired("Gym"),
  staffType: z.enum(["owner", "trainer", "staff"]).default("owner")
});

const ChangePasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string()
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"]
});

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
    const parsed = parseActionData(formData, ChangePasswordSchema);
    if (!parsed.success) return parsed.state;

    const { auth } = requireFirebaseServices();
    const newPassword = parsed.data.newPassword;

    await auth.updateUser(currentUser.uid, { password: newPassword });

    // Clear the "must change password on first login" flag, if it was set.
    // Wrapped in try/catch so an existing-staff password rotation doesn't fail
    // if the doc happens to be missing — the auth update is the source of truth.
    try {
      const { db } = requireFirebaseServices();
      await db.collection(collectionPaths.authProfiles).doc(currentUser.uid).set(
        { mustChangePassword: false, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      // Keep the persistent claim in sync for the user's NEXT login. Note this
      // does NOT fix the CURRENT session cookie — that's already baked with
      // mustChangePassword: true from login time and can't be rewritten without
      // forcing a re-login (which would be a jarring UX right after a password
      // change). requireRole's forceChange gate in src/lib/auth.ts self-heals for
      // the live session instead: it re-checks Firestore only in the rare case
      // where the claim still says true, so this request's redirect loop clears
      // immediately without logging the user out.
      await patchUserClaims(auth, currentUser.uid, { mustChangePassword: false });
    } catch (e) {
      console.warn("Could not clear mustChangePassword flag:", e);
    }

    return success("Password changed successfully.", undefined, ["staff"]);
  } catch (error) {
    console.error("Unable to change password", error);
    return failure(error, "Could not change password. Please try again.");
  }
}

export async function createOwnerProfile(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);

    const parsed = parseActionData(formData, CreateStaffSchema);
    if (!parsed.success) return parsed.state;

    const { auth, db } = requireFirebaseServices();
    const ownerId = randomUUID();
    const { fullName, email, gymId, staffType: normalizedStaffType } = parsed.data;
    const phone = parsed.data.phone;
    const now = new Date().toISOString();
    const authEmail = `${ownerId}@staff.fitsplit.app`;

    const authRole: Role = normalizedStaffType === "trainer" ? "trainer" : "owner";

    await upsertAuthUser(auth, {
      email: authEmail,
      fullName,
      uid: ownerId,
      role: authRole,
      gymId,
      isActive: true,
      staffType: normalizedStaffType,
      // Force first-login password change — matches staffProfile.mustChangePassword below.
      mustChangePassword: true
    });

    const staffProfile = {
      id: ownerId,
      fullName,
      email,
      phone,
      authEmail,
      username: phone,
      role: authRole,
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
    };

    await writeAuthProfileIndex(db, ownerId, staffProfile);
    await mirrorProfileToGym(db, ownerId, staffProfile);

    // Audit log: admin created a new staff account. Tracks who provisioned
    // gym access — useful for compliance and onboarding visibility.
    try {
      const auditId = randomUUID();
      const auditRecord = {
        id: auditId,
        gymId,
        audience: "owner",
        title: `Staff account created — ${normalizedStaffType}`,
        detail: `${fullName} (${phone}) was added to the gym with the default password. They will be forced to change it on first login.`,
        icon: "users",
        createdAt: now,
        targetId: ownerId
      };
      await mirrorGymScopedRecord(db, gymId, "activityEvents", auditId, auditRecord);
    } catch (e) {
      console.warn("Failed to write audit event for createOwnerProfile:", e);
    }

    return success(`${fullName} was added as gym ${normalizedStaffType}.`, gymId, ["staff"]);
  } catch (error) {
    return failure(error, "Unable to create gym staff profile.");
  }
}

const UpdateStaffSchema = z.object({
  userId: ZodHelpers.textRequired("User ID"),
  gymId: ZodHelpers.textRequired("Gym ID"),
  fullName: ZodHelpers.textRequired("Full name"),
  phone: ZodHelpers.textRequired("Phone"),
  staffType: z.enum(["owner", "trainer", "staff"]).default("owner")
});

export async function updateStaffProfile(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, UpdateStaffSchema);
    if (!parsed.success) return parsed.state;

    const { userId, gymId, fullName, phone, staffType } = parsed.data;
    const { db } = requireFirebaseServices();
    const now = new Date().toISOString();

    const avatarInitials = fullName
      .split(/\s+/)
      .map((p: string) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const updates = { fullName, phone, username: phone, staffType, avatarInitials, updatedAt: now };

    await Promise.all([
      db.collection(collectionPaths.authProfiles).doc(userId).set(updates, { merge: true }),
      scopedGymDoc(db, gymId, "staff", userId).set(updates, { merge: true }),
    ]);

    return success(`${fullName} was updated.`, gymId, ["staff"]);
  } catch (error) {
    return failure(error, "Unable to update staff profile.");
  }
}

const UpdateStaffImageSchema = z.object({
  userId: ZodHelpers.textRequired("User ID"),
  gymId: ZodHelpers.textRequired("Gym ID"),
  imageDataUrl: ZodHelpers.textRequired("Image preview")
});

/**
 * Uploads a cropped staff image (PNG data URL) to Firebase Storage and persists
 * the public download URL on the staff profile (auth index + gym scoped staff
 * doc). Staff can update their own image; owners/admins can update any staff in
 * their gym. Mirrors the gym-logo / member-avatar upload pattern.
 */
export async function updateStaffImage(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, UpdateStaffImageSchema);
    if (!parsed.success) return parsed.state;

    const currentUser = await requireAuth();
    const { userId, gymId, imageDataUrl } = parsed.data;

    // Self-update is always allowed for one's own record. Updating another
    // staff member requires owner/admin rights over that gym.
    if (currentUser.uid !== userId) {
      assertCanManageGym(currentUser, gymId);
    }

    const { db, storage } = requireFirebaseServices();
    const buffer = parsePngDataUrl(imageDataUrl);
    const now = new Date().toISOString();
    const token = randomUUID();
    const imagePath = `staff-images/${gymId}/${userId}.png`;
    const bucket = storage.bucket();

    await bucket.file(imagePath).save(buffer, {
      contentType: "image/png",
      metadata: {
        cacheControl: "public, max-age=31536000",
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });

    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(imagePath)}?alt=media&token=${token}`;
    const updates = { imageUrl, imagePath, updatedAt: now };

    await Promise.all([
      db.collection(collectionPaths.authProfiles).doc(userId).set(updates, { merge: true }),
      scopedGymDoc(db, gymId, "staff", userId).set(updates, { merge: true })
    ]);

    return success("Profile photo updated.", gymId, ["staff"]);
  } catch (error) {
    return failure(error, "Unable to update profile photo. Please try again.");
  }
}

const DeleteStaffSchema = z.object({
  userId: ZodHelpers.textRequired("User ID"),
  gymId: ZodHelpers.textRequired("Gym ID")
});

export async function deleteGymStaffProfile(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, DeleteStaffSchema);
    if (!parsed.success) return parsed.state;

    const { auth, db } = requireFirebaseServices();
    const { userId, gymId } = parsed.data;

    const profileDoc = await getAuthProfileDoc(db, userId);
    const scopedStaffDoc = await scopedGymDoc(db, gymId, "staff", userId).get();
    await Promise.all([
      archiveDocumentSnapshot(db, profileDoc, { entityType: "staffProfile", deletedBy: user.uid, gymId, reason: "staff_deleted" }),
      archiveDocumentSnapshot(db, scopedStaffDoc, { entityType: "staffProfile", deletedBy: user.uid, gymId, reason: "staff_deleted" })
    ]);

    await db.collection(collectionPaths.authProfiles).doc(userId).delete();
    await db.collection(collectionPaths.profiles).doc(userId).delete().catch(() => undefined);
    await scopedGymDoc(db, gymId, "staff", userId).delete();

    try {
      await auth.deleteUser(userId);
    } catch (error: unknown) {
      if ((error as any)?.code !== "auth/user-not-found") {
        throw error;
      }
    }

    return success("Gym staff access was deleted.", undefined, ["staff"]);
  } catch (error) {
    return failure(error, "Unable to delete gym staff.");
  }
}

const AdminEmailSchema = z.object({
  newEmail: ZodHelpers.emailRequired,
  confirmEmail: ZodHelpers.emailRequired
}).refine(d => d.newEmail === d.confirmEmail, {
  message: "Email and confirmation do not match.",
  path: ["confirmEmail"]
});

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
    const parsed = parseActionData(formData, AdminEmailSchema);
    if (!parsed.success) return parsed.state;

    const { auth, db } = requireFirebaseServices();
    const newEmail = parsed.data.newEmail;
    const now = new Date().toISOString();
    await auth.updateUser(currentUser.uid, { email: newEmail });
    await db.collection(collectionPaths.authProfiles).doc(currentUser.uid).set(
      { email: newEmail, updatedAt: now },
      { merge: true }
    );
    return success("Email updated. Log in again with your new email.", undefined, ["staff"]);
  } catch (error) {
    return failure(error, "Unable to change email.");
  }
}

const AdminDisplayNameSchema = z.object({
  displayName: ZodHelpers.textRequired("Display name")
});

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
    const parsed = parseActionData(formData, AdminDisplayNameSchema);
    if (!parsed.success) return parsed.state;

    const { auth, db } = requireFirebaseServices();
    const displayName = parsed.data.displayName;
    const now = new Date().toISOString();
    const initials = displayName
      .split(" ")
      .map((p: string) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    await auth.updateUser(currentUser.uid, { displayName });
    await db.collection(collectionPaths.authProfiles).doc(currentUser.uid).set(
      { fullName: displayName, avatarInitials: initials, updatedAt: now },
      { merge: true }
    );
    return success("Display name updated.", undefined, ["staff"]);
  } catch (error) {
    return failure(error, "Unable to update display name.");
  }
}

const ResetPasswordSchema = z.object({
  userId: ZodHelpers.textRequired("User ID"),
  newPassword: z.string().optional(),
  newPin: z.string().optional()
});

export async function resetPassword(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, ResetPasswordSchema);
    if (!parsed.success) return parsed.state;

    const { userId, newPassword: rawNewPassword = "", newPin = "" } = parsed.data;

    // Block owners from resetting members of other gyms. Admin bypasses inside the helper.
    await assertMemberBelongsToCallerGym(currentUser, userId);
    const { auth, db } = requireFirebaseServices();

    const rawPassword = rawNewPassword.trim() || newPin.trim() || "password";
    let newPassword = rawPassword;
    const isPinReset = Boolean(newPin);
    if (isPinReset) {
      assertValidPin(rawPassword);
      newPassword = `pin-${rawPassword}`;
    }

    const profileRef = db.collection(collectionPaths.authProfiles).doc(userId);
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
    } catch (error: unknown) {
      if (role !== "member" || (error as any)?.code !== "auth/email-already-exists") {
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
      await writeAuthProfileIndex(db, userId,
        {
          ...profile,
          authEmail,
          username,
          updatedAt: new Date().toISOString()
        },
      );
    }

    // Audit log: who reset whose access code, when. Helps if a member ever
    // disputes "someone changed my login".
    try {
      const auditId = randomUUID();
      const auditRecord = {
        id: auditId,
        gymId,
        audience: "owner",
        title: isPinReset ? "PIN reset" : "Password reset",
        detail: `${currentUser.fullName} reset ${role === "member" ? "the PIN" : "the password"} for ${fullName}.`,
        icon: "key",
        createdAt: new Date().toISOString(),
        actorId: currentUser.uid,
        targetId: userId
      };
      await mirrorGymScopedRecord(db, gymId, "activityEvents", auditId, auditRecord);
    } catch (e) {
      console.warn("Failed to write audit event for resetPassword:", e);
    }

    return success(isPinReset ? `PIN reset for ${username}.` : "Password reset successfully.", gymId, ["staff"]);
  } catch (error) {
    console.error("Unable to reset password", error);
    return failure(error, "Could not reset access code.");
  }
}
