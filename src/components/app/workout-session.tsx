"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { finishWorkout, getSwapOptions, logSet, removeSet, type SwapOption } from "@/lib/firebase/actions/workouts";
import { formatClock, formatDuration, formatKg, parseReps } from "@/lib/today";
import { sessionRecords, type SessionRecord } from "@/lib/recap";
import { ShareCardButton } from "./share-card";
import { CheckIcon, ChevronDown, ChevronLeft, CloseIcon, ExternalIcon, ListIcon } from "./icons";
import { Sheet } from "./sheet";
import { RehabCard } from "./rehab/rehab-bits";

export type SessionExercise = {
  key: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  steps: string[];
  videoUrl: string;
  sets: number;
  reps: string;
  restSeconds: number;
  /** What the user did the last time they trained this exercise, set by set. */
  last: Array<{ weight: number; reps: number }>;
  /** Heaviest weight ever logged for this exercise before today (0 = never). */
  priorBest: number;
  /** Two straight sessions at the top of the rep range: a small weight jump to offer. Never forced. */
  nudge?: { fromKg: number; toKg: number; reps: number } | null;
};

export type SessionProps = {
  programId: string;
  dayId: string;
  dayTitle: string;
  exercises: SessionExercise[];
  nextDayTitle: string | null;
  /** The user's combined rehab routine, when they have added conditions: offered after the summary. */
  rehab?: { count: number; minutes: number } | null;
  /** "short": the trimmed version of the day, kept apart from a full session in storage. */
  variant?: "short";
};

type Row = { weight: string; reps: string; done: boolean; saving: boolean; edited: boolean; logId?: string };
type Rows = Record<string, Row[]>;
type Swaps = Record<string, Partial<SessionExercise>>;
type Saved = { sessionId: string; startedAt: number; rows: Rows; index: number; swaps?: Swaps };

const STALE_MS = 1000 * 60 * 60 * 12;

function initialRows(exercises: SessionExercise[]): Rows {
  const rows: Rows = {};
  for (const ex of exercises) {
    const targetReps = parseReps(ex.reps);
    rows[ex.key] = Array.from({ length: ex.sets }, (_, i) => {
      const prev = ex.last[i] ?? ex.last[ex.last.length - 1];
      return {
        weight: prev ? formatKg(prev.weight) : "",
        reps: String(prev?.reps ?? targetReps ?? ""),
        done: false,
        saving: false,
        edited: false
      };
    });
  }
  return rows;
}

function storageKey(p: SessionProps) {
  return `fitsplit-session:${p.programId}:${p.dayId}${p.variant ? `:${p.variant}` : ""}`;
}

function loadSaved(p: SessionProps): Saved | null {
  try {
    const raw = window.localStorage.getItem(storageKey(p));
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    if (!saved.sessionId || Date.now() - saved.startedAt > STALE_MS) return null;
    const swaps = saved.swaps ?? {};
    const base = p.exercises.map((e) => (swaps[e.key] ? { ...e, ...swaps[e.key] } : e));
    const rows = initialRows(base);
    for (const ex of base) {
      const kept = saved.rows[ex.key];
      if (kept?.length) rows[ex.key] = kept.map((r) => ({ ...r, saving: false }));
    }
    return { ...saved, swaps, rows, index: Math.min(saved.index ?? 0, p.exercises.length - 1) };
  } catch {
    return null;
  }
}

function newSessionId() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ── small live pieces: each owns its own tick so the screen does not re-render every second ── */

