import { describe, expect, it } from "vitest";
import { EXERCISE_THUMBNAIL_URLS, findExerciseThumbnail, getExerciseThumbnail } from "./exercise-thumbnails";

describe("exercise thumbnails", () => {
  it("keeps genuine matches", () => {
    for (const name of ["Barbell Bench Press", "Incline Dumbbell Press", "Push-Ups", "Pull-Ups", "Hammer Curl", "Barbell Squat", "Standing Calf Raises", "T-Bar Row", "Skull Crushers", "Lat Pulldown", "Bulgarian Split Squats", "Face Pull", "Hyperextensions"]) {
      expect(findExerciseThumbnail(name), name).toMatch(/^https:\/\/wger\.de\/media\/exercise-images\//);
    }
  });
  it("never shows a different exercise for a variation", () => {
    for (const name of ["Romanian Deadlift", "Reverse Pec Deck", "Close Grip Bench Press", "Cable Crunch", "Reverse Barbell Curl", "Incline Dumbbell Curl", "Seated Calf Raises", "Barbell Row", "Straight Arm Pulldown", "Arnold Press", "Cable Wrist Curl"]) {
      expect(findExerciseThumbnail(name), name).toBeUndefined();
    }
  });
  it("returns an empty string, not a muscle-group fallback, when nothing matches", () => {
    expect(getExerciseThumbnail("Landmine Row")).toBe("");
  });
  it("only lists wger URLs", () => {
    for (const u of EXERCISE_THUMBNAIL_URLS) expect(u.startsWith("https://wger.de/media/exercise-images/")).toBe(true);
  });
});
