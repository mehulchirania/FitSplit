/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";

import { randomUUID } from "crypto";
import { requireRole, requireOwner } from "@/lib/auth";
import { collectionPaths, PRIMARY_GYM_ID } from "../collections";
import { hasFirebaseAdminConfig } from "../admin";
import type { FormActionState } from "@/types/action-state";
import type { WorkoutProgram } from "@/types/domain";
import { getWorkoutPrograms } from "@/lib/firebase/read-models/programs";
import workoutsData from "@/lib/workouts.json";
import {
  requireFirebase,
  requireText,
  getActionFormData,
  success,
  failure,
  scopedGymDoc,
  archiveDocumentSnapshot,
  mirrorGymScopedRecord,
  assertMemberBelongsToCallerGym,
  assertCanManageGym,
  sendPushToMember,
  revalidateGymTags
} from "./shared";
import { ensurePrimaryWorkspace } from "./gyms";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";

const AssignProgramSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  memberName: z.string().optional(),
  programId: ZodHelpers.textRequired("Workout program"),
  programTitle: z.string().optional()
});

const BulkAssignSchema = z.object({
  memberIds: ZodHelpers.textRequired("Member IDs"),
  programId: ZodHelpers.textRequired("Workout program"),
  programTitle: z.string().optional()
});

const DeleteProgramSchema = z.object({
  programId: ZodHelpers.textRequired("Program ID")
});

async function resolveExerciseRecordId(sourceExerciseId: string) {
  const db = requireFirebase();
  const sourceExercise = await db
    .collection(collectionPaths.exerciseCatalog)
    .doc(sourceExerciseId)
    .get();

  return sourceExercise.exists ? sourceExercise.id : sourceExerciseId;
}

export async function assignProgramToMember(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);

    const parsed = parseActionData(formData, AssignProgramSchema);
    if (!parsed.success) return parsed.state;

    const { memberId, programId } = parsed.data;
    const memberName = parsed.data.memberName || "Member";
    const programTitle = parsed.data.programTitle || "Workout program";

    if (!hasFirebaseAdminConfig()) {
      return success(`${programTitle} was assigned to ${memberName} (local mode).`, undefined, ["programs"]);
    }

    const db = requireFirebase();
    const assignmentId = randomUUID();
    const notificationId = randomUUID();
    const activityId = randomUUID();
    await assertMemberBelongsToCallerGym(currentUser, memberId);
    const now = new Date().toISOString();

    const assignGymId = currentUser.gymId ?? PRIMARY_GYM_ID;

    const existingAssignments = await db
      .collection(collectionPaths.programAssignments)
      .where("gymId", "==", assignGymId)
      .where("memberId", "==", memberId)
      .where("status", "==", "active")
      .get();
    const existingScopedAssignments = await scopedGymDoc(db, assignGymId, "programAssignments", "_placeholder")
      .parent
      .where("memberId", "==", memberId)
      .where("status", "==", "active")
      .get();

    await Promise.all(
      [...existingAssignments.docs, ...existingScopedAssignments.docs].map((doc) =>
        doc.ref.set({ status: "cancelled", updatedAt: now }, { merge: true })
      )
    );

    const assignmentRecord = {
      id: assignmentId,
      gymId: assignGymId,
      memberId,
      programId,
      assignedAt: now,
      status: "active",
      createdBy: currentUser.uid,
      createdAt: now,
      updatedAt: now
    };
    await db.collection(collectionPaths.programAssignments).doc(assignmentId).set(assignmentRecord);
    await mirrorGymScopedRecord(db, assignGymId, "programAssignments", assignmentId, assignmentRecord);

    const notificationRecord = {
      id: notificationId,
      recipientRole: "member",
      recipientId: memberId,
      gymId: assignGymId,
      type: "program_assigned",
      title: "Workout program assigned",
      body: `${programTitle} is now available in your weekly schedule.`,
      actionHref: "/member",
      memberId,
      createdAt: now
    };
    await db.collection(collectionPaths.notifications).doc(notificationId).set(notificationRecord);
    await mirrorGymScopedRecord(db, assignGymId, "notifications", notificationId, notificationRecord);

    const activityRecord = {
      id: activityId,
      gymId: assignGymId,
      audience: "owner",
      title: `Program assigned - ${programTitle}`,
      detail: `${memberName} now has ${programTitle} as the active weekly schedule.`,
      icon: "dumbbell",
      createdAt: now
    };
    await db.collection(collectionPaths.activityEvents).doc(activityId).set(activityRecord);
    await mirrorGymScopedRecord(db, assignGymId, "activityEvents", activityId, activityRecord);

    // Fire push notification (non-blocking, never throws)
    void sendPushToMember(
      db,
      memberId,
      "Workout program assigned",
      `${programTitle} is now available in your weekly schedule.`,
      "/member"
    );

    return success(`${programTitle} was assigned to ${memberName}.`, assignGymId, ["programs"]);
  } catch (error) {
    console.error("Unable to assign program to member", error);
    return failure(error, "Unable to assign workout program. Please try again.");
  }
}

