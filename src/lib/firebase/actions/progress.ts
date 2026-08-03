/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
"use server";

import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth, requireRole } from "@/lib/auth";
import { collectionPaths, PRIMARY_GYM_ID } from "../collections";
import { hasFirebaseAdminConfig } from "../admin";
import type { FormActionState } from "@/types/action-state";
import {
  requireFirebase,
  requireText,
  assertValidPhone,
  getActionFormData,
  success,
  failure,
  scopedGymDoc,
  mirrorGymScopedRecord,
  mirrorProfileToGym,
  assertCanManageMember,
  assertMemberBelongsToCallerGym,
  getGymScopedProfileDoc
} from "./shared";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";
import {
  getYesterdaysMealsForMember,
  getRecentMealsForMember,
  getBodyMetricLogsForMember
} from "../read-models/progress";

const LogLiftSetSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  exerciseId: ZodHelpers.textRequired("Exercise"),
  // A LiftLog record is exactly one set — reps performed on that set, as a
  // whole number. This used to be free text, which let prescription strings
  // like "8-12" (meant as a target range, not an actual rep count) get stored
  // as the logged value. Coerce to an integer and reject anything else with a
  // message that explains why.
  reps: z.coerce
    .number({ error: "Reps must be a whole number, e.g. 10 (not a range like \"8-12\")." })
    .int("Reps must be a whole number, e.g. 10.")
    .min(1, "Reps must be at least 1.")
    .max(200, "Reps must be 200 or fewer."),
  sets: z.coerce.number().min(1).optional(),
  weightKg: z.coerce.number().min(0).optional(),
  sessionId: z.string().optional(),
  targetGymId: z.string().optional(),
  notes: z.string().max(300).optional(),
  /** 1-based position of this set within the exercise submission it came from. */
  setIndex: z.coerce.number().int().min(1).max(50).optional()
});

const LogBodyWeightSchema = z.object({
  weightKg: z.coerce.number().min(10, "Weight must be at least 10 kg.").max(500, "Weight must be under 500 kg."),
  memberId: z.string().optional(),
  bodyFatPct: z.coerce.number().min(1).max(70).optional().or(z.literal("")).transform(v => v === "" ? undefined : v),
  notes: z.string().max(300).optional()
});

const LogDayStatusSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  dayId: ZodHelpers.textRequired("Day"),
  weekStart: ZodHelpers.textRequired("Week start"),
  status: z.enum(["completed", "skipped", "modified"]),
  skipReason: z.string().optional(),
  note: z.string().max(400).optional(),
  /** Comma-separated exercise IDs to surface as makeup suggestions */
  makeupExerciseIds: z.string().optional()
});

