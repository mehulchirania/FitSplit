"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, requireAuth } from "@/lib/auth";
import { collectionPaths, userCollectionPath, type UserCollectionKey } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import type { FormActionState } from "@/types/action-state";
import { failure } from "./shared";
import {
  getUserProfile,
  getBodyMetricLogsForMember,
  getLiftLogsForMember,
  getDayLogsForMember,
  getMacroLogsForMember,
  getActivityLogsForMember,
  getProgramAssignmentForMember
} from "../read-models";

export type DataExportResult =
  | { status: "success"; filename: string; data: Record<string, unknown> }
  | { status: "error"; message: string };

// Large caps so the export is complete rather than a recent-window default.
const ALL = 100000;

/**
 * Data portability: gather everything FitSplit holds about the signed-in user and
 * return it as a serializable object the client downloads as JSON. The uid always
 * comes from the session, so a user can only ever export their own data.
 */
export async function exportMyData(): Promise<DataExportResult> {
  try {
    const user = await requireAuth();
    const uid = user.uid;

    const [profileRes, bodyMetricLogs, liftLogs, dayLogs, macroLogs, activityLogs, assignment] = await Promise.all([
      getUserProfile(uid, user.fullName),
      getBodyMetricLogsForMember(uid, ALL),
      getLiftLogsForMember(uid, ALL),
      getDayLogsForMember(uid, ALL),
      getMacroLogsForMember(uid, ALL),
      getActivityLogsForMember(uid, ALL),
      getProgramAssignmentForMember(uid)
    ]);

    // Collections without a dedicated read-model are dumped as stored, so the export is complete.
    const rawCollections: Record<string, unknown[]> = {};
    if (hasFirebaseAdminConfig()) {
      const { db } = getFirebaseAdminServices();
      const userDoc = await db.collection(collectionPaths.users).doc(uid).get();
      const raw = userDoc.data() ?? {};
      rawCollections.consentRecord = [{ consent: raw.consent ?? null, termsAcceptedAt: raw.termsAcceptedAt ?? null }];
      const extra: UserCollectionKey[] = ["mealLogs", "workoutSessions", "exerciseSwaps"];
      await Promise.all(
        extra.map(async (key) => {
          const snap = await db.collection(userCollectionPath(uid, key)).get();
          rawCollections[key] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        })
      );
    }

    const data: Record<string, unknown> = {
      meta: {
        exportedAt: new Date().toISOString(),
        userId: uid,
        note: "This is a copy of the personal data FitSplit holds about you. See /privacy for details."
      },
      account: profileRes.user,
      bodyMetricLogs: bodyMetricLogs.logs,
      liftLogs: liftLogs.liftLogs,
      dayLogs: dayLogs.dayLogs,
      macroLogs: macroLogs.macroLogs,
      activityLogs: activityLogs.activityLogs,
      activeProgram: assignment.assignment,
      ...rawCollections
    };

    return { status: "success", filename: `fitsplit-data-${uid}.json`, data };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to export your data." };
  }
}

/**
 * Permanently deletes the signed-in user's account: every document under
 * `users/{uid}`, the profile itself, the avatar, and the Firebase Auth identity.
 * Irreversible; the client confirms before calling.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deleteMyAccount(_prev: FormActionState, _formData: FormData): Promise<FormActionState> {
  try {
    const user = await requireAuth();

    if (hasFirebaseAdminConfig()) {
      const { auth, db, storage } = getFirebaseAdminServices();
      await db.recursiveDelete(db.collection(collectionPaths.users).doc(user.uid));
      await storage
        .bucket()
        .file(`avatars/${user.uid}.png`)
        .delete({ ignoreNotFound: true })
        .catch(() => undefined);
      await auth.deleteUser(user.uid);
    }

    const cookieStore = await cookies();
    cookieStore.delete("fitsplit-session");
    cookieStore.delete("fitsplit-local-user");

  } catch (err) {
    return failure(err, "Failed to delete your account.");
  }
  // Everything is gone and the cookies are cleared: leave the signed-in shell.
  redirect("/?deleted=1");
}

/**
 * Records the signed-in user's optional diagnostics choice on their profile consent
 * record. Under-18 accounts can never opt in (no behavioural monitoring of children).
 */
export async function setDiagnosticsConsent(granted: boolean): Promise<FormActionState> {
  try {
    // Signed out visitors only have the per-device switch; there is no account record to update.
    const user = await getCurrentUser();
    if (user && hasFirebaseAdminConfig()) {
      const { db } = getFirebaseAdminServices();
      const ref = db.collection(collectionPaths.users).doc(user.uid);
      const snap = await ref.get();
      const data = snap.data() as { consent?: { ageGroup?: string } } | undefined;
      const isMinor = data?.consent?.ageGroup === "minor";
      await ref.set(
        {
          consent: { diagnostics: { granted: granted && !isMinor, updatedAt: new Date().toISOString() } },
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      if (granted && isMinor) {
        return { status: "error", message: "Diagnostics are not available for under-18 accounts." };
      }
    }
    return { status: "success", message: granted ? "Diagnostics turned on." : "Diagnostics turned off." };
  } catch (err) {
    return failure(err, "Could not save your choice.");
  }
}
