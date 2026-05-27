/**
 * lib/ai.ts — Local workout insights (no external API).
 * Gemini/Google AI has been removed. This file contains only the
 * rule-based heuristic that works entirely from the member's own lift logs.
 */

import type { Exercise, LiftLog } from "@/types/domain";

/**
 * Generate trainer-style insights from lift log data.
 * Pure computation — no network calls, no API key required.
 */
export function getWorkoutInsights(liftLogs: LiftLog[], exercises: Exercise[]): string {
  if (liftLogs.length === 0) {
    return "Start logging your workouts to receive personalised trainer insights and progress tracking.";
  }

  const exerciseCounts: Record<string, number> = {};
  let maxWeight = 0;
  let maxWeightExerciseId = "";
  let totalSets = 0;

  for (const log of liftLogs) {
    exerciseCounts[log.exerciseId] = (exerciseCounts[log.exerciseId] ?? 0) + 1;
    totalSets += Number(log.sets || 0);
    const weight = Number(log.weight || 0);
    if (weight > maxWeight) {
      maxWeight = weight;
      maxWeightExerciseId = log.exerciseId;
    }
  }

  const topExerciseId =
    Object.entries(exerciseCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "";
  const topExerciseName =
    exercises.find((e) => e.id === topExerciseId)?.name ?? "your main lifts";
  const maxExerciseName =
    exercises.find((e) => e.id === maxWeightExerciseId)?.name ?? "your lifts";

  return [
    `**Consistency:** You're showing strong consistency with **${topExerciseName}** — keep building that habit.`,
    `**Strength marker:** Your peak logged load is **${maxWeight} kg** on **${maxExerciseName}**, giving your coach a solid baseline to programme from.`,
    `**Volume:** Across ${liftLogs.length} log entries and ${totalSets} total sets, you're building the progressive overload record needed to track real progress.`,
    `**Trainer tip:** On your next ${topExerciseName} set, try a 3-second lowering phase to improve time-under-tension and technique.`
  ].join("\n\n");
}