function stableOfflineLiftLogId(log: Record<string, unknown>, index: number, now: string) {
  const source = String(
    log.id ??
      log.offlineId ??
      `${log.sessionId ?? "offline"}_${log.memberId ?? "member"}_${log.exerciseId ?? "exercise"}_${log.loggedAt ?? now}_${index}`
  );
  return source.replace(/[\/#?[\]]/g, "_");
}

function dailyWorkoutSessionId(memberId: string, isoDate: string) {
  return `${memberId}_${isoDate.slice(0, 10)}`.replace(/[\/#?[\]]/g, "_");
}

async function upsertImplicitWorkoutAttendance(
  db: ReturnType<typeof requireFirebase>,
  gymId: string,
  memberId: string,
  now: string
) {
  const sessionId = dailyWorkoutSessionId(memberId, now);
  const sessionRef = scopedGymDoc(db, gymId, "workoutSessions", sessionId);
  const attendanceRef = scopedGymDoc(db, gymId, "attendanceRecords", sessionId);
  const [sessionDoc, attendanceDoc] = await Promise.all([sessionRef.get(), attendanceRef.get()]);
  const existingSession = sessionDoc.data() ?? {};
  const existingAttendance = attendanceDoc.data() ?? {};
  const startedAt = String(existingSession.startedAt ?? existingAttendance.checkInAt ?? now);
  const checkInAt = String(existingAttendance.checkInAt ?? startedAt);

  await Promise.all([
    sessionRef.set(
      {
        id: sessionId,
        gymId,
        memberId,
        startedAt,
        endedAt: now,
        status: "completed",
        updatedAt: now,
        attendanceSource: "lift_log",
        mirroredFromRootCollection: true
      },
      { merge: true }
    ),
    attendanceRef.set(
      {
        id: sessionId,
        memberId,
        gymId,
        sessionId,
        checkInAt,
        checkOutAt: now,
        latitude: null,
        longitude: null,
        distanceMeters: null,
        geofenceStatus: "location_not_provided",
        createdAt: String(existingAttendance.createdAt ?? checkInAt),
        updatedAt: now,
        source: "lift_log",
        mirroredFromRootCollection: true
      },
      { merge: true }
    )
  ]);
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

    const { memberId, exerciseId, reps, setIndex } = parsed.data;
    const weight = parsed.data.weightKg ?? Number(formData.get("weight") ?? 0);
    // Every new LiftLog write is exactly one set. Callers that previously sent
    // an aggregate `sets` (e.g. "3" for a 3x10) should submit one call per set
    // instead — see WorkoutLiftLogForm/MemberProgressPanel, which now expand a
    // single form submission into N single-set calls client-side.
    const sets = 1;
    const sessionId = parsed.data.sessionId || randomUUID();

    assertCanManageMember(currentUser, memberId);

    if (!hasFirebaseAdminConfig()) {
      return success("Lift entry was logged (local mode).", undefined, ["day-logs", "lift-logs", "activity", "body-metrics"]);
    }
    const db = requireFirebase();
    const liftLogId = randomUUID();
    const now = new Date().toISOString();

    const gymId = currentUser.role === "admin"
      ? (parsed.data.targetGymId || currentUser.gymId || PRIMARY_GYM_ID)
      : (currentUser.gymId ?? PRIMARY_GYM_ID);
    const liftLogRecord = {
      id: liftLogId,
      gymId,
      memberId,
      exerciseId,
      weight,
      sets,
      reps: String(reps),
      sessionId,
      loggedAt: now,
      createdAt: now,
      updatedAt: now,
      ...(setIndex !== undefined ? { setIndex } : {})
    };
    await Promise.all([
      mirrorGymScopedRecord(db, gymId, "liftLogs", liftLogId, liftLogRecord),
      upsertImplicitWorkoutAttendance(db, gymId, memberId, now)
    ]);

    return success("Lift entry was logged.", gymId, ["day-logs", "lift-logs", "activity", "body-metrics", "sessions"]);
  } catch (error) {
    console.error("Unable to log lift set", error);
    return failure(error, "Unable to log lift. Please try again.");
  }
}

export async function syncOfflineLifts(logs: any[]): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role === "member") {
      for (const log of logs) {
        assertCanManageMember(currentUser, String(log.memberId ?? ""));
      }
    }

    const db = requireFirebase();
    const batch = db.batch();
    const now = new Date().toISOString();
    const sessionSummaries = new Map<string, {
      gymId: string;
      memberId: string;
      sessionId: string;
      startedAt: string;
      endedAt: string;
    }>();

    for (const [index, log] of logs.entries()) {
      const gymId = String(log.gymId ?? currentUser.gymId ?? PRIMARY_GYM_ID);
      const liftLogId = stableOfflineLiftLogId(log, index, now);
      const sessionId = String(log.sessionId || liftLogId);
      const loggedAt = String(log.loggedAt || now);
      // One LiftLog === one set, same contract logLiftSet enforces. Offline
      // clients already queue single-set rows; forcing it here keeps a stale
      // queue (written by an older build) from reintroducing aggregate rows.
      const setIndex = Number(log.setIndex);
      const liftLogRecord = {
        id: liftLogId,
        gymId,
        memberId: log.memberId,
        exerciseId: log.exerciseId,
        weight: Number(log.weight),
        sets: 1,
        ...(Number.isFinite(setIndex) && setIndex > 0 ? { setIndex } : {}),
        reps: log.reps,
        sessionId,
        loggedAt,
        createdAt: now,
        updatedAt: now
      };
      const memberId = String(log.memberId ?? "");
      const dailySessionId = dailyWorkoutSessionId(memberId, loggedAt);
      const sessionKey = `${gymId}:${dailySessionId}`;
      const existingSummary = sessionSummaries.get(sessionKey);
      sessionSummaries.set(sessionKey, {
        gymId,
        memberId,
        sessionId: dailySessionId,
        startedAt: existingSummary && existingSummary.startedAt < loggedAt ? existingSummary.startedAt : loggedAt,
        endedAt: existingSummary && existingSummary.endedAt > loggedAt ? existingSummary.endedAt : loggedAt
      });

      batch.set(
        scopedGymDoc(db, gymId, "liftLogs", liftLogId),
        { ...liftLogRecord, mirroredFromRootCollection: true },
        { merge: true }
      );
    }

    for (const summary of sessionSummaries.values()) {
      batch.set(
        scopedGymDoc(db, summary.gymId, "workoutSessions", summary.sessionId),
        {
          id: summary.sessionId,
          gymId: summary.gymId,
          memberId: summary.memberId,
          startedAt: summary.startedAt,
          endedAt: summary.endedAt,
          status: "completed",
          updatedAt: now,
          attendanceSource: "offline_lift_sync",
          mirroredFromRootCollection: true
        },
        { merge: true }
      );
      batch.set(
        scopedGymDoc(db, summary.gymId, "attendanceRecords", summary.sessionId),
        {
          id: summary.sessionId,
          memberId: summary.memberId,
          gymId: summary.gymId,
          sessionId: summary.sessionId,
          checkInAt: summary.startedAt,
          checkOutAt: summary.endedAt,
          latitude: null,
          longitude: null,
          distanceMeters: null,
          geofenceStatus: "location_not_provided",
          updatedAt: now,
          source: "offline_lift_sync",
          mirroredFromRootCollection: true
        },
        { merge: true }
      );
    }

    await batch.commit();

    return success(`${logs.length} offline lift(s) synced.`, currentUser.gymId, ["day-logs", "lift-logs", "activity", "body-metrics", "sessions"]);
  } catch (error) {
    console.error("Unable to sync offline lifts", error);
    return failure(error, "Unable to sync offline lifts.");
  }
}

