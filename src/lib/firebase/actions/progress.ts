"use server";

import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "@/lib/auth";
import { hasFirebaseAdminConfig } from "../admin";
import type { FormActionState } from "@/types/action-state";
import { requireFirebase, requireText, getActionFormData, success, failure, userDoc } from "./shared";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";
import {
  getYesterdaysMealsForMember,
  getRecentMealsForMember,
  getBodyMetricLogsForMember
} from "../read-models/progress";

// Every action below writes only to the signed-in user's own data
// (users/{uid}/...). A `memberId` posted by a form is never trusted.

const LogLiftSetSchema = z.object({
  exerciseId: ZodHelpers.textRequired("Exercise"),
  // A LiftLog record is exactly one set: reps performed on that set, as a
  // whole number (not a prescription range like "8-12").
  reps: z.coerce
    .number({ error: "Reps must be a whole number, e.g. 10 (not a range like \"8-12\")." })
    .int("Reps must be a whole number, e.g. 10.")
    .min(1, "Reps must be at least 1.")
    .max(200, "Reps must be 200 or fewer."),
  weightKg: z.coerce.number().min(0).optional(),
  sessionId: z.string().optional(),
  /** 1-based position of this set within the exercise submission it came from. */
  setIndex: z.coerce.number().int().min(1).max(50).optional()
});

const LogBodyWeightSchema = z.object({
  weightKg: z.coerce.number().min(10, "Weight must be at least 10 kg.").max(500, "Weight must be under 500 kg."),
  bodyFatPct: z.coerce.number().min(1).max(70).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  notes: z.string().max(300).optional()
});

const LogDayStatusSchema = z.object({
  dayId: ZodHelpers.textRequired("Day"),
  weekStart: ZodHelpers.textRequired("Week start"),
  status: z.enum(["completed", "skipped", "modified"]),
  skipReason: z.string().optional(),
  note: z.string().max(400).optional(),
  /** Comma-separated exercise IDs to surface as makeup suggestions */
  makeupExerciseIds: z.string().optional()
});

function safeId(raw: string) {
  return raw.replace(/[\/#?[\]]/g, "_");
}

export async function logLiftSet(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const currentUser = await requireAuth();

    const parsed = parseActionData(formData, LogLiftSetSchema);
    if (!parsed.success) return parsed.state;

    const { exerciseId, reps, setIndex } = parsed.data;
    const weight = parsed.data.weightKg ?? Number(formData.get("weight") ?? 0);
    const sessionId = parsed.data.sessionId || randomUUID();

    if (!hasFirebaseAdminConfig()) {
      return success("Lift entry was logged (local mode).");
    }
    const db = requireFirebase();
    const liftLogId = randomUUID();
    const now = new Date().toISOString();

    await userDoc(db, currentUser.uid, "liftLogs", liftLogId).set({
      id: liftLogId,
      memberId: currentUser.uid,
      exerciseId,
      weight,
      sets: 1,
      reps: String(reps),
      sessionId,
      loggedAt: now,
      createdAt: now,
      updatedAt: now,
      ...(setIndex !== undefined ? { setIndex } : {})
    });

    return success("Lift entry was logged.");
  } catch (error) {
    console.error("Unable to log lift set", error);
    return failure(error, "Unable to log lift. Please try again.");
  }
}

type OfflineLiftLog = {
  id?: string;
  offlineId?: string | number;
  exerciseId: string;
  weight: number;
  reps: string | number;
  sessionId?: string;
  loggedAt?: string;
  setIndex?: number;
};

/** Replays lift sets that were queued in the browser while offline. */
export async function syncOfflineLifts(logs: OfflineLiftLog[]): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const db = requireFirebase();
    const batch = db.batch();
    const now = new Date().toISOString();

    for (const [index, log] of logs.entries()) {
      const liftLogId = safeId(
        String(log.id ?? log.offlineId ?? `${log.sessionId ?? "offline"}_${log.exerciseId}_${log.loggedAt ?? now}_${index}`)
      );
      const setIndex = Number(log.setIndex);
      batch.set(
        userDoc(db, currentUser.uid, "liftLogs", liftLogId),
        {
          id: liftLogId,
          memberId: currentUser.uid,
          exerciseId: log.exerciseId,
          weight: Number(log.weight),
          sets: 1,
          ...(Number.isFinite(setIndex) && setIndex > 0 ? { setIndex } : {}),
          reps: String(log.reps),
          sessionId: String(log.sessionId || liftLogId),
          loggedAt: String(log.loggedAt || now),
          createdAt: now,
          updatedAt: now
        },
        { merge: true }
      );
    }

    await batch.commit();
    return success(`${logs.length} offline lift(s) synced.`);
  } catch (error) {
    console.error("Unable to sync offline lifts", error);
    return failure(error, "Unable to sync offline lifts.");
  }
}

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

