"use server";

import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth";
import { hasFirebaseAdminConfig } from "../admin";
import type { FormActionState } from "@/types/action-state";
import { requireFirebase, getActionFormData, success, failure, userDoc } from "./shared";
import { z } from "zod";
import { parseActionData } from "./validation";

// Writes only to the signed-in user's own data (users/{uid}/...). Workout logging lives in
// ./workouts.ts; this file keeps the body-weight entry used by the profile page.

const LogBodyWeightSchema = z.object({
  weightKg: z.coerce.number().min(10, "Weight must be at least 10 kg.").max(500, "Weight must be under 500 kg."),
  bodyFatPct: z.coerce.number().min(1).max(70).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  notes: z.string().max(300).optional()
});

/** Log a body-weight entry. Powers the body-weight progress chart. */
export async function logBodyWeight(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, LogBodyWeightSchema);
    if (!parsed.success) return parsed.state;

    const { weightKg, bodyFatPct, notes = "" } = parsed.data;
    const now = new Date().toISOString();

    if (!hasFirebaseAdminConfig()) {
      return success(`Weight ${weightKg} kg logged.`);
    }

    const db = requireFirebase();
    const id = randomUUID();
    await userDoc(db, currentUser.uid, "bodyMetricLogs", id).set({
      id,
      memberId: currentUser.uid,
      weightKg,
      ...(bodyFatPct !== undefined ? { bodyFatPct } : {}),
      ...(notes ? { notes } : {}),
      loggedAt: now,
      createdAt: now
    });

    // Keep the profile's current weight in sync (best-effort).
    try {
      await db.collection("users").doc(currentUser.uid).set({ weightKg, updatedAt: now }, { merge: true });
    } catch {
      // the dedicated collection is the source of truth for the chart
    }

    return success(`Weight ${weightKg} kg logged.`);
  } catch (error) {
    console.error("Unable to log body weight", error);
    return failure(error, "Could not log weight. Please try again.");
  }
}
