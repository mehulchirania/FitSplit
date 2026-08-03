/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logLiftSet, syncOfflineLifts } from "@/lib/firebase/actions";
import { offlineDB } from "@/lib/offline-db";
import { getExerciseName, getWeekStart, resolveTodaysSession } from "@/lib/workout-utils";
import type { FormActionState } from "@/types/action-state";
import { initialFormActionState } from "@/types/action-state";
import type { DayLog, Exercise, LiftLog, WorkoutExercise, WorkoutProgram } from "@/types/domain";
import { ProgressChart } from "@/components/progress-chart";
import { WorkoutLiftLogForm } from "@/components/workout-lift-log-form";

type MemberProgressPanelProps = {
  exercises: Exercise[];
  initialLiftLogs: LiftLog[];
  dayLogs: DayLog[];
  memberId: string;
  program: WorkoutProgram | null;
};

/**
 * Splits a reps input ("10" for uniform reps, or "8,8,7" for per-set reps)
 * into exactly `numSets` integer entries — one per set. Fewer comma-separated
 * values than sets repeats the last one; a bare number applies to every set.
 * Used to expand one form submission ("3 sets of 10") into N single-set
 * logLiftSet calls, since a LiftLog record is always exactly one set.
 */
function expandRepsPerSet(rawReps: string, numSets: number): number[] {
  const parts = rawReps
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Math.max(1, Math.round(Number(part)) || 1));
  if (parts.length === 0) {
    return Array.from({ length: numSets }, () => 1);
  }
  return Array.from({ length: numSets }, (_, index) => parts[index] ?? parts[parts.length - 1]);
}

