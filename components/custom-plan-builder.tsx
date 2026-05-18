"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "@/components/icons";
import { createCustomWorkoutProgram } from "@/lib/firebase/actions";
import type { Exercise, MuscleGroup } from "@/types/domain";
import { ConfirmActionForm } from "./confirm-action-form";

type CatalogGroup = {
  muscleGroup: MuscleGroup;
  exercises: Exercise[];
};

type PlanDay = {
  id: string;
  title: string;
  exerciseIds: string[];
  sets: number;
  reps: string;
};

function nextId() {
  return Math.random().toString(36).slice(2, 8);
}

function makeDay(n: number): PlanDay {
  return { id: nextId(), title: `Day ${n}`, exerciseIds: [], sets: 3, reps: "8-12" };
}

export function CustomPlanBuilder({ catalog }: { catalog: CatalogGroup[] }) {
  const firstExerciseId = catalog[0]?.exercises[0]?.id ?? "";
  const [days, setDays] = useState<PlanDay[]>([makeDay(1)]);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [selectedExerciseId, setSelectedExerciseId] = useState(firstExerciseId);

  const exerciseById = useMemo(
    () =>
      new Map(
        catalog.flatMap((g) => g.exercises.map((e) => [e.id, e] as const))
      ),
    [catalog]
  );

  const activeDay = days[activeDayIdx] ?? days[0];

  function updateDay(idx: number, patch: Partial<PlanDay>) {
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  function addExerciseToActiveDay() {
    if (!selectedExerciseId) return;
    updateDay(activeDayIdx, {
      exerciseIds: [...activeDay.exerciseIds, selectedExerciseId]
    });
  }

  function removeExerciseFromDay(dayIdx: number, exIdx: number) {
    const day = days[dayIdx];
    updateDay(dayIdx, {
      exerciseIds: day.exerciseIds.filter((_, i) => i !== exIdx)
    });
  }

  function addDay() {
    const next = makeDay(days.length + 1);
    setDays((prev) => [...prev, next]);
    setActiveDayIdx(days.length);
  }

  function removeDay(idx: number) {
    if (days.length === 1) return;
    const next = days.filter((_, i) => i !== idx);
    setDays(next);
    setActiveDayIdx(Math.min(activeDayIdx, next.length - 1));
  }

  const daysJson = JSON.stringify(
    days.map((d) => ({ title: d.title, exerciseIds: d.exerciseIds, sets: d.sets, reps: d.reps }))
  );

  return (
    <ConfirmActionForm
      action={createCustomWorkoutProgram}
      className="form-panel"
      confirmMessage="This will create a new custom workout program from your day schedule."
      confirmTitle="Save custom plan?"
      pendingLabel="Saving custom plan..."
      submitLabel="Save custom plan"
    >
      <h2>Custom owner plan</h2>

      {/* Program meta */}
      <div className="form-grid">
        <label>
          Program title
          <input name="title" defaultValue="Custom Owner Plan" required />
        </label>
        <label>
          Goal
          <input name="goal" defaultValue="Custom member plan" />
        </label>
      </div>
      <label>
        Description
        <input name="description" defaultValue="Owner-built routine from the exercise catalog" />
      </label>

      {/* Day tabs */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          {days.map((day, idx) => (
            <button
              key={day.id}
              type="button"
              onClick={() => setActiveDayIdx(idx)}
              style={{
                padding: "5px 13px",
                borderRadius: 8,
                border: `1px solid ${idx === activeDayIdx ? "rgba(200,241,53,.4)" : "var(--border)"}`,
                background: idx === activeDayIdx ? "var(--brand-soft)" : "transparent",
                color: idx === activeDayIdx ? "var(--brand)" : "var(--text-soft)",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              {day.title || `Day ${idx + 1}`}
              {days.length > 1 && (
                <span
                  role="button"
                  aria-label={`Remove ${day.title}`}
                  onClick={(e) => { e.stopPropagation(); removeDay(idx); }}
                  style={{ opacity: 0.6, lineHeight: 1, marginLeft: 2 }}
                >
                  <X />
                </span>
              )}
            </button>
          ))}
          {days.length < 7 && (
            <button
              type="button"
              onClick={addDay}
              style={{
                padding: "5px 10px",
                borderRadius: 8,
                border: "1px dashed var(--border)",
                background: "transparent",
                color: "var(--text-faint)",
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              <Plus /> Add day
            </button>
          )}
        </div>

        {/* Active day editor */}
        <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: 14, border: "1px solid var(--border)" }}>
          <label style={{ display: "grid", gap: 4, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-soft)", marginBottom: 10 }}>
            Day title
            <input
              value={activeDay.title}
              onChange={(e) => updateDay(activeDayIdx, { title: e.target.value })}
              placeholder={`Day ${activeDayIdx + 1}`}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.9rem" }}
            />
          </label>

          <div className="form-grid add-exercise-grid" style={{ marginBottom: 8 }}>
            <label>
              Add exercise
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
              >
                {catalog.flatMap((g) =>
                  g.exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {g.muscleGroup}: {ex.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              Sets / Reps
              <span className="inline-fields">
                <input
                  value={activeDay.sets}
                  min="1"
                  type="number"
                  onChange={(e) => updateDay(activeDayIdx, { sets: Number(e.target.value) })}
                />
                <input
                  value={activeDay.reps}
                  onChange={(e) => updateDay(activeDayIdx, { reps: e.target.value })}
                />
              </span>
            </label>
            <button
              aria-label="Add selected exercise"
              className="icon-button add-exercise-button"
              onClick={addExerciseToActiveDay}
              type="button"
            >
              <Plus />
            </button>
          </div>

          <div className="selected-exercise-list" aria-label={`${activeDay.title} exercises`}>
            <span>{activeDay.title || `Day ${activeDayIdx + 1}`} — {activeDay.exerciseIds.length} exercise{activeDay.exerciseIds.length !== 1 ? "s" : ""}</span>
            {activeDay.exerciseIds.map((exId, i) => {
              const ex = exerciseById.get(exId);
              return (
                <strong key={`${exId}-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{ex?.name ?? exId}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${ex?.name ?? exId}`}
                    onClick={() => removeExerciseFromDay(activeDayIdx, i)}
                    style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", padding: "0 2px", lineHeight: 1 }}
                  >
                    <X />
                  </button>
                </strong>
              );
            })}
            {activeDay.exerciseIds.length === 0 && (
              <span style={{ color: "var(--text-faint)", fontStyle: "italic", fontSize: "0.82rem" }}>
                No exercises added yet
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Serialised days — kept in sync with builder state */}
      <input name="days" type="hidden" value={daysJson} />
      <input name="difficulty" type="hidden" value="beginner" />
      <input name="restSeconds" type="hidden" value="75" />
    </ConfirmActionForm>
  );
}
