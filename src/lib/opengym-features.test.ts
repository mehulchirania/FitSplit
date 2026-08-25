/**
 * Unit tests for opengym-ported functions in @fitsplit/core (workout-utils.ts).
 * All functions are pure, so these are straightforward input → output checks.
 */

import { describe, it, expect } from "vitest";
import {
  estimate1RM,
  best1RM,
  ONE_RM_REP_CAP,
  computeWeeklyStreak,
  computeWorkoutVolume,
  suggestNextSet,
  toCanonicalEffort,
  fromCanonicalEffort,
  formatEffort,
  getMuscleHeatmap,
  buildActivityHeatmapData,
} from "@fitsplit/core";

// ─── 1RM ─────────────────────────────────────────────────────────────────────

describe("estimate1RM", () => {
  it("returns 0 for bodyweight sets (weight 0)", () => {
    expect(estimate1RM(0, 10)).toBe(0);
  });

  it("returns weight unchanged for 1 rep (already a 1RM)", () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it("epley: 100 kg × 10 reps → ~133 kg", () => {
    expect(estimate1RM(100, 10, "epley")).toBe(133);
  });

  it("caps reps at ONE_RM_REP_CAP (12)", () => {
    // 100 kg × 12 and 100 kg × 20 should produce the same result
    const at12 = estimate1RM(100, 12, "epley");
    const at20 = estimate1RM(100, 20, "epley");
    expect(at12).toBe(at20);
  });
});

describe("best1RM", () => {
  it("returns the maximum across all three formulas", () => {
    const epley = estimate1RM(80, 10, "epley");
    const brzycki = estimate1RM(80, 10, "brzycki");
    const lombardi = estimate1RM(80, 10, "lombardi");
    expect(best1RM(80, 10)).toBe(Math.max(epley, brzycki, lombardi));
  });

  it("returns 0 for 0 weight", () => {
    expect(best1RM(0, 10)).toBe(0);
  });
});

// ─── Weekly streak ────────────────────────────────────────────────────────────

describe("computeWeeklyStreak", () => {
  it("returns 0 for an empty set", () => {
    expect(computeWeeklyStreak(new Set())).toBe(0);
  });

  it("returns 1 when only the current week has a training day", () => {
    // Use the current week's Monday as the reference; pick today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayKey = `${yyyy}-${mm}-${dd}`;

    // Figure out this week's Monday to pass as currentWeekStart
    const mondayOffset = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);
    const mYyyy = monday.getFullYear();
    const mMm = String(monday.getMonth() + 1).padStart(2, "0");
    const mDd = String(monday.getDate()).padStart(2, "0");
    const weekStart = `${mYyyy}-${mMm}-${mDd}`;

    expect(computeWeeklyStreak(new Set([todayKey]), weekStart)).toBe(1);
  });

  it("does not count a week with no training", () => {
    // Train this week but not last week → streak = 1
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const weekStart = fmt(monday);
    const trainedKeys = new Set([fmt(monday)]); // only this Mon
    expect(computeWeeklyStreak(trainedKeys, weekStart)).toBe(1);
  });
});

// ─── Volume ───────────────────────────────────────────────────────────────────

describe("computeWorkoutVolume", () => {
  it("sums weight × reps for done sets only", () => {
    const sets = [
      { weight: 100, reps: 10, done: true },
      { weight: 80, reps: 8, done: true },
      { weight: 60, reps: 12, done: false }, // not done — excluded
    ];
    expect(computeWorkoutVolume(sets)).toBe(100 * 10 + 80 * 8);
  });

  it("returns 0 for bodyweight sets (weight 0)", () => {
    const sets = [{ weight: 0, reps: 15, done: true }];
    expect(computeWorkoutVolume(sets)).toBe(0);
  });

  it("handles string reps", () => {
    const sets = [{ weight: 60, reps: "10", done: true }];
    expect(computeWorkoutVolume(sets)).toBe(600);
  });
});

// ─── Overload engine ──────────────────────────────────────────────────────────

