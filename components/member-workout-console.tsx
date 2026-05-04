"use client";

import { useEffect, useMemo, useState } from "react";
import { exercises } from "@/lib/mock-data";
import type { WorkoutExercise, WorkoutProgram } from "@/types/domain";
import { Activity, Dumbbell } from "@/components/icons";
import { ExerciseList } from "@/components/exercise-list";

const sessionKey = "fitsplit-active-workout";
const activeCountKey = "fitsplit-active-workouts";

type Modification = {
  injury: string;
  summary: string;
  swaps: Array<{ from: string; to: string; reason: string }>;
  routine: WorkoutExercise[];
};

function getStoredActiveCount() {
  if (typeof window === "undefined") {
    return 0;
  }

  return Number(window.localStorage.getItem(activeCountKey) ?? "0");
}

function setStoredActiveCount(nextCount: number) {
  const normalizedCount = Math.max(0, nextCount);
  window.localStorage.setItem(activeCountKey, String(normalizedCount));
  window.dispatchEvent(new CustomEvent("fitsplit-capacity-change"));
  return normalizedCount;
}

function getBusyness(count: number) {
  if (count <= 1) {
    return { label: "Quiet", tone: "status-active", dot: "Green" };
  }

  if (count <= 4) {
    return { label: "Moderate", tone: "status-expiring", dot: "Yellow" };
  }

  return { label: "Busy", tone: "status-expired", dot: "Red" };
}

function getInjuryRule(injury: string) {
  const value = injury.toLowerCase();

  if (value.includes("shoulder")) {
    return {
      avoidMuscles: ["Shoulders", "Chest"],
      avoidTerms: ["overhead", "press", "bench", "fly"],
      preferredMuscles: ["Legs", "Core", "Back"],
      summary:
        "Reduced shoulder-loaded pressing and replaced it with lower-body, core, and controlled pulling work."
    };
  }

  if (value.includes("knee")) {
    return {
      avoidMuscles: ["Legs"],
      avoidTerms: ["squat", "lunge", "leg press", "extension"],
      preferredMuscles: ["Chest", "Back", "Core"],
      summary:
        "Removed knee-dominant leg work and shifted the session toward upper-body and trunk-safe movements."
    };
  }

  if (value.includes("back") || value.includes("spine")) {
    return {
      avoidMuscles: ["Back", "Legs"],
      avoidTerms: ["deadlift", "row", "squat"],
      preferredMuscles: ["Chest", "Shoulders", "Core"],
      summary:
        "Avoided spinal loading and rebuilt the day around supported upper-body and low-load core work."
    };
  }

  return {
    avoidMuscles: [],
    avoidTerms: [],
    preferredMuscles: ["Core", "Cardio", "Chest"],
    summary:
      "Generated a conservative recovery routine while the owner reviews the limitation details."
  };
}

function isContraindicated(item: WorkoutExercise, injury: string) {
  const exercise = exercises.find((entry) => entry.id === item.exerciseId);
  const rule = getInjuryRule(injury);

  if (!exercise) {
    return false;
  }

  const text = `${exercise.name} ${exercise.instructions}`.toLowerCase();
  return (
    rule.avoidMuscles.includes(exercise.muscleGroup) ||
    rule.avoidTerms.some((term) => text.includes(term))
  );
}

function findAlternative(usedIds: Set<string>, injury: string) {
  const rule = getInjuryRule(injury);
  return exercises.find(
    (exercise) =>
      !usedIds.has(exercise.id) &&
      exercise.ownerOnly &&
      rule.preferredMuscles.includes(exercise.muscleGroup)
  );
}

function createModification(program: WorkoutProgram, injury: string): Modification {
  const activeDay = program.days.find((day) => day.exercises.length > 0) ?? program.days[0];
  const usedIds = new Set(activeDay.exercises.map((item) => item.exerciseId));
  const swaps: Modification["swaps"] = [];
  const routine = activeDay.exercises.map((item) => {
    if (!isContraindicated(item, injury)) {
      return item;
    }

    const original = exercises.find((exercise) => exercise.id === item.exerciseId);
    const alternative = findAlternative(usedIds, injury);

    if (!original || !alternative) {
      return item;
    }

    usedIds.add(alternative.id);
    swaps.push({
      from: original.name,
      to: alternative.name,
      reason: "Reduced risk based on the logged injury or limitation."
    });

    return { ...item, exerciseId: alternative.id, notes: "AI Semi-Personal Trainer swap" };
  });

  if (!swaps.length) {
    const recoveryExercises = exercises
      .filter((exercise) => getInjuryRule(injury).preferredMuscles.includes(exercise.muscleGroup))
      .slice(0, 4)
      .map((exercise, index) => ({
        exerciseId: exercise.id,
        sets: index === 0 ? 2 : 3,
        reps: index === 0 ? "easy warm-up" : "12-15",
        restSeconds: 60,
        notes: "AI Semi-Personal Trainer recovery routine"
      }));

    return {
      injury,
      summary: getInjuryRule(injury).summary,
      swaps: [
        {
          from: "Original training intensity",
          to: "Dedicated recovery routine",
          reason: "No direct contraindicated exercise was detected, so the plan was softened."
        }
      ],
      routine: recoveryExercises
    };
  }

  return {
    injury,
    summary: getInjuryRule(injury).summary,
    swaps,
    routine
  };
}

