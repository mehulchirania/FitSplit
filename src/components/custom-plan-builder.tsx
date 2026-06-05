"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  createCustomWorkoutProgram,
  requestCatalogExercise,
  updateCustomWorkoutProgram,
} from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { Exercise, MuscleGroup, WorkoutProgram } from "@/types/domain";

// ── Types ─────────────────────────────────────────────────────────────────────
type CatalogGroup = { muscleGroup: MuscleGroup; exercises: Exercise[] };
type PlanEntry = {
  id: string; exerciseId: string; name: string;
  group: string; mechanic: string;
  sets: number; reps: string; isCustom: boolean;
};
type PlanDay = { id: string; title: string; entries: PlanEntry[] };

// ── Constants ─────────────────────────────────────────────────────────────────
const REP_PRESETS = ["5","6-8","8-10","8-12","10-12","10-15","12-15","15-20","To failure"];
const WEEKDAYS    = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const ALL_MUSCLE_GROUPS = ["Back","Biceps","Cardio","Chest","Core","Forearms","Legs","Shoulders","Triceps"];

function uid() { return Math.random().toString(36).slice(2, 8); }
function makeDay(n: number): PlanDay { return { id: uid(), title: `Day ${n}`, entries: [] }; }

// ── Inline SVG icons ──────────────────────────────────────────────────────────
function IcClose({ w = 14 }: { w?: number }) {
  return <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
}
function IcPlus({ w = 15 }: { w?: number }) {
  return <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
}
function IcSearch() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>;
}
function IcTrash() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>;
}
function IcCopy() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>;
}
function IcGrip() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>;
}
function IcCheck({ w = 13 }: { w?: number }) {
  return <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
}
function IcDumbbell() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.4 14.4 9.6 9.6M18.7 16.6l1.4 1.4a2 2 0 0 0 2.8-2.8l-1.4-1.4M5.3 7.4 3.9 6a2 2 0 0 1 2.8-2.8l1.4 1.4M21 3l-3 3M3 21l3-3M16.6 18.7l1.4-1.4a2 2 0 0 0 0-2.8L9.5 6a2 2 0 0 0-2.8 0L5.3 7.4a2 2 0 0 0 0 2.8l8.5 8.5a2 2 0 0 0 2.8 0Z"/></svg>;
}
function IcChevDown() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RepsSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const has = REP_PRESETS.includes(value);
  return (
    <select className="ep-reps" value={value} onChange={(e) => onChange(e.target.value)}>
      {!has && <option value={value}>{value}</option>}
      {REP_PRESETS.map((r) => <option key={r} value={r}>{r}</option>)}
    </select>
  );
}

function DayNamePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click
  useState(() => {
    if (typeof document === "undefined") return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  });

  const pick = (v: string) => { onChange(v); setOpen(false); };

  return (
    <div className="ep-daypick" ref={ref}>
      <input
        className="ep-dayname"
        value={value}
        placeholder="Name this day"
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className={"ep-daypick__btn" + (open ? " ep-daypick__btn--on" : "")}
        title="Quick-name this day"
        onClick={() => setOpen((o) => !o)}
      >
        <IcChevDown />
      </button>
      {open && (
        <div className="ep-daypop">
          <p className="ep-daypop__label">By number</p>
          <div className="ep-daypop__grid">
            {[1,2,3,4,5,6,7].map((n) => (
              <button key={n} type="button"
                className={"ep-daypop__cell" + (value === `Day ${n}` ? " ep-daypop__cell--on" : "")}
                onClick={() => pick(`Day ${n}`)}>{n}</button>
            ))}
          </div>
          <p className="ep-daypop__label">By day of week</p>
          <div className="ep-daypop__grid ep-daypop__grid--wk">
            {WEEKDAYS.map((d) => (
              <button key={d} type="button"
                className={"ep-daypop__cell" + (value === d ? " ep-daypop__cell--on" : "")}
                onClick={() => pick(d)}>{d.slice(0, 3)}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanExercise({
  entry, onSets, onReps, onRemove,
  dragId, overId, onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  entry: PlanEntry;
  onSets: (v: number) => void;
  onReps: (v: string) => void;
  onRemove: () => void;
  dragId: string | null; overId: string | null;
  onDragStart: () => void; onDragOver: () => void;
  onDrop: () => void; onDragEnd: () => void;
}) {
  return (
    <div
      className={
        "ep-ex" +
        (dragId === entry.id ? " ep-ex--drag" : "") +
        (overId === entry.id ? " ep-ex--over" : "")
      }
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <span className="ep-ex__handle" title="Drag to reorder"><IcGrip /></span>
      <span className="ep-ex__name">
        {entry.name}
        {entry.isCustom && <span className="ep-ex__custom">Custom</span>}
      </span>
      <div className="ep-ex__controls">
        <div className="ep-stepper" title="Sets">
          <button type="button" className="ep-stepper__btn" onClick={() => onSets(Math.max(1, entry.sets - 1))}>−</button>
          <span className="ep-stepper__val">{entry.sets}</span>
          <button type="button" className="ep-stepper__btn" onClick={() => onSets(entry.sets + 1)}>+</button>
        </div>
        <RepsSelect value={entry.reps} onChange={onReps} />
        <button type="button" className="ep-iconbtn" title="Remove exercise" onClick={onRemove}><IcTrash /></button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CustomPlanBuilder({
  catalog, initialProgram, targetGymId, onSuccess, onCancel,
}: {
  catalog: CatalogGroup[];
  initialProgram?: WorkoutProgram;
  targetGymId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initialProgram);

  // Build exercise lookup from prop catalog
  const exById = useMemo(
    () => new Map(catalog.flatMap((g) => g.exercises.map((e) => [e.id, { ...e, group: g.muscleGroup }] as const))),
    [catalog]
  );

  // Muscle groups derived from catalog
  const muscleGroups = useMemo(() => catalog.map((g) => g.muscleGroup), [catalog]);

  function initDays(): PlanDay[] {
    if (!initialProgram) return [makeDay(1)];
    return initialProgram.days.map((day) => ({
      id: uid(), title: day.title,
      entries: day.exercises.map((ex) => {
        const info = exById.get(ex.exerciseId);
        return {
          id: uid(), exerciseId: ex.exerciseId,
          name: info?.name ?? ex.exerciseId,
          group: info?.muscleGroup ?? "Other",
          mechanic: (info as Exercise & { mechanic?: string })?.mechanic ?? "",
          sets: ex.sets ?? 3, reps: ex.reps ?? "8-12", isCustom: false,
        };
      }),
    }));
  }

  const [meta,       setMeta]       = useState({ title: initialProgram?.title ?? "Custom Plan", goal: initialProgram?.goal ?? "General fitness", description: initialProgram?.description ?? "Owner-built workout" });
  const [days,       setDays]       = useState<PlanDay[]>(() => initDays());
  const [active,     setActive]     = useState(0);
  const [search,     setSearch]     = useState("");
  const [group,      setGroup]      = useState("All");
  const [customName, setCustomName] = useState("");
  const [reqOpen,    setReqOpen]    = useState(true);
  const [reqMuscle,  setReqMuscle]  = useState("Chest");
  const [reqEquip,   setReqEquip]   = useState("");
  const [reqNotes,   setReqNotes]   = useState("");
  const [toast,      setToast]      = useState<string | null>(null);
  const [isSaving,   startSaving]   = useTransition();

  // Drag state
  const dragRef = useRef<string | null>(null);
  const [dragState, setDragState] = useState<{ dragId: string | null; overId: string | null }>({ dragId: null, overId: null });

  const day      = days[active] ?? days[0];
  const totalEx  = days.reduce((t, d) => t + d.entries.length, 0);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  function patchDay(idx: number, patch: Partial<PlanDay>) {
    setDays((p) => p.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  function addExercise(ex: Exercise & { group: string; mechanic: string }) {
    patchDay(active, { entries: [...day.entries, { id: uid(), exerciseId: ex.id, name: ex.name, group: ex.group, mechanic: ex.mechanic, sets: 3, reps: "8-12", isCustom: false }] });
    showToast(`Added "${ex.name}" to ${day.title}`);
  }

  function addCustom() {
    const name = customName.trim(); if (!name) return;
    patchDay(active, { entries: [...day.entries, { id: uid(), exerciseId: `__custom__${name}`, name, group: reqMuscle, mechanic: "Custom", sets: 3, reps: "8-12", isCustom: true }] });
    showToast(reqOpen ? `Added "${name}" + catalog request queued` : `Added "${name}"`);
    setCustomName(""); setReqEquip(""); setReqNotes("");
  }

  function updateEntry(i: number, patch: Partial<PlanEntry>) {
    patchDay(active, { entries: day.entries.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  }
  function removeEntry(i: number) {
    patchDay(active, { entries: day.entries.filter((_, j) => j !== i) });
  }
  function addDay() {
    const d = makeDay(days.length + 1);
    setDays((p) => [...p, d]); setActive(days.length);
  }
  function dupDay(idx: number) {
    const src = days[idx];
    const copy: PlanDay = { id: uid(), title: `${src.title} (copy)`, entries: src.entries.map((e) => ({ ...e, id: uid() })) };
    const next = [...days]; next.splice(idx + 1, 0, copy);
    setDays(next); setActive(idx + 1);
  }
  function removeDay(idx: number) {
    if (days.length === 1) return;
    const next = days.filter((_, i) => i !== idx);
    setDays(next); setActive(Math.min(active, next.length - 1));
  }

  // Drag reorder
  const dnd = {
    dragId: dragState.dragId, overId: dragState.overId,
    start: (id: string) => { dragRef.current = id; setDragState({ dragId: id, overId: null }); },
    over:  (id: string) => setDragState((s) => s.overId === id ? s : { ...s, overId: id }),
    drop:  (id: string) => {
      const from = day.entries.findIndex((e) => e.id === dragRef.current);
      const to   = day.entries.findIndex((e) => e.id === id);
      if (from < 0 || to < 0 || from === to) return;
      const arr = [...day.entries]; const [m] = arr.splice(from, 1); arr.splice(to, 0, m);
      patchDay(active, { entries: arr });
    },
    end: () => { dragRef.current = null; setDragState({ dragId: null, overId: null }); },
  };

  // Filtered catalog
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog
      .filter((g) => group === "All" || g.muscleGroup === group)
      .map((g) => ({ group: g.muscleGroup, exercises: g.exercises.filter((e) => !q || e.name.toLowerCase().includes(q)) }))
      .filter((g) => g.exercises.length > 0);
  }, [catalog, search, group]);

  const countInDay = (id: string) => day.entries.filter((e) => e.exerciseId === id).length;

  // Serialise for server action
  const daysJson = JSON.stringify(days.map((d) => ({
    title: d.title,
    exerciseIds: d.entries.map((e) => e.exerciseId),
    sets: d.entries[0]?.sets ?? 3,
    reps: d.entries[0]?.reps ?? "8-12",
    entrySets: d.entries.map((e) => e.sets),
    entryReps: d.entries.map((e) => e.reps),
  })));

  const customForAdmin = useMemo(() => {
    const seen = new Set<string>();
    return days.flatMap((d) => d.entries.filter((e) => e.isCustom && !seen.has(e.name) && seen.add(e.name)));
  }, [days]);

  async function handleSave(fd: FormData) {
    fd.set("days", daysJson); fd.set("difficulty", "beginner"); fd.set("restSeconds", "75");
    if (targetGymId) fd.set("targetGymId", targetGymId);
    const action = isEdit ? updateCustomWorkoutProgram : createCustomWorkoutProgram;
    if (isEdit && initialProgram) fd.set("programId", initialProgram.id);
    const result = await action(initialFormActionState, fd);
    if (result.status === "success" && reqOpen && customForAdmin.length > 0) {
      for (const e of customForAdmin) {
        const rf = new FormData();
        rf.set("name", e.name); rf.set("muscleGroup", reqMuscle);
        rf.set("equipment", reqEquip); rf.set("instructions", reqNotes);
        await requestCatalogExercise(initialFormActionState, rf);
      }
    }
    if (result.status === "success") { showToast("Changes saved"); onSuccess?.(); }
    else showToast(`Error: ${result.message}`);
  }

  return (
    <div className="ep-modal">
      {/* Header */}
      <header className="ep-head">
        <div>
          <p className="ep-head__eyebrow">Workout program</p>
          <h2 className="ep-head__title">
            {isEdit ? <>Edit plan <em>· {meta.title}</em></> : "New custom plan"}
          </h2>
          <p className="ep-head__desc">Add training days, then fill each day with exercises from the catalog.</p>
        </div>
        <button className="ep-close" type="button" onClick={onCancel}>
          <IcClose /> Close
        </button>
      </header>

      {/* Meta */}
      <section className="ep-meta">
        <div className="ep-field">
          <label>Title</label>
          <input className="ep-input" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
        </div>
        <div className="ep-field">
          <label>Goal</label>
          <input className="ep-input" value={meta.goal} onChange={(e) => setMeta({ ...meta, goal: e.target.value })} />
        </div>
        <div className="ep-field">
          <label>Description</label>
          <input className="ep-input" value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
        </div>
      </section>

      {/* Day tabs */}
      <nav className="ep-days">
        <span className="ep-days__label">Days</span>
        {days.map((d, idx) => (
          <div
            key={d.id}
            className={"ep-tab" + (idx === active ? " ep-tab--on" : "")}
            onClick={() => setActive(idx)}
          >
            <span>{d.title || `Day ${idx + 1}`}</span>
            <span className="ep-tab__count">{d.entries.length}</span>
            <span className="ep-tab__icons">
              <span className="ep-tab__ico" title="Duplicate day" onClick={(e) => { e.stopPropagation(); dupDay(idx); }}><IcCopy /></span>
              {days.length > 1 && (
                <span className="ep-tab__ico" title="Remove day" onClick={(e) => { e.stopPropagation(); removeDay(idx); }}><IcClose w={12} /></span>
              )}
            </span>
          </div>
        ))}
        <button className="ep-tab--add" type="button" onClick={addDay}><IcPlus w={13} /> Add day</button>
      </nav>

      {/* Body */}
      <div className="ep-body">
        {/* LEFT — plan */}
        <section className="ep-pane ep-pane--plan">
          <div className="ep-pane__head">
            <DayNamePicker value={day.title} onChange={(v) => patchDay(active, { title: v })} />
            <span className="ep-pane__sub">{day.entries.length} exercise{day.entries.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="ep-scroll">
            {day.entries.length === 0 ? (
              <div className="ep-empty">
                <div className="ep-empty__icon"><IcDumbbell /></div>
                <p className="ep-empty__title">Pick an exercise to start</p>
                <p className="ep-empty__sub">Tap any exercise in the catalog on the right →<br />or add your own custom movement below it.</p>
              </div>
            ) : (
              <>
                <div className="ep-ex-head">
                  <span className="ep-ex-head__name">Exercise</span>
                  <span className="ep-ex-head__sets">Sets</span>
                  <span className="ep-ex-head__reps">Reps</span>
                  <span className="ep-ex-head__sp" />
                </div>
                <div className="ep-ex-list">
                  {day.entries.map((entry, i) => (
                    <PlanExercise
                      key={entry.id} entry={entry}
                      onSets={(v) => updateEntry(i, { sets: v })}
                      onReps={(v) => updateEntry(i, { reps: v })}
                      onRemove={() => removeEntry(i)}
                      dragId={dnd.dragId} overId={dnd.overId}
                      onDragStart={() => dnd.start(entry.id)}
                      onDragOver={() => dnd.over(entry.id)}
                      onDrop={() => dnd.drop(entry.id)}
                      onDragEnd={dnd.end}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* RIGHT — catalog */}
        <section className="ep-pane ep-pane--catalog">
          <div className="ep-pane__head">
            <h3 className="ep-pane__title">Exercise catalog</h3>
            <span className="ep-pane__sub">Tap to add to {day.title}</span>
          </div>
          <div className="ep-search">
            <IcSearch />
            <input placeholder="Search exercises…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="ep-chips">
            {["All", ...muscleGroups].map((g) => (
              <button key={g} type="button"
                className={"ep-chip" + (group === g ? " ep-chip--on" : "")}
                onClick={() => setGroup(g)}>
                {g}
              </button>
            ))}
          </div>
          <p className="ep-cat-hint">Tap an exercise to add it · it starts at <b>3 × 8–12</b>, adjust on the left.</p>
          <div className="ep-scroll">
            {filtered.length === 0 ? (
              <div className="ep-cat-empty">No exercises match &ldquo;{search}&rdquo;.</div>
            ) : filtered.map((g) => (
              <div key={g.group} className="ep-cat-group">
                <div className="ep-cat-group__h">{g.group}</div>
                {g.exercises.map((ex) => {
                  const n = countInDay(ex.id);
                  const info = exById.get(ex.id);
                  return (
                    <button key={ex.id} type="button"
                      className={"ep-cat-row" + (n > 0 ? " ep-cat-row--added" : "")}
                      onClick={() => addExercise({ ...ex, group: g.group, mechanic: (info as Exercise & { mechanic?: string })?.mechanic ?? "" })}>
                      <span className="ep-cat-row__add"><IcPlus /></span>
                      <span className="ep-cat-row__main">
                        <span className="ep-cat-row__name">{ex.name}</span>
                        <span className="ep-cat-row__mech">{(info as Exercise & { mechanic?: string })?.mechanic ?? ""}</span>
                      </span>
                      {n > 0 && <span className="ep-cat-row__count"><IcCheck /> {n}×</span>}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Custom exercise */}
            <div className="ep-custom">
              <div className="ep-custom__head"><h4>Add a custom exercise</h4></div>
              <p className="ep-custom__sub">Can&apos;t find a movement? Type its name and add it to this day.</p>
              <div className="ep-custom__row">
                <input className="ep-input" placeholder="e.g. Cable Face Pull" value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }} />
                <button className="ep-btn-add" type="button" disabled={!customName.trim()} onClick={addCustom}>
                  <IcPlus /> Add
                </button>
              </div>
              <div className="ep-req">
                <label className="ep-check">
                  <input type="checkbox" checked={reqOpen} onChange={(e) => setReqOpen(e.target.checked)} />
                  Request addition to the official FitSplit catalog
                </label>
                {reqOpen && (
                  <div className="ep-req__grid">
                    <div>
                      <select className="ep-select" value={reqMuscle} onChange={(e) => setReqMuscle(e.target.value)}>
                        {ALL_MUSCLE_GROUPS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <input className="ep-input" placeholder="Equipment (optional)" value={reqEquip} onChange={(e) => setReqEquip(e.target.value)} />
                    </div>
                    <div className="ep-full">
                      <textarea className="ep-textarea" placeholder="Notes for admin — setup, cues, common mistakes…" value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="ep-foot">
        <div className="ep-foot__summary">
          <span className="ep-foot__stat"><b>{totalEx}</b> {totalEx === 1 ? "exercise" : "exercises"}</span>
          <span className="ep-foot__dot" />
          <span className="ep-foot__stat"><b>{days.length}</b> {days.length === 1 ? "day" : "days"}</span>
        </div>
        <input type="hidden" name="days" value={daysJson} />
        <input type="hidden" name="difficulty" value="beginner" />
        <input type="hidden" name="restSeconds" value="75" />
        <button className="ep-btn-ghost" type="button" onClick={onCancel}>Cancel</button>
        <button
          className="ep-btn-primary"
          type="button"
          disabled={isSaving}
          onClick={() => {
            const fd = new FormData();
            fd.set("title", meta.title); fd.set("goal", meta.goal); fd.set("description", meta.description);
            startSaving(() => handleSave(fd));
          }}
        >
          <IcCheck w={15} /> {isSaving ? "Saving…" : "Save changes"}
        </button>
      </footer>

      {toast && (
        <div className="ep-toast">
          <IcCheck w={15} /> {toast}
        </div>
      )}
    </div>
  );
}