describe("suggestNextSet", () => {
  it("returns a starter suggestion for empty history", () => {
    const s = suggestNextSet([]);
    expect(s.suggestedReps).toBe("8");
    expect(s.why).toMatch(/no history/i);
  });

  it("linear: adds 2.5 kg after hitting 8+ reps", () => {
    const s = suggestNextSet([{ weight: 60, reps: 10 }], "linear");
    expect(s.suggestedWeightKg).toBe(62.5);
    expect(s.why).toMatch(/linear/i);
  });

  it("linear: holds weight when reps below target", () => {
    const s = suggestNextSet([{ weight: 60, reps: 6 }], "linear");
    expect(s.suggestedWeightKg).toBe(60);
  });

  it("deloads 10% after 3 misses", () => {
    const history = [
      { weight: 80, reps: 5 },
      { weight: 80, reps: 4 },
      { weight: 80, reps: 6 },
    ];
    const s = suggestNextSet(history, "linear");
    expect(s.suggestedWeightKg).toBeLessThan(80);
    expect(s.why).toMatch(/deload/i);
  });

  it("double: increments reps until ceiling then bumps weight", () => {
    const atCeiling = suggestNextSet([{ weight: 60, reps: 12 }], "double");
    expect(atCeiling.suggestedWeightKg).toBe(62.5);

    const belowCeiling = suggestNextSet([{ weight: 60, reps: 9 }], "double");
    expect(belowCeiling.suggestedWeightKg).toBe(60);
    expect(Number(belowCeiling.suggestedReps)).toBe(10);
  });
});

// ─── Effort scale ─────────────────────────────────────────────────────────────

describe("effort helpers", () => {
  it("toCanonicalEffort: RIR 0 → 10 (max effort)", () => {
    expect(toCanonicalEffort(0, "rir")).toBe(10);
  });

  it("toCanonicalEffort: RIR 4 → 6", () => {
    expect(toCanonicalEffort(4, "rir")).toBe(6);
  });

  it("toCanonicalEffort: RPE 8 → 8 (passthrough)", () => {
    expect(toCanonicalEffort(8, "rpe")).toBe(8);
  });

  it("fromCanonicalEffort: round-trip RIR", () => {
    const canonical = toCanonicalEffort(3, "rir");
    expect(fromCanonicalEffort(canonical, "rir")).toBe(3);
  });

  it("formatEffort: RIR", () => {
    expect(formatEffort(2, "rir")).toBe("RIR 2");
  });

  it("formatEffort: RPE", () => {
    expect(formatEffort(8, "rpe")).toBe("RPE 8");
  });
});

// ─── Muscle heatmap ───────────────────────────────────────────────────────────

describe("getMuscleHeatmap", () => {
  const exercises = [
    { id: "bench", muscleGroup: "Chest" as const },
    { id: "squat", muscleGroup: "Legs" as const },
  ];

  it("returns an empty map for empty logs", () => {
    const map = getMuscleHeatmap([], exercises);
    expect(map.size).toBe(0);
  });

  it("normalises the highest-volume group to 1.0", () => {
    const logs = [
      { exerciseId: "bench", weight: 100, reps: 10 }, // vol = 1000
      { exerciseId: "squat", weight: 80, reps: 5 },   // vol = 400
    ];
    const map = getMuscleHeatmap(logs, exercises);
    expect(map.get("Chest")).toBe(1.0);
    expect(map.get("Legs")).toBeCloseTo(0.4);
  });
});

// ─── Activity heatmap ─────────────────────────────────────────────────────────

describe("buildActivityHeatmapData", () => {
  it("produces exactly N entries", () => {
    const map = buildActivityHeatmapData(new Set(), 28);
    expect(map.size).toBe(28);
  });

  it("marks trained days as 1 and rest days as 0", () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayKey = `${yyyy}-${mm}-${dd}`;

    const map = buildActivityHeatmapData(new Set([todayKey]), 7);
    expect(map.get(todayKey)).toBe(1);

    // All other days in the 7-day window should be 0
    const others = Array.from(map.entries()).filter(([k]) => k !== todayKey);
    others.forEach(([, v]) => expect(v).toBe(0));
  });
});