/**
 * Record how the user deviated from their planned day for a given week
 * (completed / skipped / modified). The document ID is deterministic
 * (`${dayId}_${weekStart}`) so a second call for the same slot is an upsert.
 */
export async function logDayStatus(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, LogDayStatusSchema);
    if (!parsed.success) return parsed.state;

    const { dayId, weekStart, status, skipReason: rawReason, note: rawNote = "", makeupExerciseIds: rawMakeupIds = "" } =
      parsed.data;
    const programId = requireText(formData, "programId", "Program ID");
    const skipReason = status === "skipped" && rawReason ? rawReason.trim() : null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) throw new Error("Invalid week start date.");

    const makeupExerciseIds =
      status === "skipped" && rawMakeupIds.trim()
        ? rawMakeupIds.split(",").map((s) => s.trim()).filter(Boolean)
        : null;

    const db = requireFirebase();
    const now = new Date().toISOString();

    await userDoc(db, currentUser.uid, "dayLogs", safeId(`${dayId}_${weekStart}`)).set(
      {
        memberId: currentUser.uid,
        programId,
        dayId,
        weekStart,
        status,
        skipReason: skipReason ?? null,
        note: rawNote || null,
        ...(makeupExerciseIds ? { makeupExerciseIds, makeupStatus: "pending" } : {}),
        loggedAt: now,
        updatedAt: now
      },
      { merge: true }
    );

    return success(
      status === "completed"
        ? "Day marked as done."
        : status === "skipped"
          ? "Day marked as skipped."
          : "Activity note saved."
    );
  } catch (error) {
    console.error("Unable to log day status", error);
    return failure(error, "Could not save. Please try again.");
  }
}

const ClearDayLogSchema = z.object({
  dayId: ZodHelpers.textRequired("Day ID"),
  weekStart: ZodHelpers.textRequired("Week start")
});

/** Undo a day-skip or modification note for the current week's slot. */
export async function clearDayLog(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, ClearDayLogSchema);
    if (!parsed.success) return parsed.state;

    const { dayId, weekStart } = parsed.data;
    const db = requireFirebase();
    await userDoc(db, currentUser.uid, "dayLogs", safeId(`${dayId}_${weekStart}`)).delete();

    return success("Day log cleared.");
  } catch (error) {
    console.error("Unable to clear day log", error);
    return failure(error, "Could not clear. Please try again.");
  }
}

// -- Macro logging ------------------------------------------------------------
// mealLogs are the ONLY source of truth for protein/carbs/fat. The day's
// macroLogs doc (id = the date) is a derived rollup, mutated only by logMeal (+)
// and deleteMealLog (-) via FieldValue.increment. Water is the one exception:
// saveWaterLog is a narrow write that can only ever touch `water`.

const SaveWaterLogSchema = z.object({
  date: ZodHelpers.textRequired("Date"),
  water: z.coerce.number().min(0).max(30)
});

