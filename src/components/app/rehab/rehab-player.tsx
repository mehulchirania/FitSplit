"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RehabExercise } from "@/lib/rehab/catalog";
import { dosageLabel, dosageUnits, unitWorkSeconds } from "@/lib/rehab/dosage";
import { formatClock } from "@/lib/today";
import { saveRehabSession } from "@/lib/firebase/actions/rehab";
import { CheckIcon, CloseIcon } from "../icons";

/**
 * Rehab player: one exercise at a time. Each exercise is walked set by set (and side by
 * side where it has them); a hold counts down on tap, a rep exercise is ticked off when done.
 * Skipping drops the whole exercise. A finished run (at least one exercise done) is saved
 * once to history; it is never counted toward the workout streak.
 */
export function RehabPlayer({
  exercises,
  conditionIds,
  backHref
}: {
  exercises: RehabExercise[];
  conditionIds: string[];
  backHref: string;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [unit, setUnit] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [finished, setFinished] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [runId] = useState(() => crypto.randomUUID());
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const savedOnce = useRef(false);

  const ex = exercises[index];
  const units = dosageUnits(ex.dosage);
  const current = units[unit];
  const next = units[unit + 1];

  function advanceExercise(wasSkipped: boolean) {
    if (wasSkipped) setSkipped((n) => n + 1);
    else setCompleted((n) => n + 1);
    if (index + 1 >= exercises.length) {
      setElapsed(Math.round((Date.now() - startedAt) / 1000));
      setFinished(true);
    } else {
      setIndex(index + 1);
      setUnit(0);
    }
  }

  function unitDone() {
    if (unit + 1 < units.length) setUnit(unit + 1);
    else advanceExercise(false);
  }

  const persist = useCallback(async () => {
    setSave("saving");
    const res = await saveRehabSession({
      runId,
      conditionIds,
      startedAt: new Date(startedAt).toISOString(),
      durationSec: elapsed,
      exercisesCompleted: completed,
      exercisesSkipped: skipped
    }).catch(() => ({ ok: false as const }));
    setSave(res.ok ? "saved" : "error");
  }, [runId, conditionIds, startedAt, elapsed, completed, skipped]);

  useEffect(() => {
    if (!finished || savedOnce.current || completed === 0) return;
    savedOnce.current = true;
    void persist();
  }, [finished, completed, persist]);

  if (finished) {
    return (
      <main className="fs-wk fs-wk--summary">
        <div className="fs-summary">
          <span className="fs-summary__badge" aria-hidden="true">
            <CheckIcon size={40} />
          </span>
          <h1 className="fs-title">Rehab complete</h1>
          <p className="fs-soft">
            {completed} of {exercises.length} exercises done
            {skipped > 0 ? `, ${skipped} skipped` : ""} · {Math.max(1, Math.round(elapsed / 60))} min
          </p>
        </div>
        {completed > 0 && save !== "idle" && (
          <p className="fs-soft fs-center fs-num" role="status">
            {save === "saving" && "Saving to history..."}
            {save === "saved" && "Saved to history"}
            {save === "error" && (
              <>
                Could not save this session.{" "}
                <button type="button" className="fs-text-btn" onClick={() => void persist()}>
                  Retry
                </button>
              </>
            )}
          </p>
        )}
        <p className="fs-soft fs-center">Some stiffness or mild muscle fatigue is normal. Sharp or lingering pain is not.</p>
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

  const sideName = current.side === "left" ? "Left side" : current.side === "right" ? "Right side" : null;
  const unitLabel = [`Set ${current.set} of ${ex.dosage.sets}`, sideName].filter(Boolean).join(" · ");
  const isLast = unit + 1 >= units.length;
  const doneLabel = !isLast
    ? next && next.set === current.set
      ? `Next: ${next.side === "right" ? "right" : "left"} side`
      : `Next: set ${next?.set}${next?.side ? ", " + next.side + " side" : ""}`
    : index + 1 >= exercises.length
      ? "Finish"
      : "Next exercise";

  return (
    <main className="fs-wk">
      <header className="fs-wk__head">
        <Link href={backHref} className="fs-icon-btn" aria-label="End rehab" replace>
          <CloseIcon size={22} />
        </Link>
        <div className="fs-wk__headtitle">
          <strong>Rehab</strong>
          <span className="fs-num">
            {index + 1} of {exercises.length}
          </span>
        </div>
        <button type="button" className="fs-text-btn" onClick={() => advanceExercise(true)}>
          Skip
        </button>
      </header>

      <div className="fs-seg-row" role="img" aria-label={`Exercise ${index + 1} of ${exercises.length}`}>
        {exercises.map((e, i) => (
          <span
            key={e.id}
            className="fs-seg fs-rp__seg"
            data-state={i < index ? "done" : "todo"}
            aria-current={i === index ? "step" : undefined}
          >
            <span />
          </span>
        ))}
      </div>

      <section className="fs-wk__ex" key={ex.id}>
        <p className="fs-soft">{ex.target}</p>
        <h1 className="fs-wk__name">{ex.name}</h1>
        <p className="fs-soft fs-num">
          {dosageLabel(ex.dosage)}
          {ex.equipment ? ` · ${ex.equipment}` : ""}
        </p>
      </section>

      {/* outside the animated section: its transform would trap the fixed bottom bar */}
      <UnitPanel key={`${ex.id}:${unit}`} exercise={ex} label={unitLabel} doneLabel={doneLabel} onDone={unitDone} />

      <section className="fs-wk__ex fs-rp__rest" key={`${ex.id}-cues`}>
        <ol className="fs-steps fs-rp__cues">
          {ex.cues.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ol>
        <p className="fs-rp__stop">
          <strong>Stop if</strong> {ex.stopIf.replace(/^Stop if /, "")}
        </p>
      </section>
    </main>
  );
}

/** One set on one side: a countdown to start for holds, a big rep count otherwise. */
function UnitPanel({
  exercise,
  label,
  doneLabel,
  onDone
}: {
  exercise: RehabExercise;
  label: string;
  doneLabel: string;
  onDone: () => void;
}) {
  const d = exercise.dosage;
  const total = unitWorkSeconds(d);
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const endsAt = useRef(0);
  const isHold = d.kind === "hold";

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        try {
          navigator.vibrate?.([120, 60, 120]);
        } catch {
          /* not supported */
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running]);

  function start() {
    endsAt.current = Date.now() + remaining * 1000;
    setRunning(true);
  }

  const finishedHold = isHold && remaining <= 0;
  const progress = isHold ? 1 - remaining / total : 0;

  return (
    <>
      <div className="fs-rp__unit">
        <p className="fs-rp__label fs-num">{label}</p>
        {isHold ? (
          <>
            <p className="fs-rp__big fs-num" role="timer" aria-live="off">
              {formatClock(remaining)}
            </p>
            <div className="fs-rest__track" aria-hidden="true">
              <span style={{ transform: `scaleX(${progress})` }} />
            </div>
          </>
        ) : (
          <p className="fs-rp__big fs-num">
            {d.kind === "reps" && d.reps}
            <span className="fs-rp__unit-word"> reps</span>
          </p>
        )}
      </div>

      <div className="fs-wk__bar">
        {isHold && !finishedHold ? (
          running ? (
            <button type="button" className="fs-btn fs-btn--secondary fs-btn--lg" onClick={() => setRunning(false)}>
              Pause
            </button>
          ) : (
            <button type="button" className="fs-btn fs-btn--primary fs-btn--lg" onClick={start}>
              {remaining === total ? "Start hold" : "Resume"}
            </button>
          )
        ) : (
          <button type="button" className="fs-btn fs-btn--primary fs-btn--lg" onClick={onDone}>
            {isHold ? doneLabel : `Done · ${doneLabel}`}
          </button>
        )}
      </div>
    </>
  );
}
