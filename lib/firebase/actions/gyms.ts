"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { requireRole, requireOwner } from "@/lib/auth";
import { collectionPaths, PRIMARY_GYM_ID, PRIMARY_OWNER_ID } from "../collections";
import { getFirebaseAdminServices } from "../admin";
import type { FormActionState } from "@/types/action-state";
import {
  requireFirebase,
  requireFirebaseServices,
  getActionFormData,
  success,
  failure,
  normalizeGymStatusInput,
  parsePngDataUrl,
  slugifyGymName,
  scopedGymDoc,
  archiveDocumentSnapshot,
  archiveQuerySnapshot,
  archiveAndDeleteGymSubcollections,
  writeAuthProfileIndex,
  mirrorProfileToGym,
  upsertAuthUser
} from "./shared";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";

const CreateGymSchema = z.object({
  name: ZodHelpers.textRequired("Gym name"),
  slug: z.string().optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  locationUrl: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional()
});

const UpdateGymSchema = z.object({
  gymId: ZodHelpers.textRequired("Gym ID"),
  name: ZodHelpers.textRequired("Gym name"),
  location: z.string().optional(),
  locationUrl: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  youtube: z.string().optional()
});

const GymIdSchema = z.object({
  gymId: ZodHelpers.textRequired("Gym ID")
});

const UpdateGymLogoSchema = z.object({
  gymId: ZodHelpers.textRequired("Gym ID"),
  logoDataUrl: ZodHelpers.textRequired("Logo preview")
});

const SetGymStatusSchema = z.object({
  gymId: ZodHelpers.textRequired("Gym ID"),
  status: z.string().optional()
});

const AddGymNoticeSchema = z.object({
  title: ZodHelpers.textRequired("Notice title"),
  type: z.string().optional(),
  body: z.string().optional()
});

const DeleteGymNoticeSchema = z.object({
  noticeId: ZodHelpers.textRequired("Notice ID")
});

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

  const ownerProfile = {
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
  };
  await writeAuthProfileIndex(db, PRIMARY_OWNER_ID, ownerProfile);
  await mirrorProfileToGym(db, PRIMARY_OWNER_ID, ownerProfile);

  for (const member of demoMembers) {
    const memberProfile = {
      ...member,
      authEmail: member.email.toLowerCase(),
      role: "member",
      defaultGymId: PRIMARY_GYM_ID,
      isActive: true,
      joinedAt: now.slice(0, 10),
      updatedAt: now
    };
    await writeAuthProfileIndex(db, member.id, memberProfile);
    await mirrorProfileToGym(db, member.id, memberProfile);
  }

  for (const trainer of demoTrainers) {
    const trainerProfile = {
      ...trainer,
      authEmail: trainer.email.toLowerCase(),
      role: "owner",
      staffType: "trainer",
      defaultGymId: PRIMARY_GYM_ID,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    await writeAuthProfileIndex(db, trainer.id, trainerProfile);
    await mirrorProfileToGym(db, trainer.id, trainerProfile);
  }

  await writeAuthProfileIndex(db, "admin-fitsplit", {
    id: "admin-fitsplit",
    fullName: "Admin",
    email: "admin@fitsplit.app",
    authEmail: "admin@fitsplit.app",
    username: "admin",
    role: "admin",
    defaultGymId: PRIMARY_GYM_ID,
    isActive: true,
    updatedAt: now
  });

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

export async function createGymWorkspace(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, CreateGymSchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const { name, slug: requestedSlug = "", status: rawStatus, location = "", locationUrl = "", phone = "", email = "" } = parsed.data;
    const slug = slugifyGymName(requestedSlug || name);
    const trimmedLocationUrl = locationUrl.trim();

    if (!slug) {
      throw new Error("Gym slug is invalid.");
    }
    if (trimmedLocationUrl) {
      try {
        new URL(trimmedLocationUrl);
      } catch {
        throw new Error("Location URL must be a valid URL.");
      }
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
      status: normalizeGymStatusInput(rawStatus ?? null),
      location: location.trim(),
      locationUrl: trimmedLocationUrl || null,
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      instagram: "",
      linkedin: "",
      youtube: "",
      createdAt: now,
      updatedAt: now
    });

    return success(`${name} was added.`, slug, ["gyms"]);
  } catch (error) {
    return failure(error, "Unable to create gym.");
  }
}