/**
 * Assign the same workout program to multiple members at once.
 * Expects "memberIds" (JSON array), "programId", and "programTitle".
 */
export async function bulkAssignProgram(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireRole(["admin", "owner"]);
    if (!hasFirebaseAdminConfig()) return success("Assigned (local mode — no Firebase).", undefined, ["programs"]);

    const parsed = parseActionData(formData, BulkAssignSchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const memberIds: string[] = JSON.parse(parsed.data.memberIds);
    if (!Array.isArray(memberIds) || memberIds.length === 0) throw new Error("No members selected.");

    const { programId } = parsed.data;
    const programTitle = parsed.data.programTitle || "Workout program";
    const assignGymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const now = new Date().toISOString();

    await Promise.all(
      memberIds.map(async (memberId) => {
        await assertMemberBelongsToCallerGym(currentUser, memberId);
        const assignmentId = randomUUID();

        // Deactivate existing active assignments
        const existing = await db
          .collection(collectionPaths.programAssignments)
          .where("gymId", "==", assignGymId)
          .where("memberId", "==", memberId)
          .where("status", "==", "active")
          .get();
        await Promise.all(existing.docs.map((d) => d.ref.set({ status: "cancelled", updatedAt: now }, { merge: true })));

        const record = {
          id: assignmentId,
          gymId: assignGymId,
          memberId,
          programId,
          assignedBy: currentUser.uid,
          assignedAt: now,
          status: "active",
          createdAt: now,
          updatedAt: now
        };
        await db.collection(collectionPaths.programAssignments).doc(assignmentId).set(record);
        await mirrorGymScopedRecord(db, assignGymId, "programAssignments", assignmentId, record);
      })
    );

    revalidateGymTags(assignGymId, ["members", "notifications", "programs"]);
    return success(`"${programTitle}" assigned to ${memberIds.length} member${memberIds.length === 1 ? "" : "s"}.`, assignGymId, ["programs"]);
  } catch (error) {
    return failure(error, "Bulk program assignment failed.");
  }
}

export async function deleteCustomWorkoutProgram(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, DeleteProgramSchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const programId = parsed.data.programId;
    const programTitle = String(formData.get("programTitle") ?? "Program").trim();

    const programDoc = await db.collection(collectionPaths.workoutPrograms).doc(programId).get();
    const gymId = String(programDoc.data()?.gymId ?? currentUser.gymId ?? PRIMARY_GYM_ID);
    assertCanManageGym(currentUser, gymId);
    const scopedProgramDoc = await scopedGymDoc(db, gymId, "workoutPrograms", programId).get();

    await Promise.all([
      archiveDocumentSnapshot(db, programDoc, { entityType: "workoutProgram", deletedBy: currentUser.uid, gymId, reason: "program_deleted" }),
      archiveDocumentSnapshot(db, scopedProgramDoc, { entityType: "workoutProgram", deletedBy: currentUser.uid, gymId, reason: "program_deleted" })
    ]);

    if (programDoc.exists) {
      await db.collection(collectionPaths.workoutPrograms).doc(programId).delete();
    }
    if (scopedProgramDoc.exists) {
      await scopedGymDoc(db, gymId, "workoutPrograms", programId).delete();
    }

    return success(`${programTitle} was deleted.`, gymId, ["programs"]);
  } catch (error) {
    return failure(error, "Unable to delete program.");
  }
}