export async function saveWaterLog(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, SaveWaterLogSchema);
    if (!parsed.success) return parsed.state;

    const { date, water } = parsed.data;
    if (!hasFirebaseAdminConfig()) return success("Water logged (local mode).");

    const db = requireFirebase();
    await userDoc(db, currentUser.uid, "macroLogs", date).set(
      { id: date, memberId: currentUser.uid, date, water, updatedAt: new Date().toISOString() },
      { merge: true }
    );

    return success("Water logged.");
  } catch (error) {
    return failure(error, "Could not save water log.");
  }
}

const LogMealSchema = z.object({
  date: ZodHelpers.textRequired("Date"),
  name: ZodHelpers.textRequired("Meal name"),
  items: z.string().max(300).optional(),
  kcal: z.coerce.number().min(0).max(5000),
  protein: z.coerce.number().min(0).max(500),
  carbs: z.coerce.number().min(0).max(500),
  fat: z.coerce.number().min(0).max(500)
});

export async function logMeal(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, LogMealSchema);
    if (!parsed.success) return parsed.state;

    const { date, name, items, kcal, protein, carbs, fat } = parsed.data;
    if (!hasFirebaseAdminConfig()) return success("Meal logged (local mode).");

    const db = requireFirebase();
    const now = new Date().toISOString();
    const mealId = randomUUID();

    await userDoc(db, currentUser.uid, "mealLogs", mealId).set({
      id: mealId,
      memberId: currentUser.uid,
      date,
      name,
      items: items ?? "",
      kcal,
      protein,
      carbs,
      fat,
      loggedAt: now
    });

    await userDoc(db, currentUser.uid, "macroLogs", date).set(
      {
        id: date,
        memberId: currentUser.uid,
        date,
        protein: FieldValue.increment(protein),
        carbs: FieldValue.increment(carbs),
        fat: FieldValue.increment(fat),
        updatedAt: now
      },
      { merge: true }
    );

    return success("Meal logged.");
  } catch (error) {
    return failure(error, "Could not log this meal.");
  }
}

const DeleteMealLogSchema = z.object({
  mealId: ZodHelpers.textRequired("Meal"),
  date: ZodHelpers.textRequired("Date")
});

/** Deletes a logged meal and rolls its macros back out of the day's rollup. */
export async function deleteMealLog(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, DeleteMealLogSchema);
    if (!parsed.success) return parsed.state;

    const { mealId, date } = parsed.data;
    if (!hasFirebaseAdminConfig()) return success("Meal removed (local mode).");

    const db = requireFirebase();
    const mealRef = userDoc(db, currentUser.uid, "mealLogs", mealId);
    const mealDoc = await mealRef.get();
    if (!mealDoc.exists) {
      return failure(new Error("Meal not found."), "That meal was already removed.");
    }

    const meal = mealDoc.data() ?? {};
    await Promise.all([
      mealRef.delete(),
      userDoc(db, currentUser.uid, "macroLogs", date).set(
        {
          id: date,
          memberId: currentUser.uid,
          date,
          protein: FieldValue.increment(-Number(meal.protein ?? 0)),
          carbs: FieldValue.increment(-Number(meal.carbs ?? 0)),
          fat: FieldValue.increment(-Number(meal.fat ?? 0)),
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      )
    ]);

    return success("Meal removed.");
  } catch (error) {
    return failure(error, "Could not remove this meal.");
  }
}

// -- Nutrition quick-add suggestions -------------------------------------------
// Thin "use server" wrappers around the read-models so client components can
// fetch this data directly on mount.

export async function getMealQuickAddSuggestions(todayDate: string) {
  const currentUser = await requireAuth();
  const [{ mealLogs: yesterdayMeals }, { recentMeals }] = await Promise.all([
    getYesterdaysMealsForMember(currentUser.uid, todayDate),
    getRecentMealsForMember(currentUser.uid)
  ]);
  return { yesterdayMeals, recentMeals };
}

/** Body-weight history for the weight trend sparkline on the Macros screen. */
export async function getBodyWeightHistory(limit = 60) {
  const currentUser = await requireAuth();
  return getBodyMetricLogsForMember(currentUser.uid, limit);
}