/**
 * Log a body weight entry for the calling member (or for a member by an owner).
 * Powers the body-weight progress chart on /profile. Owners can log on behalf
 * of members (e.g. recording weigh-ins at the gym); members log their own.
 */
export async function logBodyWeight(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, LogBodyWeightSchema);
    if (!parsed.success) return parsed.state;

    const { weightKg, memberId: rawMember = "", bodyFatPct, notes = "" } = parsed.data;

    const memberId = rawMember.trim() || currentUser.memberId || currentUser.uid;
    if (!memberId) throw new Error("Member ID is required.");
    // Members can only log their own weight; owners must be in the same gym.
    await assertMemberBelongsToCallerGym(currentUser, memberId);

    const now = new Date().toISOString();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

    if (!hasFirebaseAdminConfig()) {
      return success(`Weight ${weightKg} kg logged.`, undefined, ["day-logs", "lift-logs", "activity", "body-metrics"]);
    }

    const db = requireFirebase();
    const id = randomUUID();
    const bodyMetricRecord = {
      id,
      memberId,
      gymId,
      weightKg,
      ...(bodyFatPct !== undefined ? { bodyFatPct } : {}),
      ...(notes ? { notes } : {}),
      loggedAt: now,
      createdAt: now
    };
    await mirrorGymScopedRecord(db, gymId, "bodyMetricLogs", id, bodyMetricRecord);

    // Mirror onto profile so dashboards see the current value without a join.
    try {
      await mirrorProfileToGym(db, memberId, {
        id: memberId,
        role: "member",
        defaultGymId: gymId,
        weightKg,
        updatedAt: now
      });
    } catch {
      // best-effort; chart still works from the dedicated collection
    }

    return success(`Weight ${weightKg} kg logged.`, gymId, ["day-logs", "lift-logs", "activity", "body-metrics"]);
  } catch (error) {
    console.error("Unable to log body weight", error);
    return failure(error, "Could not log weight. Please try again.");
  }
}

