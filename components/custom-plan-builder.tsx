"use client";

import { useMemo, useState } from "react";
import { Plus } from "@/components/icons";
import { createCustomWorkoutProgram } from "@/lib/firebase/actions";
import type { Exercise, MuscleGroup } from "@/types/domain";
import { ConfirmActionForm } from "./confirm-action-form";

type CatalogGroup = {
  muscleGroup: MuscleGroup;
  exercises: Exercise[];
};

export function CustomPlanBuilder({ catalog }: { catalog: CatalogGroup[] }) {
  const firstExerciseId = catalog[0]?.exercises[0]?.id ?? "";
  const [selectedExerciseId, setSelectedExerciseId] = useState(firstExerciseId);
  const [exerciseIds, setExerciseIds] = useState<string[]>(firstExerciseId ? [firstExerciseId] : []);

  const exerciseById = useMemo(
    () =>
      new Map(
        catalog.flatMap((group) =>
          group.exercises.map((exercise) => [exercise.id, exercise] as const)
        )
      ),
    [catalog]
  );

  function addExercise() {
    if (!selectedExerciseId) {
      return;
    }

    setExerciseIds((current) => [...current, selectedExerciseId]);
  }

  return (
    <ConfirmActionForm
      action={createCustomWorkoutProgram}
      className="form-panel"
      confirmMessage="This will create a new custom workout program from the selected exercises."
      confirmTitle="Save custom plan?"
      pendingLabel="Saving custom plan..."
      submitLabel="Save custom plan to Firebase"
    >
      <h2>Custom owner plan</h2>
      <label>
        Program title
        <input name="title" defaultValue="Custom Owner Plan" required />
      </label>
      <label>
        Description
        <input
          name="description"
          defaultValue="Owner-built routine from Titan V2 exercise catalog"
        />
      </label>
      <div className="form-grid">
        <label>
          Day title
          <input name="dayTitle" defaultValue="Custom Day 1" required />
        </label>
        <label>
          Goal
          <input name="goal" defaultValue="Custom member plan" />
        </label>
      </div>
      <div className="form-grid add-exercise-grid">
        <label>
          Add exercise
          <select
            value={selectedExerciseId}
            onChange={(event) => setSelectedExerciseId(event.target.value)}
          >
            {catalog.flatMap((group) =>
              group.exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {group.muscleGroup}: {exercise.name}
                </option>
              ))
            )}
          </select>
        </label>
        <label>
          Sets and reps
          <span className="inline-fields">
            <input name="sets" defaultValue="3" min="1" type="number" />
            <input name="reps" defaultValue="8-12" />
          </span>
        </label>
        <button
          aria-label="Add selected exercise to custom plan"
          className="icon-button add-exercise-button"
          onClick={addExercise}
          type="button"
        >
          <Plus />
        </button>
      </div>

      <div className="selected-exercise-list" aria-label="Custom plan exercise draft">
        <span>Day 1</span>
        {exerciseIds.map((exerciseId, index) => {
          const exercise = exerciseById.get(exerciseId);

          return (
            <strong key={`${exerciseId}-${index}`}>
              {exercise?.name ?? exerciseId}
              <input name="exerciseIds" type="hidden" value={exerciseId} />
            </strong>
          );
        })}
      </div>

      <input name="difficulty" type="hidden" value="beginner" />
      <input name="daysPerWeek" type="hidden" value="1" />
      <input name="restSeconds" type="hidden" value="75" />
    </ConfirmActionForm>
  );
}