const UpdateProgramSchema = z.object({
  programId: ZodHelpers.textRequired("Program ID"),
  title: ZodHelpers.textRequired("Program title"),
  description: z.string().optional(),
  goal: z.string().optional(),
  difficulty: z.string().optional(),
  days: z.string().optional(),
  restSeconds: z.coerce.number().optional()
});

export async function updateCustomWorkoutProgram(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, UpdateProgramSchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const {
      programId, title, description = "", goal = "Custom member plan", difficulty = "beginner",
      days: rawDays = "", restSeconds = 75
    } = parsed.data;
    const now = new Date().toISOString();

    type DayInput = { title: string; exerciseIds: string[]; sets: number; reps: string; entrySets?: number[]; entryReps?: string[] };
    const daysJson = rawDays.trim();
    let dayInputs: DayInput[];

    try {
      dayInputs = JSON.parse(daysJson);
    } catch {
      throw new Error("Invalid days format.");
    }

    if (!dayInputs.length) throw new Error("A plan must have at least one day.");

    const days = await Promise.all(
      dayInputs.map(async (dayInput, i) => {
        const resolvedIds = await Promise.all(
          dayInput.exerciseIds.map((id) => resolveExerciseRecordId(id))
        );
        return {
          id: randomUUID(),
          title: dayInput.title || `Day ${i + 1}`,
          dayNumber: i + 1,
          focus: "Owner-created custom day",
          exercises: resolvedIds.map((exerciseId, idx) => ({
            exerciseId,
            sortOrder: idx + 1,
            sets: dayInput.entrySets?.[idx] ?? dayInput.sets ?? 3,
            reps: dayInput.entryReps?.[idx] ?? dayInput.reps ?? "8-12",
            restSeconds
          }))
        };
      })
    );

    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const programUpdate = {
        title,
        description: description.trim(),
        goal: goal.trim(),
        difficulty,
        daysPerWeek: days.length,
        days,
        updatedBy: currentUser.uid,
        updatedAt: now
      };

    await scopedGymDoc(db, gymId, "workoutPrograms", programId).set(
      {
        ...programUpdate,
        id: programId,
        gymId,
        scope: "custom"
      },
      { merge: true }
    );

    return success(`${title} was updated.`, gymId, ["programs"]);
  } catch (error) {
    return failure(error, "Unable to update custom plan.");
  }
}

const CreateProgramSchema = z.object({
  title: ZodHelpers.textRequired("Program title"),
  targetGymId: z.string().optional(),
  description: z.string().optional(),
  goal: z.string().optional(),
  difficulty: z.string().optional(),
  days: z.string().optional(),
  dayTitle: z.string().optional(),
  sets: z.coerce.number().optional(),
  reps: z.string().optional(),
  restSeconds: z.coerce.number().optional()
});

