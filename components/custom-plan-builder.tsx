"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "@/components/icons";
import {
  createCustomWorkoutProgram,
  requestCatalogExercise,
  updateCustomWorkoutProgram
} from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { Exercise, MuscleGroup, WorkoutProgram } from "@/types/domain";

type CatalogGroup = {
  muscleGroup: MuscleGroup;
  exercises: Exercise[];
};

type PlanExerciseEntry = {
  id: string;          // local list key
  exerciseId: string;  // catalog id OR "__custom__"
  label: string;       // display name
  sets: number;
  reps: string;
  isCustom: boolean;
};

type PlanDay = {
  id: string;
  title: string;
  entries: PlanExerciseEntry[];
};

function nextId() {
  return Math.random().toString(36).slice(2, 8);
}

function makeDay(n: number): PlanDay {
  return { id: nextId(), title: `Day ${n}`, entries: [] };
}

const ALL_MUSCLE_GROUPS = [
  "Back", "Biceps", "Cardio", "Chest", "Core", "Legs", "Shoulders", "Triceps"
] as const;

export function CustomPlanBuilder({
  catalog,
  initialProgram,
  targetGymId,
  onSuccess
}: {
  catalog: CatalogGroup[];
  initialProgram?: WorkoutProgram;
  targetGymId?: string;
  onSuccess?: () => void;
}) {
  const isEditMode = Boolean(initialProgram);

  // Build initial state from existing program (edit mode)
  function initDays(): PlanDay[] {
    if (!initialProgram) return [makeDay(1)];
    return initialProgram.days.map((day) => ({
      id: nextId(),
      title: day.title,
      entries: day.exercises.map((ex) => ({
        id: nextId(),
        exerciseId: ex.exerciseId,
        label: exerciseById.get(ex.exerciseId)?.name ?? ex.exerciseId,
        sets: ex.sets ?? 3,
        reps: ex.reps ?? "8-12",
        isCustom: false
      }))
    }));
  }

  const exerciseById = useMemo(
    () => new Map(catalog.flatMap((g) => g.exercises.map((e) => [e.id, e] as const))),
    [catalog]
  );

  const [days, setDays] = useState<PlanDay[]>(() => initDays());
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [exerciseFilter, setExerciseFilter] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState(
    catalog[0]?.exercises[0]?.id ?? ""
  );
  const [addSets, setAddSets] = useState(3);
  const [addReps, setAddReps] = useState("8-12");
  const [customExName, setCustomExName] = useState("");
  const [customExMuscle, setCustomExMuscle] = useState<string>("Chest");
  const [customExEquipment, setCustomExEquipment] = useState("");
  const [customExInstructions, setCustomExInstructions] = useState("");
  const [sendToAdmin, setSendToAdmin] = useState(true);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isSaving, startSaving] = useTransition();

  const activeDay = days[activeDayIdx] ?? days[0];

  // Filter exercises for the picker
  const filteredCatalog = useMemo(() => {
    const q = exerciseFilter.toLowerCase();
    if (!q) return catalog;
    return catalog
      .map((g) => ({
        ...g,
        exercises: g.exercises.filter(
          (e) => e.name.toLowerCase().includes(q) || g.muscleGroup.toLowerCase().includes(q)
        )
      }))
      .filter((g) => g.exercises.length > 0);
  }, [catalog, exerciseFilter]);

  function updateDay(idx: number, patch: Partial<PlanDay>) {
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  function addCatalogExercise() {
    if (!selectedExerciseId) return;
    const ex = exerciseById.get(selectedExerciseId);
    const entry: PlanExerciseEntry = {
      id: nextId(),
      exerciseId: selectedExerciseId,
      label: ex?.name ?? selectedExerciseId,
      sets: addSets,
      reps: addReps,
      isCustom: false
    };
    updateDay(activeDayIdx, { entries: [...activeDay.entries, entry] });
  }

  function addCustomExercise() {
    const name = customExName.trim();
    if (!name) return;
    const entry: PlanExerciseEntry = {
      id: nextId(),
      exerciseId: `__custom__${name}`,
      label: name,
      sets: addSets,
      reps: addReps,
      isCustom: true
    };
    updateDay(activeDayIdx, { entries: [...activeDay.entries, entry] });
    setCustomExName("");
  }

  function updateEntry(dayIdx: number, entryIdx: number, patch: Partial<PlanExerciseEntry>) {
    const day = days[dayIdx];
    const updatedEntries = day.entries.map((e, i) => (i === entryIdx ? { ...e, ...patch } : e));
    updateDay(dayIdx, { entries: updatedEntries });
  }

  function removeEntry(dayIdx: number, entryIdx: number) {
    const day = days[dayIdx];
    updateDay(dayIdx, { entries: day.entries.filter((_, i) => i !== entryIdx) });
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

  function copyDay(idx: number) {
    if (days.length >= 7) return;
    const src = days[idx];
    const copy: PlanDay = {
      id: nextId(),
      title: `${src.title} (copy)`,
      entries: src.entries.map((e) => ({ ...e, id: nextId() }))
    };
    const next = [...days];
    next.splice(idx + 1, 0, copy);
    setDays(next);
    setActiveDayIdx(idx + 1);
  }

  // Serialise days for server action
  const daysJson = JSON.stringify(
    days.map((d) => ({
      title: d.title,
      exerciseIds: d.entries.map((e) => e.exerciseId),
      sets: d.entries[0]?.sets ?? 3,
      reps: d.entries[0]?.reps ?? "8-12",
      entrySets: d.entries.map((e) => e.sets),
      entryReps: d.entries.map((e) => e.reps)
    }))
  );

  // Collect custom exercises that should be sent to admin
  const customExercisesForAdmin = useMemo(() => {
    const seen = new Set<string>();
    return days.flatMap((d) =>
      d.entries.filter((e) => e.isCustom && !seen.has(e.label) && seen.add(e.label))
    );
  }, [days]);

  async function handleSave(formData: FormData) {
    formData.set("days", daysJson);
    formData.set("difficulty", "beginner");
    formData.set("restSeconds", "75");
    if (targetGymId) {
      formData.set("targetGymId", targetGymId);
    }

    const action = isEditMode ? updateCustomWorkoutProgram : createCustomWorkoutProgram;
    if (isEditMode && initialProgram) {
      formData.set("programId", initialProgram.id);
    }

    const result = await action(initialFormActionState, formData);
    setStatus({ type: result.status === "success" ? "success" : "error", msg: result.message });

    // Send custom exercises to admin if requested
    if (result.status === "success" && sendToAdmin && customExercisesForAdmin.length > 0) {
      for (const entry of customExercisesForAdmin) {
        const reqForm = new FormData();
        reqForm.set("name", entry.label);
        reqForm.set("muscleGroup", customExMuscle);
        reqForm.set("equipment", customExEquipment);
        reqForm.set("instructions", customExInstructions);
        await requestCatalogExercise(initialFormActionState, reqForm);
      }
    }

    if (result.status === "success") {
      onSuccess?.();
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 13px",
    borderRadius: 8,
    border: `1px solid ${active ? "rgba(200,241,53,.4)" : "var(--border)"}`,
    background: active ? "var(--brand-soft)" : "transparent",
    color: active ? "var(--brand)" : "var(--text-soft)",
    fontSize: "0.82rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6
  });

  return (
    <form
      className="form-panel"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startSaving(() => handleSave(fd));
      }}
    >
      <h2>{isEditMode ? `Edit: ${initialProgram?.title}` : "Custom owner plan"}</h2>

      {/* Program meta */}
      <div className="form-grid">
        <label>
          Program title
          <input name="title" defaultValue={initialProgram?.title ?? "Custom Owner Plan"} required />
        </label>
        <label>
          Goal
          <input name="goal" defaultValue={initialProgram?.goal ?? "Custom member plan"} />
        </label>
      </div>
      <label>
        Description
        <input
          name="description"
          defaultValue={initialProgram?.description ?? "Owner-built routine from the exercise catalog"}
        />
      </label>

      {/* Day tabs */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          {days.map((day, idx) => (
            <button key={day.id} type="button" onClick={() => setActiveDayIdx(idx)} style={tabStyle(idx === activeDayIdx)}>
              {day.title || `Day ${idx + 1}`}
              {days.length < 7 && (
                <span
                  role="button"
                  aria-label={`Duplicate ${day.title}`}
                  onClick={(e) => { e.stopPropagation(); copyDay(idx); }}
                  style={{ opacity: 0.5, lineHeight: 1, marginLeft: 2, fontSize: "0.7rem" }}
                  title="Duplicate this day"
                >
                  ⧉
                </span>
              )}
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
          <label style={{ display: "grid", gap: 4, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-soft)", marginBottom: 12 }}>
            Day title
            <input
              value={activeDay.title}
              onChange={(e) => updateDay(activeDayIdx, { title: e.target.value })}
              placeholder={`Day ${activeDayIdx + 1}`}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.9rem" }}
            />
          </label>

          {/* ── Add from catalog ── */}
          <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)", marginBottom: 6 }}>
            Add from catalog
          </p>
          <div style={{ marginBottom: 8 }}>
            <input
              placeholder="Filter exercises..."
              value={exerciseFilter}
              onChange={(e) => setExerciseFilter(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.85rem", marginBottom: 6 }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label style={{ flex: "1 1 180px", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-soft)", display: "grid", gap: 4 }}>
                Exercise
                <select
                  value={selectedExerciseId}
                  onChange={(e) => setSelectedExerciseId(e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.85rem" }}
                >
                  {filteredCatalog.flatMap((g) =>
                    g.exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        [{g.muscleGroup}] {ex.name}
                      </option>
                    ))
                  )}
                  {filteredCatalog.length === 0 && (
                    <option disabled value="">No exercises match your search</option>
                  )}
                </select>
              </label>
              <label style={{ width: 60, fontSize: "0.82rem", fontWeight: 600, color: "var(--text-soft)", display: "grid", gap: 4 }}>
                Sets
                <input type="number" min="1" value={addSets} onChange={(e) => setAddSets(Number(e.target.value))} style={{ padding: "8px 6px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.85rem" }} />
              </label>
              <label style={{ width: 72, fontSize: "0.82rem", fontWeight: 600, color: "var(--text-soft)", display: "grid", gap: 4 }}>
                Reps
                <input value={addReps} onChange={(e) => setAddReps(e.target.value)} style={{ padding: "8px 6px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.85rem" }} />
              </label>
              <button
                type="button"
                onClick={addCatalogExercise}
                disabled={!selectedExerciseId || filteredCatalog.length === 0}
                className="button button-primary"
                style={{ height: 36, minWidth: 36, padding: "0 12px", alignSelf: "flex-end" }}
              >
                <Plus /> Add
              </button>
            </div>
          </div>

          {/* ── Add custom exercise ── */}
          <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)", margin: "12px 0 6px" }}>
            Custom exercise (not in catalog)
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: customExName.trim() ? 8 : 0 }}>
            <label style={{ flex: "1 1 180px", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-soft)", display: "grid", gap: 4 }}>
              Exercise name
              <input
                placeholder="e.g. Cable Face Pull"
                value={customExName}
                onChange={(e) => setCustomExName(e.target.value)}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.85rem" }}
              />
            </label>
            <button
              type="button"
              onClick={addCustomExercise}
              disabled={!customExName.trim()}
              className="button button-secondary"
              style={{ height: 36, padding: "0 12px", alignSelf: "flex-end" }}
            >
              <Plus /> Add
            </button>
          </div>

          {/* Send-to-admin options shown when a custom exercise name has been typed */}
          {customExName.trim() && (
            <div style={{ background: "color-mix(in srgb,var(--brand) 6%,var(--bg-elevated))", border: "1px solid color-mix(in srgb,var(--brand) 20%,transparent)", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={sendToAdmin}
                  onChange={(e) => setSendToAdmin(e.target.checked)}
                  style={{ marginTop: 2, accentColor: "var(--brand)" }}
                />
                <span>Send this exercise to admin for adding to the official catalog</span>
              </label>
              {sendToAdmin && (
                <div style={{ display: "grid", gap: 8, marginTop: 10, gridTemplateColumns: "1fr 1fr" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-soft)", display: "grid", gap: 4 }}>
                    Muscle group
                    <select
                      value={customExMuscle}
                      onChange={(e) => setCustomExMuscle(e.target.value)}
                      style={{ padding: "7px 8px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.82rem" }}
                    >
                      {ALL_MUSCLE_GROUPS.map((mg) => (
                        <option key={mg} value={mg}>{mg}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-soft)", display: "grid", gap: 4 }}>
                    Equipment (optional)
                    <input
                      value={customExEquipment}
                      onChange={(e) => setCustomExEquipment(e.target.value)}
                      placeholder="e.g. Cable machine"
                      style={{ padding: "7px 8px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.82rem" }}
                    />
                  </label>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-soft)", display: "grid", gap: 4, gridColumn: "1 / -1" }}>
                    Notes for admin (optional)
                    <textarea
                      value={customExInstructions}
                      onChange={(e) => setCustomExInstructions(e.target.value)}
                      placeholder="Setup, cues, common mistakes..."
                      rows={2}
                      style={{ padding: "7px 8px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.82rem", resize: "vertical" }}
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Exercise list for active day */}
          <div className="selected-exercise-list" aria-label={`${activeDay.title} exercises`}>
            <span>
              {activeDay.title || `Day ${activeDayIdx + 1}`} — {activeDay.entries.length} exercise{activeDay.entries.length !== 1 ? "s" : ""}
            </span>
            {activeDay.entries.map((entry, i) => (
              <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ flex: 1, fontWeight: 600, fontSize: "0.88rem" }}>
                  {entry.label}
                  {entry.isCustom && (
                    <span style={{ marginLeft: 6, fontSize: "0.7rem", background: "color-mix(in srgb,var(--brand) 14%,transparent)", color: "var(--brand-strong)", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>custom</span>
                  )}
                </span>
                <input
                  type="number"
                  min="1"
                  value={entry.sets}
                  onChange={(e) => updateEntry(activeDayIdx, i, { sets: Number(e.target.value) })}
                  title="Sets"
                  style={{ width: 44, padding: "3px 5px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.82rem", textAlign: "center" }}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>×</span>
                <input
                  value={entry.reps}
                  onChange={(e) => updateEntry(activeDayIdx, i, { reps: e.target.value })}
                  title="Reps"
                  style={{ width: 52, padding: "3px 5px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.82rem", textAlign: "center" }}
                />
                <button
                  type="button"
                  aria-label={`Remove ${entry.label}`}
                  onClick={() => removeEntry(activeDayIdx, i)}
                  style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: "0 2px", lineHeight: 1 }}
                >
                  <X />
                </button>
              </div>
            ))}
            {activeDay.entries.length === 0 && (
              <span style={{ color: "var(--text-faint)", fontStyle: "italic", fontSize: "0.82rem" }}>
                No exercises added yet
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status message */}
      {status && (
        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: status.type === "success" ? "var(--brand-strong)" : "var(--danger)", marginTop: 8 }}>
          {status.msg}
        </p>
      )}

      <input name="days" type="hidden" value={daysJson} />
      <input name="difficulty" type="hidden" value="beginner" />
      <input name="restSeconds" type="hidden" value="75" />

      <button
        type="submit"
        disabled={isSaving}
        className="button button-primary"
        style={{ marginTop: 14, width: "100%" }}
      >
        {isSaving ? (isEditMode ? "Saving changes..." : "Saving custom plan...") : (isEditMode ? "Save changes" : "Save custom plan")}
      </button>
    </form>
  );
}
