"use server";

import { GoogleGenAI } from "@google/genai";
import { requireAuth } from "./auth";
import { getExerciseCatalog, getLiftLogsForMember } from "./firebase/read-models";
import type { Exercise, LiftLog, WorkoutExercise } from "@/types/domain";

type SmartSwap = {
  from: string;
  to: string;
  reason: string;
};

type RehabSuggestion = {
  name: string;
  reason: string;
};

export type SmartSwapResult = {
  injury: string;
  summary: string;
  swaps: SmartSwap[];
  addedStretches: RehabSuggestion[];
  routine: WorkoutExercise[];
};

export async function generateWorkoutSummary(memberId: string) {
  let liftLogs: LiftLog[] = [];
  let exercises: Exercise[] = [];

  try {
    const currentUser = await requireAuth();
    if (currentUser.role === "member" && (currentUser.memberId ?? currentUser.uid) !== memberId) {
      throw new Error("Not authorized to view this member's data.");
    }

    const [logsResult, exercisesResult] = await Promise.all([
      getLiftLogsForMember(memberId),
      getExerciseCatalog()
    ]);
    liftLogs = logsResult.liftLogs ?? [];
    exercises = exercisesResult.exercises ?? [];

    if (liftLogs.length === 0) {
      return "You haven't logged any lifts yet. Start logging your workouts to receive personalized AI insights and progress tracking.";
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const recentLogs = liftLogs
      .slice(0, 15)
      .map((log) => {
        const exerciseName = exercises.find((exercise) => exercise.id === log.exerciseId)?.name ?? "Exercise";
        const loggedDate = log.loggedAt ? new Date(log.loggedAt).toLocaleDateString() : "recently";
        return `- ${exerciseName}: ${log.weight}kg for ${log.sets} sets of [${log.reps}] reps. (Logged: ${loggedDate})`;
      })
      .join("\n");

    const prompt = `
      You are an encouraging and expert Semi-Personal Trainer for the FitSplit platform.
      Analyze the following recent lift logs for a member.

      Recent Lifts:
      ${recentLogs}

      Please provide a highly personalized, short (max 3-4 sentences) summary of their progress.
      Highlight any notable volume, consistency, or exercises they seem to be focusing on.
      End with a short, punchy, and actionable motivational tip.
      Keep the formatting clean using markdown.
    `;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini AI Error: falling back to offline analyzer.", error);

    if (liftLogs.length > 0) {
      return generateLocalInsights(liftLogs, exercises);
    }

    return "We could not generate your AI summary right now. Check that Gemini is configured and try again.";
  }
}

function generateLocalInsights(liftLogs: LiftLog[], exercises: Exercise[]) {
  if (liftLogs.length === 0) {
    return "You haven't logged any lifts yet. Start logging your workouts to receive personalized AI insights and progress tracking.";
  }

  const exerciseCounts: Record<string, number> = {};
  let maxWeight = 0;
  let maxWeightExerciseId = "";
  let totalSets = 0;

  liftLogs.forEach((log) => {
    exerciseCounts[log.exerciseId] = (exerciseCounts[log.exerciseId] ?? 0) + 1;
    totalSets += Number(log.sets || 0);
    const weight = Number(log.weight || 0);
    if (weight > maxWeight) {
      maxWeight = weight;
      maxWeightExerciseId = log.exerciseId;
    }
  });

  const topExerciseId = Object.entries(exerciseCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "";
  const topExerciseName = exercises.find((exercise) => exercise.id === topExerciseId)?.name ?? "your main lifts";
  const maxExerciseName = exercises.find((exercise) => exercise.id === maxWeightExerciseId)?.name ?? "your lifts";

  return [
    `**Trainer Assessment:** You are showing strong consistency, especially with **${topExerciseName}**.`,
    `Your peak logged load is **${maxWeight}kg** on **${maxExerciseName}**, which gives your coach a useful strength marker to build from.`,
    `Across ${liftLogs.length} logged entries and ${totalSets} total sets, you are creating the data needed for progressive overload.`,
    `**Trainer Tip:** In your next session, control the lowering phase on **${topExerciseName}** for a full 3 seconds to improve tension and technique.`
  ].join(" ");
}

export async function generateSmartSwaps(
  memberId: string,
  dayExercises: WorkoutExercise[],
  injuryDescription: string,
  exercises: Exercise[]
): Promise<SmartSwapResult | null> {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role === "member" && (currentUser.memberId ?? currentUser.uid) !== memberId) {
      throw new Error("Not authorized to view this member's data.");
    }

    const injury = injuryDescription.trim();
    if (!injury) {
      return null;
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const catalogJson = exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      equipment: exercise.equipment,
      instructions: exercise.instructions
    }));

    const dayExercisesJson = dayExercises.map((dayExercise) => {
      const exercise = exercises.find((item) => item.id === dayExercise.exerciseId);
      return {
        exerciseId: dayExercise.exerciseId,
        name: exercise?.name ?? "Unknown Exercise",
        muscleGroup: exercise?.muscleGroup ?? "Unknown",
        sets: dayExercise.sets,
        reps: dayExercise.reps,
        restSeconds: dayExercise.restSeconds,
        notes: dayExercise.notes
      };
    });

    const prompt = `
      You are an elite sports physiotherapist and certified strength and conditioning specialist (CSCS).
      A member has reported the following physical limitation/injury: "${injury}".

      Here is their scheduled workout for today:
      ${JSON.stringify(dayExercisesJson, null, 2)}

      Here is the complete gym exercise catalog:
      ${JSON.stringify(catalogJson, null, 2)}

      Your tasks:
      1. Identify any exercises that are contraindicated or unsafe for the reported injury/limitation.
      2. Suggest alternatives only from the provided gym exercise catalog.
      3. Keep safe exercises as-is.
      4. Provide a clinical summary of the routine changes in 1-2 sentences.
      5. Explain each swap in 1 sentence.
      6. Output a final routine list using the requested schema.

      Respond strictly in valid JSON. Do not wrap the response in markdown.
      {
        "injury": "${injury}",
        "summary": "Clinical summary of modifications...",
        "swaps": [
          { "from": "Original exercise", "to": "Alternative exercise", "reason": "Explanation of swap..." }
        ],
        "addedStretches": [],
        "routine": [
          { "exerciseId": "id_from_catalog", "sets": 3, "reps": "12", "restSeconds": 60, "notes": "AI swap note" }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
      contents: prompt,
    });

    const responseText = response.text ?? "";
    const jsonText = responseText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return normalizeSmartSwapResult(JSON.parse(jsonText) as unknown, injury);
  } catch (error) {
    console.error("AI swap generation failed. Falling back to local heuristics.", error);
    return null;
  }
}

function normalizeSmartSwapResult(value: unknown, fallbackInjury: string): SmartSwapResult | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const routine = Array.isArray(record.routine)
    ? record.routine.map(normalizeWorkoutExercise).filter((item): item is WorkoutExercise => Boolean(item))
    : [];

  if (routine.length === 0) return null;

  return {
    injury: String(record.injury ?? fallbackInjury),
    summary: String(record.summary ?? "Workout adjusted based on the reported limitation."),
    swaps: normalizeSwaps(record.swaps),
    addedStretches: normalizeRehabSuggestions(record.addedStretches),
    routine
  };
}

function normalizeWorkoutExercise(value: unknown): WorkoutExercise | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const exerciseId = String(record.exerciseId ?? "").trim();
  if (!exerciseId) return null;

  return {
    exerciseId,
    sets: record.sets == null ? undefined : Number(record.sets),
    reps: record.reps == null ? undefined : String(record.reps),
    restSeconds: record.restSeconds == null ? undefined : Number(record.restSeconds),
    notes: record.notes == null ? undefined : String(record.notes)
  };
}

function normalizeSwaps(value: unknown): SmartSwap[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      from: String(item.from ?? ""),
      to: String(item.to ?? ""),
      reason: String(item.reason ?? "")
    }))
    .filter((item) => item.from || item.to || item.reason);
}

function normalizeRehabSuggestions(value: unknown): RehabSuggestion[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      name: String(item.name ?? ""),
      reason: String(item.reason ?? "")
    }))
    .filter((item) => item.name || item.reason);
}