export async function createCustomWorkoutProgram(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, CreateProgramSchema);
    if (!parsed.success) return parsed.state;

    await ensurePrimaryWorkspace();
    const db = requireFirebase();
    const programId = randomUUID();
    const now = new Date().toISOString();
    const {
      title, targetGymId: rawTargetGym = "", description = "", goal = "Custom member plan", difficulty = "beginner",
      days: rawDays = "", dayTitle: rawDayTitle = "", sets = 3, reps = "8-12", restSeconds = 75
    } = parsed.data;

    const exerciseIds = formData
      .getAll("exerciseIds")
      .map((value) => String(value).trim())
      .filter(Boolean);

    // Multi-day support: builder serialises days as JSON in the "days" field.
    // Fall back to single-day for backward compat.
    type DayInput = { title: string; exerciseIds: string[]; sets: number; reps: string; entrySets?: number[]; entryReps?: string[] };
    let dayInputs: DayInput[];

    const daysJson = rawDays.trim();
    if (daysJson) {
      try {
        dayInputs = JSON.parse(daysJson);
      } catch {
        throw new Error("Invalid days format.");
      }
    } else {
      if (!exerciseIds.length) {
        throw new Error("Add at least one exercise before saving a custom plan.");
      }
      dayInputs = [{
        title: rawDayTitle || "Day title", // Note: The old code used requireText, so this effectively requires it if fallback is hit
        exerciseIds,
        sets,
        reps
      }];
    }

    if (!dayInputs.length) {
      throw new Error("A plan must have at least one day.");
    }

    const days = await Promise.all(
      dayInputs.map(async (dayInput, i) => {
        const resolvedIds = await Promise.all(
          dayInput.exerciseIds.map((id) => resolveExerciseRecordId(id))
        );
        return {
          id: randomUUID(),
          title: dayInput.title || `Day ${i + 1}`,
          dayNumber: i + 1,
          focus: "Owner-created custom day",
          exercises: resolvedIds.map((exerciseId, idx) => ({
            exerciseId,
            sortOrder: idx + 1,
            sets: dayInput.entrySets?.[idx] ?? dayInput.sets ?? 3,
            reps: dayInput.entryReps?.[idx] ?? dayInput.reps ?? "8-12",
            restSeconds
          }))
        };
      })
    );

    const targetGymId = rawTargetGym.trim();
    const gymId = currentUser.role === "admin"
      ? (targetGymId || currentUser.gymId || PRIMARY_GYM_ID)
      : (currentUser.gymId ?? PRIMARY_GYM_ID);
    const programRecord = {
      id: programId,
      gymId,
      title,
      description: description.trim(),
      goal: goal.trim(),
      difficulty,
      daysPerWeek: days.length,
      splitType: "custom",
      isActive: true,
      createdBy: currentUser.uid,
      days,
      createdAt: now,
      updatedAt: now
    };
    await scopedGymDoc(db, gymId, "workoutPrograms", programId).set(
      {
        ...programRecord,
        scope: "custom"
      },
      { merge: true }
    );

    return success(`${title} was saved to workout programs.`, gymId, ["programs"]);
  } catch (error) {
    console.error("Unable to create custom workout program", error);
    return failure(error, "Unable to save custom plan. Please try again.");
  }
}

const CreateAndAssignSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  memberName: z.string().optional(),
  title: ZodHelpers.textRequired("Program title"),
  description: z.string().optional(),
  goal: z.string().optional(),
  difficulty: z.string().optional(),
  days: z.string().optional(),
  restSeconds: z.coerce.number().optional()
});

