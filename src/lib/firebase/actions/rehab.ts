"use server";

import { requireAuth } from "@/lib/auth";
import { collectionPaths } from "../collections";
import { requireFirebase, userDoc } from "./shared";
import { REHAB_FIELD } from "@/lib/rehab/catalog";
import { getCondition, sanitizeConditionIds } from "@/lib/rehab/routine";
import { parseRehabFeeling, validateRehabRun, type RehabRunInput } from "@/lib/rehab/session";

/**
 * Opt in to (or out of) a rehab condition. Stored as `rehabConditions: string[]` on the
 * signed-in user's own profile document; the id is checked against the catalogue.
 */
export async function setRehabCondition(
  conditionId: string,
  enabled: boolean
): Promise<{ ok: true; conditions: string[] } | { ok: false; message: string }> {
  try {
    const user = await requireAuth();
    if (typeof conditionId !== "string" || !getCondition(conditionId)) {
      return { ok: false, message: "That condition is not available." };
    }
    const ref = requireFirebase().collection(collectionPaths.users).doc(user.uid);
    const snap = await ref.get();
    const current = sanitizeConditionIds(snap.data()?.[REHAB_FIELD]);
    const next = enabled ? sanitizeConditionIds([...current, conditionId]) : current.filter((id) => id !== conditionId);
    await ref.set({ [REHAB_FIELD]: next, updatedAt: new Date().toISOString() }, { merge: true });
    return { ok: true, conditions: next };
  } catch (error) {
    console.error("Unable to save rehab condition", error);
    return { ok: false, message: "Could not save that. Check your connection and try again." };
  }
}

/**
 * Save one finished rehab run to users/{uid}/rehabSessions/{runId}. Validated server-side;
 * `completedAt` is the server clock. A run with no completed exercises is ignored (ok, nothing
 * written). The run id is client-generated, so a retry or double tap overwrites rather than
 * duplicates.
 */
export async function saveRehabSession(
  input: RehabRunInput
): Promise<{ ok: true; saved: boolean } | { ok: false; message: string }> {
  try {
    const user = await requireAuth();
    const result = validateRehabRun(input);
    if (!result.ok) {
      return result.reason === "empty"
        ? { ok: true, saved: false }
        : { ok: false, message: "Could not read this rehab session." };
    }
    await userDoc(requireFirebase(), user.uid, "rehabSessions", result.id).set(result.doc);
    return { ok: true, saved: true };
  } catch (error) {
    console.error("Unable to save rehab session", error);
    return { ok: false, message: "Could not save your rehab session. Check your connection and try again." };
  }
}

/** Record how a saved run felt (better / same / worse) on the member's own session doc. */
export async function setRehabFeeling(
  runId: string,
  feeling: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const user = await requireAuth();
    const f = parseRehabFeeling(feeling);
    if (!f || typeof runId !== "string" || !/^[A-Za-z0-9_-]{8,80}$/.test(runId)) {
      return { ok: false, message: "Could not read that answer." };
    }
    const ref = userDoc(requireFirebase(), user.uid, "rehabSessions", runId);
    if (!(await ref.get()).exists) return { ok: false, message: "Save the session first." };
    await ref.set({ feeling: f }, { merge: true });
    return { ok: true };
  } catch (error) {
    console.error("Unable to save rehab feeling", error);
    return { ok: false, message: "Could not save that. Try again." };
  }
}