export function MemberWorkoutConsole({ program }: { program: WorkoutProgram }) {
  const [isActive, setIsActive] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [injury, setInjury] = useState("");
  const [modification, setModification] = useState<Modification | null>(null);
  const busyness = useMemo(() => getBusyness(activeCount), [activeCount]);

  useEffect(() => {
    setIsActive(window.localStorage.getItem(sessionKey) === "active");
    setActiveCount(getStoredActiveCount());
  }, []);

  function startWorkout() {
    if (isActive) {
      return;
    }

    window.localStorage.setItem(sessionKey, "active");
    setIsActive(true);
    setActiveCount(setStoredActiveCount(getStoredActiveCount() + 1));
  }

  function endWorkout() {
    if (!isActive) {
      return;
    }

    window.localStorage.removeItem(sessionKey);
    setIsActive(false);
    setActiveCount(setStoredActiveCount(getStoredActiveCount() - 1));
  }

  function updateInjury() {
    if (!injury.trim()) {
      return;
    }

    setModification(createModification(program, injury.trim()));
  }

  return (
    <section className="content-grid">
      <div className="list-panel">
        <div className="panel-title">
          <h2>
            <Dumbbell /> Today&apos;s workout
          </h2>
          <span className="status-pill status-neutral">
            {program.daysPerWeek} days/week
          </span>
        </div>

        <div className="workout-session-panel">
          <div>
            <p className="eyebrow">Attendance proxy</p>
            <h2>{isActive ? "Workout in progress" : "Ready to train"}</h2>
            <p>
              Start and end buttons are mandatory so FitSplit can estimate live
              gym capacity from active workouts.
            </p>
          </div>
          <div className="quick-actions">
            <button
              className="button button-primary"
              disabled={isActive}
              onClick={startWorkout}
              type="button"
            >
              Start Workout
            </button>
            <button
              className="button button-secondary"
              disabled={!isActive}
              onClick={endWorkout}
              type="button"
            >
              End Workout
            </button>
          </div>
        </div>

        <div className="notification-list">
          {(modification ? [{ ...program.days[0], exercises: modification.routine }] : program.days).map(
            (day) => (
              <article key={day.id}>
                <p className="eyebrow">Day {day.dayNumber}</p>
                <h2>{day.title}</h2>
                <p>{modification ? modification.summary : day.focus}</p>
                <ExerciseList items={day.exercises} />
              </article>
            )
          )}
        </div>
      </div>

      <aside className="list-panel">
        <div className="panel-title">
          <h2>
            <Activity /> Gym Busyness
          </h2>
          <span className={`status-pill ${busyness.tone}`}>{busyness.label}</span>
        </div>
        <div className="busyness-widget">
          <strong>{activeCount}</strong>
          <span>{busyness.dot} capacity status</span>
          <p>Based on members who have started but not ended a workout.</p>
        </div>

        <div className="injury-card">
          <h2>AI Semi-Personal Trainer</h2>
          <p>
            Update Injury/Limitation to let the AI swap risky exercises or
            create a conservative recovery routine for owner review.
          </p>
          <label>
            Injury or limitation
            <textarea
              onChange={(event) => setInjury(event.target.value)}
              placeholder="Example: shoulder pain during overhead press"
              value={injury}
            />
          </label>
          <button className="button button-primary" onClick={updateInjury} type="button">
            Update Injury/Limitation
          </button>
        </div>

        {modification ? (
          <div className="ai-modification-panel">
            <p className="eyebrow">Plan modified</p>
            <h2>{modification.swaps.length} AI adjustment(s)</h2>
            {modification.swaps.map((swap) => (
              <span key={`${swap.from}-${swap.to}`}>
                {swap.from} {"->"} {swap.to}
              </span>
            ))}
          </div>
        ) : null}
      </aside>
    </section>
  );
}