export function MemberProgressPanel({
  exercises,
  initialLiftLogs,
  dayLogs,
  memberId,
  program
}: MemberProgressPanelProps) {
  const router = useRouter();
  const liftFormRef = useRef<HTMLFormElement>(null);
  const [optimisticLiftLogs, setOptimisticLiftLogs] = useState<LiftLog[] | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const liftLogs = optimisticLiftLogs ?? initialLiftLogs;

  const [eventStatus, setEventStatus] = useState<FormActionState | null>(null);
  const [isEventPending, setIsEventPending] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [isNewPR, setIsNewPR] = useState(false);
  const [offlineLogsCount, setOfflineLogsCount] = useState(0);
  const [offlineSyncStatus, setOfflineSyncStatus] = useState<FormActionState | null>(null);
  const [isOfflineSyncing, setIsOfflineSyncing] = useState(false);



  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  );

  // Agrees with the Train tab's WorkoutScreen and Overview's "today" card —
  // previously used a bare weekday-index heuristic that could point at a
  // different day than the rest of the app.
  const todaysSession = useMemo(
    () => resolveTodaysSession(program, dayLogs, liftLogs, getWeekStart()),
    [program, dayLogs, liftLogs]
  );
  const todayPlan = program?.days[todaysSession.dayIndex] ?? program?.days[0] ?? null;
  const uniqueLoggableExercises = useMemo<WorkoutExercise[]>(() => {
    const knownItems = (todayPlan?.exercises ?? []).filter((item) => exerciseById.has(item.exerciseId));
    return Array.from(new Map(knownItems.map((item) => [item.exerciseId, item])).values());
  }, [exerciseById, todayPlan]);

  const plannedExerciseIds = useMemo(
    () => new Set(uniqueLoggableExercises.map((item) => item.exerciseId)),
    [uniqueLoggableExercises]
  );
  const otherExercises = useMemo(
    () => exercises.filter((exercise) => !plannedExerciseIds.has(exercise.id)),
    [exercises, plannedExerciseIds]
  );

  const effectiveSelectedExerciseId = selectedExerciseId || uniqueLoggableExercises[0]?.exerciseId || "";

  const prMap = liftLogs.reduce<Map<string, number>>((acc, log) => {
    if (log.weight && log.exerciseId) {
      acc.set(log.exerciseId, Math.max(acc.get(log.exerciseId) ?? 0, log.weight));
    }
    return acc;
  }, new Map());

  const lastLogByExercise = liftLogs.reduce<Map<string, LiftLog>>((acc, log) => {
    if (log.exerciseId && !acc.has(log.exerciseId)) {
      acc.set(log.exerciseId, log);
    }
    return acc;
  }, new Map());

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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Offline sync failed. Try again when you have a stable connection.";
      setOfflineSyncStatus({ status: "error", message });
    } finally {
      setIsOfflineSyncing(false);
    }
  }

  useEffect(() => {
    offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(console.error);
    if (typeof navigator !== "undefined" && navigator.onLine) {
      window.setTimeout(() => { void syncOfflineQueue(false); }, 0);
    }
    const handleOnline = () => void syncOfflineQueue(false);
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  async function handleLiftLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const exerciseId = String(formData.get("exerciseId") ?? "");
    const weight = Number(formData.get("weight") ?? 0);
    const sessionId = String(formData.get("sessionId") ?? "");
    const numSets = Math.max(1, Math.round(Number(formData.get("sets") ?? 1)));
    const repsPerSet = expandRepsPerSet(String(formData.get("reps") ?? ""), numSets);
    const prevMax = prMap.get(exerciseId) ?? 0;
    const loggedAt = new Date().toISOString();

    // Contract: a LiftLog is exactly one set. "3 sets of 10" becomes 3
    // individual single-set records instead of one aggregate `sets: 3` row —
    // see logLiftSet in src/lib/firebase/actions/progress.ts.
    const newLogs: LiftLog[] = repsPerSet.map((reps, index) => ({
      id: `optimistic-${Date.now()}-${index}`,
      memberId,
      exerciseId,
      weight,
      sets: 1,
      reps: String(reps),
      sessionId,
      loggedAt,
      setIndex: index + 1
    }));
    const setWord = newLogs.length === 1 ? "set" : "sets";

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await offlineDB.liftLogs.bulkAdd(newLogs.map((log) => ({ ...log, synced: false })));
      setOptimisticLiftLogs((current) => [...[...newLogs].reverse(), ...(current ?? initialLiftLogs)]);
      offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(console.error);
      setIsNewPR(false);
      setLogSuccess(true);
      toast.success(`${newLogs.length} ${setWord} saved offline. They will sync when you are back online.`);
      liftFormRef.current?.reset();
      setTimeout(() => setLogSuccess(false), 3000);
      return;
    }

    setIsEventPending(true);
    try {
      const results: FormActionState[] = [];
      for (const log of newLogs) {
        const fd = new FormData();
        fd.set("memberId", memberId);
        fd.set("sessionId", sessionId);
        fd.set("exerciseId", exerciseId);
        fd.set("weight", String(weight));
        fd.set("sets", "1");
        fd.set("reps", log.reps);
        if (log.setIndex != null) fd.set("setIndex", String(log.setIndex));
        // Sequential (not parallel) so a mid-batch failure stops cleanly and we
        // know exactly how many sets actually made it to Firestore.
        const result = await logLiftSet(initialFormActionState, fd);
        results.push(result);
        if (result.status !== "success") break;
      }
      setIsEventPending(false);

      const failedAt = results.findIndex((result) => result.status !== "success");
      const succeededLogs = failedAt === -1 ? newLogs : newLogs.slice(0, failedAt);

      if (succeededLogs.length > 0) {
        setOptimisticLiftLogs((current) => [...[...succeededLogs].reverse(), ...(current ?? initialLiftLogs)]);
        setIsNewPR(weight > prevMax);
        setLogSuccess(true);
        const succeededWord = succeededLogs.length === 1 ? "Set" : `${succeededLogs.length} sets`;
        toast.success(weight > prevMax ? "New PR logged. Strong progress." : `${succeededWord} logged. Progress recorded.`);
        liftFormRef.current?.reset();
        setTimeout(() => { setLogSuccess(false); setIsNewPR(false); }, 3000);
        router.refresh();
      }

      if (failedAt !== -1) {
        setEventStatus(results[failedAt]);
      }
    } catch {
      setIsEventPending(false);
      await offlineDB.liftLogs.bulkAdd(newLogs.map((log) => ({ ...log, synced: false })));
      setOptimisticLiftLogs((current) => [...[...newLogs].reverse(), ...(current ?? initialLiftLogs)]);
      offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(console.error);
      setIsNewPR(false);
      setLogSuccess(true);
      toast.success(`${newLogs.length} ${setWord} saved offline. They will sync when your connection returns.`);
      liftFormRef.current?.reset();
      setTimeout(() => setLogSuccess(false), 3000);
    }
  }



  return (
    <section className="member-progress-console">
      <div className="member-progress-chart-card">
        <div className="panel-title" style={{ marginBottom: "18px" }}>
          <div>
            <p className="eyebrow">Progress</p>
            <h2>Strength trend</h2>
          </div>
        </div>
        <ProgressChart
          exercises={exercises}
          liftLogs={liftLogs}
          onExerciseSelect={setSelectedExerciseId}
        />
      </div>

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
        selectedExerciseId={effectiveSelectedExerciseId}
        onExerciseChange={setSelectedExerciseId}
        onSubmit={handleLiftLog}
        isSubmitting={isEventPending}
        onRetryOfflineSync={() => syncOfflineQueue(true)}
      />



      <Dialog.Root open={Boolean(eventStatus)} onOpenChange={(open) => { if (!open) setEventStatus(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-backdrop" />
          <Dialog.Content className="confirm-dialog">
            <Dialog.Title>
              {eventStatus?.status === "success" ? "Update complete" : "Update failed"}
            </Dialog.Title>
            <Dialog.Description asChild>
              <p aria-live="polite" className={`form-message form-message-${eventStatus?.status ?? "success"}`}>
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