function Clock({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="fs-num">{formatClock((now - startedAt) / 1000)}</span>;
}

function RestTimer({
  endsAt,
  total,
  onAdjust,
  onDone
}: {
  endsAt: number;
  total: number;
  onAdjust: (deltaSeconds: number) => void;
  onDone: () => void;
}) {
  const [now, setNow] = useState(endsAt - total * 1000);
  const finished = useRef(false);
  useEffect(() => {
    finished.current = false;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt && !finished.current) {
        finished.current = true;
        try {
          navigator.vibrate?.([120, 60, 120]);
        } catch {
          /* not supported */
        }
        window.setTimeout(onDone, 2500);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [endsAt, onDone]);

  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const progress = Math.min(1, Math.max(0, 1 - (endsAt - now) / (total * 1000)));
  return (
    <div className="fs-rest" role="timer" aria-live="off">
      <div className="fs-rest__row">
        <div className="fs-rest__time">
          <span className="fs-rest__label">{remaining === 0 ? "Go" : "Rest"}</span>
          <span className="fs-rest__clock fs-num">{formatClock(remaining)}</span>
        </div>
        <div className="fs-rest__actions">
          <button type="button" className="fs-chip-btn" onClick={() => onAdjust(-15)} aria-label="15 seconds less">
            −15
          </button>
          <button type="button" className="fs-chip-btn" onClick={() => onAdjust(15)} aria-label="15 seconds more">
            +15
          </button>
          <button type="button" className="fs-chip-btn fs-chip-btn--strong" onClick={onDone}>
            Skip
          </button>
        </div>
      </div>
      <div className="fs-rest__track" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
    </div>
  );
}

/* ── the logger ─────────────────────────────────────────────────────────── */

export default function WorkoutSession(props: SessionProps) {
  const router = useRouter();
  const [init] = useState(() => loadSaved(props));
  const [swaps, setSwaps] = useState<Swaps>(() => init?.swaps ?? {});
  // Swaps apply to this session only: the plan itself is never touched.
  const exercises = props.exercises.map((e) => (swaps[e.key] ? { ...e, ...swaps[e.key] } : e));
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapOptions, setSwapOptions] = useState<SwapOption[] | null>(null);
  const [sessionId] = useState(() => init?.sessionId ?? newSessionId());
  const [startedAt] = useState(() => init?.startedAt ?? Date.now());
  const [rows, setRows] = useState<Rows>(() => init?.rows ?? initialRows(exercises));
  const [index, setIndex] = useState(init?.index ?? 0);
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [summary, setSummary] = useState<null | {
    durationSec: number;
    sets: number;
    volume: number;
    records: SessionRecord[];
  }>(null);

  const ex = exercises[index];
  const exRows = rows[ex.key] ?? [];
  const isLast = index === exercises.length - 1;
  const exDone = exRows.length > 0 && exRows.every((r) => r.done);

  const totalSets = exercises.reduce((n, e) => n + (rows[e.key]?.length ?? 0), 0);
  const doneSets = exercises.reduce((n, e) => n + (rows[e.key]?.filter((r) => r.done).length ?? 0), 0);

  // Survive a refresh: sets are already saved on the server as they are ticked.
  useEffect(() => {
    if (summary) return;
    try {
      window.localStorage.setItem(storageKey(props), JSON.stringify({ sessionId, startedAt, rows, index, swaps } satisfies Saved));
    } catch {
      /* storage unavailable: the logger still works, it just will not resume */
    }
  }, [rows, index, swaps, sessionId, startedAt, summary, props]);

  // Keep the screen awake between sets.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        lock = null;
      }
    };
    void acquire();
    const onVisible = () => document.visibilityState === "visible" && void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, []);

  function patchRow(key: string, i: number, patch: Partial<Row>) {
    setRows((prev) => ({ ...prev, [key]: prev[key].map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  }

  function edit(i: number, field: "weight" | "reps", value: string) {
    const clean = field === "reps" ? value.replace(/\D/g, "").slice(0, 3) : value.replace(/[^\d.,]/g, "").slice(0, 6);
    patchRow(ex.key, i, { [field]: clean, edited: true });
  }

  async function toggle(i: number) {
    const row = exRows[i];
    if (!row || row.saving) return;

    if (row.done) {
      const { logId } = row;
      patchRow(ex.key, i, { done: false, logId: undefined });
      setRest(null);
      if (logId) {
        const res = await removeSet(logId);
        if (!res.ok) toast.error("Could not undo that set on the server.");
      }
      return;
    }

    const reps = parseInt(row.reps, 10);
    const weight = row.weight.trim() === "" ? 0 : Number(row.weight.replace(",", "."));
    if (!Number.isFinite(reps) || reps < 1) {
      toast.error("Enter the reps you did.");
      return;
    }
    if (!Number.isFinite(weight) || weight < 0) {
      toast.error("Enter a weight of 0 or more.");
      return;
    }

    patchRow(ex.key, i, { done: true, saving: true });
    // Carry the values forward to sets the user has not touched yet.
    setRows((prev) => ({
      ...prev,
      [ex.key]: prev[ex.key].map((r, j) => (j > i && !r.done && !r.edited ? { ...r, weight: row.weight, reps: row.reps } : r))
    }));
    try {
      navigator.vibrate?.(12);
    } catch {
      /* not supported */
    }
    const afterLast = i === exRows.length - 1 && isLast;
    if (!afterLast) {
      const total = ex.restSeconds;
      setRest({ endsAt: Date.now() + total * 1000, total });
    } else {
      setRest(null);
    }

    const res = await logSet({ exerciseId: ex.exerciseId, weightKg: weight, reps, setIndex: i + 1, sessionId });
    if (res.ok) {
      patchRow(ex.key, i, { saving: false, logId: res.id });
    } else {
      patchRow(ex.key, i, { done: false, saving: false });
      setRest(null);
      toast.error(res.message);
    }
  }

  function addSet() {
    setRows((prev) => {
      const list = prev[ex.key];
      const last = list[list.length - 1];
      return { ...prev, [ex.key]: [...list, { weight: last?.weight ?? "", reps: last?.reps ?? "", done: false, saving: false, edited: false }] };
    });
  }

  function removeLastSet() {
    setRows((prev) => {
      const list = prev[ex.key];
      if (list.length <= 1 || list[list.length - 1].done) return prev;
      return { ...prev, [ex.key]: list.slice(0, -1) };
    });
  }

  function openSwap() {
    setSwapOpen(true);
    setSwapOptions(null);
    void getSwapOptions(ex.exerciseId).then(setSwapOptions);
  }

  function applySwap(o: SwapOption) {
    const targetReps = parseReps(ex.reps);
    setSwaps((prev) => ({
      ...prev,
      [ex.key]: {
        exerciseId: o.id,
        name: o.name,
        muscleGroup: o.muscleGroup,
        equipment: o.equipment,
        steps: o.steps,
        videoUrl: o.videoUrl,
        last: o.last,
        priorBest: o.priorBest,
        nudge: null
      }
    }));
    setRows((prev) => ({
      ...prev,
      [ex.key]: Array.from({ length: prev[ex.key].length }, (_, i) => {
        const p = o.last[i] ?? o.last[o.last.length - 1];
        return { weight: p ? formatKg(p.weight) : "", reps: String(p?.reps ?? targetReps ?? ""), done: false, saving: false, edited: false };
      })
    }));
    setShowHow(false);
    setSwapOpen(false);
    toast.success(`Swapped to ${o.name} for this workout.`);
  }

  function applyNudge(kg: number) {
    setRows((prev) => ({ ...prev, [ex.key]: prev[ex.key].map((r) => (r.done ? r : { ...r, weight: formatKg(kg), edited: true })) }));
  }

  function go(next: number) {
    setIndex(Math.max(0, Math.min(exercises.length - 1, next)));
    setShowHow(false);
    setRest(null);
    window.scrollTo({ top: 0 });
  }

  function finish() {
    const done = exercises.flatMap((e) => (rows[e.key] ?? []).filter((r) => r.done).map((r) => ({ e, r })));
    const volume = done.reduce((n, { r }) => n + (Number(r.weight.replace(",", ".")) || 0) * (parseInt(r.reps, 10) || 0), 0);
    const durationSec = (Date.now() - startedAt) / 1000;
    const exercisesCompleted = new Set(done.map(({ e }) => e.key)).size;

    const records = sessionRecords(
      done.map(({ e, r }) => ({ key: e.key, name: e.name, weight: Number(r.weight.replace(",", ".")) || 0, prior: e.priorBest }))
    );

    startSaving(async () => {
      const res = await finishWorkout({
        sessionId,
        programId: props.programId,
        dayId: props.dayId,
        dayTitle: props.dayTitle,
        startedAt: new Date(startedAt).toISOString(),
        durationSec,
        setsCompleted: done.length,
        exercisesCompleted,
        volumeKg: volume
      });
      if (!res.ok) {
        toast.error(res.message ?? "Could not save your workout.");
        return;
      }
      try {
        window.localStorage.removeItem(storageKey(props));
      } catch {
        /* nothing to clear */
      }
      setLeaveOpen(false);
      setRest(null);
      setSummary({ durationSec, sets: done.length, volume, records });
    });
  }

  function discard() {
    startSaving(async () => {
      const ids = exercises.flatMap((e) => (rows[e.key] ?? []).map((r) => r.logId).filter((id): id is string => Boolean(id)));
      await Promise.all(ids.map((id) => removeSet(id)));
      try {
        window.localStorage.removeItem(storageKey(props));
      } catch {
        /* nothing to clear */
      }
      router.replace("/member");
    });
  }

  /* ── finish summary ── */
  if (summary) {
    return (
      <main className="fs-wk fs-wk--summary">
        <div className="fs-summary">
          <span className="fs-summary__badge" aria-hidden="true">
            <CheckIcon size={40} />
          </span>
          <h1 className="fs-title">Workout complete</h1>
          <p className="fs-soft">{props.dayTitle}</p>
        </div>

        <div className="fs-group">
          <div className="fs-row">
            <span className="fs-row__title">Time</span>
            <span className="fs-row__value fs-num">{formatDuration(summary.durationSec)}</span>
          </div>
          <div className="fs-row">
            <span className="fs-row__title">Sets completed</span>
            <span className="fs-row__value fs-num">{summary.sets}</span>
          </div>
          <div className="fs-row">
            <span className="fs-row__title">Volume lifted</span>
            <span className="fs-row__value fs-num">{Math.round(summary.volume).toLocaleString("en-US")} kg</span>
          </div>
        </div>

        {summary.records.length > 0 && (
          <section className="fs-section fs-pr" aria-label="Personal bests">
            <h2 className="fs-section__title">
              {summary.records.length === 1 ? "New personal best" : `${summary.records.length} new personal bests`}
            </h2>
            <div className="fs-group">
              {summary.records.map((r) => (
                <div className="fs-row fs-pr__row" key={r.name}>
                  <span className="fs-pr__mark" aria-hidden="true" />
                  <span className="fs-row__main">
                    <span className="fs-row__title">{r.name}</span>
                    <span className="fs-row__sub fs-num">
                      Was {formatKg(r.prior)} kg, up {formatKg(Math.round((r.weight - r.prior) * 10) / 10)} kg
                    </span>
                  </span>
                  <span className="fs-row__value fs-num">{formatKg(r.weight)} kg</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="fs-share">
          <ShareCardButton
            data={{
              title: props.dayTitle,
              durationLabel: formatDuration(summary.durationSec),
              volumeLabel: `${Math.round(summary.volume).toLocaleString("en-US")} kg`,
              prCount: summary.records.length,
              dateLabel: new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Kolkata" }).format(new Date())
            }}
          />
        </div>

        {props.rehab && <RehabCard variant="summary" count={props.rehab.count} minutes={props.rehab.minutes} />}

        {props.nextDayTitle && <p className="fs-soft fs-center">Up next: {props.nextDayTitle}</p>}

        <div className="fs-wk__summary-cta">
          <button
            type="button"
            className="fs-btn fs-btn--primary fs-btn--lg"
            onClick={() => {
              router.replace("/member");
              router.refresh();
            }}
          >
            Done
          </button>
        </div>
      </main>
    );
  }

  const lastTime = ex.last.length
    ? ex.last.map((s) => `${formatKg(s.weight)} × ${s.reps}`).join("  ·  ")
    : null;
  const allDone = doneSets === totalSets && totalSets > 0;

  return (
    <main className="fs-wk">
      <header className="fs-wk__head">
        <button type="button" className="fs-icon-btn" aria-label="End workout" onClick={() => setLeaveOpen(true)}>
          <CloseIcon size={22} />
        </button>
        <div className="fs-wk__headtitle">
          <strong>{props.dayTitle}</strong>
          <Clock startedAt={startedAt} />
        </div>
        <button type="button" className="fs-text-btn" onClick={() => (allDone ? finish() : setLeaveOpen(true))} disabled={saving}>
          Finish
        </button>
      </header>

      <div className="fs-seg-row" role="group" aria-label="Exercises">
        {exercises.map((e, i) => {
          const list = rows[e.key] ?? [];
          const done = list.filter((r) => r.done).length;
          const state = done === list.length && list.length > 0 ? "done" : done > 0 ? "part" : "todo";
          return (
            <button
              key={e.key}
              type="button"
              className="fs-seg"
              data-state={state}
              aria-current={i === index ? "step" : undefined}
              aria-label={`${e.name}: ${done} of ${list.length} sets`}
              onClick={() => go(i)}
            >
              <span />
            </button>
          );
        })}
      </div>

      <section className="fs-wk__ex" key={ex.key}>
        <p className="fs-soft fs-num">
          Exercise {index + 1} of {exercises.length}
        </p>
        <h1 className="fs-wk__name">{ex.name}</h1>
        <p className="fs-soft">
          {ex.muscleGroup} · {ex.equipment}
        </p>
        <p className="fs-wk__target">
          <strong className="fs-num">
            {ex.sets} × {ex.reps}
          </strong>
          <span className="fs-soft"> · rest {ex.restSeconds >= 60 ? `${Math.round(ex.restSeconds / 6) / 10} min` : `${ex.restSeconds}s`}</span>
        </p>
        {lastTime && (
          <p className="fs-wk__last">
            <span className="fs-soft">Last time</span> <span className="fs-num">{lastTime}</span>
          </p>
        )}
        {ex.nudge && !exRows.some((r) => r.done) && (
          <p className="fs-nudge">
            <span>
              Hit {ex.nudge.reps} reps on every set twice running. Try <strong className="fs-num">{formatKg(ex.nudge.toKg)} kg</strong> today.
            </span>
            <button type="button" className="fs-chip-btn" onClick={() => applyNudge(ex.nudge!.toKg)}>
              Use {formatKg(ex.nudge.toKg)} kg
            </button>
          </p>
        )}
        {!exRows.some((r) => r.done) && (
          <button type="button" className="fs-text-btn fs-wk__how" onClick={openSwap}>
            Swap exercise
          </button>
        )}
        {ex.steps.length > 0 && (
          <button type="button" className="fs-text-btn fs-wk__how" aria-expanded={showHow} onClick={() => setShowHow((v) => !v)}>
            How to do it <ChevronDown size={16} data-open={showHow} />
          </button>
        )}
        {showHow && (
          <div className="fs-wk__steps">
            <ol>
              {ex.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            {ex.videoUrl && (
              <a className="fs-text-btn" href={ex.videoUrl} target="_blank" rel="noopener noreferrer">
                Watch tutorial <ExternalIcon size={16} />
              </a>
            )}
          </div>
        )}
      </section>

      <section className="fs-sets" aria-label={`${ex.name} sets`}>
        <div className="fs-sets__head" aria-hidden="true">
          <span>Set</span>
          <span>kg</span>
          <span />
          <span>Reps</span>
          <span />
        </div>
        {exRows.map((r, i) => (
          <div className="fs-set" data-done={r.done} key={i}>
            <span className="fs-set__n fs-num">{i + 1}</span>
            <input
              className="fs-set__in fs-num"
              inputMode="decimal"
              enterKeyHint="next"
              aria-label={`Set ${i + 1} weight in kilograms`}
              placeholder="0"
              value={r.weight}
              readOnly={r.done}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => edit(i, "weight", e.target.value)}
            />
            <span className="fs-set__x" aria-hidden="true">
              ×
            </span>
            <input
              className="fs-set__in fs-num"
              inputMode="numeric"
              enterKeyHint="done"
              aria-label={`Set ${i + 1} reps`}
              placeholder="0"
              value={r.reps}
              readOnly={r.done}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => edit(i, "reps", e.target.value)}
            />
            <button
              type="button"
              className="fs-set__check"
              aria-pressed={r.done}
              aria-label={r.done ? `Undo set ${i + 1}` : `Complete set ${i + 1}`}
              onClick={() => void toggle(i)}
            >
              <CheckIcon size={22} />
            </button>
          </div>
        ))}
        <div className="fs-sets__foot">
          <button type="button" className="fs-text-btn" onClick={addSet}>
            Add set
          </button>
          {exRows.length > 1 && !exRows[exRows.length - 1].done && (
            <button type="button" className="fs-text-btn fs-text-btn--quiet" onClick={removeLastSet}>
              Remove last set
            </button>
          )}
        </div>
      </section>

      {rest && (
        <RestTimer
          endsAt={rest.endsAt}
          total={rest.total}
          onAdjust={(d) => setRest((r) => (r ? { ...r, endsAt: r.endsAt + d * 1000, total: Math.max(5, r.total + d) } : r))}
          onDone={() => setRest(null)}
        />
      )}

      <nav className="fs-wk__bar" aria-label="Workout navigation">
        <button type="button" className="fs-icon-btn fs-icon-btn--box" aria-label="Previous exercise" disabled={index === 0} onClick={() => go(index - 1)}>
          <ChevronLeft size={22} />
        </button>
        <button type="button" className="fs-icon-btn fs-icon-btn--box" aria-label="All exercises" onClick={() => setListOpen(true)}>
          <ListIcon size={22} />
        </button>
        {isLast ? (
          <button
            type="button"
            className={`fs-btn ${allDone ? "fs-btn--primary" : "fs-btn--secondary"} fs-btn--lg fs-wk__next`}
            disabled={saving || doneSets === 0}
            onClick={() => (allDone ? finish() : setLeaveOpen(true))}
          >
            {saving ? "Saving…" : "Finish workout"}
          </button>
        ) : (
          <button type="button" className={`fs-btn ${exDone ? "fs-btn--primary" : "fs-btn--secondary"} fs-btn--lg fs-wk__next`} onClick={() => go(index + 1)}>
            Next exercise
          </button>
        )}
      </nav>

      <Sheet open={swapOpen} onOpenChange={setSwapOpen} title={`Swap ${ex.name}`}>
        {swapOptions === null ? (
          <p className="fs-soft">Finding alternatives…</p>
        ) : swapOptions.length === 0 ? (
          <p className="fs-soft">No alternatives found for this exercise.</p>
        ) : (
          <>
            <p className="fs-soft fs-sheet__note">Same muscle group. Applies to this workout only.</p>
            <div className="fs-group">
              {swapOptions.map((o) => (
                <button key={o.id} type="button" className="fs-row fs-row--tap" onClick={() => applySwap(o)}>
                  <span className="fs-row__main">
                    <span className="fs-row__title">{o.name}</span>
                    <span className="fs-row__sub">{o.equipment}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={listOpen} onOpenChange={setListOpen} title="Exercises">
        <div className="fs-group">
          {exercises.map((e, i) => {
            const list = rows[e.key] ?? [];
            const done = list.filter((r) => r.done).length;
            return (
              <button
                key={e.key}
                type="button"
                className="fs-row fs-row--tap"
                onClick={() => {
                  go(i);
                  setListOpen(false);
                }}
              >
                <span className="fs-row__main">
                  <span className="fs-row__title">{e.name}</span>
                  <span className="fs-row__sub fs-num">
                    {done} of {list.length} sets{i === index ? " · current" : ""}
                  </span>
                </span>
                {done === list.length && list.length > 0 && (
                  <span className="fs-badge-check" aria-label="Done">
                    <CheckIcon size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Sheet>

      <Sheet
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={doneSets > 0 ? "Finish workout?" : "Leave workout?"}
        footer={
          <div className="fs-stack">
            {doneSets > 0 && (
              <button type="button" className="fs-btn fs-btn--primary fs-btn--lg" disabled={saving} onClick={finish}>
                {saving ? "Saving…" : "Finish and save"}
              </button>
            )}
            <button type="button" className="fs-btn fs-btn--secondary fs-btn--lg" onClick={() => setLeaveOpen(false)}>
              Keep going
            </button>
            <button type="button" className="fs-btn fs-btn--danger-plain" disabled={saving} onClick={discard}>
              {doneSets > 0 ? "Discard workout" : "Leave without saving"}
            </button>
          </div>
        }
      >
        <p>
          {doneSets > 0
            ? `You have completed ${doneSets} of ${totalSets} sets. Finishing saves what you have done so far.`
            : "You have not completed any sets yet, so there is nothing to save."}
        </p>
      </Sheet>
    </main>
  );
}
