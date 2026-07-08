"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { logLiftSet, logDayStatus } from "@/lib/firebase/actions";
import { offlineDB } from "@/lib/offline-db";
import { initialFormActionState } from "@/types/action-state";
import type { Exercise, LiftLog, DayLog, WorkoutProgram, WorkoutDay } from "@/types/domain";
import {
  getWeekStart, SKIP_REASONS,
  getNextExerciseSwap, getLastLiftForExercise, hasLoggedWeight,
} from "@/lib/workout-utils";
import { CatalogVideoPreview } from "@/components/catalog-video-preview";

interface WorkoutScreenProps {
  memberId: string;
  gymId: string;
  program: WorkoutProgram;
  exercises: Exercise[];
  liftLogs: LiftLog[];
  dayLogs: DayLog[];
  selectedDayIndex: number;
  onSelectDay: (idx: number) => void;
}

type SetRow = { weight: string; reps: string; rpe: string; done: boolean; pending: boolean };
type RowsState = Record<number, SetRow[]>;

const todayKey = () => new Date().toISOString().slice(0, 10);

function buildInitialRows(day: WorkoutDay | undefined, liftLogs: LiftLog[]): RowsState {
  const rows: RowsState = {};
  const key = todayKey();
  (day?.exercises ?? []).forEach((ex, exIdx) => {
    const count = ex.sets && ex.sets > 0 ? ex.sets : 3;
    const loggedToday = liftLogs.filter((l) => l.exerciseId === ex.exerciseId && l.loggedAt?.slice(0, 10) === key).length;
    const doneCount = Math.min(loggedToday, count);
    const lastLift = getLastLiftForExercise(ex.exerciseId, liftLogs);
    rows[exIdx] = Array.from({ length: count }, (_, i) => ({
      weight: lastLift && hasLoggedWeight(lastLift) ? String(lastLift.weight) : "",
      reps: ex.reps ?? "",
      rpe: "",
      done: i < doneCount,
      pending: false,
    }));
  });
  return rows;
}