export async function deleteGymWorkspace(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, GymIdSchema);
    if (!parsed.success) return parsed.state;

    const { db } = requireFirebaseServices();
    const gymId = parsed.data.gymId;

    if (gymId === PRIMARY_GYM_ID) {
      throw new Error("This gym is protected and cannot be deleted.");
    }

    const assignedProfiles = await db
      .collection(collectionPaths.authProfiles)
      .where("defaultGymId", "==", gymId)
      .limit(1)
      .get();

    if (!assignedProfiles.empty) {
      throw new Error("Remove or reassign gym staff and members before deleting this gym.");
    }

    const gymDoc = await db.collection(collectionPaths.gyms).doc(gymId).get();
    await archiveDocumentSnapshot(db, gymDoc, { entityType: "gym", deletedBy: user.uid, gymId, reason: "gym_deleted" });
    await archiveAndDeleteGymSubcollections(db, gymId, user.uid, "gym_deleted");
    await db.collection(collectionPaths.gyms).doc(gymId).delete();

  } catch (error) {
    return failure(error, "Unable to remove gym.");
  }
  redirect("/admin/gyms");
}

export async function deleteGymWithMembers(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, GymIdSchema);
    if (!parsed.success) return parsed.state;

    const { auth, db } = requireFirebaseServices();
    const gymId = parsed.data.gymId;

    if (gymId === PRIMARY_GYM_ID) {
      throw new Error("This gym is protected and cannot be deleted.");
    }

    // Fetch all profiles assigned to this gym
    const profilesSnap = await db
      .collection(collectionPaths.authProfiles)
      .where("defaultGymId", "==", gymId)
      .get();
    const gymDoc = await db.collection(collectionPaths.gyms).doc(gymId).get();

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
      await Promise.all([
        archiveQuerySnapshot(db, assignmentsSnap, { entityType: "programAssignment", deletedBy: user.uid, gymId, reason: "gym_deleted" }),
        archiveQuerySnapshot(db, liftLogsSnap, { entityType: "liftLog", deletedBy: user.uid, gymId, reason: "gym_deleted" }),
        archiveQuerySnapshot(db, notificationsSnap, { entityType: "notification", deletedBy: user.uid, gymId, reason: "gym_deleted" }),
        archiveQuerySnapshot(db, sessionsSnap, { entityType: "workoutSession", deletedBy: user.uid, gymId, reason: "gym_deleted" }),
        archiveQuerySnapshot(db, attendanceSnap, { entityType: "attendanceRecord", deletedBy: user.uid, gymId, reason: "gym_deleted" })
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

    await Promise.all([
      archiveDocumentSnapshot(db, gymDoc, { entityType: "gym", deletedBy: user.uid, gymId, reason: "gym_deleted" }),
      archiveQuerySnapshot(db, profilesSnap, { entityType: "profile", deletedBy: user.uid, gymId, reason: "gym_deleted" }),
      archiveQuerySnapshot(db, activitySnap, { entityType: "activityEvent", deletedBy: user.uid, gymId, reason: "gym_deleted" })
    ]);
    await archiveAndDeleteGymSubcollections(db, gymId, user.uid, "gym_deleted");

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

  } catch (error) {
    return failure(error, "Unable to delete gym.");
  }
  redirect("/admin/gyms");
}

export async function updateGymDetails(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, UpdateGymSchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const { gymId, name, location = "", locationUrl = "", phone = "", email = "", instagram = "", linkedin = "", youtube = "" } = parsed.data;

    // Owners can only update their own gym
    if (user.role === "owner" && user.gymId && gymId !== user.gymId) {
      return { status: "error", message: "Unauthorized: you can only update your own gym." };
    }

    // Validate locationUrl if provided
    const trimmedLocationUrl = locationUrl.trim();
    if (trimmedLocationUrl) {
      try { new URL(trimmedLocationUrl); } catch { throw new Error("Location URL must be a valid URL (e.g. https://maps.google.com/...)."); }
    }

    const updateData: Record<string, string | null> = {
      name,
      location: location.trim(),
      locationUrl: trimmedLocationUrl || null,
      phone: phone.trim(),
      email: email.trim(),
      instagram: instagram.trim(),
      linkedin: linkedin.trim(),
      youtube: youtube.trim(),
      updatedAt: new Date().toISOString()
    };

    await db.collection(collectionPaths.gyms).doc(gymId).update(updateData);

    return success("Gym details updated successfully.", gymId, ["gyms"]);
  } catch (error) {
    return failure(error, "Unable to update gym details.");
  }
}

