"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCustomPlan, searchExercisesForPlan, type ExerciseHit } from "@/lib/firebase/actions/programs";
import { ChevronLeft, PlusIcon, SearchIcon, TrashIcon } from "./icons";
import { Sheet } from "./sheet";

type DraftExercise = { exerciseId: string; name: string; sets: number; reps: string };
type DraftDay = { uid: number; title: string; exercises: DraftExercise[] };

const MUSCLES = ["Chest", "Back", "Legs", "Shoulders", "Biceps", "Triceps", "Core"];
let nextUid = 1;
const newDay = (n: number): DraftDay => ({ uid: nextUid++, title: `Day ${n}`, exercises: [] });

function ExercisePicker({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (hit: ExerciseHit) => void }) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("");
  const [hits, setHits] = useState<ExerciseHit[]>([]);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);

  useEffect(() => {
    if (!open) return;
    const id = ++request.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchExercisesForPlan(q, muscle);
        if (id === request.current) setHits(res);
      } catch {
        if (id === request.current) setHits([]);
      } finally {
        if (id === request.current) setLoading(false);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [q, muscle, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add exercise">
      <div className="fs-stack">
        <label className="fs-search">
          <SearchIcon size={18} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercises"
            aria-label="Search exercises"
            autoComplete="off"
          />
        </label>
        <div className="fs-chips" role="group" aria-label="Muscle group">
          <button type="button" className="fs-chip" aria-pressed={muscle === ""} onClick={() => setMuscle("")}>
            All
          </button>
          {MUSCLES.map((m) => (
            <button key={m} type="button" className="fs-chip" aria-pressed={muscle === m} onClick={() => setMuscle(muscle === m ? "" : m)}>
              {m}
            </button>
          ))}
        </div>
        <div className="fs-group" aria-busy={loading}>
          {hits.map((h) => (
            <button
              key={h.id}
              type="button"
              className="fs-row fs-row--tap"
              onClick={() => {
                onPick(h);
                onOpenChange(false);
              }}
            >
              <span className="fs-row__main">
                <span className="fs-row__title">{h.name}</span>
                <span className="fs-row__sub">
                  {h.muscleGroup} · {h.equipment}
                </span>
              </span>
              <PlusIcon size={18} className="fs-row__chev" />
            </button>
          ))}
          {!loading && hits.length === 0 && <p className="fs-empty">No exercises match that search.</p>}
        </div>
      </div>
    </Sheet>
  );
}

/** Build your own plan: a name, some days, and exercises from the library. Saving starts the plan. */
export function PlanBuilder({ backHref }: { backHref: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<DraftDay[]>(() => [newDay(1)]);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function patchDay(uid: number, fn: (d: DraftDay) => DraftDay) {
    setDays((prev) => prev.map((d) => (d.uid === uid ? fn(d) : d)));
  }

  function save() {
    startTransition(async () => {
      const res = await createCustomPlan({
        title,
        days: days.map((d) => ({
          title: d.title,
          exercises: d.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets, reps: e.reps }))
        }))
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      router.replace("/member");
      router.refresh();
    });
  }

  const ready = title.trim().length > 0 && days.length > 0 && days.every((d) => d.exercises.length > 0);

  return (
    <main className="fs-page fs-page--focus fs-page--cta">
      <header className="fs-navbar">
        <Link href={backHref} className="fs-text-btn fs-navbar__back">
          <ChevronLeft size={18} /> Back
        </Link>
      </header>
      <header className="fs-head">
        <h1 className="fs-title">Create your plan</h1>
        <p className="fs-soft">Name it, add your training days, then pick exercises for each.</p>
      </header>

      <section className="fs-section">
        <h2 className="fs-section__title">Name</h2>
        <div className="fs-group">
          <label className="fs-field">
            <span className="fs-sr">Plan name</span>
            <input className="fs-input" value={title} maxLength={60} placeholder="e.g. My 4-day split" onChange={(e) => setTitle(e.target.value)} />
          </label>
        </div>
      </section>

      {days.map((d, di) => (
        <section className="fs-section" key={d.uid}>
          <div className="fs-section__bar">
            <h2 className="fs-section__title">Day {di + 1}</h2>
            {days.length > 1 && (
              <button type="button" className="fs-text-btn fs-text-btn--danger" onClick={() => setDays((p) => p.filter((x) => x.uid !== d.uid))}>
                Remove day
              </button>
            )}
          </div>
          <div className="fs-group">
            <label className="fs-field">
              <span className="fs-sr">Day {di + 1} name</span>
              <input
                className="fs-input"
                value={d.title}
                maxLength={40}
                placeholder="e.g. Push"
                onChange={(e) => patchDay(d.uid, (x) => ({ ...x, title: e.target.value }))}
              />
            </label>
            {d.exercises.map((e, ei) => (
              <div className="fs-builder-ex" key={`${e.exerciseId}-${ei}`}>
                <div className="fs-builder-ex__name">
                  <span>{e.name}</span>
                  <button
                    type="button"
                    className="fs-icon-btn"
                    aria-label={`Remove ${e.name}`}
                    onClick={() => patchDay(d.uid, (x) => ({ ...x, exercises: x.exercises.filter((_, j) => j !== ei) }))}
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>
                <div className="fs-builder-ex__fields">
                  <label>
                    <span>Sets</span>
                    <input
                      className="fs-input fs-num"
                      inputMode="numeric"
                      value={e.sets}
                      onChange={(ev) => {
                        const n = Math.min(12, Math.max(1, parseInt(ev.target.value.replace(/\D/g, ""), 10) || 1));
                        patchDay(d.uid, (x) => ({ ...x, exercises: x.exercises.map((y, j) => (j === ei ? { ...y, sets: n } : y)) }));
                      }}
                    />
                  </label>
                  <label>
                    <span>Reps</span>
                    <input
                      className="fs-input fs-num"
                      value={e.reps}
                      maxLength={12}
                      placeholder="8-12"
                      onChange={(ev) => patchDay(d.uid, (x) => ({ ...x, exercises: x.exercises.map((y, j) => (j === ei ? { ...y, reps: ev.target.value } : y)) }))}
                    />
                  </label>
                </div>
              </div>
            ))}
            <button type="button" className="fs-row fs-row--tap fs-row--action" onClick={() => setPickerFor(d.uid)}>
              <span className="fs-row__icon fs-row__icon--fill">
                <PlusIcon size={18} />
              </span>
              <span className="fs-row__title">Add exercise</span>
            </button>
          </div>
        </section>
      ))}

      {days.length < 7 && (
        <button type="button" className="fs-btn fs-btn--secondary" onClick={() => setDays((p) => [...p, newDay(p.length + 1)])}>
          Add another day
        </button>
      )}

      <div className="fs-sticky-cta">
        <button type="button" className="fs-btn fs-btn--primary fs-btn--lg" disabled={!ready || pending} onClick={save}>
          {pending ? "Saving…" : "Save and start plan"}
        </button>
      </div>

      <ExercisePicker
        open={pickerFor !== null}
        onOpenChange={(o) => !o && setPickerFor(null)}
        onPick={(hit) => {
          if (pickerFor === null) return;
          patchDay(pickerFor, (x) => ({ ...x, exercises: [...x.exercises, { exerciseId: hit.id, name: hit.name, sets: 3, reps: "8-12" }] }));
        }}
      />
    </main>
  );
}
