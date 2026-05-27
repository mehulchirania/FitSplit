"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  clearDayLog,
  endWorkoutSession,
  logDayStatus,
  logLiftSet,
  saveMemberAiTrainerNote,
  syncOfflineLifts
} from "@/lib/firebase/actions";
import type { DayLog, Exercise, LiftLog, WorkoutProgram } from "@/types/domain";
import type { FormActionState } from "@/types/action-state";
import { initialFormActionState } from "@/types/action-state";
import { useWorkoutStore } from "@/lib/stores/workout-store";
import { offlineDB } from "@/lib/offline-db";
import { getWeekStart, getDefaultDayIndex, getDayMuscleTargets } from "@/lib/workout-utils";

export function useWorkoutConsole({
  exercises,
  gymId,
  initialDayLogs,
  initialInjuryNote,
  initialLiftLogs,
  memberId,
  program
}: {
  exercises: Exercise[];
  gymId: string;
  initialDayLogs: DayLog[];
  initialInjuryNote: string;
  initialLiftLogs: LiftLog[];
  memberId: string;
  program: WorkoutProgram;
}) {
  const router = useRouter();
  const store = useWorkoutStore();
  const {
    isSessionActive, setSessionActive,
    sessionId,
    elapsedSeconds, setElapsedSeconds,
    sessionStatus, setSessionStatus,
    isSessionPending, setIsSessionPending,
    injury, setInjury,
    liftLogs, setLiftLogs, addLiftLog,
    eventStatus, setEventStatus,
    isEventPending, setIsEventPending,
    offlineLogsCount, setOfflineLogsCount,
    logSuccess, setLogSuccess,
    isNewPR, setIsNewPR,
    selectedDayIndex, setSelectedDayIndex,
    dayLogs, setDayLogs,
    skipMode, setSkipMode,
    skipReason, setSkipReason,
    skipNote, setSkipNote,
    isDayLogging, setIsDayLogging,
    dayLogStatus, setDayLogStatus,
    selectedExerciseIdForForm, setSelectedExerciseIdForForm
  } = store;

  const [offlineSyncStatus, setOfflineSyncStatus] = useState<FormActionState | null>(null);
  const [isOfflineSyncing, setIsOfflineSyncing] = useState(false);
  const liftFormRef = useRef<HTMLFormElement>(null);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    useWorkoutStore.setState({
      liftLogs: initialLiftLogs,
      dayLogs: initialDayLogs,
      injury: initialInjuryNote,
      selectedDayIndex: getDefaultDayIndex(program.days.length)
    });
  }, [initialLiftLogs, initialDayLogs, initialInjuryNote, program.days.length]);

  // Restore session from localStorage
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Elapsed counter
  useEffect(() => {
    if (!isSessionActive) return;
    const interval = setInterval(() => {
      const storedStart = window.localStorage.getItem("fitsplit-session-start");
      if (storedStart) setElapsedSeconds(Math.floor((Date.now() - Number(storedStart)) / 1000));
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSessionActive]);

  // Offline queue bootstrap
  useEffect(() => {
    offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(console.error);
    if (typeof navigator !== "undefined" && navigator.onLine) void syncOfflineQueue(false);
    const handleOnline = () => void syncOfflineQueue(false);
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  const weekStart = useMemo(() => getWeekStart(), []);
  const exerciseById = useMemo(() => new Map(exercises.map((ex) => [ex.id, ex])), [exercises]);
  const prMap = useMemo(() => liftLogs.reduce<Map<string, number>>((acc, log) => {
    if (log.weight && log.exerciseId) acc.set(log.exerciseId, Math.max(acc.get(log.exerciseId) ?? 0, log.weight));
    return acc;
  }, new Map()), [liftLogs]);
  const lastLogByExercise = useMemo(() => liftLogs.reduce<Map<string, LiftLog>>((acc, log) => {
    if (log.exerciseId && !acc.has(log.exerciseId)) acc.set(log.exerciseId, log);
    return acc;
  }, new Map()), [liftLogs]);

  const selectedDay = program.days[selectedDayIndex] ?? program.days[0];
  const visibleWorkoutDay = useMemo(
    () => selectedDay
      ? { ...selectedDay, exercises: selectedDay.exercises.filter((item) => exerciseById.has(item.exerciseId)) }
      : selectedDay,
    [selectedDay, exerciseById]
  );
  const loggableExercises = useMemo(
    () => visibleWorkoutDay?.exercises ?? [],
    [visibleWorkoutDay]
  );
  const dayMuscleTargets = getDayMuscleTargets(loggableExercises, exercises);
  const uniqueLoggableExercises = useMemo(
    () => Array.from(new Map(loggableExercises.map((item) => [item.exerciseId, item])).values()),
    [loggableExercises]
  );
  const plannedExerciseIds = useMemo(
    () => new Set(uniqueLoggableExercises.map((e) => e.exerciseId)),
    [uniqueLoggableExercises]
  );
  const otherExercises = useMemo(() => exercises.filter((e) => !plannedExerciseIds.has(e.id)), [exercises, plannedExerciseIds]);
  const currentDayLog = useMemo(
    () => dayLogs.find((dl) => dl.dayId === selectedDay?.id && dl.weekStart === weekStart) ?? null,
    [dayLogs, selectedDay, weekStart]
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  async function syncOfflineQueue(showStatus = false) {
    if (isOfflineSyncing) return;
    setIsOfflineSyncing(true);
    if (showStatus) setOfflineSyncStatus(null);
    try {
      const offlineLogs = await offlineDB.liftLogs.toArray();
      if (offlineLogs.length === 0) {
        setOfflineLogsCount(0);
        if (showStatus) setOfflineSyncStatus({ status: "success", message: "All offline logs are already synced." });
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
      const message = err instanceof Error ? err.message : "Offline sync failed.";
      setOfflineSyncStatus({ status: "error", message });
      console.error("Failed to sync offline logs:", err);
    } finally {
      setIsOfflineSyncing(false);
    }
  }

  async function handleEndWorkout() {
    if (!sessionId) return;
    setIsSessionPending(true);
    const fd = new FormData();
    fd.set("memberId", memberId);
    fd.set("sessionId", sessionId);
    const result = await endWorkoutSession(initialFormActionState, fd);
    setIsSessionPending(false);
    window.localStorage.removeItem("fitsplit-session-id");
    window.localStorage.removeItem("fitsplit-session-start");
    setSessionActive(false);
    setElapsedSeconds(0);
    setSessionStatus(result);
    router.refresh();
  }

  async function saveInjuryNote() {
    const fd = new FormData();
    fd.set("memberId", memberId);
    fd.set("injuryNotes", injury.trim());
    void saveMemberAiTrainerNote(initialFormActionState, fd);
  }

  function clearInjuryNote() {
    setInjury("");
    const fd = new FormData();
    fd.set("memberId", memberId);
    fd.set("injuryNotes", "");
    void saveMemberAiTrainerNote(initialFormActionState, fd);
  }

  async function saveDayLog() {
    if (!selectedDay || (skipMode === "skip" && !skipReason)) return;
    setIsDayLogging(true);
    const isSkip = skipMode === "skip";
    const makeupExerciseIds: string[] = [];
    if (isSkip && selectedDay.exercises.length) {
      const groupCounts = new Map<string, string[]>();
      for (const we of selectedDay.exercises) {
        const ex = exerciseById.get(we.exerciseId);
        if (!ex) continue;
        const ids = groupCounts.get(ex.muscleGroup) ?? [];
        ids.push(we.exerciseId);
        groupCounts.set(ex.muscleGroup, ids);
      }
      const sorted = [...groupCounts.entries()].sort((a, b) => b[1].length - a[1].length);
      for (const [, ids] of sorted) {
        for (const id of ids) {
          if (makeupExerciseIds.length >= 3) break;
          makeupExerciseIds.push(id);
        }
        if (makeupExerciseIds.length >= 3) break;
      }
    }
    const fd = new FormData();
    fd.set("memberId", memberId);
    fd.set("programId", program.id);
    fd.set("dayId", selectedDay.id);
    fd.set("weekStart", weekStart);
    fd.set("status", isSkip ? "skipped" : "modified");
    if (isSkip && skipReason) fd.set("skipReason", skipReason);
    if (skipNote.trim()) fd.set("note", skipNote.trim());
    if (isSkip && makeupExerciseIds.length) fd.set("makeupExerciseIds", makeupExerciseIds.join(","));
    const result = await logDayStatus(initialFormActionState, fd);
    setIsDayLogging(false);
    setDayLogStatus(result);
    if (result.status === "success") {
      const newLog: DayLog = {
        id: `${memberId}_${selectedDay.id}_${weekStart}`,
        memberId, gymId, programId: program.id,
        dayId: selectedDay.id, weekStart,
        status: isSkip ? "skipped" : "modified",
        skipReason: isSkip && skipReason ? skipReason : undefined,
        note: skipNote.trim() || undefined,
        loggedAt: new Date().toISOString(),
        makeupExerciseIds: isSkip && makeupExerciseIds.length ? makeupExerciseIds : undefined,
        makeupStatus: isSkip && makeupExerciseIds.length ? "pending" : undefined
      };
      setDayLogs((prev) => {
        const filtered = prev.filter((dl) => !(dl.dayId === selectedDay.id && dl.weekStart === weekStart));
        return [newLog, ...filtered];
      });
      setSkipMode("none"); setSkipReason(""); setSkipNote("");
    }
  }

  async function removeDayLog() {
    if (!selectedDay) return;
    setIsDayLogging(true);
    const fd = new FormData();
    fd.set("memberId", memberId);
    fd.set("dayId", selectedDay.id);
    fd.set("weekStart", weekStart);
    const result = await clearDayLog(initialFormActionState, fd);
    setIsDayLogging(false);
    if (result.status === "success") {
      setDayLogs((prev) => prev.filter((dl) => !(dl.dayId === selectedDay.id && dl.weekStart === weekStart)));
      setDayLogStatus(null);
    }
  }

  function handleMakeupUpdate(updated: DayLog) {
    setDayLogs((prev) => prev.map((dl) => (dl.id === updated.id ? updated : dl)));
  }

  function selectWorkoutDay(index: number) {
    setSelectedDayIndex(index);
    setSkipMode("none"); setSkipReason(""); setSkipNote(""); setDayLogStatus(null);
  }

  async function handleLiftLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const fd = new FormData(event.currentTarget);
    const exerciseId = String(fd.get("exerciseId") ?? "");
    const weight = Number(fd.get("weight") ?? 0);
    const prevMax = prMap.get(exerciseId) ?? 0;
    const newLog: LiftLog = {
      id: `optimistic-${Date.now()}`,
      memberId, exerciseId, weight,
      sets: Number(fd.get("sets") ?? 1),
      reps: String(fd.get("reps") ?? ""),
      sessionId: String(fd.get("sessionId") ?? ""),
      loggedAt: new Date().toISOString()
    };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await offlineDB.liftLogs.add({ ...newLog, synced: false });
      addLiftLog(newLog);
      offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(console.error);
      setIsNewPR(false); setLogSuccess(true); liftFormRef.current?.reset();
      setTimeout(() => setLogSuccess(false), 3000);
      return;
    }
    setIsEventPending(true);
    try {
      const result = await logLiftSet(initialFormActionState, fd);
      setIsEventPending(false);
      if (result.status === "success") {
        setLiftLogs((current) => [newLog, ...current].slice(0, 12));
        setIsNewPR(weight > prevMax); setLogSuccess(true); liftFormRef.current?.reset();
        setTimeout(() => { setLogSuccess(false); setIsNewPR(false); }, 3000);
        router.refresh();
      } else { setEventStatus(result); }
    } catch {
      setIsEventPending(false);
      await offlineDB.liftLogs.add({ ...newLog, synced: false });
      addLiftLog(newLog);
      offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(console.error);
      setIsNewPR(false); setLogSuccess(true); liftFormRef.current?.reset();
      setTimeout(() => setLogSuccess(false), 3000);
    }
  }

  return {
    // store state (passthrough)
    isSessionActive, sessionStatus, isSessionPending, elapsedSeconds,
    injury, setInjury,
    eventStatus, setEventStatus,
    isEventPending, offlineLogsCount, logSuccess, isNewPR,
    selectedDayIndex, dayLogs, skipMode, setSkipMode,
    skipReason, setSkipReason, skipNote, setSkipNote,
    isDayLogging, dayLogStatus,
    selectedExerciseIdForForm, setSelectedExerciseIdForForm,
    liftLogs,
    // derived
    weekStart, selectedDay, visibleWorkoutDay, dayMuscleTargets,
    uniqueLoggableExercises, otherExercises, currentDayLog,
    offlineSyncStatus, isOfflineSyncing, lastLogByExercise, prMap,
    liftFormRef,
    // actions
    handleEndWorkout, saveInjuryNote, clearInjuryNote,
    saveDayLog, removeDayLog, handleMakeupUpdate, selectWorkoutDay,
    handleLiftLog,
    retryOfflineSync: () => syncOfflineQueue(true)
  };
}
