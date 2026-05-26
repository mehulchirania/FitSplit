"use client";

import { useState, useTransition } from "react";
import type { DayLog, Exercise } from "@/types/domain";
import { updateMakeupStatus } from "@/lib/firebase/actions/progress";

type Props = {
  dayLog: DayLog;
  exercises: Exercise[];
  /** Called after the member accepts or dismisses, so parent can update state */
  onUpdate: (updated: DayLog) => void;
};

export function WorkoutMakeupCard({ dayLog, exercises, onUpdate }: Props) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (
    !dayLog.makeupExerciseIds?.length ||
    dayLog.makeupStatus !== "pending" ||
    done
  ) {
    return null;
  }

  const makeupExercises = dayLog.makeupExerciseIds
    .map((id) => exercises.find((e) => e.id === id))
    .filter((e): e is Exercise => Boolean(e));

  if (!makeupExercises.length) return null;

  function handleAction(status: "added" | "dismissed") {
    startTransition(async () => {
      await updateMakeupStatus(dayLog.id, status);
      setDone(true);
      onUpdate({ ...dayLog, makeupStatus: status });
    });
  }

  return (
    <div className="makeup-card" role="region" aria-label="Makeup exercises">
      <div className="makeup-card-header">
        <span className="makeup-card-icon" aria-hidden="true">💪</span>
        <div>
          <p className="eyebrow">Missed workout</p>
          <h3>Add these to your next session?</h3>
          <p className="makeup-card-sub">
            You skipped this day. Here are the key exercises to recover.
          </p>
        </div>
      </div>

      <ul className="makeup-exercise-list">
        {makeupExercises.map((ex) => (
          <li key={ex.id} className="makeup-exercise-item">
            <span className="makeup-exercise-muscle">{ex.muscleGroup}</span>
            <span className="makeup-exercise-name">{ex.name}</span>
          </li>
        ))}
      </ul>

      <div className="makeup-card-actions">
        <button
          className="button button-primary"
          disabled={isPending}
          onClick={() => handleAction("added")}
          type="button"
        >
          {isPending ? "Saving..." : "Add to next session"}
        </button>
        <button
          className="button-link makeup-dismiss"
          disabled={isPending}
          onClick={() => handleAction("dismissed")}
          type="button"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
