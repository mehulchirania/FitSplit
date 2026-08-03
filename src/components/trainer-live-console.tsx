/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useActionState, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelPTSession,
  completePTSession,
  logPTLiftSet,
  reschedulePTSession,
  startPTSession
} from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { Exercise, PTLiftLog, PTSession } from "@/types/domain";

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(iso));
  } catch { return ""; }
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Asia/Kolkata"
    }).format(new Date(iso));
  } catch { return iso; }
}

function formatPlanRange(session: PTSession) {
  if (session.planStartDate) {
    return session.planEndDate
      ? `${session.planStartDate} to ${session.planEndDate}`
      : session.planStartDate;
  }
  return formatDateTime(session.scheduledAt);
}

function formatPlanDuration(session: PTSession) {
  if (session.planDurationDays) {
    return `${session.planDurationDays} day${session.planDurationDays === 1 ? "" : "s"}`;
  }
  return `${session.durationMinutes} min`;
}

function toDatetimeLocal(iso: string) {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
}

type OptimisticLiftLog = PTLiftLog & { optimistic?: boolean };

export function TrainerLiveConsole({
  session,
  initialLiftLogs,
  exercises
}: {
  session: PTSession;
  initialLiftLogs: PTLiftLog[];
  exercises: Exercise[];
}) {
  const router = useRouter();

  // ── Lift logger state ──────────────────────────────────────────────────────
  const [liftState, liftAction, liftPending] = useActionState(logPTLiftSet, initialFormActionState);
  const [optimisticLogs, addOptimisticLog] = useOptimistic<OptimisticLiftLog[], OptimisticLiftLog>(
    initialLiftLogs,
    (prev, next) => [next, ...prev]
  );
  const [, startLiftTransition] = useTransition();
  const liftFormRef = useRef<HTMLFormElement>(null);

  const [exerciseId, setExerciseId] = useState(session.plannedExercises?.[0]?.exerciseId ?? "");
  const [weight, setWeight] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [liftNotes, setLiftNotes] = useState("");

  // ── PT plan lifecycle state ────────────────────────────────────────────────
  const [startState, startAction, startPending] = useActionState(startPTSession, initialFormActionState);
  const [completeState, completeAction, completePending] = useActionState(completePTSession, initialFormActionState);
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelPTSession, initialFormActionState);
  const [rescheduleState, rescheduleAction, reschedulePending] = useActionState(reschedulePTSession, initialFormActionState);

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [newScheduledAt, setNewScheduledAt] = useState(toDatetimeLocal(session.scheduledAt));

  const anyLifecyclePending = startPending || completePending || cancelPending || reschedulePending;

  // Refresh page after lifecycle changes
  if (
    !anyLifecyclePending && (
      startState.status === "success" ||
      completeState.status === "success" ||
      cancelState.status === "success" ||
      rescheduleState.status === "success"
    )
  ) {
    router.refresh();
  }

  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const plannedExerciseIds = new Set(session.plannedExercises?.map((entry) => entry.exerciseId) ?? []);
  const orderedExercises = [
    ...exercises.filter((exercise) => plannedExerciseIds.has(exercise.id)),
    ...exercises.filter((exercise) => !plannedExerciseIds.has(exercise.id))
  ];

  // Group exercises by muscle group for optgroups
  const byMuscle = orderedExercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    (acc[ex.muscleGroup] ??= []).push(ex);
    return acc;
  }, {});

  // Total volume logged this session
  const totalVolume = optimisticLogs.reduce((sum, log) => {
    const firstRep = Number(String(log.reps ?? "0").split(",")[0]) || 0;
    return sum + log.weight * log.sets * firstRep;
  }, 0);

  function handleLiftSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!exerciseId) return;
    const fd = new FormData(e.currentTarget);
    const exName = exerciseById.get(exerciseId)?.name ?? "";

    startLiftTransition(() => {
      addOptimisticLog({
        id: `opt-${Date.now()}`,
        gymId: session.gymId,
        ptSessionId: session.id,
        memberId: session.memberId,
        trainerId: session.trainerId,
        exerciseId,
        exerciseName: exName,
        weight: Number(weight) || 0,
        sets: Number(sets) || 1,
        reps,
        notes: liftNotes || undefined,
        loggedAt: new Date().toISOString(),
        optimistic: true
      });
      // Clear lift form fields
      setWeight("");
      setLiftNotes("");
    });

    liftFormRef.current?.requestSubmit();
  }

  const isScheduled = session.status === "scheduled";
  const isActive = session.status === "active";
  const isDone = session.status === "completed" || session.status === "cancelled";

  return (
    <div className="pt-console">
      {/* ── PT plan header ──────────────────────────────────────────────────── */}
      <section className="pt-console-header list-panel">
        <div className="pt-console-meta">
          <div className="pt-console-person">
            <span className="pt-console-label">Member</span>
            <strong className="pt-console-value">{session.memberName ?? session.memberId}</strong>
          </div>
          <div className="pt-console-person">
            <span className="pt-console-label">Trainer</span>
            <strong className="pt-console-value">{session.trainerName ?? session.trainerId}</strong>
          </div>
          <div className="pt-console-person">
            <span className="pt-console-label">PT plan period</span>
            <strong className="pt-console-value">{formatPlanRange(session)}</strong>
          </div>
          <div className="pt-console-person">
            <span className="pt-console-label">Plan length</span>
            <strong className="pt-console-value">{formatPlanDuration(session)}</strong>
          </div>
          {session.startedAt && (
            <div className="pt-console-person">
              <span className="pt-console-label">Started</span>
              <strong className="pt-console-value">{formatTime(session.startedAt)}</strong>
            </div>
          )}
        </div>

        {session.notes && (
          <p className="pt-console-notes"><em>Goals: {session.notes}</em></p>
        )}

        {session.plannedExercises && session.plannedExercises.length > 0 && (
          <div className="pt-console-plan">
            <span className="pt-console-label">Planned PT work</span>
            <div className="pt-console-plan-list">
              {session.plannedExercises.map((entry, index) => {
                const exercise = exerciseById.get(entry.exerciseId);
                return (
                  <button
                    className={`pt-console-plan-chip${exerciseId === entry.exerciseId ? " is-selected" : ""}`}
                    key={`${entry.exerciseId}-${index}`}
                    onClick={() => {
                      setExerciseId(entry.exerciseId);
                      setSets(String(entry.sets ?? 3));
                      setReps(entry.reps ?? "8-12");
                      setLiftNotes(entry.notes ?? "");
                    }}
                    type="button"
                  >
                    <strong>{exercise?.name ?? entry.exerciseId}</strong>
                    <span>{entry.sets ?? 3} x {entry.reps ?? "8-12"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Lifecycle buttons */}
        <div className="pt-console-lifecycle">
          {isScheduled && (
            <form action={startAction} style={{ display: "inline" }}>
              <input type="hidden" name="ptSessionId" value={session.id} />
              <button className="button button-primary" disabled={anyLifecyclePending} type="submit">
                {startPending ? "Activating..." : "Activate plan"}
              </button>
            </form>
          )}

          {isActive && (
            <form action={completeAction} style={{ display: "inline" }}>
              <input type="hidden" name="ptSessionId" value={session.id} />
              <button className="button button-secondary" disabled={anyLifecyclePending} type="submit">
                {completePending ? "Completing..." : "Complete plan"}
              </button>
            </form>
          )}

          {!isDone && !showCancel && !showReschedule && (
            <>
              <button
                className="button button-secondary"
                disabled={anyLifecyclePending}
                onClick={() => setShowReschedule(true)}
                type="button"
              >
                Reschedule
              </button>
              <button
                className="button button-danger-ghost"
                disabled={anyLifecyclePending}
                onClick={() => setShowCancel(true)}
                type="button"
              >
                Cancel plan
              </button>
            </>
          )}

          {showReschedule && (
            <form action={rescheduleAction} className="pt-reschedule-form">
              <input type="hidden" name="ptSessionId" value={session.id} />
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
                New date &amp; time
                <input
                  name="scheduledAt"
                  required
                  type="datetime-local"
                  value={newScheduledAt}
                  onChange={(e) => setNewScheduledAt(e.target.value)}
                />
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="button button-primary" disabled={anyLifecyclePending} type="submit">
                  {reschedulePending ? "Saving…" : "Save new time"}
                </button>
                <button className="button button-secondary" onClick={() => setShowReschedule(false)} type="button">
                  Back
                </button>
              </div>
              {rescheduleState.status === "error" && (
                <p className="form-message form-message-error">{rescheduleState.message}</p>
              )}
            </form>
          )}

          {showCancel && (
            <form action={cancelAction} className="pt-cancel-form">
              <input type="hidden" name="ptSessionId" value={session.id} />
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
                Cancel reason <span style={{ color: "var(--text-faint)" }}>(optional)</span>
                <input
                  maxLength={200}
                  name="cancelReason"
                  placeholder="e.g. Member didn't show up"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="button button-danger" disabled={anyLifecyclePending} type="submit">
                  {cancelPending ? "Cancelling…" : "Confirm cancel"}
                </button>
                <button className="button button-secondary" onClick={() => setShowCancel(false)} type="button">
                  Back
                </button>
              </div>
              {cancelState.status === "error" && (
                <p className="form-message form-message-error">{cancelState.message}</p>
              )}
            </form>
          )}
        </div>

        {isDone && (
          <p className={`pt-done-banner ${session.status === "completed" ? "pt-done-completed" : "pt-done-cancelled"}`}>
            PT plan {session.status}.
            {session.endedAt && ` Ended at ${formatTime(session.endedAt)}.`}
            {session.cancelReason && ` Reason: ${session.cancelReason}`}
          </p>
        )}
      </section>

      {/* ── Lift logger (only shown during active session) ──────────────────── */}
      {isActive && (
        <section className="list-panel pt-lift-logger">
          <h2 className="pt-lift-logger-title"><span>Log a set</span></h2>
          <form
            className="pt-lift-form"
            ref={liftFormRef}
            action={liftAction}
            onSubmit={handleLiftSubmit}
          >
            <input type="hidden" name="ptSessionId" value={session.id} />
            <input type="hidden" name="memberId" value={session.memberId} />
            <input type="hidden" name="exerciseName" value={exerciseById.get(exerciseId)?.name ?? ""} />

            <div className="form-grid">
              <label className="form-grid-full">
                Exercise
                <select
                  name="exerciseId"
                  required
                  value={exerciseId}
                  onChange={(e) => setExerciseId(e.target.value)}
                >
                  <option value="">— Pick an exercise —</option>
                  {Object.entries(byMuscle).sort(([a], [b]) => a.localeCompare(b)).map(([muscle, exs]) => (
                    <optgroup key={muscle} label={muscle}>
                      {exs.sort((a, b) => a.name.localeCompare(b.name)).map((ex) => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <label>
                Weight (kg)
                <input
                  inputMode="decimal"
                  min="0"
                  name="weight"
                  placeholder="e.g. 60"
                  required
                  step="0.5"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </label>

              <label>
                Sets
                <input
                  inputMode="numeric"
                  min="1"
                  name="sets"
                  required
                  type="number"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                />
              </label>

              <label>
                Reps
                <input
                  name="reps"
                  placeholder="e.g. 10 or 10,9,8"
                  required
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                />
              </label>

              <label>
                Notes <span style={{ color: "var(--text-faint)", fontSize: "0.8em" }}>(optional)</span>
                <input
                  maxLength={200}
                  name="notes"
                  placeholder="e.g. good form, slight knee pain"
                  value={liftNotes}
                  onChange={(e) => setLiftNotes(e.target.value)}
                />
              </label>
            </div>

            {liftState.status === "error" && (
              <p className="form-message form-message-error" role="alert">{liftState.message}</p>
            )}

            <button
              className="button button-primary"
              disabled={liftPending || !exerciseId}
              type="submit"
            >
              {liftPending ? "Logging…" : "+ Log set"}
            </button>
          </form>
        </section>
      )}

      {/* ── Logged sets ─────────────────────────────────────────────────────── */}
      <section className="list-panel pt-logs-panel">
        <div className="panel-title" style={{ marginBottom: 12 }}>
          <h2>Sets logged</h2>
          {optimisticLogs.length > 0 && (
            <span className="status-pill status-neutral">
              {optimisticLogs.length} set{optimisticLogs.length !== 1 ? "s" : ""} · {Math.round(totalVolume / 1000 * 10) / 10}k vol
            </span>
          )}
        </div>

        {optimisticLogs.length === 0 ? (
          <p style={{ color: "var(--text-soft)", fontSize: "0.9rem" }}>
            {isActive ? "No sets logged yet. Use the form above to start." : "No sets were logged for this PT plan."}
          </p>
        ) : (
          <div className="pt-logs-list">
            {optimisticLogs.map((log) => (
              <div key={log.id} className={`pt-log-row${log.optimistic ? " pt-log-row--pending" : ""}`}>
                <span className="pt-log-exercise">
                  {log.exerciseName ?? exerciseById.get(log.exerciseId)?.name ?? log.exerciseId}
                </span>
                <span className="pt-log-stats">
                  {log.weight}kg × {log.sets} × {log.reps}
                </span>
                {log.notes && (
                  <span className="pt-log-notes">{log.notes}</span>
                )}
                <span className="pt-log-time">
                  {log.optimistic ? "saving…" : formatTime(log.loggedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
