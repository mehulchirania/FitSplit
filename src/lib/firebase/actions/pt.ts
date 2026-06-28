/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";

import { randomUUID } from "crypto";
import { collectionPaths, PRIMARY_GYM_ID } from "../collections";
import type { FormActionState } from "@/types/action-state";
import {
  requireFirebase,
  requireText,
  getActionFormData,
  success,
  failure,
  scopedGymDoc,
  mirrorGymScopedRecord,
  requireGymStaff,
  parsePTPlannedExercises,
  sendPushToMember
} from "./shared";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";

const BookPTSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  memberName: z.string().optional(),
  trainerId: ZodHelpers.textRequired("Trainer"),
  trainerName: z.string().optional(),
  planStartDate: ZodHelpers.textRequired("PT start date"),
  planDurationDays: z.coerce
    .number()
    .int("PT plan duration must be a whole number of days.")
    .min(1, "PT plan duration must be at least 1 day.")
    .max(365, "PT plan duration must be 365 days or less.")
    .default(30),
  gymId: z.string().optional(),
  plannedExercises: z.string().optional(),
  notes: z.string().optional()
});

/**
 * Book a new PT plan for a member.
 *
 * FormData keys:
 *   memberId, memberName?, trainerId, trainerName?, planStartDate,
 *   planDurationDays?, plannedExercises?, notes?
 */
export async function bookPTSession(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireGymStaff();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, BookPTSchema);
    if (!parsed.success) return parsed.state;

    const {
      memberId, memberName: rawMemberName = "", trainerId, trainerName: rawTrainerName = "",
      planStartDate, planDurationDays = 30, gymId: requestedGymId = "", plannedExercises: rawExercises = "", notes: rawNotes = ""
    } = parsed.data;

    const memberName = rawMemberName.trim() || undefined;
    const trainerName = rawTrainerName.trim() || undefined;
    const scheduledAt = `${planStartDate}T06:00:00`;
    const durationMinutes = planDurationDays * 24 * 60;
    const notes = rawNotes.trim() || undefined;

    if (isNaN(new Date(scheduledAt).getTime())) {
      throw new Error("PT start date is invalid.");
    }
    const gymId = currentUser.role === "admin"
      ? (requestedGymId.trim() || currentUser.gymId || PRIMARY_GYM_ID)
      : (currentUser.gymId ?? PRIMARY_GYM_ID);
    const plannedExercises = parsePTPlannedExercises(rawExercises);
    if (plannedExercises.length === 0) {
      throw new Error("Add at least one exercise to the PT plan.");
    }

    const sessionId = randomUUID();
    const now = new Date().toISOString();
    const planEnd = new Date(`${planStartDate}T00:00:00`);
    planEnd.setDate(planEnd.getDate() + planDurationDays - 1);
    const planEndDate = planEnd.toISOString().slice(0, 10);

    const sessionRecord = {
      id: sessionId,
      gymId,
      memberId,
      memberName,
      trainerId,
      trainerName,
      scheduledAt,
      durationMinutes,
      planStartDate,
      planEndDate,
      planDurationDays,
      status: "scheduled",
      plannedExercises,
      notes,
      createdAt: now,
      updatedAt: now
    };

    const db = requireFirebase();
    await mirrorGymScopedRecord(db, gymId, "ptSessions", sessionId, sessionRecord);

    // Notification is written by the onPTPlanCreated Cloud Function trigger
    // using deterministic ID "pt_plan_${sessionId}" + an existence check, so
    // no inline write is needed here (CF-MIRROR cleanup).

    // Fire push notification (non-blocking, never throws)
    void sendPushToMember(
      db,
      memberId,
      "PT Plan Assigned",
      `Your personal training plan runs from ${planStartDate} to ${planEndDate}.`,
      "/member/pt-history"
    );

    return success(`PT plan assigned. Plan ID: ${sessionId}`, gymId, ["pt-sessions", "pt-lift-logs"]);
  } catch (error) {
    console.error("Unable to book PT plan", error);
    return failure(error, "Could not assign PT plan. Please try again.");
  }
}

/**
 * Start an active PT session (trainer taps "Start session").
 * Any gym staff can start any session for trainer-NA cover.
 *
 * FormData keys: ptSessionId
 */