export async function createAndAssignCustomProgram(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, CreateAndAssignSchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const {
      memberId, memberName: rawMemberName = "Member", title,
      description = "", goal = "Custom training", difficulty = "intermediate",
      days: rawDays = "", restSeconds = 75
    } = parsed.data;

    await assertMemberBelongsToCallerGym(currentUser, memberId);
    const memberName = rawMemberName.trim();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const programId = randomUUID();
    const assignmentId = randomUUID();
    const notificationId = randomUUID();
    const activityId = randomUUID();
    const now = new Date().toISOString();

    // Parse days JSON (same format as createCustomWorkoutProgram)
    type DayInput = { title: string; exerciseIds: string[]; sets: number; reps: string; entrySets?: number[]; entryReps?: string[] };
    const daysJson = rawDays.trim();
    let dayInputs: DayInput[];
    try {
      dayInputs = JSON.parse(daysJson);
    } catch {
      throw new Error("Invalid days format.");
    }
    if (!dayInputs.length) throw new Error("A plan must have at least one day.");

    const totalExercises = dayInputs.reduce((sum, d) => sum + d.exerciseIds.length, 0);
    if (totalExercises === 0) throw new Error("Add at least one exercise before saving.");

    const days = await Promise.all(
      dayInputs.map(async (dayInput, i) => {
        const resolvedIds = await Promise.all(
          dayInput.exerciseIds.map((id) => resolveExerciseRecordId(id))
        );
        return {
          id: randomUUID(),
          title: dayInput.title || `Day ${i + 1}`,
          dayNumber: i + 1,
          focus: "Member-specific custom plan",
          exercises: resolvedIds.map((exerciseId, idx) => ({
            exerciseId,
            sortOrder: idx + 1,
            sets: dayInput.entrySets?.[idx] ?? dayInput.sets ?? 3,
            reps: dayInput.entryReps?.[idx] ?? dayInput.reps ?? "8-12",
            restSeconds
          }))
        };
      })
    );

    // 1. Save the program to the gym's library so it appears on /owner/programs too
    const programRecord = {
      id: programId,
      gymId,
      title,
      description: description.trim() || `Custom plan built for ${memberName}`,
      goal: goal.trim(),
      difficulty,
      daysPerWeek: days.length,
      splitType: "custom",
      isActive: true,
      createdBy: currentUser.uid,
      days,
      createdAt: now,
      updatedAt: now
    };
    await scopedGymDoc(db, gymId, "workoutPrograms", programId).set(
      {
        ...programRecord,
        scope: "custom"
      },
      { merge: true }
    );

    // 2. Cancel any existing active assignments for this member
    const existing = await db
      .collection(collectionPaths.programAssignments)
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .where("status", "==", "active")
      .get();
    const existingScoped = await scopedGymDoc(db, gymId, "programAssignments", "_placeholder")
      .parent
      .where("memberId", "==", memberId)
      .where("status", "==", "active")
      .get();
    await Promise.all(
      [...existing.docs, ...existingScoped.docs].map((doc) => doc.ref.set({ status: "cancelled", updatedAt: now }, { merge: true }))
    );

    // 3. Create the assignment
    const assignmentRecord = {
      id: assignmentId,
      gymId,
      memberId,
      programId,
      assignedAt: now,
      status: "active",
      createdBy: currentUser.uid,
      createdAt: now,
      updatedAt: now
    };
    await db.collection(collectionPaths.programAssignments).doc(assignmentId).set(assignmentRecord);
    await mirrorGymScopedRecord(db, gymId, "programAssignments", assignmentId, assignmentRecord);

    // 4. Notify the member
    const notificationRecord = {
      id: notificationId,
      recipientRole: "member",
      recipientId: memberId,
      gymId,
      type: "program_assigned",
      title: "Workout program assigned",
      body: `${title} is now available in your weekly schedule.`,
      actionHref: "/member",
      memberId,
      createdAt: now
    };
    await db.collection(collectionPaths.notifications).doc(notificationId).set(notificationRecord);
    await mirrorGymScopedRecord(db, gymId, "notifications", notificationId, notificationRecord);

    // 5. Activity log
    const activityRecord = {
      id: activityId,
      gymId,
      audience: "owner",
      title: `Custom program assigned — ${title}`,
      detail: `${memberName} was assigned a custom ${days.length}-day plan.`,
      icon: "dumbbell",
      createdAt: now
    };
    await db.collection(collectionPaths.activityEvents).doc(activityId).set(activityRecord);
    await mirrorGymScopedRecord(db, gymId, "activityEvents", activityId, activityRecord);

    return success(`${title} was created and assigned to ${memberName}.`, gymId, ["programs"]);
  } catch (error) {
    console.error("Unable to create and assign custom program", error);
    return failure(error, "Unable to create custom workout. Please try again.");
  }
}