export async function updateGymLogo(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, UpdateGymLogoSchema);
    if (!parsed.success) return parsed.state;

    const { db, storage } = requireFirebaseServices();
    const { gymId, logoDataUrl } = parsed.data;

    // Owners can only update their own gym's logo
    if (user.role === "owner" && user.gymId && gymId !== user.gymId) {
      return { status: "error", message: "Unauthorized: you can only update your own gym." };
    }
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

    return success("Gym logo updated.", gymId, ["gyms"]);
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
    const parsed = parseActionData(formData, SetGymStatusSchema);
    if (!parsed.success) return parsed.state;

    const { auth, db } = requireFirebaseServices();
    const { gymId, status: rawStatus } = parsed.data;
    const status = normalizeGymStatusInput(rawStatus ?? null);
    const isActive = status === "active";
    const now = new Date().toISOString();

    await db.collection(collectionPaths.gyms).doc(gymId).update({
      status,
      updatedAt: now
    });

    const profileSnapshot = await db
      .collection(collectionPaths.authProfiles)
      .where("defaultGymId", "==", gymId)
      .where("role", "in", ["owner", "trainer", "member"])
      .get();

    const batch = db.batch();

    for (const profileDoc of profileSnapshot.docs) {
      batch.update(profileDoc.ref, {
        isActive,
        updatedAt: now
      });
    }

    const [memberSnapshot, staffSnapshot] = await Promise.all([
      scopedGymDoc(db, gymId, "members", "_placeholder").parent.get(),
      scopedGymDoc(db, gymId, "staff", "_placeholder").parent.get()
    ]);

    for (const scopedDoc of [...memberSnapshot.docs, ...staffSnapshot.docs]) {
      batch.set(scopedDoc.ref, { isActive, updatedAt: now }, { merge: true });
    }

    await batch.commit();

    await Promise.all(
      profileSnapshot.docs.map(async (profileDoc) => {
        try {
          await auth.updateUser(profileDoc.id, { disabled: !isActive });
        } catch (error: unknown) {
          if ((error as { code?: string })?.code !== "auth/user-not-found") {
            throw error;
          }
        }
      })
    );

    return success(`Gym ${isActive ? "activated" : "deactivated"}. Staff and member access ${isActive ? "enabled" : "disabled"}.`, gymId, ["gyms"]);
  } catch (error) {
    return failure(error, "Unable to update gym status.");
  }
}

export async function addGymNotice(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, AddGymNoticeSchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const { title, type = "tip", body = "" } = parsed.data;

    const notice = {
      id: randomUUID(),
      type: type.trim(),
      title,
      body: body.trim() || null,
      isActive: true,
      order: Date.now(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.uid,
    };

    const gymRef = db.collection(collectionPaths.gyms).doc(gymId);
    const gymDoc = await gymRef.get();
    const existing: unknown[] = Array.isArray(gymDoc.data()?.notices) ? (gymDoc.data()!.notices as unknown[]) : [];
    await gymRef.set({ notices: [...existing, notice] }, { merge: true });

    return success("Notice added.", gymId, ["gyms"]);
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
    const parsed = parseActionData(formData, DeleteGymNoticeSchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const noticeId = parsed.data.noticeId;

    const gymRef = db.collection(collectionPaths.gyms).doc(gymId);
    const gymDoc = await gymRef.get();
    const existing: unknown[] = Array.isArray(gymDoc.data()?.notices) ? (gymDoc.data()!.notices as unknown[]) : [];
    const updated = existing.filter((n) => (n as { id?: string }).id !== noticeId);
    await gymRef.set({ notices: updated }, { merge: true });

    return success("Notice removed.", gymId, ["gyms"]);
  } catch (error) {
    return failure(error, "Unable to delete notice.");
  }
}