/**
 * Trainer/owner writes a short coaching note that surfaces on the member's
 * dashboard. One note per member (latest only) — not a history. Members can
 * see it but cannot edit. To clear, send an empty string.
 */
const CoachNoteSchema = z.object({
  memberId: ZodHelpers.textRequired("Member ID"),
  coachNote: z.string().max(600, "Note is too long. Keep it under 600 characters.").optional()
});

export async function updateCoachNote(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, CoachNoteSchema);
    if (!parsed.success) return parsed.state;

    const { memberId, coachNote: rawNote = "" } = parsed.data;
    await assertMemberBelongsToCallerGym(currentUser, memberId);
    const db = requireFirebase();
    const now = new Date().toISOString();
    const noteUpdate = {
        coachNote: rawNote,
        coachNoteUpdatedAt: rawNote ? now : null,
        coachNoteUpdatedBy: rawNote ? currentUser.uid : null,
        coachNoteUpdatedByName: rawNote ? currentUser.fullName : null,
        updatedAt: now
      };
    await mirrorProfileToGym(db, memberId, {
      id: memberId,
      role: "member",
      defaultGymId: currentUser.gymId ?? PRIMARY_GYM_ID,
      ...noteUpdate
    });

    return success(rawNote ? "Coach note updated." : "Coach note cleared.", currentUser.gymId, ["day-logs", "lift-logs", "activity", "body-metrics"]);
  } catch (error) {
    console.error("Unable to update coach note", error);
    return failure(error, "Could not save coach note.");
  }
}

/**
 * Member records how they deviated from their planned day for a given week.
 * Modes:
 *   status="completed" — they finished the planned day.
 *   status="skipped"  — they didn't train (optional reason + note).
 *   status="modified" — they did something other than the plan (note describes it).
 *
 * The Firestore document ID is deterministic (`${memberId}_${dayId}_${weekStart}`)
 * so a second call for the same slot is an upsert, not a duplicate row.
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

    const {
      memberId: rawMember, dayId, weekStart, status: rawStatus, skipReason: rawReason, note: rawNote = "",
      makeupExerciseIds: rawMakeupIds = ""
    } = parsed.data;

    const memberId = rawMember.trim() || currentUser.memberId || currentUser.uid;
    const programId = requireText(formData, "programId", "Program ID");
    const status = rawStatus;
    const skipReason = status === "skipped" && rawReason ? rawReason.trim() : null;

    if (!memberId) throw new Error("Member ID is required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) throw new Error("Invalid week start date.");

    // Parse makeup exercise IDs (comma-separated) — only set on skips
    const makeupExerciseIds = status === "skipped" && rawMakeupIds.trim()
      ? rawMakeupIds.split(",").map(s => s.trim()).filter(Boolean)
      : null;

    const db = requireFirebase();
    const now = new Date().toISOString();

    // Deterministic ID → upsert semantics: same member+day+week = one record
    const docId = `${memberId}_${dayId}_${weekStart}`;
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const dayLogRecord = {
      memberId,
      gymId,
      programId,
      dayId,
      weekStart,
      status,
      skipReason: skipReason ?? null,
      note: rawNote || null,
      ...(makeupExerciseIds ? { makeupExerciseIds, makeupStatus: "pending" } : {}),
      loggedAt: now,
      updatedAt: now
    };

    await mirrorGymScopedRecord(db, gymId, "dayLogs", docId, dayLogRecord);

    const message =
      status === "completed"
        ? "Day marked as done."
        : status === "skipped"
          ? "Day marked as skipped."
          : "Activity note saved.";
    return success(message, gymId, ["day-logs", "lift-logs", "activity", "body-metrics"]);
  } catch (error) {
    console.error("Unable to log day status", error);
    return failure(error, "Could not save. Please try again.");
  }
}

/**
 * Undo a day-skip or modification note for the current week's slot.
 */
const ClearDayLogSchema = z.object({
  memberId: z.string().optional(),
  dayId: ZodHelpers.textRequired("Day ID"),
  weekStart: ZodHelpers.textRequired("Week start")
});