const SessionIdSchema = z.object({
  ptSessionId: ZodHelpers.textRequired("Session ID")
});

/**
 * Resolve a PT session for a lifecycle write. The UI lists sessions from the
 * gym-scoped path (`gyms/{gymId}/ptSessions`), but legacy data may live only
 * there OR only in the root mirror — so look up the gym-scoped copy first and
 * fall back to root. Returns an `applyPatch` that updates whichever copies
 * exist (never creating a partial doc), keeping both mirrors in sync.
 */
async function loadPTSessionForWrite(
  db: ReturnType<typeof requireFirebase>,
  ptSessionId: string,
  currentUser: { role: string; gymId?: string }
) {
  const fallbackGym = currentUser.gymId ?? PRIMARY_GYM_ID;
  const rootRef = db.collection(collectionPaths.ptSessions).doc(ptSessionId);

  let snap = await scopedGymDoc(db, fallbackGym, "ptSessions", ptSessionId).get();
  if (!snap.exists) {
    snap = await rootRef.get();
  }
  if (!snap.exists) return null;

  const session = snap.data()!;
  const gymId = String(session.gymId ?? fallbackGym);

  async function applyPatch(patch: Record<string, unknown>) {
    // `.update()` throws on a missing doc — catch so we only touch existing
    // copies and never write an incomplete mirror.
    await scopedGymDoc(db, gymId, "ptSessions", ptSessionId).update(patch).catch(() => {});
    await rootRef.update(patch).catch(() => {});
  }

  return { session, gymId, applyPatch };
}

export async function startPTSession(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireGymStaff();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, SessionIdSchema);
    if (!parsed.success) return parsed.state;

    const ptSessionId = parsed.data.ptSessionId;
    const db = requireFirebase();
    const now = new Date().toISOString();

    const loaded = await loadPTSessionForWrite(db, ptSessionId, currentUser);
    if (!loaded) throw new Error("PT session not found.");
    const { session, gymId, applyPatch } = loaded;
    if (currentUser.role !== "admin" && currentUser.gymId !== gymId) {
      throw new Error("This PT session belongs to another gym.");
    }
    if (session.status !== "scheduled") {
      throw new Error(`Cannot start a session with status "${session.status}".`);
    }

    await applyPatch({ status: "active", startedAt: now, updatedAt: now });

    return success("Session started.", gymId, ["pt-sessions", "pt-lift-logs"]);
  } catch (error) {
    console.error("Unable to start PT session", error);
    return failure(error, "Could not start session. Please try again.");
  }
}

/**
 * Log a single lift set during an active PT session.
 * Dual-writes to ptLiftLogs AND liftLogs (with source: "trainer") so the
 * member's history automatically includes PT-logged sets.
 *
 * FormData keys: ptSessionId, memberId, exerciseId, exerciseName?,
 *                weight, sets, reps, notes?
 */
const LogLiftSchema = z.object({
  ptSessionId: ZodHelpers.textRequired("Session ID"),
  memberId: ZodHelpers.textRequired("Member"),
  exerciseId: ZodHelpers.textRequired("Exercise"),
  exerciseName: z.string().optional(),
  weight: z.coerce.number().optional(),
  sets: z.coerce.number().optional(),
  reps: ZodHelpers.textRequired("Reps"),
  notes: z.string().optional()
});

