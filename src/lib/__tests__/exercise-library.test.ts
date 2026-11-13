import { describe, expect, it } from "vitest";
import { catalogExercises, exerciseCatalogByMuscle, exercises, muscleGroups, programs } from "@/lib/exercise-library";
import { getExerciseCatalog, getExerciseLibrary } from "@/lib/firebase/read-models/exercises";
import { getWorkoutPrograms } from "@/lib/firebase/read-models/programs";

describe("built-in exercise library", () => {
  it("ships a non-empty catalog with unique ids", () => {
    expect(exercises.length).toBeGreaterThan(0);
    expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length);
  });

  it("groups every exercise under one of the muscle groups", () => {
    const grouped = exerciseCatalogByMuscle.flatMap((group) => group.exercises);
    expect(muscleGroups.length).toBeGreaterThan(0);
    expect(grouped.length).toBe(exercises.length);
  });

  it("only references exercises that exist in the catalog from every workout template", () => {
    const ids = new Set(catalogExercises.map((e) => e.id));
    const missing: string[] = [];
    for (const program of programs) {
      for (const day of program.days) {
        for (const item of day.exercises) {
          if (!ids.has(item.exerciseId)) missing.push(`${program.id}:${item.exerciseId}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("serves the same library to every user without a database", () => {
    expect(getExerciseCatalog().exercises).toBe(catalogExercises);
    const { programs: available } = getWorkoutPrograms();
    expect(available.length).toBeGreaterThan(0);
    expect(available.every((program) => program.source === "predefined")).toBe(true);
    expect(available.every((program) => program.days.some((day) => day.exercises.length > 0))).toBe(true);
  });

  it("makes imported exercises eligible swap targets and searchable", () => {
    expect(catalogExercises.filter((e) => e.id.startsWith("lib-")).every((e) => e.ownerOnly)).toBe(true);
    const all = getExerciseLibrary({});
    expect(all.total).toBeGreaterThan(1000);
    expect(all.results.length).toBe(48);
    const bench = getExerciseLibrary({ q: "bench press", equipment: "barbell" });
    expect(bench.total).toBeGreaterThan(0);
    expect(bench.results.every((e) => e.name.toLowerCase().includes("bench press"))).toBe(true);
  });

  it("lists each exercise and each plan concept once", () => {
    const names = getExerciseLibrary({ q: "bench press" }).results.map((e) => e.name.toLowerCase().replace(/[^a-z0-9]+/g, " "));
    expect(new Set(names).size).toBe(names.length);
    const titles = programs.map((p) => p.title.toLowerCase().replace(/[^a-z]/g, ""));
    expect(titles.filter((t) => t.startsWith("upperlower")).length).toBe(1);
    expect(titles.filter((t) => t === "pushpulllegs").length).toBe(1);
    expect(titles.filter((t) => t.startsWith("fullbody")).length).toBe(1);
  });
});
