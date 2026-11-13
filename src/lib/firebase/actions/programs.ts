"use server";

import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth";
import { hasFirebaseAdminConfig } from "../admin";
import { userCollectionPath } from "../collections";
import type { FormActionState } from "@/types/action-state";
import { requireFirebase, getActionFormData, success, failure, userDoc } from "./shared";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";

// The active plan is stored per user: users/{uid}/programAssignments/*

const SelectProgramSchema = z.object({
  programId: ZodHelpers.textRequired("Workout program"),
  programTitle: z.string().optional()
});

/** Pick (or switch) the plan the user is currently following. */
export async function selectProgramForSelf(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);

    const parsed = parseActionData(formData, SelectProgramSchema);
    if (!parsed.success) return parsed.state;

    const { programId } = parsed.data;
    const programTitle = parsed.data.programTitle || "Workout program";

    if (!hasFirebaseAdminConfig()) {
      return success(`${programTitle} is now your active workout split.`);
    }

    const db = requireFirebase();
    const now = new Date().toISOString();

    // Cancel prior active assignments
    const existing = await db
      .collection(userCollectionPath(currentUser.uid, "programAssignments"))
      .where("status", "==", "active")
      .get();
    await Promise.all(existing.docs.map((doc) => doc.ref.set({ status: "cancelled", updatedAt: now }, { merge: true })));

    const assignmentId = randomUUID();
    await userDoc(db, currentUser.uid, "programAssignments", assignmentId).set({
      id: assignmentId,
      memberId: currentUser.uid,
      programId,
      assignedAt: now,
      status: "active" as const,
      createdAt: now,
      updatedAt: now
    });

    return success(`${programTitle} is now your active split!`);
  } catch (error) {
    console.error("Unable to select program", error);
    return failure(error, "Unable to select program. Please try again.");
  }
}