export async function logPTLiftSet(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireGymStaff();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, LogLiftSchema);
    if (!parsed.success) return parsed.state;

    const {
      ptSessionId, memberId, exerciseId, exerciseName: rawExName = "",
      weight = 0, sets = 1, reps, notes: rawNotes = ""
    } = parsed.data;

    const exerciseName = rawExName.trim() || undefined;
    const notes = rawNotes.trim() || undefined;

    if (weight < 0 || sets < 1) throw new Error("Invalid lift values.");

    const now = new Date().toISOString();
    const logId = randomUUID();

    const db = requireFirebase();

    // Verify session is active
    const sessionSnap = await db.collection(collectionPaths.ptSessions).doc(ptSessionId).get();
    if (!sessionSnap.exists) throw new Error("PT session not found.");
    const session = sessionSnap.data()!;
    const gymId = String(session.gymId ?? currentUser.gymId ?? PRIMARY_GYM_ID);
    if (currentUser.role !== "admin" && currentUser.gymId !== gymId) {
      throw new Error("This PT session belongs to another gym.");
    }
    if (session.status !== "active") {
      throw new Error("Lift can only be logged on an active session.");
    }

    // Write ptLiftLog
    const ptLiftLogRecord = {
      id: logId,
      gymId,
      ptSessionId,
      memberId,
      trainerId: currentUser.uid,
      exerciseId,
      exerciseName,
      weight,
      sets,
      reps,
      notes,
      loggedAt: now,
      createdAt: now,
      updatedAt: now
    };
    await mirrorGymScopedRecord(db, gymId, "ptLiftLogs", logId, ptLiftLogRecord);

    // Dual-write to liftLogs so member workout history inherits PT sets
    const liftLogRecord = {
      id: logId,
      gymId,
      memberId,
      exerciseId,
      weight,
      sets,
      reps,
      sessionId: ptSessionId,
      source: "trainer",
      ptSessionId,
      loggedByTrainerId: currentUser.uid,
      loggedAt: now,
      createdAt: now,
      updatedAt: now
    };
    await mirrorGymScopedRecord(db, gymId, "liftLogs", logId, liftLogRecord);

    return success("Lift logged.", gymId, ["pt-sessions", "pt-lift-logs"]);
  } catch (error) {
    console.error("Unable to log PT lift set", error);
    return failure(error, "Could not log lift. Please try again.");
  }
}

/**
 * Complete a PT session (trainer taps "End session").
 *
 * FormData keys: ptSessionId
 */
export async function completePTSession(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireGymStaff();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, SessionIdSchema);
    if (!parsed.success) return parsed.state;

    const ptSessionId = parsed.data.ptSessionId;
    const db = requireFirebase();
    const now = new Date().toISOString();

    const loaded = await loadPTSessionForWrite(db, ptSessionId, currentUser);
    if (!loaded) throw new Error("PT session not found.");
    const { session, gymId, applyPatch } = loaded;
    if (currentUser.role !== "admin" && currentUser.gymId !== gymId) {
      throw new Error("This PT session belongs to another gym.");
    }
    if (session.status !== "active") {
      throw new Error(`Cannot complete a session with status "${session.status}".`);
    }

    await applyPatch({ status: "completed", endedAt: now, updatedAt: now });

    // Notify the member
    const notifId = randomUUID();
    const notifRecord = {
      id: notifId,
      gymId,
      recipientId: session.memberId,
      recipientRole: "member",
      type: "pt_session_completed",
      title: "PT Session Completed",
      body: "Your personal training session has been completed. Great work!",
      actionHref: "/member/pt-history",
      ptSessionId,
      memberId: session.memberId,
      createdAt: now,
      updatedAt: now
    };
    await mirrorGymScopedRecord(db, gymId, "notifications", notifId, notifRecord);

    // Fire push notification (non-blocking, never throws)
    void sendPushToMember(
      db,
      session.memberId,
      "PT Session Completed",
      "Your personal training session has been completed. Great work!",
      "/member/pt-history"
    );

    return success("Session completed.", gymId, ["pt-sessions", "pt-lift-logs"]);
  } catch (error) {
    console.error("Unable to complete PT session", error);
    return failure(error, "Could not complete session. Please try again.");
  }
}

/**
 * Cancel a PT session.
 *
 * FormData keys: ptSessionId, cancelReason?
 */
const CancelSessionSchema = z.object({
  ptSessionId: ZodHelpers.textRequired("Session ID"),
  cancelReason: z.string().optional()
});

