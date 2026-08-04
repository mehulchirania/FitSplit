/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { Plus, X } from "@/components/icons";
import { assignProgramToMember, createAndAssignCustomProgram } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { Member, MuscleGroup, WorkoutProgram } from "@/types/domain";
import { FieldError } from "./form-action-context";

type CatalogGroup = { muscleGroup: MuscleGroup; exercises: Array<{ id: string; name: string }> };
type PlanEntry = { id: string; exerciseId: string; label: string; sets: number; reps: string };
type PlanDay = { id: string; title: string; entries: PlanEntry[] };

function uid() { return Math.random().toString(36).slice(2, 9); }
function makeDay(n: number): PlanDay { return { id: uid(), title: `Day ${n}`, entries: [] }; }

// ─── Pick-existing sub-form ──────────────────────────────────────────────────

function PickPlanForm({
  currentProgramId,
  member,
  programs
}: {
  currentProgramId?: string;
  member: Member;
  programs: WorkoutProgram[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(currentProgramId ?? programs[0]?.id ?? "");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const selected = programs.find((p) => p.id === selectedId) ?? programs[0];
  const predefined = programs.filter((p) => p.source !== "gym");
  const gym = programs.filter((p) => p.source === "gym");
  const trainingDays = selected?.days.filter((d) => d.exercises.length > 0) ?? [];

  function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected?.id) return;
    const ok = window.confirm("This will replace the member's active workout assignment and notify them.");
    if (!ok) return;

    const formData = new FormData(event.currentTarget);
    setFeedback(null);
    startTransition(async () => {
      const result = await assignProgramToMember(initialFormActionState, formData);
      setFeedback({ type: result.status === "success" ? "success" : "error", message: result.message });
      if (result.status === "success") router.refresh();
    });
  }

  if (programs.length === 0) {
    return (
      <div>
        <p style={{ color: "var(--text-soft)", marginBottom: 16 }}>
          No saved programs yet. Create one on the Programs page or use the Build Custom tab.
        </p>
        <a className="button button-secondary" href="/owner/programs">Go to programs</a>
      </div>
    );
  }

  return (
    <form className="inline-action-form" onSubmit={handleAssign}>
      <input name="memberId" type="hidden" value={member.id} />
      <input name="memberName" type="hidden" value={member.fullName} />
      <input name="programId" type="hidden" value={selected?.id ?? ""} />
      <input name="programTitle" type="hidden" value={selected?.title ?? ""} />
      <div style={{ marginBottom: "12px" }}>
        <p style={{ fontSize: "0.9rem", color: "var(--text-soft)", marginBottom: "8px", fontWeight: 600 }}>1. Select a Plan</p>
        <div className="mpd-plan-list" style={{ display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px" }}>
          {programs.map((p) => {
            const isSelected = selectedId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                style={{
                  padding: "16px",
                  border: isSelected ? "2px solid var(--brand)" : "1px solid var(--border)",
                  borderRadius: "14px",
                  background: isSelected ? "color-mix(in srgb, var(--brand) 12%, transparent)" : "var(--bg-subtle)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <strong style={{ fontSize: "1.15rem", color: isSelected ? "var(--brand)" : "var(--text)" }}>{p.title}</strong>
                  <span className="status-pill status-neutral" style={{ fontSize: "0.7rem" }}>
                    {p.source === "gym" ? "Gym" : "System"}
                  </span>
                </div>
                <small style={{ fontSize: "0.9rem", color: "var(--text-soft)" }}>
                  {[
                    p.goal,
                    p.daysPerWeek ? `${p.daysPerWeek} days/wk` : null,
                    p.difficulty
                  ].filter(Boolean).join(" · ")}
                </small>
              </div>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div style={{ marginTop: "16px", marginBottom: "16px" }}>
          <p style={{ fontSize: "0.9rem", color: "var(--text-soft)", marginBottom: "8px", fontWeight: 600 }}>2. Confirm Details</p>
          <div className="assignment-preview" style={{ background: "transparent", border: "1px dashed var(--border)", padding: "14px" }}>
            {trainingDays.length > 0 && (
              <small style={{ color: "var(--text)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                <strong>Workouts included: </strong>
                {trainingDays.slice(0, 4).map((d) => d.title).join(", ")}
                {trainingDays.length > 4 ? ` +${trainingDays.length - 4} more` : ""}
              </small>
            )}
          </div>
        </div>
      ) : null}

      {feedback ? (
        <p className={`form-message form-message-${feedback.type}`} role="status" style={{ fontSize: "0.95rem", padding: "12px" }}>
          {feedback.message}
        </p>
      ) : null}
      <button className="button button-primary mpd-assign-submit" disabled={isPending || !selectedId} type="submit">
        {isPending ? "Assigning…" : "3. Assign Plan to Member"}
      </button>
    </form>
  );
}

// ─── Build-custom sub-form ───────────────────────────────────────────────────

function BuildCustomForm({
  catalog,
  member,
  onContentChange
}: {
  catalog: CatalogGroup[];
  member: Member;
  onContentChange?: (hasContent: boolean) => void;
}) {
  const [days, setDays] = useState<PlanDay[]>(() => [makeDay(1)]);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [filter, setFilter] = useState("");
  const [selectedExId, setSelectedExId] = useState(catalog[0]?.exercises[0]?.id ?? "");
  const [addSets, setAddSets] = useState(3);
  const [addReps, setAddReps] = useState("8-12");
  const [title, setTitle] = useState(`${member.fullName}'s Plan`);

  const activeDay = days[activeDayIdx] ?? days[0];

  // Report content state to parent so it can warn before tab-switching
  const hasContent = days.some((d) => d.entries.length > 0);
  useEffect(() => {
    onContentChange?.(hasContent);
  }, [hasContent, onContentChange]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return catalog;
    return catalog
      .map((g) => ({ ...g, exercises: g.exercises.filter((e) => e.name.toLowerCase().includes(q)) }))
      .filter((g) => g.exercises.length > 0);
  }, [catalog, filter]);

  const allExercises = useMemo(() => catalog.flatMap((g) => g.exercises), [catalog]);

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

  function patchDay(idx: number, patch: Partial<PlanDay>) {
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  function addEntry() {
    if (!selectedExId) return;
    const ex = allExercises.find((e) => e.id === selectedExId);
    patchDay(activeDayIdx, {
      entries: [
        ...activeDay.entries,
        { id: uid(), exerciseId: selectedExId, label: ex?.name ?? selectedExId, sets: addSets, reps: addReps }
      ]
    });
  }

  function removeEntry(dayIdx: number, i: number) {
    patchDay(dayIdx, { entries: days[dayIdx].entries.filter((_, j) => j !== i) });
  }

  function patchEntry(dayIdx: number, i: number, patch: Partial<PlanEntry>) {
    patchDay(dayIdx, { entries: days[dayIdx].entries.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
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

  const tabActive: React.CSSProperties = {
    padding: "4px 10px", borderRadius: 7, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
    border: "1px solid color-mix(in srgb, var(--brand) 40%, transparent)", background: "var(--brand-soft)", color: "var(--brand)",
    display: "flex", alignItems: "center", gap: 4
  };
  const tabInactive: React.CSSProperties = {
    ...tabActive, border: "1px solid var(--border)", background: "transparent", color: "var(--text-soft)"
  };

  if (catalog.length === 0) {
    return (
      <p style={{ color: "var(--text-soft)" }}>
        No exercise catalog available. Add exercises from the Exercises page first.
      </p>
    );
  }

  return (
    <ConfirmActionForm
      action={createAndAssignCustomProgram}
      className="inline-action-form"
      confirmMessage={`This will save a new custom program to your gym library and assign it to ${member.fullName}.`}
      confirmTitle="Create & assign custom plan?"
      pendingLabel="Creating plan..."
      submitLabel="Save & assign custom plan"
    >
      <input name="memberId" type="hidden" value={member.id} />
      <input name="memberName" type="hidden" value={member.fullName} />
      <input name="days" type="hidden" value={daysJson} />
      <input name="difficulty" type="hidden" value="intermediate" />
      <input name="restSeconds" type="hidden" value="75" />

      <label>
        Plan title
        <input name="title" onChange={(e) => setTitle(e.target.value)} required value={title} />
        <FieldError name="title" />
      </label>

      {/* Day tab strip */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          {days.map((day, idx) => (
            <button
              key={day.id}
              onClick={() => setActiveDayIdx(idx)}
              style={activeDayIdx === idx ? tabActive : tabInactive}
              type="button"
            >
              {day.title || `Day ${idx + 1}`}
              {days.length > 1 && (
                <span
                  aria-label={`Remove ${day.title}`}
                  onClick={(e) => { e.stopPropagation(); removeDay(idx); }}
                  style={{ opacity: 0.55, lineHeight: 1 }}
                >
                  <X />
                </span>
              )}
            </button>
          ))}
          {days.length < 7 && (
            <button
              onClick={addDay}
              style={{
                padding: "4px 9px", borderRadius: 7, border: "1px dashed var(--border)",
                background: "transparent", color: "var(--text-faint)", fontSize: "0.8rem",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 3
              }}
              type="button"
            >
              <Plus /> Day
            </button>
          )}
        </div>

        {/* Active day editor */}
        <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: 12, border: "1px solid var(--border)" }}>
          <label style={{ display: "grid", gap: 4, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-soft)", marginBottom: 10 }}>
            Day title
            <input
              onChange={(e) => patchDay(activeDayIdx, { title: e.target.value })}
              placeholder={`Day ${activeDayIdx + 1}`}
              style={{ padding: "7px 9px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.88rem" }}
              value={activeDay.title}
            />
          </label>

          {/* Exercise picker */}
          <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-faint)", marginBottom: 6 }}>
            Add exercise
          </p>
          <input
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter exercises..."
            style={{ width: "100%", padding: "6px 9px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.82rem", marginBottom: 7, boxSizing: "border-box" }}
            value={filter}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ flex: "1 1 160px", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-soft)", display: "grid", gap: 3 }}>
              Exercise
              <select
                onChange={(e) => setSelectedExId(e.target.value)}
                style={{ padding: "7px 8px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.82rem" }}
                value={selectedExId}
              >
                {filtered.flatMap((g) =>
                  g.exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>[{g.muscleGroup}] {ex.name}</option>
                  ))
                )}
                {filtered.length === 0 && <option disabled value="">No matches</option>}
              </select>
            </label>
            <label style={{ width: 52, fontSize: "0.8rem", fontWeight: 600, color: "var(--text-soft)", display: "grid", gap: 3 }}>
              Sets
              <input
                min="1"
                onChange={(e) => setAddSets(Number(e.target.value))}
                style={{ padding: "7px 5px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.82rem", textAlign: "center" }}
                type="number"
                value={addSets}
              />
            </label>
            <label style={{ width: 60, fontSize: "0.8rem", fontWeight: 600, color: "var(--text-soft)", display: "grid", gap: 3 }}>
              Reps
              <input
                onChange={(e) => setAddReps(e.target.value)}
                style={{ padding: "7px 5px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.82rem", textAlign: "center" }}
                value={addReps}
              />
            </label>
            <button
              className="button button-primary"
              disabled={!selectedExId || filtered.length === 0}
              onClick={addEntry}
              style={{ height: 34, padding: "0 12px", alignSelf: "flex-end" }}
              type="button"
            >
              <Plus />
            </button>
          </div>

          {/* Exercise list for active day */}
          <div aria-label={`${activeDay.title || "Day"} exercises`} style={{ marginTop: 10 }}>
            {activeDay.entries.map((entry, i) => (
              <div
                key={entry.id}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: "1px solid var(--border)" }}
              >
                <span style={{ flex: 1, fontWeight: 600, fontSize: "0.85rem" }}>{entry.label}</span>
                <input
                  min="1"
                  onChange={(e) => patchEntry(activeDayIdx, i, { sets: Number(e.target.value) })}
                  style={{ width: 40, padding: "2px 4px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.8rem", textAlign: "center" }}
                  title="Sets"
                  type="number"
                  value={entry.sets}
                />
                <span style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>×</span>
                <input
                  onChange={(e) => patchEntry(activeDayIdx, i, { reps: e.target.value })}
                  style={{ width: 48, padding: "2px 4px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.8rem", textAlign: "center" }}
                  title="Reps"
                  value={entry.reps}
                />
                <button
                  aria-label={`Remove ${entry.label}`}
                  onClick={() => removeEntry(activeDayIdx, i)}
                  style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: "0 2px", lineHeight: 1 }}
                  type="button"
                >
                  <X />
                </button>
              </div>
            ))}
            {activeDay.entries.length === 0 && (
              <p style={{ color: "var(--text-faint)", fontStyle: "italic", fontSize: "0.82rem", margin: "6px 0 0" }}>
                No exercises added yet
              </p>
            )}
          </div>
        </div>
      </div>

      <p style={{ fontSize: "0.82rem", color: "var(--text-soft)", marginTop: 10 }}>
        The plan is saved to your gym's library and immediately assigned to this member.
      </p>
    </ConfirmActionForm>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function ProgramAssignmentForm({
  catalog = [],
  currentProgramId,
  member,
  programs
}: {
  catalog?: CatalogGroup[];
  currentProgramId?: string;
  member: Member;
  programs: WorkoutProgram[];
}) {
  const [mode, setMode] = useState<"pick" | "build">("pick");
  const [hasUnsavedCustom, setHasUnsavedCustom] = useState(false);

  const handleSwitchMode = useCallback((next: "pick" | "build") => {
    if (next === mode) return;
    // Warn before switching AWAY from the custom builder if exercises were added
    if (mode === "build" && hasUnsavedCustom) {
      const ok = typeof window !== "undefined"
        ? window.confirm("You have unsaved exercises in the custom builder. Switch tabs and discard them?")
        : true;
      if (!ok) return;
      setHasUnsavedCustom(false);
    }
    setMode(next);
  }, [hasUnsavedCustom, mode]);

  const modeBtnBase: React.CSSProperties = {
    flex: 1, padding: "8px 12px", border: "none", cursor: "pointer",
    fontWeight: 700, fontSize: "0.85rem", transition: "color 0.15s, border-color 0.15s",
    background: "transparent"
  };

  return (
    <div className="form-panel">
      <div style={{ marginBottom: 18 }}>
        <p className="eyebrow">Workout program</p>
        <h2>{currentProgramId ? "Change program" : "Assign program"}</h2>
      </div>

      {/* Mode toggle tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 18, gap: 0 }}>
        <button
          onClick={() => handleSwitchMode("pick")}
          style={{
            ...modeBtnBase,
            color: mode === "pick" ? "var(--brand)" : "var(--text-soft)",
            borderBottom: mode === "pick" ? "2px solid var(--brand)" : "2px solid transparent"
          }}
          type="button"
        >
          Pick a plan
        </button>
        <button
          onClick={() => handleSwitchMode("build")}
          style={{
            ...modeBtnBase,
            color: mode === "build" ? "var(--brand)" : "var(--text-soft)",
            borderBottom: mode === "build" ? "2px solid var(--brand)" : "2px solid transparent"
          }}
          type="button"
        >
          Build custom
        </button>
      </div>

      {mode === "pick" && (
        <PickPlanForm
          currentProgramId={currentProgramId}
          member={member}
          programs={programs}
        />
      )}
      {mode === "build" && (
        <BuildCustomForm
          catalog={catalog}
          member={member}
          onContentChange={setHasUnsavedCustom}
        />
      )}
    </div>
  );
}
