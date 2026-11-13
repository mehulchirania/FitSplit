import { cache } from "react";
import type { ProfileMetrics, UserProfile } from "@/types/domain";

import { collectionPaths } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { reportReadModelError } from "./shared";

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "FS"
  );
}

/** Maps a `users/{uid}` document (or an empty stand-in) to the UserProfile shape. */
function mapUserProfile(uid: string, data: Record<string, unknown>): UserProfile {
  const fullName = String(data.fullName ?? "FitSplit user");
  const target = data.macroNutritionTarget;
  return {
    id: uid,
    fullName,
    phone: data.phone ? String(data.phone) : undefined,
    joinedAt: String(data.joinedAt ?? data.createdAt ?? new Date().toISOString().slice(0, 10)),
    avatarInitials: String(data.avatarInitials ?? initialsOf(fullName)),
    avatarUrl: data.avatarUrl ? String(data.avatarUrl) : undefined,
    avatarPath: data.avatarPath ? String(data.avatarPath) : undefined,
    goal: String(data.goal ?? "General fitness"),
    isActive: data.isActive !== false,
    age: data.age ? Number(data.age) : undefined,
    heightCm: data.heightCm ? Number(data.heightCm) : undefined,
    weightKg: data.weightKg ? Number(data.weightKg) : undefined,
    gender: data.gender ? String(data.gender) : undefined,
    dob: data.dob ? String(data.dob) : undefined,
    fitnessGoals: data.fitnessGoals ? String(data.fitnessGoals) : data.goal ? String(data.goal) : undefined,
    medicalNotes: data.medicalNotes ? String(data.medicalNotes) : undefined,
    injuryNotes: data.injuryNotes ? String(data.injuryNotes) : undefined,
    macroNutritionTarget:
      target && typeof target === "object" ? (target as UserProfile["macroNutritionTarget"]) : undefined
  };
}

/**
 * Loads `users/{uid}`. When Firebase Admin isn't configured (local dev) it
 * returns a stand-in profile so the whole app still renders.
 */
export const getUserProfile = cache(async function getUserProfile(
  uid: string,
  fallbackName = "Athlete"
): Promise<{ user: UserProfile; profile: ProfileMetrics; isPersisted: boolean }> {
  const standIn = mapUserProfile(uid, { fullName: fallbackName });

  if (!hasFirebaseAdminConfig()) {
    return { user: standIn, profile: standIn, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const doc = await db.collection(collectionPaths.users).doc(uid).get();
    if (!doc.exists) {
      return { user: standIn, profile: standIn, isPersisted: false };
    }
    const user = mapUserProfile(uid, doc.data() ?? {});
    return { user, profile: user, isPersisted: true };
  } catch (error) {
    reportReadModelError("getUserProfile", error, { memberId: uid });
    return { user: standIn, profile: standIn, isPersisted: false };
  }
});