export async function cancelPTSession(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireGymStaff();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, CancelSessionSchema);
    if (!parsed.success) return parsed.state;

    const { ptSessionId, cancelReason: rawReason = "" } = parsed.data;
    const cancelReason = rawReason.trim() || undefined;
    const db = requireFirebase();
    const now = new Date().toISOString();

    const loaded = await loadPTSessionForWrite(db, ptSessionId, currentUser);
    if (!loaded) throw new Error("PT session not found.");
    const { session, gymId, applyPatch } = loaded;
    if (currentUser.role !== "admin" && currentUser.gymId !== gymId) {
      throw new Error("This PT session belongs to another gym.");
    }
    if (session.status === "completed" || session.status === "cancelled") {
      throw new Error(`Session is already ${session.status}.`);
    }

    await applyPatch({ status: "cancelled", cancelReason, updatedAt: now });

    // Notify the member
    const notifId = randomUUID();
    const notifRecord = {
      id: notifId,
      gymId,
      recipientId: session.memberId,
      recipientRole: "member",
      type: "pt_session_cancelled",
      title: "PT Session Cancelled",
      body: cancelReason
        ? `Your PT session has been cancelled. Reason: ${cancelReason}`
        : "Your PT session has been cancelled.",
      actionHref: "/member/pt-history",
      ptSessionId,
      memberId: session.memberId,
      createdAt: now,
      updatedAt: now
    };
    await mirrorGymScopedRecord(db, gymId, "notifications", notifId, notifRecord);

    return success("Session cancelled.", gymId, ["pt-sessions", "pt-lift-logs"]);
  } catch (error) {
    console.error("Unable to cancel PT session", error);
    return failure(error, "Could not cancel session. Please try again.");
  }
}

/**
 * Reschedule an existing PT session to a new time.
 * Can also reassign to a different trainer for cover.
 *
 * FormData keys: ptSessionId, scheduledAt (ISO), trainerId?, trainerName?,
 *                durationMinutes?, notes?
 */
const RescheduleSchema = z.object({
  ptSessionId: ZodHelpers.textRequired("Session ID"),
  scheduledAt: ZodHelpers.textRequired("New date/time"),
  trainerId: z.string().optional(),
  trainerName: z.string().optional(),
  durationMinutes: z.coerce.number().optional(),
  notes: z.string().optional()
});

export async function reschedulePTSession(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireGymStaff();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, RescheduleSchema);
    if (!parsed.success) return parsed.state;

    const { ptSessionId, scheduledAt, trainerId, trainerName, durationMinutes, notes: rawNotes } = parsed.data;

    if (isNaN(new Date(scheduledAt).getTime())) {
      throw new Error("Scheduled date/time is invalid.");
    }

    const db = requireFirebase();
    const now = new Date().toISOString();

    const loaded = await loadPTSessionForWrite(db, ptSessionId, currentUser);
    if (!loaded) throw new Error("PT session not found.");
    const { session, gymId, applyPatch } = loaded;
    if (currentUser.role !== "admin" && currentUser.gymId !== gymId) {
      throw new Error("This PT session belongs to another gym.");
    }
    if (session.status === "completed" || session.status === "cancelled") {
      throw new Error(`Cannot reschedule a ${session.status} session.`);
    }

    const patch: Record<string, unknown> = {
      scheduledAt,
      status: "scheduled",  // reset to scheduled if it was somehow active
      notified24h: false,   // reset flags so they get notified again
      notified1h: false,
      updatedAt: now
    };

    const newTrainerId = (trainerId || "").trim();
    if (newTrainerId) patch.trainerId = newTrainerId;

    const newTrainerName = (trainerName || "").trim();
    if (newTrainerName) patch.trainerName = newTrainerName;

    if (durationMinutes && durationMinutes >= 15 && durationMinutes <= 240) {
      patch.durationMinutes = durationMinutes;
    }

    const notes = (rawNotes || "").trim();
    if (notes) patch.notes = notes;

    await applyPatch(patch);

    // Notify the member
    const notifId = randomUUID();
    const notifRecord = {
      id: notifId,
      gymId,
      recipientId: session.memberId,
      recipientRole: "member",
      type: "pt_session_rescheduled",
      title: "PT Session Rescheduled",
      body: `Your PT session has been rescheduled to ${new Date(scheduledAt).toLocaleString()}.`,
      actionHref: "/member/pt-history",
      ptSessionId,
      memberId: session.memberId,
      createdAt: now,
      updatedAt: now
    };
    await mirrorGymScopedRecord(db, gymId, "notifications", notifId, notifRecord);

    return success("Session rescheduled.", gymId, ["pt-sessions", "pt-lift-logs"]);
  } catch (error) {
    console.error("Unable to reschedule PT session", error);
    return failure(error, "Could not reschedule session. Please try again.");
  }
}
