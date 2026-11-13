"use server";

import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { requireFirebase, userDoc } from "./shared";
import { userCollectionPath } from "../collections";
import { getWorkoutPrograms, isCustomProgramId, newCustomProgramId } from "../read-models/programs";
import { getExerciseLibrary } from "../read-models/exercises";
import { findExercise } from "@/lib/exercise-library";

// The active plan is stored per user: users/{uid}/programAssignments/* (at most one "active").
// Plans the user builds live in users/{uid}/customPrograms/*. Everything here writes only
// to the signed-in user's own data; ids posted by the client are never trusted blindly.

type Result = { ok: true } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

async function makeActive(uid: string, programId: string) {
  const db = requireFirebase();
  const now = new Date().toISOString();
  const existing = await db.collection(userCollectionPath(uid, "programAssignments")).where("status", "==", "active").get();
  await Promise.all(existing.docs.map((doc) => doc.ref.set({ status: "cancelled", updatedAt: now }, { merge: true })));
  const id = randomUUID();
  await userDoc(db, uid, "programAssignments", id).set({
    id,
    memberId: uid,
    programId,
    assignedAt: now,
    status: "active" as const,
    createdAt: now,
    updatedAt: now
  });
}

/** Make a plan (built-in or one of your own) the plan you are following. */
export async function activatePlan(programId: string): Promise<Result> {
  try {
    const user = await requireAuth();
    if (typeof programId !== "string" || !programId) return fail("Choose a plan first.");
    const isBuiltIn = getWorkoutPrograms().programs.some((p) => p.id === programId);
    if (!isBuiltIn) {
      if (!isCustomProgramId(programId)) return fail("That plan no longer exists.");
      const snap = await userDoc(requireFirebase(), user.uid, "customPrograms", programId).get();
      if (!snap.exists) return fail("That plan no longer exists.");
    }
    await makeActive(user.uid, programId);
    return { ok: true };
  } catch (error) {
    console.error("Unable to activate plan", error);
    return fail("Could not set your plan. Please try again.");
  }
}

const PlanInput = z.object({
  title: z.string().trim().min(1, "Give your plan a name.").max(60, "Plan names can be up to 60 characters."),
  days: z
    .array(
      z.object({
        title: z.string().trim().min(1, "Every day needs a name.").max(40),
        exercises: z
          .array(
            z.object({
              exerciseId: z.string().min(1).max(80),
              sets: z.number().int().min(1).max(12),
              reps: z.string().trim().min(1).max(20)
            })
          )
          .min(1, "Add at least one exercise to every day.")
          .max(30)
      })
    )
    .min(1, "Add at least one day.")
    .max(7, "A plan can have up to 7 days.")
});

export type PlanDraft = z.input<typeof PlanInput>;

/** Save a plan you built and start following it. */
export async function createCustomPlan(input: PlanDraft): Promise<Result & { programId?: string }> {
  try {
    const user = await requireAuth();
    const parsed = PlanInput.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check your plan and try again.");
    const { title, days } = parsed.data;
    if (days.some((d) => d.exercises.some((e) => !findExercise(e.exerciseId)))) {
      return fail("One of the exercises could not be found. Remove it and try again.");
    }

    const id = newCustomProgramId(randomUUID());
    const now = new Date().toISOString();
    await userDoc(requireFirebase(), user.uid, "customPrograms", id).set({
      id,
      memberId: user.uid,
      title,
      days: days.map((d, i) => ({
        id: `${id}-day-${i + 1}`,
        title: d.title,
        dayNumber: i + 1,
        focus: d.title,
        exercises: d.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets, reps: e.reps, restSeconds: 90 }))
      })),
      createdAt: now,
      updatedAt: now
    });
    await makeActive(user.uid, id);
    return { ok: true, programId: id };
  } catch (error) {
    console.error("Unable to create plan", error);
    return fail("Could not save your plan. Please try again.");
  }
}

/** Delete one of your own plans. If it was your active plan you will be asked to pick another. */
export async function deleteCustomPlan(programId: string): Promise<Result> {
  try {
    const user = await requireAuth();
    if (!isCustomProgramId(programId)) return fail("Only plans you built can be deleted.");
    const db = requireFirebase();
    await userDoc(db, user.uid, "customPrograms", programId).delete();
    const now = new Date().toISOString();
    const active = await db
      .collection(userCollectionPath(user.uid, "programAssignments"))
      .where("programId", "==", programId)
      .get();
    await Promise.all(active.docs.map((doc) => doc.ref.set({ status: "cancelled", updatedAt: now }, { merge: true })));
    return { ok: true };
  } catch (error) {
    console.error("Unable to delete plan", error);
    return fail("Could not delete this plan. Please try again.");
  }
}

export type ExerciseHit = { id: string; name: string; muscleGroup: string; equipment: string };

/** Exercise search for the plan builder: light records only, 30 at a time. */
export async function searchExercisesForPlan(query: string, muscleGroup = ""): Promise<ExerciseHit[]> {
  await requireAuth();
  const { results } = getExerciseLibrary({ q: String(query ?? "").slice(0, 60), muscleGroup: String(muscleGroup ?? "") });
  return results.slice(0, 30).map((e) => ({ id: e.id, name: e.name, muscleGroup: e.muscleGroup, equipment: e.equipment }));
}
