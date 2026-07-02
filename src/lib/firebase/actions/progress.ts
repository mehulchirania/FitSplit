/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
"use server";

import { randomUUID } from "crypto";
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
  getGymScopedProfileDoc,
  getGymGeofenceConfig,
  validateGymGeofence
} from "./shared";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";

const LogLiftSetSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  exerciseId: ZodHelpers.textRequired("Exercise"),
  reps: ZodHelpers.textRequired("Reps"),
  sets: z.coerce.number().min(1).optional(),
  weightKg: z.coerce.number().min(0).optional(),
  sessionId: z.string().optional(),
  targetGymId: z.string().optional(),
  notes: z.string().max(300).optional()
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
  status: z.enum(["skipped", "modified"]),
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

    const { memberId, exerciseId, reps } = parsed.data;
    const weight = parsed.data.weightKg ?? Number(formData.get("weight") ?? 0);
    const sets = parsed.data.sets ?? 1;
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
      reps,
      sessionId,
      loggedAt: now,
      createdAt: now,
      updatedAt: now
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
      const liftLogRecord = {
        id: liftLogId,
        gymId,
        memberId: log.memberId,
        exerciseId: log.exerciseId,
        weight: Number(log.weight),
        sets: Number(log.sets),
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
 * Two modes:
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
    const status = rawStatus === "modified" ? "modified" : "skipped";
    const skipReason = rawReason ? rawReason.trim() : null;

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

    return success(status === "skipped" ? "Day marked as skipped." : "Activity note saved.", gymId, ["day-logs", "lift-logs", "activity", "body-metrics"]);
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

const SaveMacroLogSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  date: ZodHelpers.textRequired("Date"),
  protein: z.coerce.number().min(0).max(2000),
  carbs: z.coerce.number().min(0).max(2000),
  fat: z.coerce.number().min(0).max(2000),
  water: z.coerce.number().min(0).max(30)
});

export async function saveMacroLog(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, SaveMacroLogSchema);
    if (!parsed.success) return parsed.state;

    const { memberId, date, protein, carbs, fat, water } = parsed.data;
    assertCanManageMember(currentUser, memberId);

    if (!hasFirebaseAdminConfig()) {
      return success("Macro log saved (local mode).", undefined, ["day-logs", "lift-logs", "activity", "body-metrics"]);
    }

    const db = requireFirebase();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const now = new Date().toISOString();
    const docId = `${memberId}_${date}`;

    const macroRecord = {
      id: docId,
      memberId,
      gymId,
      date,
      protein,
      carbs,
      fat,
      water,
      updatedAt: now
    };

    await mirrorGymScopedRecord(db, gymId, "macroLogs", docId, macroRecord);

    return success("Macros saved.", gymId, ["day-logs", "lift-logs", "activity", "body-metrics"]);
  } catch (error) {
    return failure(error, "Could not save macro log.");
  }
}

/**
 * Update the makeup status for a skipped day.
 * Called when the member taps "Add to next session" (→ "added") or "Dismiss" (→ "dismissed").
 */
export async function updateMakeupStatus(
  dayLogId: string,
  status: "added" | "dismissed",
  targetDayId?: string
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();

    if (!hasFirebaseAdminConfig()) {
      return success("Makeup status updated (local mode).", undefined, ["day-logs"]);
    }

    const db = requireFirebase();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const now = new Date().toISOString();

    const update: Record<string, string | null> = {
      makeupStatus: status,
      updatedAt: now,
      ...(targetDayId ? { makeupTargetDayId: targetDayId } : {})
    };

    await scopedGymDoc(db, gymId, "dayLogs", dayLogId).set(update, { merge: true });

    return success("Makeup preference saved.", gymId, ["day-logs"]);
  } catch (error) {
    console.error("Unable to update makeup status", error);
    return failure(error, "Could not save makeup preference.");
  }
}

// ── Activity logging (stretch / cardio) ──────────────────────────────────────

const LogActivitySchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  type: z.enum(["stretch", "cardio"]),
  name: ZodHelpers.textRequired("Activity name"),
  duration: z.coerce.number().min(1).max(600).optional(),
  distance: z.coerce.number().min(0).max(1000).optional(),
  notes: z.string().max(400).optional(),
  sessionId: z.string().optional()
});

