"use server";

import { randomUUID } from "crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireRole, requireOwner } from "@/lib/auth";
import { collectionPaths, PRIMARY_GYM_ID } from "../collections";
import { hasFirebaseAdminConfig } from "../admin";
import type { FormActionState } from "@/types/action-state";
import type { WorkoutProgram } from "@/types/domain";
import { getWorkoutPrograms } from "@/lib/firebase/read-models";
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
  sendPushToMember
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

function pickProgramWithoutAi(programs: WorkoutProgram[], memberGoal: string) {
  const assignablePrograms = programs.filter((program) =>
    program.days.some((day) => day.exercises.length > 0)
  );
  const programPool = assignablePrograms.length ? assignablePrograms : programs;
  const goal = memberGoal.toLowerCase();

  if (goal.includes("strength")) {
    return programPool.find((program) => program.title.toLowerCase().includes("ppl")) ?? programPool[0];
  }

  if (goal.includes("fat") || goal.includes("loss") || goal.includes("weight")) {
    return (
      programPool.find((program) => program.daysPerWeek <= 4) ??
      programPool.find((program) => program.splitType === "ppl_upper_lower") ??
      programPool[0]
    );
  }

  if (goal.includes("muscle") || goal.includes("hypertrophy") || goal.includes("bulk")) {
    return (
      programPool.find((program) => program.splitType === "ppl_x2") ??
      programPool.find((program) => program.splitType === "combo_x2") ??
      programPool[0]
    );
  }

  return programPool.find((program) => program.splitType === "ppl_upper_lower") ?? programPool[0];
}

async function pickProgramWithGemini(programs: WorkoutProgram[], memberGoal: string) {
  const assignablePrograms = programs.filter((program) =>
    program.days.some((day) => day.exercises.length > 0)
  );
  const programPool = assignablePrograms.length ? assignablePrograms : programs;
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    return pickProgramWithoutAi(programPool, memberGoal);
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
  const prompt = [
    "Pick the best FitSplit workout program id for this gym member.",
    "Return only one exact id from the list. No markdown.",
    `Member goal: ${memberGoal || "General fitness"}`,
    "Programs:",
    ...programPool.map((program) =>
      `- ${program.id}: ${program.title}; goal=${program.goal}; days=${program.daysPerWeek}; difficulty=${program.difficulty}; split=${program.splitType}`
    )
  ].join("\n");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 32, temperature: 0.2 }
        }),
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        method: "POST"
      }
    );

    if (!response.ok) {
      return pickProgramWithoutAi(programPool, memberGoal);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const selectedId = text.replace(/[`"' ]/g, "");
    return programPool.find((program) => program.id === selectedId) ?? pickProgramWithoutAi(programPool, memberGoal);
  } catch (error) {
    console.warn("Gemini program selection failed; using fallback.", error);
    return pickProgramWithoutAi(programPool, memberGoal);
  }
}

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
      revalidatePath("/owner");
      revalidatePath("/member");
      return success(`${programTitle} was assigned to ${memberName} (local mode).`);
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

    revalidatePath("/owner");
    revalidatePath("/owner/members");
    revalidatePath(`/owner/members/${memberId}`);
    revalidatePath("/member");
    revalidatePath("/activity");

    return success(`${programTitle} was assigned to ${memberName}.`);
  } catch (error) {
    console.error("Unable to assign program to member", error);
    return failure(error, "Unable to assign workout program. Please try again.");
  }
}

const GenerateAssignSchema = z.object({
  memberId: ZodHelpers.textRequired("Member"),
  memberName: ZodHelpers.textRequired("Member name"),
  memberGoal: z.string().optional()
});

export async function generateAndAssignProgram(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireRole(["admin", "owner"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, GenerateAssignSchema);
    if (!parsed.success) return parsed.state;

    const { memberId, memberName, memberGoal: rawGoal = "General fitness" } = parsed.data;
    const memberGoal = rawGoal.trim() || "General fitness";
    const { programs } = await getWorkoutPrograms(currentUser.gymId);
    const selectedProgram = await pickProgramWithGemini(programs, memberGoal);

    if (!selectedProgram) {
      throw new Error("No workout programs are available to assign.");
    }

    const assignmentData = new FormData();
    assignmentData.set("memberId", memberId);
    assignmentData.set("memberName", memberName);
    assignmentData.set("programId", selectedProgram.id);
    assignmentData.set("programTitle", selectedProgram.title);
    return assignProgramToMember(previousStateOrFormData, assignmentData);
  } catch (error) {
    console.error("Unable to generate and assign program", error);
    return failure(error, "Unable to generate a workout assignment.");
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
    if (!hasFirebaseAdminConfig()) return success("Assigned (local mode — no Firebase).");

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

    revalidatePath("/owner");
    revalidatePath("/owner/members");
    revalidateTag(`gym:${assignGymId}`);
    return success(`"${programTitle}" assigned to ${memberIds.length} member${memberIds.length === 1 ? "" : "s"}.`);
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

    revalidatePath("/owner/programs");
    revalidatePath("/owner/members");

    return success(`${programTitle} was deleted.`);
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

    revalidatePath("/owner/programs");

    return success(`${title} was updated.`);
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

    revalidatePath("/owner/programs");

    return success(`${title} was saved to workout programs.`);
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

    revalidatePath("/owner");
    revalidatePath("/owner/members");
    revalidatePath(`/owner/members/${memberId}`);
    revalidatePath("/owner/programs");
    revalidatePath("/member");
    revalidatePath("/activity");

    return success(`${title} was created and assigned to ${memberName}.`);
  } catch (error) {
    console.error("Unable to create and assign custom program", error);
    return failure(error, "Unable to create custom workout. Please try again.");
  }
}
