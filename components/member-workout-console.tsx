"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { clearDayLog, endWorkoutSession, logDayStatus, logLiftSet, saveMemberAiTrainerNote, syncOfflineLifts } from "@/lib/firebase/actions";
import { generateSmartSwaps } from "@/lib/ai";
import type { DayLog, Exercise, LiftLog, SkipReason, WorkoutExercise, WorkoutProgram } from "@/types/domain";
import type { FormActionState } from "@/types/action-state";
import { initialFormActionState } from "@/types/action-state";
import { Dumbbell } from "@/components/icons";
import { ExerciseList } from "@/components/exercise-list";
import { useWorkoutStore } from "@/lib/stores/workout-store";
import { offlineDB } from "@/lib/offline-db";
import {
  SKIP_REASONS,
  dayNames,
  getWeekStart,
  getDefaultDayIndex,
  createModification,
  getExerciseName,
  getDayMuscleTargets
} from "@/lib/workout-utils";
import { WorkoutLiftLogForm } from "@/components/workout-lift-log-form";

export function MemberWorkoutConsole({
  exercises,
  gymId,
  initialActiveSessionCount: _initialActiveSessionCount,
  initialDayLogs = [],
  initialInjuryNote = "",
  initialLiftLogs,
  memberId,
  program
}: {
  exercises: Exercise[];
  gymId: string;
  initialActiveSessionCount: number;
  initialDayLogs?: DayLog[];
  initialInjuryNote?: string;
  initialLiftLogs: LiftLog[];
  memberId: string;
  program: WorkoutProgram;
}) {
  const router = useRouter();
  const {
    isSessionActive, setSessionActive,
    sessionId,
    elapsedSeconds, setElapsedSeconds,
    sessionStatus, setSessionStatus,
    isSessionPending, setIsSessionPending,
    injury, setInjury,
    modification, setModification,
    workoutMode, setWorkoutMode,
    liftLogs, setLiftLogs, addLiftLog,
    pendingEvent, setPendingEvent,
    eventStatus, setEventStatus,
    isEventPending, setIsEventPending,
    offlineLogsCount, setOfflineLogsCount,
    logSuccess, setLogSuccess,
    isNewPR, setIsNewPR,
    isAiSwapping, setIsAiSwapping,
    selectedDayIndex, setSelectedDayIndex,
    dayLogs, setDayLogs,
    skipMode, setSkipMode,
    skipReason, setSkipReason,
    skipNote, setSkipNote,
    isDayLogging, setIsDayLogging,
    dayLogStatus, setDayLogStatus,
    selectedExerciseIdForForm, setSelectedExerciseIdForForm
  } = useWorkoutStore();

  const [offlineSyncStatus, setOfflineSyncStatus] = useState<FormActionState | null>(null);
  const [isOfflineSyncing, setIsOfflineSyncing] = useState(false);
  const liftFormRef = useRef<HTMLFormElement>(null);

  // Initialize store state on mount if not already done
  useEffect(() => {
    useWorkoutStore.setState({
      liftLogs: initialLiftLogs,
      dayLogs: initialDayLogs,
      injury: initialInjuryNote,
      selectedDayIndex: getDefaultDayIndex(program.days.length)
    });
  }, [initialLiftLogs, initialDayLogs, initialInjuryNote, program.days.length]);
  // The current week's Monday — stable for the lifetime of this render
  const weekStart = useMemo(() => getWeekStart(), []);
  // Max weight per exercise for PR detection
  const prMap = liftLogs.reduce<Map<string, number>>((acc, log) => {
    if (log.weight && log.exerciseId) {
      acc.set(log.exerciseId, Math.max(acc.get(log.exerciseId) ?? 0, log.weight));
    }
    return acc;
  }, new Map());

  // Most recent log per exercise — drives the "Last time" hint under the lift form.
  // liftLogs are already ordered newest-first, so the first match wins.
  const lastLogByExercise = liftLogs.reduce<Map<string, LiftLog>>((acc, log) => {
    if (log.exerciseId && !acc.has(log.exerciseId)) {
      acc.set(log.exerciseId, log);
    }
    return acc;
  }, new Map());



  const selectedDay = program.days[selectedDayIndex] ?? program.days[0];
  const aiStorageKey = `fitsplit-ai-trainer-${memberId}-${program.id}`;
  const visibleWorkoutDay = workoutMode === "ai" && modification && selectedDay
    ? { ...selectedDay, exercises: modification.routine }
    : selectedDay;
  const loggableExercises = visibleWorkoutDay?.exercises ?? [];
  const dayMuscleTargets = getDayMuscleTargets(loggableExercises, exercises);
  const uniqueLoggableExercises = Array.from(
    new Map(loggableExercises.map((item) => [item.exerciseId, item])).values()
  );

  // DayLog for the currently selected day in the current week
  const currentDayLog = useMemo(
    () => dayLogs.find((dl) => dl.dayId === selectedDay?.id && dl.weekStart === weekStart) ?? null,
    [dayLogs, selectedDay, weekStart]
  );

  // Exercises NOT already in today's plan — for the "other exercises" optgroup
  const plannedExerciseIds = useMemo(
    () => new Set(uniqueLoggableExercises.map((e) => e.exerciseId)),
    [uniqueLoggableExercises]
  );
  const otherExercises = useMemo(
    () => exercises.filter((e) => !plannedExerciseIds.has(e.id)),
    [exercises, plannedExerciseIds]
  );

  // Restore session state from localStorage on mount
  useEffect(() => {
    const storedId = window.localStorage.getItem("fitsplit-session-id");
    const storedStart = window.localStorage.getItem("fitsplit-session-start");
    if (storedId && storedStart) {
      const startMs = Number(storedStart);
      if (Number.isFinite(startMs)) {
        setSessionActive(true, storedId);
        setElapsedSeconds(Math.floor((Date.now() - startMs) / 1000));
      }
    }
  }, []);

  // Elapsed time counter
  useEffect(() => {
    if (!isSessionActive) return;
    const interval = setInterval(() => {
      const storedStart = window.localStorage.getItem("fitsplit-session-start");
      if (storedStart) {
        setElapsedSeconds(Math.floor((Date.now() - Number(storedStart)) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isSessionActive]);

  async function syncOfflineQueue(showStatus = false) {
    if (isOfflineSyncing) return;
    setIsOfflineSyncing(true);
    if (showStatus) setOfflineSyncStatus(null);
    try {
      const offlineLogs = await offlineDB.liftLogs.toArray();
      if (offlineLogs.length === 0) {
        setOfflineLogsCount(0);
        if (showStatus) {
          setOfflineSyncStatus({ status: "success", message: "All offline logs are already synced." });
        }
        return;
      }

      const result = await syncOfflineLifts(offlineLogs);
      if (result.status === "success") {
        await offlineDB.liftLogs.clear();
        setOfflineLogsCount(0);
      } else {
        setOfflineLogsCount(offlineLogs.length);
      }
      setOfflineSyncStatus(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Offline sync failed. Try again when you have a stable connection.";
      setOfflineSyncStatus({ status: "error", message });
      console.error("Failed to sync offline logs:", err);
    } finally {
      setIsOfflineSyncing(false);
    }
  }

  useEffect(() => {
    offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(console.error);

    if (typeof navigator !== "undefined" && navigator.onLine) {
       void syncOfflineQueue(false);
    }

    const handleOnline = () => void syncOfflineQueue(false);
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !program.days.length) {
      return;
    }

    const savedCustomization = window.localStorage.getItem(aiStorageKey);
    if (!savedCustomization && !initialInjuryNote.trim()) {
      return;
    }

    try {
      const parsed = savedCustomization ? JSON.parse(savedCustomization) as {
        injury?: string;
        selectedDayIndex?: number;
        mode?: "default" | "ai";
      } : {};
      const savedInjury = parsed.injury?.trim() || initialInjuryNote.trim();
      if (!savedInjury) {
        return;
      }

      const nextIndex = Math.min(
        Math.max(parsed.selectedDayIndex ?? selectedDayIndex, 0),
        program.days.length - 1
      );
      const nextDay = program.days[nextIndex];

      setInjury(savedInjury);
      setSelectedDayIndex(nextIndex);
      setModification(createModification(nextDay, savedInjury, exercises));
      setWorkoutMode(parsed.mode === "default" ? "default" : "ai");
    } catch {
      window.localStorage.removeItem(aiStorageKey);
    }
  }, [aiStorageKey, exercises, initialInjuryNote, program.days, selectedDayIndex]);

  function formatElapsed(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }


  async function handleEndWorkout() {
    if (!sessionId) return;
    setIsSessionPending(true);
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("sessionId", sessionId);
    const result = await endWorkoutSession(initialFormActionState, formData);
    setIsSessionPending(false);
    window.localStorage.removeItem("fitsplit-session-id");
    window.localStorage.removeItem("fitsplit-session-start");
    setSessionActive(false);
    setElapsedSeconds(0);
    setSessionStatus(result);
    router.refresh();
  }

  function persistAiCustomization(
    nextInjury: string,
    nextSelectedDayIndex: number,
    nextMode: "default" | "ai"
  ) {
    if (typeof window === "undefined") {
      return;
    }

    // A5: Guard against QuotaExceededError and private-browsing restrictions.
    try {
      window.localStorage.setItem(
        aiStorageKey,
        JSON.stringify({
          injury: nextInjury,
          mode: nextMode,
          selectedDayIndex: nextSelectedDayIndex
        })
      );
    } catch {
      // Non-fatal — preferences just won't persist this session.
    }
  }

  async function updateInjury() {
    const nextInjury = injury.trim();
    if (!nextInjury || !selectedDay) {
      return;
    }

    setIsAiSwapping(true);
    try {
      const aiResult = await generateSmartSwaps(memberId, selectedDay.exercises, nextInjury, exercises);
      if (aiResult && aiResult.routine && aiResult.routine.length > 0) {
        setModification({
          injury: nextInjury,
          summary: aiResult.summary || "Smart anatomical adjustments applied by Gemini.",
          swaps: aiResult.swaps || [],
          addedStretches: aiResult.addedStretches || [],
          routine: aiResult.routine
        });
        setWorkoutMode("ai");
        persistAiCustomization(nextInjury, selectedDayIndex, "ai");
      } else {
        // Fallback to local heuristic
        setModification(createModification(selectedDay, nextInjury, exercises));
        setWorkoutMode("ai");
        persistAiCustomization(nextInjury, selectedDayIndex, "ai");
      }
    } catch (e) {
      console.warn("AI Smart Swaps call failed, using client heuristics...", e);
      setModification(createModification(selectedDay, nextInjury, exercises));
      setWorkoutMode("ai");
      persistAiCustomization(nextInjury, selectedDayIndex, "ai");
    } finally {
      setIsAiSwapping(false);
    }

    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("injuryNotes", nextInjury);
    void saveMemberAiTrainerNote(initialFormActionState, formData);
  }

  async function saveDayLog() {
    if (!selectedDay) return;
    if (skipMode === "skip" && !skipReason) return;
    setIsDayLogging(true);
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("programId", program.id);
    formData.set("dayId", selectedDay.id);
    formData.set("weekStart", weekStart);
    formData.set("status", skipMode === "other" ? "modified" : "skipped");
    if (skipMode === "skip" && skipReason) formData.set("skipReason", skipReason);
    if (skipNote.trim()) formData.set("note", skipNote.trim());
    const result = await logDayStatus(initialFormActionState, formData);
    setIsDayLogging(false);
    setDayLogStatus(result);
    if (result.status === "success") {
      // Optimistic local update so the UI reflects immediately
      const newLog: DayLog = {
        id: `${memberId}_${selectedDay.id}_${weekStart}`,
        memberId,
        gymId,
        programId: program.id,
        dayId: selectedDay.id,
        weekStart,
        status: skipMode === "other" ? "modified" : "skipped",
        skipReason: skipMode === "skip" && skipReason ? skipReason : undefined,
        note: skipNote.trim() || undefined,
        loggedAt: new Date().toISOString()
      };
      setDayLogs((prev) => {
        const filtered = prev.filter((dl) => !(dl.dayId === selectedDay.id && dl.weekStart === weekStart));
        return [newLog, ...filtered];
      });
      setSkipMode("none");
      setSkipReason("");
      setSkipNote("");
    }
  }

  async function removeDayLog() {
    if (!selectedDay) return;
    setIsDayLogging(true);
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("dayId", selectedDay.id);
    formData.set("weekStart", weekStart);
    const result = await clearDayLog(initialFormActionState, formData);
    setIsDayLogging(false);
    if (result.status === "success") {
      setDayLogs((prev) => prev.filter((dl) => !(dl.dayId === selectedDay.id && dl.weekStart === weekStart)));
      setDayLogStatus(null);
    }
  }

  function clearInjuryCustomization() {
    setInjury("");
    setModification(null);
    setWorkoutMode("default");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(aiStorageKey);
    }

    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("injuryNotes", "");
    void saveMemberAiTrainerNote(initialFormActionState, formData);
  }

  function selectWorkoutDay(index: number) {
    const nextDay = program.days[index];
    setSelectedDayIndex(index);
    // Reset skip form so it doesn't bleed across days
    setSkipMode("none");
    setSkipReason("");
    setSkipNote("");
    setDayLogStatus(null);

    const nextInjury = injury.trim();
    if (nextDay && nextInjury) {
      setModification(createModification(nextDay, nextInjury, exercises));
      persistAiCustomization(nextInjury, index, workoutMode);
    }
  }

  function handleLiftLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const exerciseName = getExerciseName(String(formData.get("exerciseId") ?? ""), exercises);

    const exerciseId = String(formData.get("exerciseId") ?? "");
    const weight = Number(formData.get("weight") ?? 0);
    setPendingEvent({
      confirmLabel: "Log lift",
      message: `This will save a lift entry for ${exerciseName}.`,
      title: "Log this lift?",
      liftExerciseId: exerciseId,
      liftWeight: weight,
      run: async () => {
        const newLog: LiftLog = {
          id: `optimistic-${Date.now()}`,
          memberId,
          exerciseId: String(formData.get("exerciseId") ?? ""),
          weight: Number(formData.get("weight") ?? 0),
          sets: Number(formData.get("sets") ?? 1),
          reps: String(formData.get("reps") ?? ""),
          sessionId: String(formData.get("sessionId") ?? ""),
          loggedAt: new Date().toISOString()
        };

        if (typeof navigator !== "undefined" && !navigator.onLine) {
           const offlineLog = { ...newLog, synced: false };
           await offlineDB.liftLogs.add(offlineLog);
           addLiftLog(newLog);
           offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(console.error);
           return { status: "success", message: "Saved offline. Will sync when connected." } as FormActionState;
        }

        try {
          const result = await logLiftSet(initialFormActionState, formData);
          if (result.status === "success") {
            setLiftLogs((current) => [newLog, ...current].slice(0, 12));
            router.refresh();
          }
          return result;
        } catch (e) {
           const offlineLog = { ...newLog, synced: false };
           await offlineDB.liftLogs.add(offlineLog);
           addLiftLog(newLog);
           offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(console.error);
           return { status: "success", message: "Saved offline. Will sync when connected." } as FormActionState;
        }
      }
    });
  }

  async function confirmPendingEvent() {
    if (!pendingEvent) {
      return;
    }

    const prevMaxForExercise = pendingEvent.liftExerciseId
      ? prMap.get(pendingEvent.liftExerciseId) ?? 0
      : 0;
    setIsEventPending(true);
    const result = await pendingEvent.run().catch((error) => ({
      status: "error" as const,
      message: error instanceof Error ? error.message : "Unable to complete this action."
    }));
    setIsEventPending(false);
    setPendingEvent(null);
    setEventStatus(result);
    if (result.status === "success") {
      const isNewRecord =
        pendingEvent.liftExerciseId != null &&
        pendingEvent.liftWeight != null &&
        pendingEvent.liftWeight > prevMaxForExercise;
      setIsNewPR(isNewRecord);
      setLogSuccess(true);
      liftFormRef.current?.reset();
      setTimeout(() => { setLogSuccess(false); setIsNewPR(false); }, 3000);
    }
  }

  return (
    <section className="member-training-layout">
      <div className="member-workout-main">
        <div className="panel-title">
          <h2>
            <Dumbbell /> Today&apos;s workout
          </h2>
          <span className="status-pill status-neutral">
            {program.daysPerWeek} days/week
          </span>
        </div>

        {isSessionActive && (
          <div className="workout-session-bar">
            <span className="session-elapsed">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {formatElapsed(elapsedSeconds)}
              {elapsedSeconds >= 3 * 3600 && <span className="status-pill status-expired" style={{ marginLeft: 8 }}>Auto-ends at 4h</span>}
            </span>
            <button
              className="button button-danger session-end-btn"
              disabled={isSessionPending}
              onClick={handleEndWorkout}
              type="button"
            >
              {isSessionPending ? "Ending..." : "End Workout"}
            </button>
            {sessionStatus && (
              <span className={`form-message form-message-${sessionStatus.status}`} style={{ marginLeft: 12 }}>
                {sessionStatus.message}
              </span>
            )}
          </div>
        )}

        <div className="member-workout-body">
          <div className="weekly-schedule">
            <div className="day-tabs-wrap"><div className="day-tabs" aria-label="Weekly workout days">
              {program.days.map((day, index) => {
                const tabLog = dayLogs.find((dl) => dl.dayId === day.id && dl.weekStart === weekStart);
                return (
                  <button
                    className={[
                      selectedDayIndex === index ? "is-selected" : "",
                      tabLog?.status === "skipped" ? "day-tab-skipped" : "",
                      tabLog?.status === "modified" ? "day-tab-modified" : ""
                    ].filter(Boolean).join(" ")}
                    key={day.id}
                    onClick={() => selectWorkoutDay(index)}
                    type="button"
                  >
                    <span>{dayNames[index] ?? `Day ${day.dayNumber}`}</span>
                    <strong>{day.title}</strong>
                    {tabLog && (
                      <em className="day-tab-status-dot" aria-label={tabLog.status === "skipped" ? "Skipped" : "Modified"}>
                        {tabLog.status === "skipped" ? "⏭" : "📝"}
                      </em>
                    )}
                  </button>
                );
              })}
            </div></div>
            {modification ? (
              <div className="workout-mode-toggle" role="tablist" aria-label="Workout version">
                <button
                  aria-selected={workoutMode === "default"}
                  className={workoutMode === "default" ? "is-selected" : ""}
                  onClick={() => {
                    setWorkoutMode("default");
                    persistAiCustomization(modification.injury, selectedDayIndex, "default");
                  }}
                  role="tab"
                  type="button"
                >
                  Default workout
                </button>
                <button
                  aria-selected={workoutMode === "ai"}
                  className={workoutMode === "ai" ? "is-selected" : ""}
                  onClick={() => {
                    setWorkoutMode("ai");
                    persistAiCustomization(modification.injury, selectedDayIndex, "ai");
                  }}
                  role="tab"
                  type="button"
                >
                  AI customized workout
                </button>
              </div>
            ) : null}
            <AnimatePresence mode="wait" initial={false}>
            {visibleWorkoutDay ? (
              <motion.article
                animate={{ opacity: 1, y: 0 }}
                className="selected-workout-day"
                exit={{ opacity: 0, y: -6 }}
                initial={{ opacity: 0, y: 6 }}
                key={`${visibleWorkoutDay.id}-${workoutMode}`}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <p className="eyebrow">
                  {dayNames[selectedDayIndex] ?? `Day ${visibleWorkoutDay.dayNumber}`}
                </p>
                <p>
                  {workoutMode === "ai" && modification
                    ? modification.summary
                    : visibleWorkoutDay.focus}
                </p>
                <div className="day-muscle-targets" aria-label="Day muscle targets">
                  <span>Primary: {dayMuscleTargets.primary}</span>
                  <span>
                    Secondary: {dayMuscleTargets.secondary.length
                      ? dayMuscleTargets.secondary.join(", ")
                      : "Mobility and stabilizers"}
                  </span>
                </div>

                {/* Stretches section shown when modified */}
                {workoutMode === "ai" && modification && modification.routine.some(item => item.notes?.includes("stretch") || item.notes?.includes("Warm-up")) && (
                  <>
                    <p className="eyebrow" style={{ marginTop: "12px", color: "var(--brand)" }}>Stretches &amp; Warm-ups</p>
                    <ExerciseList
                      exercises={exercises}
                      items={visibleWorkoutDay.exercises.filter(item => item.notes?.includes("stretch") || item.notes?.includes("Warm-up"))}
                    />
                    <p className="eyebrow" style={{ marginTop: "12px" }}>Weight Exercises</p>
                    <ExerciseList
                      exercises={exercises}
                      items={visibleWorkoutDay.exercises.filter(item => !item.notes?.includes("stretch") && !item.notes?.includes("Warm-up"))}
                    />
                  </>
                )}

                {/* Default (no modification) */}
                {(workoutMode === "default" || !modification) && (
                  <ExerciseList exercises={exercises} items={visibleWorkoutDay.exercises} />
                )}

                {/* ── Day-skip / did-something-else section ── */}
                <div className="day-log-section">
                  {currentDayLog ? (
                    // Already have a log — show the status and an undo button
                    <div className={`day-log-status day-log-status--${currentDayLog.status}`}>
                      <div className="day-log-status-body">
                        <span className="day-log-status-icon">
                          {currentDayLog.status === "skipped" ? "⏭" : "📝"}
                        </span>
                        <div>
                          <strong>
                            {currentDayLog.status === "skipped"
                              ? `Skipped${currentDayLog.skipReason ? ` · ${SKIP_REASONS.find((r) => r.value === currentDayLog.skipReason)?.label ?? currentDayLog.skipReason}` : ""}`
                              : "Did something else"}
                          </strong>
                          {currentDayLog.note && (
                            <p className="day-log-status-note">{currentDayLog.note}</p>
                          )}
                        </div>
                      </div>
                      <button
                        className="button-link day-log-undo"
                        disabled={isDayLogging}
                        onClick={removeDayLog}
                        type="button"
                      >
                        Undo
                      </button>
                    </div>
                  ) : skipMode === "none" ? (
                    // Default — offer skip or "did something else"
                    <div className="day-log-actions">
                      <span className="day-log-actions-label">Didn&apos;t follow the plan?</span>
                      <button
                        className="button-ghost day-log-btn"
                        onClick={() => { setSkipMode("skip"); setSkipReason(""); setSkipNote(""); }}
                        type="button"
                      >
                        ⏭ Skip this day
                      </button>
                      <button
                        className="button-ghost day-log-btn"
                        onClick={() => { setSkipMode("other"); setSkipNote(""); }}
                        type="button"
                      >
                        📝 I did something else
                      </button>
                    </div>
                  ) : skipMode === "skip" ? (
                    // Skip flow — pick a reason
                    <div className="day-log-form">
                      <p className="day-log-form-title">Why are you skipping?</p>
                      <div className="day-log-reason-chips">
                        {SKIP_REASONS.map((r) => (
                          <button
                            className={`day-log-chip${skipReason === r.value ? " is-selected" : ""}`}
                            key={r.value}
                            onClick={() => setSkipReason(r.value)}
                            type="button"
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                      <label className="day-log-note-label">
                        Note <span className="day-log-optional">(optional)</span>
                        <textarea
                          className="day-log-textarea"
                          maxLength={400}
                          onChange={(e) => setSkipNote(e.target.value)}
                          placeholder="Any extra context..."
                          rows={2}
                          value={skipNote}
                        />
                      </label>
                      <div className="day-log-form-actions">
                        <button
                          className="button button-primary"
                          disabled={isDayLogging || !skipReason}
                          onClick={saveDayLog}
                          type="button"
                        >
                          {isDayLogging ? "Saving..." : "Save"}
                        </button>
                        <button
                          className="button button-secondary"
                          disabled={isDayLogging}
                          onClick={() => { setSkipMode("none"); setSkipReason(""); setSkipNote(""); }}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                      {dayLogStatus?.status === "error" && (
                        <p className="form-message form-message-error">{dayLogStatus.message}</p>
                      )}
                    </div>
                  ) : (
                    // "Did something else" flow — free-text note
                    <div className="day-log-form">
                      <label className="day-log-note-label">
                        <p className="day-log-form-title">What did you do instead?</p>
                        <textarea
                          className="day-log-textarea"
                          maxLength={400}
                          onChange={(e) => setSkipNote(e.target.value)}
                          placeholder="e.g. 30 min run, yoga session, swimming..."
                          rows={3}
                          value={skipNote}
                        />
                      </label>
                      <div className="day-log-form-actions">
                        <button
                          className="button button-primary"
                          disabled={isDayLogging || !skipNote.trim()}
                          onClick={saveDayLog}
                          type="button"
                        >
                          {isDayLogging ? "Saving..." : "Save"}
                        </button>
                        <button
                          className="button button-secondary"
                          disabled={isDayLogging}
                          onClick={() => { setSkipMode("none"); setSkipNote(""); }}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                      {dayLogStatus?.status === "error" && (
                        <p className="form-message form-message-error">{dayLogStatus.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.article>
            ) : null}
            </AnimatePresence>
          </div>
        </div>

      </div>

      <aside className="member-workout-side">
        <WorkoutLiftLogForm
          memberId={memberId}
          exercises={exercises}
          uniqueLoggableExercises={uniqueLoggableExercises}
          otherExercises={otherExercises}
          logSuccess={logSuccess}
          isNewPR={isNewPR}
          offlineLogsCount={offlineLogsCount}
          offlineSyncStatus={offlineSyncStatus}
          isOfflineSyncing={isOfflineSyncing}
          lastLogByExercise={lastLogByExercise}
          prMap={prMap}
          liftLogs={liftLogs}
          liftFormRef={liftFormRef}
          selectedExerciseId={selectedExerciseIdForForm}
          onExerciseChange={setSelectedExerciseIdForForm}
          onSubmit={handleLiftLog}
          pendingEvent={pendingEvent}
          eventStatus={eventStatus}
          isEventPending={isEventPending}
          onConfirm={confirmPendingEvent}
          onCancelEvent={() => setPendingEvent(null)}
          onRetryOfflineSync={() => syncOfflineQueue(true)}
        />

        <div className="injury-card">
          <h2>AI Semi-Personal Trainer</h2>
          <p>
            Update Injury/Limitation to let the AI swap risky exercises or
            create a conservative recovery routine for owner review.
          </p>
          <div style={{ display: "flex", gap: "8px", margin: "12px 0", flexWrap: "wrap" }}>
            <button type="button" className="status-pill status-neutral" style={{ cursor: "pointer", border: "none" }} onClick={() => setInjury("Shoulder pain")}>Shoulder pain</button>
            <button type="button" className="status-pill status-neutral" style={{ cursor: "pointer", border: "none" }} onClick={() => setInjury("Knee pain")}>Knee pain</button>
            <button type="button" className="status-pill status-neutral" style={{ cursor: "pointer", border: "none" }} onClick={() => setInjury("Lower back ache")}>Lower back ache</button>
            {injury && <button type="button" className="status-pill status-expired" style={{ cursor: "pointer", border: "none" }} onClick={clearInjuryCustomization}>Clear</button>}
          </div>
          <label>
            Injury or limitation
            <textarea
              onChange={(event) => setInjury(event.target.value)}
              placeholder="Example: shoulder pain during overhead press"
              value={injury}
            />
          </label>
          <button className="button button-primary" onClick={updateInjury} type="button" disabled={isAiSwapping}>
            {isAiSwapping ? "Applying AI Swaps..." : "Update Injury/Limitation"}
          </button>
        </div>

        {modification ? (
          <div className="ai-modification-panel">
            <p className="eyebrow">Plan modified</p>
            <h2>AI Adjustments for {modification.injury}</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-soft)", margin: 0 }}>{modification.summary}</p>

            {modification.swaps.length > 0 && (
              <>
                <p className="eyebrow" style={{ margin: "8px 0 4px", color: "var(--warning)" }}>Exercises Swapped</p>
                {modification.swaps.map((swap) => (
                  <span key={`${swap.from}-${swap.to}`}>
                    <strong>{swap.from}</strong> -&gt; <strong>{swap.to}</strong>
                    <br />
                    <small style={{ color: "var(--text-soft)" }}>{swap.reason}</small>
                  </span>
                ))}
              </>
            )}

            {modification.addedStretches.length > 0 && (
              <>
                <p className="eyebrow" style={{ margin: "8px 0 4px", color: "var(--brand)" }}>Stretches Added for Pain Management</p>
                {modification.addedStretches.map((stretch) => (
                  <span key={stretch.name}>
                    <strong>{stretch.name}</strong>
                    <br />
                    <small style={{ color: "var(--text-soft)" }}>{stretch.reason}</small>
                  </span>
                ))}
              </>
            )}
          </div>
        ) : null}

      </aside>

      {/* ── Confirm dialog (Radix Dialog — focus trap, Escape to cancel) ── */}
      <Dialog.Root
        open={Boolean(pendingEvent)}
        onOpenChange={(open) => { if (!open) setPendingEvent(null); }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-backdrop" />
          <Dialog.Content
            aria-describedby="event-confirm-dialog-message"
            className="confirm-dialog"
          >
            <Dialog.Title>{pendingEvent?.title ?? ""}</Dialog.Title>
            <Dialog.Description id="event-confirm-dialog-message">
              {pendingEvent?.message ?? ""}
            </Dialog.Description>
            <div className="quick-actions">
              <Dialog.Close asChild>
                <button
                  className="button button-secondary"
                  disabled={isEventPending}
                  type="button"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                className="button button-primary"
                disabled={isEventPending}
                onClick={confirmPendingEvent}
                type="button"
              >
                {isEventPending ? "Updating..." : (pendingEvent?.confirmLabel ?? "Confirm")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Result dialog (Radix Dialog — focus trap, dismissible) ── */}
      <Dialog.Root
        open={Boolean(eventStatus)}
        onOpenChange={(open) => { if (!open) setEventStatus(null); }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-backdrop" />
          <Dialog.Content className="confirm-dialog">
            <Dialog.Title>
              {eventStatus?.status === "success" ? "Update complete" : "Update failed"}
            </Dialog.Title>
            <Dialog.Description asChild>
              <p
                aria-live="polite"
                className={`form-message form-message-${eventStatus?.status ?? "success"}`}
              >
                {eventStatus?.message ?? ""}
              </p>
            </Dialog.Description>
            <div className="quick-actions">
              <Dialog.Close asChild>
                <button className="button button-primary" type="button">
                  Done
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