function fmtElapsed(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WorkoutScreen({ memberId, program, exercises, liftLogs, dayLogs, selectedDayIndex, onSelectDay }: WorkoutScreenProps) {
  const router = useRouter();
  const day = program.days[selectedDayIndex] ?? program.days[0];
  const weekStart = useMemo(() => getWeekStart(), []);
  const sessionId = useMemo(() => `session-${memberId}-${todayKey()}`, [memberId]);

  const [variant, setVariant] = useState<"timeline" | "ledger">("timeline");
  const [focusIndex, setFocusIndex] = useState(0);
  const [drawerIndex, setDrawerIndex] = useState<number | null>(null);
  const [exerciseSwaps, setExerciseSwaps] = useState<Record<number, string>>({});
  const [rows, setRows] = useState<RowsState>(() => buildInitialRows(day, liftLogs));
  const [elapsed, setElapsed] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restTotal, setRestTotal] = useState(90);
  const [offlineLogsCount, setOfflineLogsCount] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  useEffect(() => {
    setRows(buildInitialRows(day, liftLogs));
    setExerciseSwaps({});
    setFocusIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDayIndex]);

  // Single ticking interval drives both the elapsed counter and the rest countdown.
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed((s) => s + 1);
      setRestRemaining((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(() => {});
  }, []);

  // Auto-advance focus once the active exercise's sets are all done.
  useEffect(() => {
    if (rows[focusIndex]?.length && rows[focusIndex].every((s) => s.done)) {
      const next = day.exercises.findIndex((_, i) => !(rows[i]?.length && rows[i].every((s) => s.done)));
      if (next !== -1 && next !== focusIndex) setFocusIndex(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const currentDayLog = dayLogs.find((l) => l.dayId === day?.id && l.weekStart === weekStart);
  const totalSets = Object.values(rows).reduce((n, r) => n + r.length, 0);
  const doneSets = Object.values(rows).reduce((n, r) => n + r.filter((s) => s.done).length, 0);

  function activeExerciseIdFor(exIdx: number): string {
    return exerciseSwaps[exIdx] ?? day.exercises[exIdx]?.exerciseId ?? "";
  }

  function clearSwap(exIdx: number) {
    setExerciseSwaps((current) => {
      const next = { ...current };
      delete next[exIdx];
      return next;
    });
  }

  async function submitSet(exIdx: number, setIdx: number) {
    const ex = day.exercises[exIdx];
    const row = rows[exIdx]?.[setIdx];
    if (!ex || !row || row.done || row.pending) return;
    if (!row.reps.trim()) {
      toast.error("Enter reps before marking this set done.");
      return;
    }

    setRows((r) => ({ ...r, [exIdx]: r[exIdx].map((s, i) => (i === setIdx ? { ...s, pending: true } : s)) }));

    const activeExerciseId = activeExerciseIdFor(exIdx);
    const weight = Number(row.weight || 0);

    const finalize = (success: boolean) => {
      setRows((r) => ({ ...r, [exIdx]: r[exIdx].map((s, i) => (i === setIdx ? { ...s, pending: false, done: success ? true : s.done } : s)) }));
      if (success) {
        const rest = ex.restSeconds ?? 90;
        setRestTotal(rest);
        setRestRemaining(rest);
      }
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await offlineDB.liftLogs.add({
        id: `optimistic-${Date.now()}`, memberId, exerciseId: activeExerciseId, weight, sets: 1, reps: row.reps,
        sessionId, loggedAt: new Date().toISOString(), synced: false,
      });
      offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(() => {});
      toast.success("Set saved offline — syncs when you're back online.");
      finalize(true);
      return;
    }

    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("exerciseId", activeExerciseId);
    formData.set("weight", String(weight));
    formData.set("sets", "1");
    formData.set("reps", row.reps);
    formData.set("sessionId", sessionId);

    try {
      const result = await logLiftSet(initialFormActionState, formData);
      if (result.status === "success") {
        const prevMax = Math.max(0, ...liftLogs.filter((l) => l.exerciseId === activeExerciseId).map((l) => l.weight ?? 0));
        toast.success(weight > 0 && weight > prevMax ? "New PR logged. Strong work." : "Set logged.");
        finalize(true);
        router.refresh();
      } else {
        toast.error(result.message || "Could not log this set.");
        finalize(false);
      }
    } catch {
      await offlineDB.liftLogs.add({
        id: `optimistic-${Date.now()}`, memberId, exerciseId: activeExerciseId, weight, sets: 1, reps: row.reps,
        sessionId, loggedAt: new Date().toISOString(), synced: false,
      });
      offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(() => {});
      toast.success("Set saved offline — syncs when your connection returns.");
      finalize(true);
    }
  }

  function updateRow(exIdx: number, setIdx: number, patch: Partial<SetRow>) {
    setRows((r) => ({ ...r, [exIdx]: r[exIdx].map((s, i) => (i === setIdx ? { ...s, ...patch } : s)) }));
  }

  async function handleFinish() {
    setIsFinishing(true);
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("programId", program.id);
    formData.set("dayId", day.id);
    formData.set("weekStart", weekStart);
    formData.set("status", "completed");
    const result = await logDayStatus(initialFormActionState, formData);
    setIsFinishing(false);
    if (result.status === "success") {
      toast.success("Workout marked complete. Nice work.");
      router.refresh();
    } else {
      toast.error(result.message || "Could not save. Try again.");
    }
  }

  async function handleSkip(reason: string) {
    setIsSkipping(true);
    const makeupExerciseIds = day.exercises.slice(0, 3).map((e) => e.exerciseId).join(",");
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("programId", program.id);
    formData.set("dayId", day.id);
    formData.set("weekStart", weekStart);
    formData.set("status", "skipped");
    formData.set("skipReason", reason);
    formData.set("makeupExerciseIds", makeupExerciseIds);
    const result = await logDayStatus(initialFormActionState, formData);
    setIsSkipping(false);
    setSkipOpen(false);
    if (result.status === "success") {
      toast.success("Day marked as skipped.");
      router.refresh();
    } else {
      toast.error(result.message || "Could not save. Try again.");
    }
  }

  const drawerEx = drawerIndex != null ? exercises.find((e) => e.id === activeExerciseIdFor(drawerIndex)) : null;
  const drawerHistory = drawerEx
    ? liftLogs.filter((l) => l.exerciseId === drawerEx.id && l.loggedAt).sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()).slice(0, 6)
    : [];
  const drawerPR = drawerHistory.length ? Math.max(...drawerHistory.map((l) => l.weight ?? 0)) : 0;

  return (
    <section className="m3d-wk">
      <div className="m3d-wk__head">
        <div>
          <span className="m3d-pagehead__eyebrow">WEEK · {day?.focus ?? "TRAINING DAY"}</span>
          <h1 className="m3d-pagehead__title">{day?.title ?? "Workout"}</h1>
        </div>
        <div className="m3d-wk__variant-toggle">
          <button type="button" className={variant === "timeline" ? "m3d-wk__variant--on" : ""} onClick={() => setVariant("timeline")}>Timeline</button>
          <button type="button" className={variant === "ledger" ? "m3d-wk__variant--on" : ""} onClick={() => setVariant("ledger")}>Ledger</button>
        </div>
      </div>

      {program.days.length > 1 && (
        <div className="m3d-wk__daypicker hide-scrollbar">
          {program.days.map((d, i) => (
            <button key={d.id} type="button" className={`m3d-daychip${selectedDayIndex === i ? " m3d-daychip--on" : ""}`} onClick={() => onSelectDay(i)}>
              Day {d.dayNumber}: {d.title}
            </button>
          ))}
        </div>
      )}

      {currentDayLog && (
        <div className={`m3d-wk__daylog-chip m3d-wk__daylog-chip--${currentDayLog.status}`}>
          {currentDayLog.status === "completed" ? "Marked done for this week" : currentDayLog.status === "skipped" ? "Marked skipped for this week" : "Modified this week"}
        </div>
      )}

      {variant === "timeline" ? (
        <div className="m3d-wk__timeline">
          {day.exercises.map((ex, exIdx) => {
            const activeId = activeExerciseIdFor(exIdx);
            const dictEx = exercises.find((e) => e.id === activeId);
            const originalEx = exercises.find((e) => e.id === ex.exerciseId);
            const nextSwap = getNextExerciseSwap(originalEx, activeId, exercises);
            const isSwapped = Boolean(exerciseSwaps[exIdx]) && dictEx?.id !== originalEx?.id;
            const exRows = rows[exIdx] ?? [];
            const complete = exRows.length > 0 && exRows.every((s) => s.done);
            const isActive = focusIndex === exIdx && !complete;
            const lastLift = getLastLiftForExercise(activeId, liftLogs);

            return (
              <div key={ex.exerciseId + exIdx} className="m3d-wk__row-wrap">
                <div className="m3d-wk__row">
                  <div className={`m3d-wk__node${complete ? " m3d-wk__node--done" : isActive ? " m3d-wk__node--active" : ""}`}>
                    {complete ? "✓" : String(exIdx + 1).padStart(2, "0")}
                  </div>
                  <div className="m3d-wk__row-body">
                    <button type="button" className="m3d-wk__row-head" onClick={() => setFocusIndex(exIdx)}>
                      <span className={`m3d-wk__name${isActive ? " m3d-wk__name--active" : ""}`}>{dictEx?.name ?? "Exercise"}</span>
                      <span className="m3d-wk__meta">{ex.sets ?? exRows.length} × {ex.reps ?? "—"}</span>
                    </button>
                    {isSwapped && originalEx && (
                      <button type="button" className="m3d-wk__swap-note" onClick={() => clearSwap(exIdx)}>
                        ↩ Back to {originalEx.name}
                      </button>
                    )}
                    <span className="m3d-wk__status">{complete ? "DONE" : isActive ? "ACTIVE" : "UP NEXT"}</span>
                    {nextSwap && (
                      <button
                        type="button"
                        className="m3d-wk__swap-btn"
                        title={`Swap with ${nextSwap.name}`}
                        onClick={() => {
                          if (nextSwap.id === originalEx?.id) clearSwap(exIdx);
                          else setExerciseSwaps((c) => ({ ...c, [exIdx]: nextSwap.id }));
                        }}
                      >
                        Swap
                      </button>
                    )}
                    <button type="button" className="m3d-wk__details-btn" onClick={() => setDrawerIndex(exIdx)}>Details →</button>

                    {isActive && (
                      <div className="m3d-wk__sets">
                        {lastLift && <div className="m3d-wk__last">Last session · {hasLoggedWeight(lastLift) ? `${lastLift.weight}kg × ${lastLift.reps}` : `${lastLift.reps} reps`}</div>}
                        <div className="m3d-wk__set-head">
                          <span>SET</span><span>KG</span><span>REPS</span><span>RPE</span><span />
                        </div>
                        {exRows.map((s, setIdx) => (
                          <div key={setIdx} className="m3d-wk__set-row">
                            <span className="m3d-wk__set-n">{setIdx + 1}</span>
                            <input type="number" step="0.5" min="0" value={s.weight} disabled={s.done}
                              onChange={(e) => updateRow(exIdx, setIdx, { weight: e.target.value })} />
                            <input type="text" value={s.reps} disabled={s.done}
                              onChange={(e) => updateRow(exIdx, setIdx, { reps: e.target.value })} />
                            <input type="text" placeholder="—" value={s.rpe} disabled={s.done}
                              onChange={(e) => updateRow(exIdx, setIdx, { rpe: e.target.value })} />
                            <button type="button" className={`m3d-wk__check${s.done ? " m3d-wk__check--on" : ""}`} disabled={s.done || s.pending} onClick={() => submitSet(exIdx, setIdx)}>
                              {s.pending ? "…" : "✓"}
                            </button>
                          </div>
                        ))}
                        {restRemaining > 0 && (
                          <div className="m3d-wk__rest">
                            <span>REST</span>
                            <strong>{fmtElapsed(restRemaining)}</strong>
                            <div className="m3d-wk__rest-bar"><div style={{ width: `${Math.round((restRemaining / restTotal) * 100)}%` }} /></div>
                            <button type="button" onClick={() => setRestRemaining(0)}>Skip</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="m3d-wk__ledger">
          {day.exercises.map((ex, exIdx) => {
            const activeId = activeExerciseIdFor(exIdx);
            const dictEx = exercises.find((e) => e.id === activeId);
            const exRows = rows[exIdx] ?? [];
            return (
              <div key={ex.exerciseId + exIdx} className="m3d-wk__ledger-row">
                <span className="m3d-wk__ledger-num">{String(exIdx + 1).padStart(2, "0")}</span>
                <button type="button" className="m3d-wk__ledger-name" onClick={() => setFocusIndex(exIdx)}>
                  <div>{dictEx?.name ?? "Exercise"}</div>
                  <small>{ex.sets ?? exRows.length} × {ex.reps ?? "—"}</small>
                </button>
                <div className="m3d-wk__ledger-chips">
                  {exRows.map((s, setIdx) => (
                    <button key={setIdx} type="button" disabled={s.done || s.pending || !s.reps.trim()}
                      className={`m3d-wk__ledger-chip${s.done ? " m3d-wk__ledger-chip--on" : ""}`}
                      onClick={() => submitSet(exIdx, setIdx)}>
                      {s.weight || "—"} × {s.reps || "—"}
                    </button>
                  ))}
                </div>
                <button type="button" className="m3d-wk__details-btn" onClick={() => setDrawerIndex(exIdx)}>Details →</button>
              </div>
            );
          })}
        </div>
      )}

      <div className="m3d-wk__footer">
        <div>
          <strong>{fmtElapsed(elapsed)}</strong>
          <span>ELAPSED</span>
        </div>
        <div className="m3d-wk__footer-progress">
          <span>{doneSets} of {totalSets} sets</span>
          <div className="m3d-wk__footer-bar"><div style={{ width: `${totalSets ? Math.round((doneSets / totalSets) * 100) : 0}%` }} /></div>
        </div>
        {offlineLogsCount > 0 && <span className="m3d-wk__offline-pill">{offlineLogsCount} unsynced</span>}
        <div className="m3d-wk__footer-actions">
          <div className="m3d-wk__skip-wrap">
            <button type="button" className="m3d-btn-ghost m3d-btn-sm" onClick={() => setSkipOpen((v) => !v)}>Skip today</button>
            {skipOpen && (
              <div className="m3d-wk__skip-pop">
                {SKIP_REASONS.map((r) => (
                  <button key={r.value} type="button" disabled={isSkipping} onClick={() => handleSkip(r.value)}>{r.label}</button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="m3d-wk__finish" disabled={isFinishing} onClick={handleFinish}>
            {isFinishing ? "Saving…" : "Finish workout"}
          </button>
        </div>
      </div>

      <Dialog.Root open={drawerIndex != null} onOpenChange={(open) => !open && setDrawerIndex(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="m3d-wk-drawer__overlay" />
          <Dialog.Content className="m3d-wk-drawer">
            <div className="m3d-wk-drawer__head">
              <span>{drawerEx?.muscleGroup?.toUpperCase() ?? ""}</span>
              <Dialog.Close asChild><button type="button" aria-label="Close">×</button></Dialog.Close>
            </div>
            <Dialog.Title className="m3d-wk-drawer__title">{drawerEx?.name ?? ""}</Dialog.Title>
            <Dialog.Description className="m3d-wk-drawer__sub">
              {drawerEx?.equipment ?? ""}{drawerPR > 0 ? ` · Personal record ${drawerPR} kg` : ""}
            </Dialog.Description>

            {drawerEx && (drawerEx.gymVideoUrl || drawerEx.videoUrl) && (
              <div className="m3d-wk-drawer__video">
                <CatalogVideoPreview exerciseName={drawerEx.name} gymVideoUrl={drawerEx.gymVideoUrl} muscleGroup={drawerEx.muscleGroup ?? ""} videoUrl={drawerEx.videoUrl} />
              </div>
            )}

            {drawerEx?.instructions && (
              <div className="m3d-wk-drawer__section">
                <span className="m3d-ov__section-label">HOW TO PERFORM</span>
                <p>{drawerEx.instructions}</p>
              </div>
            )}

            <div className="m3d-wk-drawer__section">
              <span className="m3d-ov__section-label">RECENT SESSIONS</span>
              {drawerHistory.length === 0 ? (
                <p className="mcr-empty-small">No sets logged yet for this exercise.</p>
              ) : (
                drawerHistory.map((h) => (
                  <div key={h.id} className="m3d-wk-drawer__history-row">
                    <span>{new Date(h.loggedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    <span>{hasLoggedWeight(h) ? `${h.weight} kg × ${h.reps}` : `${h.reps} reps`}</span>
                    {h.weight === drawerPR && drawerPR > 0 && <span className="m3d-wk-drawer__pr">PR</span>}
                  </div>
                ))
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
