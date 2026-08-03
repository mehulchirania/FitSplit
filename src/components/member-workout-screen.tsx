"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { logLiftSet, logDayStatus, syncOfflineLifts, saveExerciseSwaps, getExerciseSwapsForMemberDay } from "@/lib/firebase/actions";
import { offlineDB } from "@/lib/offline-db";
import { initialFormActionState } from "@/types/action-state";
import type { Exercise, LiftLog, DayLog, WorkoutProgram, WorkoutDay } from "@/types/domain";
import {
  getWeekStart, SKIP_REASONS,
  getAlternateExercises, getLastLiftForExercise, hasLoggedWeight,
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

/** Prefill a numeric rep count from a prescription string like "8-12" (low end) or "10" — blank if unparseable. */
function parseLowReps(reps?: string): string {
  if (!reps) return "";
  const match = reps.match(/\d+/);
  return match ? match[0] : "";
}

function buildInitialRows(day: WorkoutDay | undefined, liftLogs: LiftLog[], sessionId: string): RowsState {
  const rows: RowsState = {};
  // Sets are matched to rows by session identity (sessionId + logged order),
  // not by counting "today's" logs for the exerciseId — a bare count lands
  // checkmarks on the wrong rows once an exercise repeats in a day or the
  // member logs it twice. We also track how many of this exercise's session
  // logs have already been claimed by an earlier row so duplicate entries
  // (e.g. a superset) in the same day don't double-count the same sets.
  const consumedByExerciseId = new Map<string, number>();
  (day?.exercises ?? []).forEach((ex, exIdx) => {
    const count = ex.sets && ex.sets > 0 ? ex.sets : 3;
    const sessionLogs = liftLogs
      .filter((l) => l.sessionId === sessionId && l.exerciseId === ex.exerciseId)
      .sort((a, b) => {
        // Prefer the log's own setIndex (stable identity) where available;
        // fall back to logged-order for legacy records written before
        // per-set normalization.
        if (a.setIndex != null && b.setIndex != null) return a.setIndex - b.setIndex;
        return new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime();
      });
    const alreadyConsumed = consumedByExerciseId.get(ex.exerciseId) ?? 0;
    const availableForThisRow = Math.max(0, sessionLogs.length - alreadyConsumed);
    const doneCount = Math.min(availableForThisRow, count);
    consumedByExerciseId.set(ex.exerciseId, alreadyConsumed + doneCount);
    const lastLift = getLastLiftForExercise(ex.exerciseId, liftLogs);
    rows[exIdx] = Array.from({ length: count }, (_, i) => ({
      weight: lastLift && hasLoggedWeight(lastLift) ? String(lastLift.weight) : "",
      reps: parseLowReps(ex.reps),
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

/** Feature-detected, never-throw haptic + audio cue for "rest is over". Must degrade silently on iOS Safari and anywhere Web Audio / vibration isn't available. */
function fireRestDoneAlert() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(200);
    }
  } catch {
    // no-op — vibration is a nice-to-have, never fatal
  }
  try {
    type AudioCtor = typeof AudioContext;
    const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (typeof window !== "undefined" && Ctx) {
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
      osc.onended = () => {
        try { void ctx.close(); } catch { /* no-op */ }
      };
    }
  } catch {
    // no-op — Web Audio can throw on autoplay-restricted / unsupported browsers
  }
}

function sessionStartStorageKey(sessionId: string) {
  return `fitsplit:workout-session-start:${sessionId}`;
}

function swapStorageKey(memberId: string, dayId: string) {
  return `fitsplit:exercise-swaps:${memberId}:${dayId}`;
}

function loadPersistedSwaps(memberId: string, dayId: string | undefined): Record<number, string> {
  if (typeof window === "undefined" || !dayId) return {};
  try {
    const raw = window.localStorage.getItem(swapStorageKey(memberId, dayId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function WorkoutScreen({ memberId, gymId, program, exercises, liftLogs, dayLogs, selectedDayIndex, onSelectDay }: WorkoutScreenProps) {
  const router = useRouter();
  const day = program.days[selectedDayIndex] ?? program.days[0];
  const weekStart = useMemo(() => getWeekStart(), []);
  const sessionId = useMemo(() => `session-${memberId}-${todayKey()}`, [memberId]);

  // No exercise is expanded by default — landing on this screen (or logging
  // in) must never drop the member straight into an open set-logging table.
  // Logging is opt-in: tap an exercise to expand it, tap again to close.
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [drawerIndex, setDrawerIndex] = useState<number | null>(null);
  // Deterministic {} on both server and first client render — the day-change
  // effect below (which also fires once on mount) is what actually hydrates
  // this from localStorage, client-only, after hydration completes. Reading
  // localStorage directly in this initializer used to make the client's
  // first render disagree with the server's (which can never see a swap),
  // showing the swapped exercise's name where the server rendered the
  // original — the same class of hydration mismatch as the elapsed timer.
  const [exerciseSwaps, setExerciseSwaps] = useState<Record<number, string>>({});
  const [rows, setRows] = useState<RowsState>(() => buildInitialRows(day, liftLogs, sessionId));

  // Elapsed only starts counting once the member has actually logged a set —
  // it must not tick just because the screen is mounted. The start time is
  // persisted per session so a refresh (or backgrounding the tab) doesn't
  // reset it.
  //
  // Initial state must be `null` unconditionally, on both server and client —
  // reading localStorage inside the useState initializer (this used to check
  // `typeof window === "undefined"` and read it immediately when truthy) makes
  // the client's very first render disagree with the server-rendered "0:00",
  // which is a hydration mismatch (React error #418) on every load where a
  // session was already in progress. Read localStorage in an effect instead —
  // effects only run after hydration completes, so first paint is always
  // identical server and client, and this "catches up" a tick later.
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null);
  const sessionStartRef = useRef<number | null>(sessionStartMs);
  useEffect(() => {
    sessionStartRef.current = sessionStartMs;
  }, [sessionStartMs]);

  useEffect(() => {
    const raw = window.localStorage.getItem(sessionStartStorageKey(sessionId));
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed)) setSessionStartMs(parsed);
  }, [sessionId]);

  // WorkoutScreen is mounted twice at all times — once inside the
  // desktop-only shell block, once inside the mobile-only one — with CSS
  // (not React) deciding which is actually shown at the current viewport
  // width. Without this, BOTH instances run live: two elapsed/rest-timer
  // intervals, two offline-sync-drain effects racing the same Dexie queue,
  // two rest-alert vibrate/beep firings. Detect whether *this* instance is
  // the one CSS is actually showing (via `offsetParent`, which is null
  // whenever the element or an ancestor is `display: none`) and gate the
  // side-effecting intervals/listeners below on it — the visible instance
  // behaves exactly as before, the hidden one goes inert instead of
  // silently duplicating work.
  const rootRef = useRef<HTMLElement>(null);
  const [isMountVisible, setIsMountVisible] = useState(true);
  useEffect(() => {
    const check = () => setIsMountVisible(rootRef.current ? rootRef.current.offsetParent !== null : true);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // sessionStartMs is always null on first render (see above) so this is
  // always 0 at mount; the ticking interval effect catches it up to the real
  // elapsed time within a second of sessionStartMs being read from storage.
  const [elapsed, setElapsed] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restTotal, setRestTotal] = useState(90);
  const [offlineLogsCount, setOfflineLogsCount] = useState(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  useEffect(() => {
    setRows(buildInitialRows(day, liftLogs, sessionId));
    setExerciseSwaps(loadPersistedSwaps(memberId, day?.id));
    setFocusIndex(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDayIndex]);

  // Reconcile with the server copy of this day's swaps — localStorage above
  // gives an instant paint, this catches up with whatever the member (or a
  // swap made on another device) actually last saved. A doc existing with an
  // empty swaps map means "explicitly cleared elsewhere"; no doc at all means
  // "nothing to reconcile against yet" and local state is left alone.
  useEffect(() => {
    const dayId = day?.id;
    if (!dayId) return;
    let cancelled = false;
    getExerciseSwapsForMemberDay(memberId, gymId, dayId)
      .then(({ found, swaps }) => {
        if (cancelled || !found) return;
        setExerciseSwaps(swaps);
        try {
          window.localStorage.setItem(swapStorageKey(memberId, dayId), JSON.stringify(swaps));
        } catch {
          // no-op — localStorage may be unavailable
        }
      })
      .catch(() => {
        // Quiet — this is a background reconciliation, not a blocking load.
      });
    return () => {
      cancelled = true;
    };
  }, [memberId, gymId, day?.id]);

  function startSessionIfNeeded() {
    if (sessionStartRef.current != null) return;
    const now = Date.now();
    setSessionStartMs(now);
    try {
      window.localStorage.setItem(sessionStartStorageKey(sessionId), String(now));
    } catch {
      // no-op — localStorage may be unavailable (private browsing, etc.)
    }
  }

  // Single ticking interval drives both the elapsed counter (only once a
  // session has started) and the rest countdown, firing a vibrate/beep alert
  // the moment rest hits zero.
  useEffect(() => {
    if (!isMountVisible) return;
    const t = setInterval(() => {
      setRestRemaining((s) => {
        if (s <= 0) return 0;
        const next = s - 1;
        if (next === 0) fireRestDoneAlert();
        return next;
      });
      if (sessionStartRef.current != null) {
        setElapsed(Math.max(0, Math.floor((Date.now() - sessionStartRef.current) / 1000)));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [isMountVisible]);

  useEffect(() => {
    offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(() => {});
  }, []);

  // Drain the offline queue whenever we have a connection — on mount, the
  // instant the browser comes back online, and via the explicit "Retry sync"
  // button in the footer. Without this, offline-queued sets are stranded
  // forever on any device that never visits the mobile Progress tab (the
  // only other place that calls syncOfflineLifts).
  async function syncOfflineQueue() {
    if (isSyncingOffline) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setIsSyncingOffline(true);
    try {
      const offlineLogs = await offlineDB.liftLogs.toArray();
      if (offlineLogs.length === 0) {
        setOfflineLogsCount(0);
        return;
      }
      const result = await syncOfflineLifts(offlineLogs);
      if (result.status === "success") {
        await offlineDB.liftLogs.clear();
        setOfflineLogsCount(0);
        toast.success("Synced your offline sets.");
        router.refresh();
      } else {
        setOfflineLogsCount(offlineLogs.length);
        toast.error(result.message || "Could not sync offline sets yet. Will retry.");
      }
    } catch {
      // Stay quiet — this runs automatically on mount/online and shouldn't
      // spam the member; the pill + manual retry button stay available.
    } finally {
      setIsSyncingOffline(false);
    }
  }

  useEffect(() => {
    if (!isMountVisible) return;
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void syncOfflineQueue();
    }
    const handleOnline = () => void syncOfflineQueue();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMountVisible]);

  // Auto-advance focus once the active exercise's sets are all done — only
  // once the member has actually opted into logging (focusIndex !== null).
  useEffect(() => {
    if (focusIndex !== null && rows[focusIndex]?.length && rows[focusIndex].every((s) => s.done)) {
      const next = day.exercises.findIndex((_, i) => !(rows[i]?.length && rows[i].every((s) => s.done)));
      if (next !== -1 && next !== focusIndex) setFocusIndex(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const currentDayLog = dayLogs.find((l) => l.dayId === day?.id && l.weekStart === weekStart);
  const totalSets = Object.values(rows).reduce((n, r) => n + r.length, 0);
  const doneSets = Object.values(rows).reduce((n, r) => n + r.filter((s) => s.done).length, 0);

  const skippedExerciseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const log of dayLogs) {
      if (log.status === "skipped" && Array.isArray(log.makeupExerciseIds)) {
        log.makeupExerciseIds.forEach((id: string) => ids.add(id.trim()));
      }
    }
    return ids;
  }, [dayLogs]);

  function activeExerciseIdFor(exIdx: number): string {
    return exerciseSwaps[exIdx] ?? day.exercises[exIdx]?.exerciseId ?? "";
  }

  function persistSwaps(next: Record<number, string>) {
    if (!day?.id) return;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(swapStorageKey(memberId, day.id), JSON.stringify(next));
      }
    } catch {
      // no-op — localStorage may be unavailable
    }
    // Fire-and-forget: the swap already applied locally (instant, offline-
    // friendly); this just makes it visible cross-device and to the
    // member's trainer (see ExerciseSwapNotes on the owner member page). A
    // failure here isn't worth interrupting the workout for — the next
    // successful save (or the reconciliation effect on remount) catches up.
    void saveExerciseSwaps({ memberId, programId: program.id, dayId: day.id, swaps: next }).catch(() => {});
  }

  function clearSwap(exIdx: number) {
    setExerciseSwaps((current) => {
      const next = { ...current };
      delete next[exIdx];
      persistSwaps(next);
      return next;
    });
  }

  async function submitSet(exIdx: number, setIdx: number) {
    const ex = day.exercises[exIdx];
    const row = rows[exIdx]?.[setIdx];
    if (!ex || !row || row.done || row.pending) return;

    const repsTrimmed = row.reps.trim();
    const repsNum = Number(repsTrimmed);
    if (!repsTrimmed || !Number.isInteger(repsNum) || repsNum <= 0) {
      toast.error("Enter a whole number of reps before marking this set done.");
      return;
    }
    const rpeTrimmed = row.rpe.trim();
    if (rpeTrimmed && Number.isNaN(Number(rpeTrimmed))) {
      toast.error("RPE must be a number, or left blank.");
      return;
    }

    setRows((r) => ({ ...r, [exIdx]: r[exIdx].map((s, i) => (i === setIdx ? { ...s, pending: true } : s)) }));

    const activeExerciseId = activeExerciseIdFor(exIdx);
    const weight = Number(row.weight || 0);

    const finalize = (success: boolean) => {
      setRows((r) => ({ ...r, [exIdx]: r[exIdx].map((s, i) => (i === setIdx ? { ...s, pending: false, done: success ? true : s.done } : s)) }));
      if (success) {
        startSessionIfNeeded();
        const rest = ex.restSeconds ?? 90;
        setRestTotal(rest);
        setRestRemaining(rest);
      }
    };

    // 1-based position of this set within the exercise's rows for this
    // session — the stable identity logLiftSet persists as LiftLog.setIndex,
    // so a future load can match logs back to rows exactly instead of
    // inferring order from timestamps.
    const setIndex = setIdx + 1;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await offlineDB.liftLogs.add({
        id: `optimistic-${Date.now()}`, memberId, exerciseId: activeExerciseId, weight, sets: 1, reps: String(repsNum),
        sessionId, loggedAt: new Date().toISOString(), synced: false, setIndex,
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
    formData.set("reps", String(repsNum));
    formData.set("sessionId", sessionId);
    formData.set("setIndex", String(setIndex));

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
        id: `optimistic-${Date.now()}`, memberId, exerciseId: activeExerciseId, weight, sets: 1, reps: String(repsNum),
        sessionId, loggedAt: new Date().toISOString(), synced: false, setIndex,
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
      // Stop the elapsed clock (freezing at its final value) and clear the
      // persisted session start so the next workout starts fresh.
      setSessionStartMs(null);
      try {
        window.localStorage.removeItem(sessionStartStorageKey(sessionId));
      } catch {
        // no-op
      }
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
    <section className="m3d-wk" ref={rootRef}>
      <div className="m3d-wk__head">
        <div>
          <span className="m3d-pagehead__eyebrow">WEEK · {day?.focus ?? "TRAINING DAY"}</span>
          <h1 className="m3d-pagehead__title">{day?.title ?? "Workout"}</h1>
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

      <div className="m3d-wk__timeline">
        {day.exercises.map((ex, exIdx) => {
          const activeId = activeExerciseIdFor(exIdx);
          const dictEx = exercises.find((e) => e.id === activeId);
          const originalEx = exercises.find((e) => e.id === ex.exerciseId);
          const alternatives = originalEx ? getAlternateExercises(originalEx, exercises, skippedExerciseIds) : [];
          const recommendedAlt = alternatives[0] ?? null;
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
                  <button type="button" className="m3d-wk__row-head" onClick={() => setFocusIndex(isActive ? null : exIdx)}>
                    <span className={`m3d-wk__name${isActive ? " m3d-wk__name--active" : ""}`}>{dictEx?.name ?? "Exercise"}</span>
                    <span className="m3d-wk__meta">{ex.sets ?? exRows.length} × {ex.reps ?? "—"}</span>
                  </button>
                  {isSwapped && originalEx && (
                    <button type="button" className="m3d-wk__swap-note" onClick={() => clearSwap(exIdx)}>
                      ↩ Back to {originalEx.name}
                    </button>
                  )}
                  <span className="m3d-wk__status">{complete ? "DONE" : isActive ? "ACTIVE" : "UP NEXT"}</span>
                  {dictEx && (dictEx.gymVideoUrl || dictEx.videoUrl) && (
                    <div className="m3d-wk__video-preview-inline" onClick={(e) => e.stopPropagation()}>
                      <CatalogVideoPreview
                        exerciseName={dictEx.name}
                        gymVideoUrl={dictEx.gymVideoUrl}
                        muscleGroup={dictEx.muscleGroup ?? ""}
                        videoUrl={dictEx.videoUrl}
                      />
                    </div>
                  )}
                  {originalEx && alternatives.length > 0 && (
                    <div className="m3d-wk__swap-dropdown-wrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        className="m3d-wk__swap-select"
                        value={activeId}
                        title={isSwapped ? `Swapped from ${originalEx.name}` : `Recommended: ${recommendedAlt?.name}`}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          if (selectedId === originalEx.id) {
                            clearSwap(exIdx);
                          } else {
                            setExerciseSwaps((c) => {
                              const next = { ...c, [exIdx]: selectedId };
                              persistSwaps(next);
                              return next;
                            });
                          }
                        }}
                      >
                        <option value={originalEx.id}>{originalEx.name} (Original)</option>
                        {alternatives.map((alt, altIdx) => (
                          <option key={alt.id} value={alt.id}>
                            {altIdx === 0 ? "⭐ Recommended: " : ""}{alt.name}
                          </option>
                        ))}
                      </select>
                    </div>
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
                          <input type="number" inputMode="decimal" step="0.5" min="0" value={s.weight} disabled={s.done}
                            onChange={(e) => updateRow(exIdx, setIdx, { weight: e.target.value })} />
                          <input type="number" inputMode="numeric" step="1" min="1" placeholder={ex.reps || "reps"} value={s.reps} disabled={s.done}
                            onChange={(e) => updateRow(exIdx, setIdx, { reps: e.target.value })} />
                          <input type="number" inputMode="decimal" step="0.5" min="0" max="10" placeholder="—" value={s.rpe} disabled={s.done}
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

      <div className="m3d-wk__footer">
        <div>
          <strong>{fmtElapsed(elapsed)}</strong>
          <span>ELAPSED</span>
        </div>
        <div className="m3d-wk__footer-progress">
          <span>{doneSets} of {totalSets} sets</span>
          <div className="m3d-wk__footer-bar"><div style={{ width: `${totalSets ? Math.round((doneSets / totalSets) * 100) : 0}%` }} /></div>
        </div>
        {offlineLogsCount > 0 && (
          <span className="m3d-wk__offline-pill">
            {offlineLogsCount} unsynced
            <button type="button" className="m3d-wk__offline-retry" disabled={isSyncingOffline} onClick={() => syncOfflineQueue()}>
              {isSyncingOffline ? "Syncing…" : "Retry sync"}
            </button>
          </span>
        )}
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
