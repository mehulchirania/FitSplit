"use server";

import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { requireFirebase, userDoc } from "./shared";
import { istDateKey, weekStartOf } from "@/lib/today";

// The workout logger writes through these. Each call writes only to the signed-in
// user's own data. A set is one liftLog document (sets === 1), as everywhere else.

const SetInput = z.object({
  exerciseId: z.string().min(1).max(80),
  weightKg: z.number().min(0).max(1000),
  reps: z.number().int().min(1).max(200),
  setIndex: z.number().int().min(1).max(50),
  sessionId: z.string().min(8).max(80)
});

type SetResult = { ok: true; id: string } | { ok: false; message: string };

export async function logSet(input: z.input<typeof SetInput>): Promise<SetResult> {
  try {
    const user = await requireAuth();
    const parsed = SetInput.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Enter whole reps (1 or more) and a weight of 0 or more." };
    const { exerciseId, weightKg, reps, setIndex, sessionId } = parsed.data;
    const id = randomUUID();
    const now = new Date().toISOString();
    await userDoc(requireFirebase(), user.uid, "liftLogs", id).set({
      id,
      memberId: user.uid,
      exerciseId,
      weight: weightKg,
      sets: 1,
      reps: String(reps),
      sessionId,
      setIndex,
      loggedAt: now,
      createdAt: now,
      updatedAt: now
    });
    return { ok: true, id };
  } catch (error) {
    console.error("Unable to log set", error);
    return { ok: false, message: "Could not save that set. Check your connection and try again." };
  }
}

/** Untick a set: remove the log written for it. */
export async function removeSet(id: string): Promise<{ ok: boolean }> {
  try {
    const user = await requireAuth();
    if (typeof id !== "string" || !id || id.includes("/")) return { ok: false };
    await userDoc(requireFirebase(), user.uid, "liftLogs", id).delete();
    return { ok: true };
  } catch (error) {
    console.error("Unable to remove set", error);
    return { ok: false };
  }
}

const FinishInput = z.object({
  sessionId: z.string().min(8).max(80),
  programId: z.string().min(1).max(120),
  dayId: z.string().min(1).max(160),
  dayTitle: z.string().max(80),
  startedAt: z.string().max(40),
  durationSec: z.number().min(0).max(60 * 60 * 24),
  setsCompleted: z.number().int().min(0).max(1000),
  exercisesCompleted: z.number().int().min(0).max(100),
  volumeKg: z.number().min(0).max(10_000_000)
});

/** Close out a workout: one session record plus the day marked done for this week. */
export async function finishWorkout(input: z.input<typeof FinishInput>): Promise<{ ok: boolean; message?: string }> {
  try {
    const user = await requireAuth();
    const parsed = FinishInput.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Could not read this workout." };
    const w = parsed.data;
    const db = requireFirebase();
    const now = new Date().toISOString();

    await userDoc(db, user.uid, "workoutSessions", w.sessionId).set({
      id: w.sessionId,
      memberId: user.uid,
      status: "completed",
      startedAt: w.startedAt,
      endedAt: now,
      programId: w.programId,
      programDayId: w.dayId,
      dayTitle: w.dayTitle,
      durationSec: Math.round(w.durationSec),
      setsCompleted: w.setsCompleted,
      exercisesCompleted: w.exercisesCompleted,
      volumeKg: Math.round(w.volumeKg),
      createdAt: now,
      updatedAt: now
    });

    // Keeps the trained-days logic honest for anything that still reads dayLogs.
    const weekStart = weekStartOf(istDateKey());
    const dayLogId = `${w.dayId}_${weekStart}`.replace(/[/#?[\]]/g, "_");
    await userDoc(db, user.uid, "dayLogs", dayLogId).set(
      {
        memberId: user.uid,
        programId: w.programId,
        dayId: w.dayId,
        weekStart,
        status: "completed",
        skipReason: null,
        note: null,
        loggedAt: now,
        updatedAt: now
      },
      { merge: true }
    );
    return { ok: true };
  } catch (error) {
    console.error("Unable to finish workout", error);
    return { ok: false, message: "Could not save your workout. Please try again." };
  }
}