export async function logActivity(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, LogActivitySchema);
    if (!parsed.success) return parsed.state;

    const { memberId, type, name, duration, distance, notes, sessionId } = parsed.data;
    assertCanManageMember(currentUser, memberId);

    if (!hasFirebaseAdminConfig()) {
      return success(`${type === "stretch" ? "Stretch" : "Cardio"} logged (local mode).`, undefined, ["day-logs", "lift-logs", "activity", "body-metrics"]);
    }

    const db = requireFirebase();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const now = new Date().toISOString();
    const id = randomUUID();

    const activityRecord = {
      id,
      memberId,
      gymId,
      type,
      name: name.trim(),
      ...(duration !== undefined ? { duration } : {}),
      ...(distance !== undefined ? { distance } : {}),
      ...(notes ? { notes: notes.trim() } : {}),
      ...(sessionId ? { sessionId } : {}),
      loggedAt: now,
      createdAt: now
    };

    await mirrorGymScopedRecord(db, gymId, "activityLogs", id, activityRecord);

    return success(type === "stretch" ? "Mobility work logged." : "Cardio logged.", gymId, ["day-logs", "lift-logs", "activity", "body-metrics"]);
  } catch (error) {
    console.error("Unable to log activity", error);
    return failure(error, "Could not log activity. Please try again.");
  }
}

// ── Workout sessions ──────────────────────────────────────────────────────────

const SessionSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  sessionId: ZodHelpers.textRequired("Session"),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  deviceInfo: z.string().optional(),
  targetGymId: z.string().optional(),
  programDayId: z.string().optional(),
  programId: z.string().optional(),
  dayTitle: z.string().optional()
});

export async function startWorkoutSession(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const currentUser = await requireAuth();
    const parsed = parseActionData(formData, SessionSchema);
    if (!parsed.success) return parsed.state;

    const {
      memberId, sessionId,
      latitude = Number.NaN, longitude = Number.NaN,
      deviceInfo: rawDevice = "", targetGymId: rawTarget = "",
      programDayId, programId, dayTitle
    } = parsed.data;

    assertCanManageMember(currentUser, memberId);

    if (!hasFirebaseAdminConfig()) {
      // Mock mode — just confirm success locally
      return success("Workout session was started (local mode).", undefined, ["day-logs", "lift-logs", "activity", "body-metrics"]);
    }
    const db = requireFirebase();

    const deviceInfo = rawDevice.slice(0, 500);
    const targetGymId = rawTarget.trim();
    const gymId = currentUser.role === "admin"
      ? (targetGymId || currentUser.gymId || PRIMARY_GYM_ID)
      : (currentUser.gymId ?? PRIMARY_GYM_ID);
    const gymConfig = await getGymGeofenceConfig(gymId);
    const geofence = validateGymGeofence(latitude, longitude, gymConfig);
    const now = new Date().toISOString();

    const sessionRecord = {
        id: sessionId,
        gymId,
        memberId,
        attendance: {
          latitude,
          longitude,
          deviceInfo,
          timestamp: now,
          ...geofence
        },
        startedAt: now,
        status: "active",
        updatedAt: now,
        ...(programDayId ? { programDayId } : {}),
        ...(programId ? { programId } : {}),
        ...(dayTitle ? { dayTitle } : {})
      };
    await mirrorGymScopedRecord(db, gymId, "workoutSessions", sessionId, sessionRecord);

    const attendanceRecord = {
        id: sessionId,
        memberId,
        gymId,
        sessionId,
        checkInAt: now,
        latitude,
        longitude,
        deviceInfo,
        ...geofence,
        createdAt: now,
        updatedAt: now
      };
    await mirrorGymScopedRecord(db, gymId, "attendanceRecords", sessionId, attendanceRecord);

    return success("Workout session was started.", gymId, ["day-logs", "lift-logs", "activity", "body-metrics"]);
  } catch (error) {
    console.error("Unable to start workout session", error);
    return failure(error, "Unable to start workout. Please try again.");
  }
}

const EndSessionSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  sessionId: ZodHelpers.textRequired("Session")
});

export async function endWorkoutSession(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const currentUser = await requireAuth();
    const parsed = parseActionData(formData, EndSessionSchema);
    if (!parsed.success) return parsed.state;

    if (!hasFirebaseAdminConfig()) {
      return success("Workout session was ended (local mode).", undefined, ["day-logs", "lift-logs", "activity", "body-metrics"]);
    }
    const db = requireFirebase();
    const { sessionId, memberId } = parsed.data;
    
    assertCanManageMember(currentUser, memberId);
    const now = new Date().toISOString();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

    await scopedGymDoc(db, gymId, "workoutSessions", sessionId).set(
      {
        endedAt: now,
        status: "completed",
        updatedAt: now
      },
      { merge: true }
    );

    // Record attendance for the day
    try {
      await scopedGymDoc(db, gymId, "attendanceRecords", sessionId).set({
        id: sessionId,
        memberId,
        gymId,
        sessionId,
        checkOutAt: now,
        updatedAt: now
      }, { merge: true });
    } catch {
      // non-fatal — attendance tracking is supplementary
    }

    return success("Workout session was ended.", gymId, ["day-logs", "lift-logs", "activity", "body-metrics"]);
  } catch (error) {
    console.error("Unable to end workout session", error);
    return failure(error, "Unable to end workout. Please try again.");
  }
}

