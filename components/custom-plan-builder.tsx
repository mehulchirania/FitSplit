"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "@/components/icons";
import {
  createCustomWorkoutProgram,
  requestCatalogExercise,
  updateCustomWorkoutProgram,
} from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { Exercise, MuscleGroup, WorkoutProgram } from "@/types/domain";

type CatalogGroup = { muscleGroup: MuscleGroup; exercises: Exercise[] };
type PlanExerciseEntry = {
  id: string; exerciseId: string; label: string;
  sets: number; reps: string; isCustom: boolean;
};
type PlanDay = { id: string; title: string; entries: PlanExerciseEntry[] };

function nextId() { return Math.random().toString(36).slice(2, 8); }
function makeDay(n: number): PlanDay { return { id: nextId(), title: `Day ${n}`, entries: [] }; }

const ALL_MUSCLE_GROUPS = [
  "Back","Biceps","Cardio","Chest","Core","Legs","Shoulders","Triceps",
] as const;

// Hardcoded dark colours so nothing bleeds through from theme variables
const C = {
  bg:     "#181c1b",
  bgCard: "#1e2422",
  bgInput:"#252e2b",
  border: "rgba(255,255,255,0.09)",
  text:   "#e8f0ec",
  muted:  "#9ba8a2",
  faint:  "#5a6b65",
  brand:  "#20c08b",
  danger: "#e05c5c",
};

const inp: React.CSSProperties = {
  padding: "7px 10px", fontSize: 13,
  background: C.bgInput, border: `1px solid ${C.border}`,
  borderRadius: 8, color: C.text, width: "100%",
  boxSizing: "border-box" as const, fontFamily: "inherit",
};

function Label({ text }: { text: string }) {
  return (
    <span style={{
      display: "block", fontSize: 10, fontWeight: 700,
      textTransform: "uppercase" as const, letterSpacing: "0.08em",
      color: C.faint, marginBottom: 4,
    }}>{text}</span>
  );
}

