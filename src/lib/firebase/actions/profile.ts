"use server";

import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth";
import { collectionPaths } from "../collections";
import type { FormActionState } from "@/types/action-state";
import { requireFirebase, requireFirebaseServices, getActionFormData, success, failure, parsePngDataUrl } from "./shared";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";

const ProfileSchema = z.object({
  fullName: ZodHelpers.textRequired("Full name"),
  age: z.coerce.number().min(0).max(120).optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),
  heightCm: z.coerce.number().min(0).max(300).optional(),
  weightKg: z.coerce.number().min(0).max(500).optional(),
  fitnessGoals: z.string().max(500).optional(),
  medicalNotes: z.string().max(1000).optional(),
  injuryNotes: z.string().max(1000).optional()
});

/**
 * Update the signed-in user's own profile (`users/{uid}`). Only the fields the
 * submitting form actually sent are written, so the small settings form and the
 * full profile form can share this action without clobbering each other.
 */
export async function updateProfileMetrics(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, ProfileSchema);
    if (!parsed.success) return parsed.state;

    const currentUser = await requireAuth();
    const db = requireFirebase();
    const data = parsed.data;
    const sent = (key: string) => formData.has(key);

    const update: Record<string, unknown> = {
      id: currentUser.uid,
      fullName: data.fullName,
      updatedAt: new Date().toISOString()
    };
    if (sent("age")) update.age = data.age ?? 0;
    if (sent("gender")) update.gender = (data.gender ?? "").trim();
    if (sent("dob")) update.dob = (data.dob ?? "").trim();
    if (sent("heightCm")) update.heightCm = data.heightCm ?? 0;
    if (sent("weightKg")) update.weightKg = data.weightKg ?? 0;
    if (sent("fitnessGoals")) {
      update.fitnessGoals = (data.fitnessGoals ?? "").trim();
      update.goal = (data.fitnessGoals ?? "").trim() || "General fitness";
    }
    if (sent("medicalNotes")) update.medicalNotes = (data.medicalNotes ?? "").trim();
    if (sent("injuryNotes")) update.injuryNotes = (data.injuryNotes ?? "").trim();

    await db.collection(collectionPaths.users).doc(currentUser.uid).set(update, { merge: true });

    return success("Profile details were updated.");
  } catch (error) {
    console.error("Unable to update profile", error);
    return failure(error, "Unable to update profile. Please try again.");
  }
}

const AvatarSchema = z.object({
  avatarDataUrl: ZodHelpers.textRequired("Avatar preview")
});

/** Uploads a cropped avatar (PNG data URL) and stores its download URL on the profile. */
export async function updateMemberAvatar(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, AvatarSchema);
    if (!parsed.success) return parsed.state;

    const currentUser = await requireAuth();
    const { db, storage } = requireFirebaseServices();

    const buffer = parsePngDataUrl(parsed.data.avatarDataUrl);
    const token = randomUUID();
    const avatarPath = `avatars/${currentUser.uid}.png`;
    const bucket = storage.bucket();

    await bucket.file(avatarPath).save(buffer, {
      contentType: "image/png",
      metadata: {
        cacheControl: "public, max-age=31536000",
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });

    const avatarUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(avatarPath)}?alt=media&token=${token}`;
    await db
      .collection(collectionPaths.users)
      .doc(currentUser.uid)
      .set({ avatarUrl, avatarPath, updatedAt: new Date().toISOString() }, { merge: true });

    return success("Profile photo updated.");
  } catch (error) {
    console.error("Unable to update avatar", error);
    return failure(error, "Unable to update profile photo. Please try again.");
  }
}