export async function clearDayLog(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, ClearDayLogSchema);
    if (!parsed.success) return parsed.state;

    const { memberId: rawMember = "", dayId, weekStart } = parsed.data;
    const memberId = rawMember.trim() || currentUser.memberId || currentUser.uid;

    if (!memberId) throw new Error("Member ID is required.");

    const db = requireFirebase();
    const docId = `${memberId}_${dayId}_${weekStart}`;
    await db.collection(collectionPaths.dayLogs).doc(docId).delete();
    await scopedGymDoc(db, currentUser.gymId ?? PRIMARY_GYM_ID, "dayLogs", docId).delete();

    return success("Day log cleared.", currentUser.gymId, ["day-logs", "lift-logs", "activity", "body-metrics"]);
  } catch (error) {
    console.error("Unable to clear day log", error);
    return failure(error, "Could not clear. Please try again.");
  }
}

// ── Macro logging ─────────────────────────────────────────────────────────────
// Contract: mealLogs are the ONLY source of truth for protein/carbs/fat. The
// day's macroLogs doc is a derived rollup, mutated only by logMeal (+) and
// deleteMealLog (-) below via FieldValue.increment. Water is the one genuine
// exception — it isn't part of a meal, so saveWaterLog below is a narrow,
// field-masked write that can only ever touch `water`. Nothing else may write
// protein/carbs/fat directly; doing so (the old saveMacroLog absolute-write
// behavior) let a stale client value silently clobber meals logged elsewhere
// on the same screen.

const SaveWaterLogSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  date: ZodHelpers.textRequired("Date"),
  water: z.coerce.number().min(0).max(30)
});

/**
 * Sets the day's water total (litres). This is intentionally the ONLY macro
 * field a member edits as an absolute value — protein/carbs/fat are derived
 * exclusively from mealLogs (logMeal / deleteMealLog). The write below is
 * field-masked to `water` only so this action can never regress into
 * overwriting meal-derived totals.
 *
 * Renamed from `saveMacroLog` (which used to overwrite protein/carbs/fat too).
 */
export async function saveWaterLog(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, SaveWaterLogSchema);
    if (!parsed.success) return parsed.state;

    const { memberId, date, water } = parsed.data;
    assertCanManageMember(currentUser, memberId);

    if (!hasFirebaseAdminConfig()) {
      return success("Water logged (local mode).", undefined, ["day-logs", "lift-logs", "activity", "body-metrics"]);
    }

    const db = requireFirebase();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const now = new Date().toISOString();
    const docId = `${memberId}_${date}`;

    // Field mask: only memberId/gymId/date/water/updatedAt are ever written
    // here. merge:true means protein/carbs/fat (owned by meal logging) are
    // left completely untouched, even if this doc doesn't exist yet.
    const waterRecord = { id: docId, memberId, gymId, date, water, updatedAt: now };

    await mirrorGymScopedRecord(db, gymId, "macroLogs", docId, waterRecord);

    return success("Water logged.", gymId, ["day-logs", "lift-logs", "activity", "body-metrics"]);
  } catch (error) {
    return failure(error, "Could not save water log.");
  }
}

// ── Meal logging ──────────────────────────────────────────────────────────────
// A meal is its own record (for the "meal log" list / quick-add UX). Logging one
// increments the day's macroLogs protein/carbs/fat via FieldValue.increment;
// deleting one (deleteMealLog, below) decrements it back out. Together these
// are the only two writers of macroLogs protein/carbs/fat — see the block
// comment above saveWaterLog for the full contract.

const LogMealSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
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

    const { memberId, date, name, items, kcal, protein, carbs, fat } = parsed.data;
    assertCanManageMember(currentUser, memberId);

    if (!hasFirebaseAdminConfig()) {
      return success("Meal logged (local mode).", undefined, ["day-logs", "lift-logs", "activity", "body-metrics"]);
    }

    const db = requireFirebase();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const now = new Date().toISOString();
    const mealId = randomUUID();

    const mealRecord = {
      id: mealId,
      memberId,
      gymId,
      date,
      name,
      items: items ?? "",
      kcal,
      protein,
      carbs,
      fat,
      loggedAt: now
    };

    await mirrorGymScopedRecord(db, gymId, "mealLogs", mealId, mealRecord);

    const macroDocId = `${memberId}_${date}`;
    const macroIncrement = {
      memberId,
      gymId,
      date,
      protein: FieldValue.increment(protein),
      carbs: FieldValue.increment(carbs),
      fat: FieldValue.increment(fat),
      updatedAt: now
    };
    await scopedGymDoc(db, gymId, "macroLogs", macroDocId).set({ ...macroIncrement, id: macroDocId }, { merge: true });

    return success("Meal logged.", gymId, ["day-logs", "lift-logs", "activity", "body-metrics"]);
  } catch (error) {
    return failure(error, "Could not log this meal.");
  }
}

const DeleteMealLogSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  mealId: ZodHelpers.textRequired("Meal"),
  date: ZodHelpers.textRequired("Date")
});

/**
 * Deletes a logged meal and rolls its protein/carbs/fat back out of the day's
 * macroLogs rollup — the undo path for a mis-tapped Quick Add or a mistaken
 * manual entry. Mirrors logMeal's increment(+x) with an increment(-x) here so
 * the rollup never drifts from the actual sum of remaining meals.
 */
export async function deleteMealLog(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, DeleteMealLogSchema);
    if (!parsed.success) return parsed.state;

    const { memberId, mealId, date } = parsed.data;
    assertCanManageMember(currentUser, memberId);

    if (!hasFirebaseAdminConfig()) {
      return success("Meal removed (local mode).", undefined, ["day-logs", "lift-logs", "activity", "body-metrics"]);
    }

    const db = requireFirebase();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const mealRef = scopedGymDoc(db, gymId, "mealLogs", mealId);
    const mealDoc = await mealRef.get();
    if (!mealDoc.exists) {
      return failure(new Error("Meal not found."), "That meal was already removed.");
    }

    const meal = mealDoc.data() ?? {};
    if (String(meal.memberId ?? "") !== memberId) {
      throw new Error("This meal does not belong to that member.");
    }

    const now = new Date().toISOString();
    const macroDocId = `${memberId}_${date}`;

    await Promise.all([
      mealRef.delete(),
      scopedGymDoc(db, gymId, "macroLogs", macroDocId).set(
        {
          id: macroDocId,
          memberId,
          gymId,
          date,
          protein: FieldValue.increment(-Number(meal.protein ?? 0)),
          carbs: FieldValue.increment(-Number(meal.carbs ?? 0)),
          fat: FieldValue.increment(-Number(meal.fat ?? 0)),
          updatedAt: now
        },
        { merge: true }
      )
    ]);

    return success("Meal removed.", gymId, ["day-logs", "lift-logs", "activity", "body-metrics"]);
  } catch (error) {
    return failure(error, "Could not remove this meal.");
  }
}

// ── Nutrition quick-add suggestions ──────────────────────────────────────────
// Thin "use server" wrappers around the read-models in read-models/progress.ts
// so MacrosScreen (a client component) can pull this data directly on mount
// without needing the page component that renders it to fetch and thread it
// down as props. See read-models/progress.ts for the actual query logic.

/**
 * Powers the nutrition Quick Add flow: yesterday's logged meals (for "Repeat
 * yesterday") and the member's most-frequently-logged recent meals (for a
 * personalized "Recent" row), both ranked ahead of the generic static presets.
 */
export async function getMealQuickAddSuggestions(memberId: string, gymId: string, todayDate: string) {
  const currentUser = await requireAuth();
  assertCanManageMember(currentUser, memberId);
  const [{ mealLogs: yesterdayMeals }, { recentMeals }] = await Promise.all([
    getYesterdaysMealsForMember(memberId, gymId, todayDate),
    getRecentMealsForMember(memberId, gymId)
  ]);
  return { yesterdayMeals, recentMeals };
}

/**
 * Body-weight history for the weight trend sparkline on the Macros screen.
 * Thin wrapper so the client component can fetch it directly (see comment
 * above getMealQuickAddSuggestions).
 */
export async function getBodyWeightHistory(memberId: string, gymId: string, limit = 60) {
  const currentUser = await requireAuth();
  assertCanManageMember(currentUser, memberId);
  return getBodyMetricLogsForMember(memberId, gymId, limit);
}

