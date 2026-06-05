import { describe, it, expect } from "vitest";
import {
  getWeekStart,
  getDefaultDayIndex,
  getInjuryRule,
  isContraindicated,
  findAlternative,
  getExerciseName,
  getDayMuscleTargets,
  SKIP_REASONS,
  dayNames
} from "@/lib/workout-utils";
import type { Exercise, WorkoutExercise } from "@/types/domain";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeExercise(overrides: Partial<Exercise> & { id: string; name: string }): Exercise {
  return {
    muscleGroup: "Core",
    equipment: "bodyweight",
    instructions: "",
    videoSource: "none",
    videoUrl: "",
    gymVideoUrl: "",
    gymVideoSource: "none",
    thumbnailUrl: "",
    ownerOnly: false,
    ...overrides
  };
}

function makeWorkoutExercise(exerciseId: string): WorkoutExercise {
  return { exerciseId };
}

// ─── getWeekStart ─────────────────────────────────────────────────────────────

describe("getWeekStart", () => {
  it("returns the Monday of the current week for a Wednesday", () => {
    // 2026-05-20 is a Wednesday
    const result = getWeekStart(new Date("2026-05-20"));
    expect(result).toBe("2026-05-18"); // Monday
  });

  it("returns the same Monday when the input is a Monday", () => {
    // 2026-05-18 is a Monday
    const result = getWeekStart(new Date("2026-05-18"));
    expect(result).toBe("2026-05-18");
  });

  it("returns the previous Monday when the input is a Sunday", () => {
    // 2026-05-24 is a Sunday
    const result = getWeekStart(new Date("2026-05-24"));
    expect(result).toBe("2026-05-18");
  });

  it("returns a string in YYYY-MM-DD format", () => {
    const result = getWeekStart(new Date("2026-01-01"));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── getInjuryRule ────────────────────────────────────────────────────────────

describe("getInjuryRule", () => {
  it("returns shoulder rule for 'shoulder pain'", () => {
    const rule = getInjuryRule("shoulder pain");
    expect(rule.avoidMuscles).toContain("Shoulders");
    expect(rule.avoidMuscles).toContain("Chest");
    expect(rule.preferredMuscles).toContain("Legs");
  });

  it("returns knee rule for 'knee injury'", () => {
    const rule = getInjuryRule("knee injury");
    expect(rule.avoidMuscles).toContain("Legs");
    expect(rule.avoidTerms).toContain("squat");
  });

  it("returns back rule for 'lower back strain'", () => {
    const rule = getInjuryRule("lower back strain");
    expect(rule.avoidMuscles).toContain("Back");
    expect(rule.avoidTerms).toContain("deadlift");
  });

  it("returns back rule for 'spine'", () => {
    const rule = getInjuryRule("spine");
    expect(rule.avoidMuscles).toContain("Back");
  });

  it("returns generic recovery rule for unknown injury", () => {
    const rule = getInjuryRule("ankle");
    expect(rule.avoidMuscles).toHaveLength(0);
    expect(rule.avoidTerms).toHaveLength(0);
    expect(rule.preferredMuscles.length).toBeGreaterThan(0);
  });

  it("is case-insensitive", () => {
    const lower = getInjuryRule("shoulder");
    const upper = getInjuryRule("SHOULDER");
    expect(lower.avoidMuscles).toEqual(upper.avoidMuscles);
  });
});

// ─── isContraindicated ────────────────────────────────────────────────────────

describe("isContraindicated", () => {
  const exercises: Exercise[] = [
    makeExercise({ id: "e1", name: "Overhead Press", muscleGroup: "Shoulders", instructions: "press overhead" }),
    makeExercise({ id: "e2", name: "Bench Press",    muscleGroup: "Chest",     instructions: "flat bench press" }),
    makeExercise({ id: "e3", name: "Squat",          muscleGroup: "Legs",      instructions: "squat down" }),
    makeExercise({ id: "e4", name: "Plank",          muscleGroup: "Core",      instructions: "hold position" }),
  ];

  it("flags a Shoulders exercise as contraindicated for shoulder injury", () => {
    const item = makeWorkoutExercise("e1");
    expect(isContraindicated(item, "shoulder", exercises)).toBe(true);
  });

  it("flags a Chest exercise (Bench Press) as contraindicated for shoulder injury", () => {
    const item = makeWorkoutExercise("e2");
    expect(isContraindicated(item, "shoulder", exercises)).toBe(true);
  });

  it("flags a Legs exercise as contraindicated for knee injury", () => {
    const item = makeWorkoutExercise("e3");
    expect(isContraindicated(item, "knee", exercises)).toBe(true);
  });

  it("does NOT flag a Core exercise as contraindicated for shoulder injury", () => {
    const item = makeWorkoutExercise("e4");
    expect(isContraindicated(item, "shoulder", exercises)).toBe(false);
  });

  it("returns false when the exercise ID is not in the catalog", () => {
    const item = makeWorkoutExercise("unknown-id");
    expect(isContraindicated(item, "shoulder", exercises)).toBe(false);
  });

  it("flags an exercise via avoidTerms when its instructions contain a banned term", () => {
    // e.g. a 'Core' exercise whose instructions mention 'deadlift' should be flagged for back injury
    const coreWithDeadliftCue = makeExercise({
      id: "e5",
      name: "Stiff-Leg Deadlift",
      muscleGroup: "Core",
      instructions: "perform a deadlift with straight legs"
    });
    const catalog = [...exercises, coreWithDeadliftCue];
    const item = makeWorkoutExercise("e5");
    expect(isContraindicated(item, "back", catalog)).toBe(true);
  });

  it("does NOT flag an exercise whose muscle group and instructions are both safe", () => {
    const safeCoreExercise = makeExercise({
      id: "e6",
      name: "Bird Dog",
      muscleGroup: "Core",
      instructions: "extend opposite arm and leg while on all fours"
    });
    const catalog = [...exercises, safeCoreExercise];
    const item = makeWorkoutExercise("e6");
    expect(isContraindicated(item, "back", catalog)).toBe(false);
  });
});

// ─── getExerciseName ─────────────────────────────────────────────────────────

describe("getExerciseName", () => {
  const exercises: Exercise[] = [
    makeExercise({ id: "ex1", name: "Pull-up" }),
    makeExercise({ id: "ex2", name: "Push-up" }),
  ];

  it("returns the name when the exercise exists", () => {
    expect(getExerciseName("ex1", exercises)).toBe("Pull-up");
  });

  it("returns 'Exercise' as a fallback for an unknown ID", () => {
    expect(getExerciseName("not-found", exercises)).toBe("Exercise");
  });

  it("returns 'Exercise' for an empty catalog", () => {
    expect(getExerciseName("ex1", [])).toBe("Exercise");
  });
});

// ─── getDayMuscleTargets ──────────────────────────────────────────────────────

describe("getDayMuscleTargets", () => {
  const exercises: Exercise[] = [
    makeExercise({ id: "a", name: "Bench Press",  muscleGroup: "Chest" }),
    makeExercise({ id: "b", name: "Incline Press", muscleGroup: "Chest" }),
    makeExercise({ id: "c", name: "Pull-up",       muscleGroup: "Back" }),
    makeExercise({ id: "d", name: "Plank",         muscleGroup: "Core" }),
  ];

  it("returns the most-common muscle group as primary", () => {
    const items = ["a", "b", "c"].map(makeWorkoutExercise);
    const result = getDayMuscleTargets(items, exercises);
    expect(result.primary).toBe("Chest"); // 2 Chest vs 1 Back
  });

  it("returns secondary groups in descending order", () => {
    const items = ["a", "b", "c", "d"].map(makeWorkoutExercise);
    const result = getDayMuscleTargets(items, exercises);
    expect(result.secondary).toContain("Back");
    expect(result.secondary).toContain("Core");
  });

  it("returns 'Full body' primary when the list is empty", () => {
    const result = getDayMuscleTargets([], exercises);
    expect(result.primary).toBe("Full body");
    expect(result.secondary).toHaveLength(0);
  });

  it("ignores items whose IDs are not in the exercise catalog", () => {
    const items = [makeWorkoutExercise("not-in-catalog")];
    const result = getDayMuscleTargets(items, exercises);
    expect(result.primary).toBe("Full body");
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe("SKIP_REASONS", () => {
  it("has exactly 5 entries", () => {
    expect(SKIP_REASONS).toHaveLength(5);
  });

  it("contains a 'rest' option", () => {
    expect(SKIP_REASONS.some(r => r.value === "rest")).toBe(true);
  });
});

describe("dayNames", () => {
  it("starts on Monday", () => {
    expect(dayNames[0]).toBe("Monday");
  });

  it("ends on Sunday", () => {
    expect(dayNames[6]).toBe("Sunday");
  });

  it("has exactly 7 entries", () => {
    expect(dayNames).toHaveLength(7);
  });
});

// ─── getDefaultDayIndex ───────────────────────────────────────────────────────

describe("getDefaultDayIndex", () => {
  it("returns 0 when dayCount is 0 (no program days)", () => {
    expect(getDefaultDayIndex(0)).toBe(0);
  });

  it("returns 0 when dayCount is 1 (only one day)", () => {
    expect(getDefaultDayIndex(1)).toBe(0);
  });

  it("returns a value in [0, dayCount-1] for typical program lengths", () => {
    for (const dayCount of [3, 4, 5, 6, 7]) {
      const result = getDefaultDayIndex(dayCount);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(dayCount);
    }
  });

  it("never returns a negative value regardless of input", () => {
    expect(getDefaultDayIndex(0)).toBeGreaterThanOrEqual(0);
    expect(getDefaultDayIndex(1)).toBeGreaterThanOrEqual(0);
    expect(getDefaultDayIndex(7)).toBeGreaterThanOrEqual(0);
  });
});

// ─── findAlternative ──────────────────────────────────────────────────────────

describe("findAlternative", () => {
  // ownerOnly=true = custom gym exercise (eligible as swap target)
  const catalog: Exercise[] = [
    makeExercise({ id: "alt1", name: "Leg Press",      muscleGroup: "Legs",       ownerOnly: true }),
    makeExercise({ id: "alt2", name: "Plank",           muscleGroup: "Core",       ownerOnly: true }),
    makeExercise({ id: "alt3", name: "Cable Row",       muscleGroup: "Back",       ownerOnly: true }),
    makeExercise({ id: "alt4", name: "Default Plank",   muscleGroup: "Core",       ownerOnly: false }),
    makeExercise({ id: "alt5", name: "Incline Press",   muscleGroup: "Chest",      ownerOnly: true }),
  ];

  it("returns an exercise from a preferred muscle group", () => {
    // shoulder: preferredMuscles = Legs, Core, Back
    const result = findAlternative(new Set(), "shoulder", catalog);
    expect(result).toBeDefined();
    expect(["Legs", "Core", "Back"]).toContain(result?.muscleGroup);
  });

  it("skips exercises whose IDs are already used", () => {
    // Mark all Legs/Core/Back ownerOnly exercises as used; nothing should be returned for shoulder
    const used = new Set(["alt1", "alt2", "alt3"]);
    const result = findAlternative(used, "shoulder", catalog);
    expect(result).toBeUndefined();
  });

  it("skips exercises where ownerOnly is false (default catalog)", () => {
    // alt4 is Core but ownerOnly=false — should never be picked
    const used = new Set(["alt1", "alt2", "alt3"]); // all ownerOnly preferred are used
    const result = findAlternative(used, "shoulder", catalog);
    expect(result).toBeUndefined();
  });

  it("prevents a pull-muscle replacement for a push-muscle original", () => {
    // For knee injury, preferred = Chest, Back, Core
    // If original is Chest (push), Back (pull) alternatives should be skipped
    const used = new Set<string>();
    const result = findAlternative(used, "knee", catalog, "Chest");
    expect(result).toBeDefined();
    expect(result?.muscleGroup).not.toBe("Back");
  });

  it("prevents a push-muscle replacement for a pull-muscle original", () => {
    // For knee injury, preferred = Chest, Back, Core
    // If original is Back (pull), Chest (push) alternatives should be skipped
    const used = new Set<string>();
    const result = findAlternative(used, "knee", catalog, "Back");
    expect(result).toBeDefined();
    expect(result?.muscleGroup).not.toBe("Chest");
  });

  it("allows cross-mechanic swap when the original muscle is itself contraindicated", () => {
    // Shoulder injury avoids Chest; so if original is Chest (push), push/pull guard is lifted
    // because Chest is in rule.avoidMuscles. Any preferred ownerOnly exercise is fair game.
    const used = new Set<string>();
    const result = findAlternative(used, "shoulder", catalog, "Chest");
    expect(result).toBeDefined();
  });
});