export function CustomPlanBuilder({
  catalog, initialProgram, targetGymId, onSuccess,
}: {
  catalog: CatalogGroup[];
  initialProgram?: WorkoutProgram;
  targetGymId?: string;
  onSuccess?: () => void;
}) {
  const isEditMode = Boolean(initialProgram);

  const exerciseById = useMemo(
    () => new Map(catalog.flatMap((g) => g.exercises.map((e) => [e.id, e] as const))),
    [catalog]
  );

  function initDays(): PlanDay[] {
    if (!initialProgram) return [makeDay(1)];
    return initialProgram.days.map((day) => ({
      id: nextId(), title: day.title,
      entries: day.exercises.map((ex) => ({
        id: nextId(), exerciseId: ex.exerciseId,
        label: exerciseById.get(ex.exerciseId)?.name ?? ex.exerciseId,
        sets: ex.sets ?? 3, reps: ex.reps ?? "8-12", isCustom: false,
      })),
    }));
  }

  const [days,              setDays]              = useState<PlanDay[]>(() => initDays());
  const [activeDayIdx,      setActiveDayIdx]      = useState(0);
  const [exerciseFilter,    setExerciseFilter]    = useState("");
  const [selectedExId,      setSelectedExId]      = useState(catalog[0]?.exercises[0]?.id ?? "");
  const [addSets,           setAddSets]           = useState(3);
  const [addReps,           setAddReps]           = useState("8-12");
  const [customExName,      setCustomExName]      = useState("");
  const [customExMuscle,    setCustomExMuscle]    = useState<string>("Chest");
  const [customExEquip,     setCustomExEquip]     = useState("");
  const [customExNotes,     setCustomExNotes]     = useState("");
  const [sendToAdmin,       setSendToAdmin]       = useState(true);
  const [status,            setStatus]            = useState<{ ok: boolean; msg: string } | null>(null);
  const [isSaving,          startSaving]          = useTransition();

  const activeDay = days[activeDayIdx] ?? days[0];

  const filteredCatalog = useMemo(() => {
    const q = exerciseFilter.toLowerCase();
    if (!q) return catalog;
    return catalog
      .map((g) => ({ ...g, exercises: g.exercises.filter((e) =>
        e.name.toLowerCase().includes(q) || g.muscleGroup.toLowerCase().includes(q)) }))
      .filter((g) => g.exercises.length > 0);
  }, [catalog, exerciseFilter]);

  function updateDay(idx: number, patch: Partial<PlanDay>) {
    setDays((p) => p.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }
  function addCatalogExercise() {
    if (!selectedExId) return;
    const ex = exerciseById.get(selectedExId);
    updateDay(activeDayIdx, { entries: [...activeDay.entries, {
      id: nextId(), exerciseId: selectedExId,
      label: ex?.name ?? selectedExId, sets: addSets, reps: addReps, isCustom: false,
    }]});
  }
  function addCustomExercise() {
    const name = customExName.trim(); if (!name) return;
    updateDay(activeDayIdx, { entries: [...activeDay.entries, {
      id: nextId(), exerciseId: `__custom__${name}`,
      label: name, sets: addSets, reps: addReps, isCustom: true,
    }]});
    setCustomExName("");
  }
  function updateEntry(dayIdx: number, i: number, patch: Partial<PlanExerciseEntry>) {
    updateDay(dayIdx, { entries: days[dayIdx].entries.map((e, j) => j === i ? { ...e, ...patch } : e) });
  }
  function removeEntry(dayIdx: number, i: number) {
    updateDay(dayIdx, { entries: days[dayIdx].entries.filter((_, j) => j !== i) });
  }
  function addDay() {
    const d = makeDay(days.length + 1);
    setDays((p) => [...p, d]); setActiveDayIdx(days.length);
  }
  function removeDay(idx: number) {
    if (days.length === 1) return;
    const next = days.filter((_, i) => i !== idx);
    setDays(next); setActiveDayIdx(Math.min(activeDayIdx, next.length - 1));
  }
  function copyDay(idx: number) {
    if (days.length >= 7) return;
    const src = days[idx];
    const copy: PlanDay = { id: nextId(), title: `${src.title} (copy)`, entries: src.entries.map((e) => ({ ...e, id: nextId() })) };
    const next = [...days]; next.splice(idx + 1, 0, copy);
    setDays(next); setActiveDayIdx(idx + 1);
  }

  const daysJson = JSON.stringify(days.map((d) => ({
    title: d.title,
    exerciseIds: d.entries.map((e) => e.exerciseId),
    sets: d.entries[0]?.sets ?? 3, reps: d.entries[0]?.reps ?? "8-12",
    entrySets: d.entries.map((e) => e.sets),
    entryReps: d.entries.map((e) => e.reps),
  })));

  const customForAdmin = useMemo(() => {
    const seen = new Set<string>();
    return days.flatMap((d) => d.entries.filter((e) => e.isCustom && !seen.has(e.label) && seen.add(e.label)));
  }, [days]);

  async function handleSave(fd: FormData) {
    fd.set("days", daysJson); fd.set("difficulty", "beginner"); fd.set("restSeconds", "75");
    if (targetGymId) fd.set("targetGymId", targetGymId);
    const action = isEditMode ? updateCustomWorkoutProgram : createCustomWorkoutProgram;
    if (isEditMode && initialProgram) fd.set("programId", initialProgram.id);
    const result = await action(initialFormActionState, fd);
    setStatus({ ok: result.status === "success", msg: result.message });
    if (result.status === "success" && sendToAdmin && customForAdmin.length > 0) {
      for (const e of customForAdmin) {
        const rf = new FormData();
        rf.set("name", e.label); rf.set("muscleGroup", customExMuscle);
        rf.set("equipment", customExEquip); rf.set("instructions", customExNotes);
        await requestCatalogExercise(initialFormActionState, rf);
      }
    }
    if (result.status === "success") onSuccess?.();
  }

  // Shared small-button style
  const btn = (variant: "primary" | "ghost" | "danger" = "ghost"): React.CSSProperties => ({
    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5,
    background: variant === "primary" ? C.brand : variant === "danger" ? "rgba(224,92,92,0.15)" : "rgba(255,255,255,0.07)",
    color:      variant === "primary" ? "#0a1714" : variant === "danger" ? C.danger : C.muted,
    border:     `1px solid ${variant === "primary" ? C.brand : variant === "danger" ? "rgba(224,92,92,0.3)" : C.border}`,
  });

  return (
    <form
      style={{ display: "flex", flexDirection: "column", background: C.bg, color: C.text }}
      onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startSaving(() => handleSave(fd)); }}
    >
      {/* ── Meta row ── */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 10, background: C.bgCard }}>
        <div>
          <Label text="Title" />
          <input name="title" style={inp} defaultValue={initialProgram?.title ?? "Custom Plan"} required />
        </div>
        <div>
          <Label text="Goal" />
          <input name="goal" style={inp} defaultValue={initialProgram?.goal ?? "General fitness"} />
        </div>
        <div>
          <Label text="Description" />
          <input name="description" style={inp} defaultValue={initialProgram?.description ?? "Owner-built workout plan"} />
        </div>
      </div>

      {/* ── Day tabs ── */}
      <div style={{ padding: "8px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", background: C.bgCard }}>
        {days.map((day, idx) => {
          const on = idx === activeDayIdx;
          return (
            <button key={day.id} type="button" onClick={() => setActiveDayIdx(idx)} style={{
              padding: "4px 10px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${on ? C.brand : C.border}`,
              background: on ? C.brand : "rgba(255,255,255,0.05)",
              color: on ? "#0a1714" : C.muted,
              display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "inherit",
            }}>
              {day.title || `Day ${idx + 1}`}
              {days.length < 7 && (
                <span title="Duplicate" role="button" style={{ opacity: 0.7, fontSize: 11 }}
                  onClick={(e) => { e.stopPropagation(); copyDay(idx); }}>⧉</span>
              )}
              {days.length > 1 && (
                <span title="Remove" role="button" style={{ opacity: 0.7, lineHeight: 1, display: "inline-flex" }}
                  onClick={(e) => { e.stopPropagation(); removeDay(idx); }}><X /></span>
              )}
            </button>
          );
        })}
        {days.length < 7 && (
          <button type="button" onClick={addDay} style={{
            padding: "4px 9px", borderRadius: 7, border: `1px dashed ${C.border}`,
            background: "transparent", color: C.faint, fontSize: 12,
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit",
          }}>
            <Plus /> Add day
          </button>
        )}
      </div>

      {/* ── Two-column editor ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 300 }}>

        {/* LEFT — exercise list for active day */}
        <div style={{ borderRight: `1px solid ${C.border}`, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, overflow: "auto" }}>
          {/* Inline day title */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <input
              value={activeDay.title}
              onChange={(e) => updateDay(activeDayIdx, { title: e.target.value })}
              placeholder={`Day ${activeDayIdx + 1}`}
              style={{ ...inp, fontWeight: 700, fontSize: 13, flex: 1 }}
            />
            <span style={{ fontSize: 11, color: C.faint, whiteSpace: "nowrap" }}>
              {activeDay.entries.length} exercise{activeDay.entries.length !== 1 ? "s" : ""}
            </span>
          </div>

          {activeDay.entries.length === 0 ? (
            <div style={{ padding: "14px", textAlign: "center", color: C.faint, fontSize: 12, border: `1px dashed ${C.border}`, borderRadius: 8 }}>
              No exercises — pick from catalog →
            </div>
          ) : (
            activeDay.entries.map((entry, i) => (
              <div key={entry.id} style={{
                display: "grid", gridTemplateColumns: "1fr 42px 8px 48px 24px",
                gap: 5, alignItems: "center",
                padding: "7px 9px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 7,
              }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.text }}>
                  {entry.label}
                  {entry.isCustom && (
                    <span style={{ marginLeft: 5, fontSize: 9, background: "rgba(32,192,139,0.18)", color: C.brand, padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>custom</span>
                  )}
                </span>
                <input type="number" min="1" title="Sets" value={entry.sets}
                  onChange={(e) => updateEntry(activeDayIdx, i, { sets: Number(e.target.value) })}
                  style={{ ...inp, padding: "4px 5px", textAlign: "center", fontSize: 12 }} />
                <span style={{ fontSize: 10, color: C.faint, textAlign: "center" }}>×</span>
                <input title="Reps" value={entry.reps}
                  onChange={(e) => updateEntry(activeDayIdx, i, { reps: e.target.value })}
                  style={{ ...inp, padding: "4px 5px", textAlign: "center", fontSize: 12 }} />
                <button type="button" aria-label={`Remove ${entry.label}`}
                  onClick={() => removeEntry(activeDayIdx, i)}
                  style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", padding: 0, lineHeight: 1, display: "flex" }}>
                  <X />
                </button>
              </div>
            ))
          )}
        </div>

        {/* RIGHT — add exercise */}
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>

          <div>
            <Label text="From catalog" />
            <input placeholder="Filter exercises…" value={exerciseFilter}
              onChange={(e) => setExerciseFilter(e.target.value)}
              style={{ ...inp, marginBottom: 7 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 48px 56px", gap: 6, marginBottom: 7 }}>
              <select value={selectedExId} onChange={(e) => setSelectedExId(e.target.value)}
                style={{ ...inp, appearance: "none" as const }}>
                {filteredCatalog.flatMap((g) =>
                  g.exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>[{g.muscleGroup}] {ex.name}</option>
                  ))
                )}
                {filteredCatalog.length === 0 && <option disabled value="">No matches</option>}
              </select>
              <input type="number" min="1" title="Sets" value={addSets}
                onChange={(e) => setAddSets(Number(e.target.value))}
                style={{ ...inp, textAlign: "center" }} />
              <input title="Reps" value={addReps} onChange={(e) => setAddReps(e.target.value)}
                style={{ ...inp, textAlign: "center" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={addCatalogExercise}
                disabled={!selectedExId || filteredCatalog.length === 0}
                style={btn("primary")}>
                <Plus /> Add
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 9.5, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.07em" }}>or custom</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <div>
            <Label text="Custom exercise" />
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input placeholder="e.g. Cable Face Pull" value={customExName}
                onChange={(e) => setCustomExName(e.target.value)}
                style={{ ...inp, flex: 1 }} />
              <button type="button" onClick={addCustomExercise} disabled={!customExName.trim()}
                style={{ ...btn("ghost"), flexShrink: 0 }}>
                <Plus /> Add
              </button>
            </div>
            {customExName.trim() && (
              <div style={{ background: "rgba(32,192,139,0.07)", border: `1px solid rgba(32,192,139,0.18)`, borderRadius: 8, padding: "10px 12px" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>
                  <input type="checkbox" checked={sendToAdmin} onChange={(e) => setSendToAdmin(e.target.checked)}
                    style={{ marginTop: 2, accentColor: C.brand }} />
                  Request addition to official catalog
                </label>
                {sendToAdmin && (
                  <div style={{ display: "grid", gap: 7, gridTemplateColumns: "1fr 1fr" }}>
                    <div>
                      <Label text="Muscle group" />
                      <select value={customExMuscle} onChange={(e) => setCustomExMuscle(e.target.value)}
                        style={{ ...inp, appearance: "none" as const }}>
                        {ALL_MUSCLE_GROUPS.map((mg) => <option key={mg} value={mg}>{mg}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label text="Equipment (optional)" />
                      <input value={customExEquip} onChange={(e) => setCustomExEquip(e.target.value)}
                        placeholder="e.g. Cable" style={inp} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Label text="Notes for admin" />
                      <textarea value={customExNotes} onChange={(e) => setCustomExNotes(e.target.value)}
                        placeholder="Setup, cues, common mistakes..." rows={2}
                        style={{ ...inp, resize: "vertical" as const }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: `1px solid ${C.border}`, padding: "10px 20px",
        display: "flex", alignItems: "center", gap: 10,
        background: C.bgCard, flexShrink: 0,
      }}>
        {status ? (
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: status.ok ? C.brand : C.danger }}>{status.msg}</span>
        ) : (
          <span style={{ flex: 1, fontSize: 12, color: C.faint }}>
            {days.reduce((t, d) => t + d.entries.length, 0)} ex. · {days.length} day{days.length !== 1 ? "s" : ""}
          </span>
        )}
        <input name="days" type="hidden" value={daysJson} />
        <input name="difficulty" type="hidden" value="beginner" />
        <input name="restSeconds" type="hidden" value="75" />
        <button type="submit" disabled={isSaving} style={btn("primary")}>
          {isSaving ? (isEditMode ? "Saving…" : "Creating…") : (isEditMode ? "Save changes" : "Save custom plan")}
        </button>
      </div>
    </form>
  );
}
