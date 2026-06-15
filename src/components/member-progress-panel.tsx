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
import { getDefaultDayIndex, getExerciseName } from "@/lib/workout-utils";
import type { FormActionState } from "@/types/action-state";
import { initialFormActionState } from "@/types/action-state";
import type { Exercise, LiftLog, WorkoutExercise, WorkoutProgram } from "@/types/domain";
import { ProgressChart } from "@/components/progress-chart";
import { WorkoutLiftLogForm } from "@/components/workout-lift-log-form";

type MemberProgressPanelProps = {
  exercises: Exercise[];
  initialLiftLogs: LiftLog[];
  memberId: string;
  program: WorkoutProgram | null;
};

export function MemberProgressPanel({
  exercises,
  initialLiftLogs,
  memberId,
  program
}: MemberProgressPanelProps) {
  const router = useRouter();
  const liftFormRef = useRef<HTMLFormElement>(null);
  const [liftLogs, setLiftLogs] = useState(initialLiftLogs);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");

  const [eventStatus, setEventStatus] = useState<FormActionState | null>(null);
  const [isEventPending, setIsEventPending] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [isNewPR, setIsNewPR] = useState(false);
  const [offlineLogsCount, setOfflineLogsCount] = useState(0);
  const [offlineSyncStatus, setOfflineSyncStatus] = useState<FormActionState | null>(null);
  const [isOfflineSyncing, setIsOfflineSyncing] = useState(false);

  useEffect(() => {
    setLiftLogs(initialLiftLogs);
  }, [initialLiftLogs]);

  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  );

  const todayPlan = program?.days[getDefaultDayIndex(program.days.length)] ?? program?.days[0] ?? null;
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

  useEffect(() => {
    if (!selectedExerciseId && uniqueLoggableExercises[0]?.exerciseId) {
      setSelectedExerciseId(uniqueLoggableExercises[0].exerciseId);
    }
  }, [selectedExerciseId, uniqueLoggableExercises]);

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
      void syncOfflineQueue(false);
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
    const prevMax = prMap.get(exerciseId) ?? 0;

    const newLog: LiftLog = {
      id: `optimistic-${Date.now()}`,
      memberId,
      exerciseId,
      weight,
      sets: Number(formData.get("sets") ?? 1),
      reps: String(formData.get("reps") ?? ""),
      sessionId: String(formData.get("sessionId") ?? ""),
      loggedAt: new Date().toISOString()
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await offlineDB.liftLogs.add({ ...newLog, synced: false });
      setLiftLogs((current) => [newLog, ...current]);
      offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(console.error);
      setIsNewPR(false);
      setLogSuccess(true);
      toast.success("Set saved offline. It will sync when you are back online.");
      liftFormRef.current?.reset();
      setTimeout(() => setLogSuccess(false), 3000);
      return;
    }

    setIsEventPending(true);
    try {
      const result = await logLiftSet(initialFormActionState, formData);
      setIsEventPending(false);
      if (result.status === "success") {
        setLiftLogs((current) => [newLog, ...current]);
        setIsNewPR(weight > prevMax);
        setLogSuccess(true);
        toast.success(weight > prevMax ? "New PR logged. Strong progress." : "Set logged. Progress recorded.");
        liftFormRef.current?.reset();
        setTimeout(() => { setLogSuccess(false); setIsNewPR(false); }, 3000);
        router.refresh();
      } else {
        setEventStatus(result);
      }
    } catch {
      setIsEventPending(false);
      await offlineDB.liftLogs.add({ ...newLog, synced: false });
      setLiftLogs((current) => [newLog, ...current]);
      offlineDB.liftLogs.count().then(setOfflineLogsCount).catch(console.error);
      setIsNewPR(false);
      setLogSuccess(true);
      toast.success("Set saved offline. It will sync when your connection returns.");
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
        selectedExerciseId={selectedExerciseId}
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
