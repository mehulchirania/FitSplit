"use client";

import type React from "react";
import type { Exercise, LiftLog, WorkoutExercise } from "@/types/domain";
import type { FormActionState } from "@/types/action-state";
import type { PendingEvent } from "@/lib/stores/workout-store";
import { getExerciseName } from "@/lib/workout-utils";
import dynamic from "next/dynamic";

const ProgressChart = dynamic(() => import("@/components/progress-chart").then(mod => mod.ProgressChart), {
  ssr: false,
  loading: () => <p className="form-message">Loading chart...</p>
});

type WorkoutLiftLogFormProps = {
  memberId: string;
  exercises: Exercise[];
  uniqueLoggableExercises: WorkoutExercise[];
  otherExercises: Exercise[];
  logSuccess: boolean;
  isNewPR: boolean;
  offlineLogsCount: number;
  lastLogByExercise: Map<string, LiftLog>;
  prMap: Map<string, number>;
  liftLogs: LiftLog[];
  liftFormRef: React.RefObject<HTMLFormElement | null>;
  selectedExerciseId: string;
  onExerciseChange: (id: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  pendingEvent: PendingEvent | null;
  eventStatus: FormActionState | null;
  isEventPending: boolean;
  onConfirm: () => void;
  onCancelEvent: () => void;
};

export function WorkoutLiftLogForm({
  memberId,
  exercises,
  uniqueLoggableExercises,
  otherExercises,
  logSuccess,
  isNewPR,
  offlineLogsCount,
  lastLogByExercise,
  prMap,
  liftLogs,
  liftFormRef,
  selectedExerciseId,
  onExerciseChange,
  onSubmit,
  pendingEvent,
  eventStatus,
  isEventPending,
  onConfirm,
  onCancelEvent,
}: WorkoutLiftLogFormProps) {
  return (
    <div className="lift-log-panel">
      <div className="panel-title lift-log-title">
        <div className="lift-log-heading">
          <h2>Log your sets</h2>
          {offlineLogsCount > 0 && (
            <span className="status-pill status-expired">
              {offlineLogsCount} unsynced (Offline)
            </span>
          )}
        </div>
        {logSuccess && (
          <span className="lift-log-success">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {isNewPR ? "New PR!" : "Set logged!"}
          </span>
        )}
      </div>

      <form ref={liftFormRef} className="lift-log-form" onSubmit={onSubmit}>
        <input name="memberId" type="hidden" value={memberId} />
        <input name="sessionId" type="hidden" value={`session-${memberId}`} />

        <label className="lift-log-exercise-field">
          Exercise
          <select
            name="exerciseId"
            onChange={(e) => onExerciseChange(e.target.value)}
            required
            value={selectedExerciseId || uniqueLoggableExercises[0]?.exerciseId || ""}
          >
            {uniqueLoggableExercises.length > 0 && (
              <optgroup label="Today's plan">
                {uniqueLoggableExercises.map((item) => (
                  <option key={item.exerciseId} value={item.exerciseId}>
                    {getExerciseName(item.exerciseId, exercises)}
                  </option>
                ))}
              </optgroup>
            )}
            {otherExercises.length > 0 && (
              <optgroup label="Other exercises">
                {otherExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.muscleGroup})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        {/* "Last time" hint — shows the most recent lift for the selected exercise.
            Gives users a fast reference point without needing to open lift history. */}
        {(() => {
          const targetId = selectedExerciseId || uniqueLoggableExercises[0]?.exerciseId;
          const lastLog = targetId ? lastLogByExercise.get(targetId) : undefined;
          const isPR = lastLog && lastLog.weight === prMap.get(lastLog.exerciseId);
          if (!lastLog) {
            return (
              <p className="lift-log-last-hint lift-log-last-hint--empty">
                No prior logs for this exercise yet.
              </p>
            );
          }
          return (
            <p className="lift-log-last-hint">
              Last time: <strong>{lastLog.weight}kg × {lastLog.sets} × {lastLog.reps}</strong>
              {isPR ? <span className="pr-chip" style={{ marginLeft: 8 }}>PR</span> : null}
            </p>
          );
        })()}

        <div className="lift-log-fields">
          <label>
            Weight (kg)
            <input min="0" name="weight" placeholder="60" required step="0.5" type="number" />
          </label>
          <label>
            Sets
            <input defaultValue="3" min="1" name="sets" required type="number" />
          </label>
          <label>
            Reps
            <input name="reps" placeholder="e.g. 10 or 8,8,7" title="Single number for uniform reps (10) or comma-separated per set (8,8,7)" required />
          </label>
        </div>

        <button className="button button-primary lift-log-submit" type="submit">
          Log Set
        </button>
      </form>

      <details className="member-details-panel">
        <summary className="member-details-summary">
          <span className="status-pill status-neutral">View Lift History</span>
        </summary>
        <div className="lift-log-table" role="table" aria-label="Historical lift data">
          <div role="row">
            <span>Exercise</span>
            <span>Weight</span>
            <span>Sets</span>
            <span>Reps</span>
          </div>
          {liftLogs.length === 0 ? (
            <p className="empty-lift-state">No sets logged yet. Log your first set above.</p>
          ) : liftLogs.slice(0, 8).map((log) => {
            const isPR = log.weight != null && log.exerciseId && prMap.get(log.exerciseId) === log.weight;
            return (
              <div key={log.id} role="row">
                <span>{getExerciseName(log.exerciseId, exercises)}{isPR && <span className="pr-chip" title="Personal record">PR</span>}</span>
                <span>{log.weight} kg</span>
                <span>{log.sets}</span>
                <span>{log.reps}</span>
              </div>
            );
          })}
        </div>
      </details>

      {liftLogs.length > 0 && (
        <details className="member-details-panel">
          <summary className="member-details-summary">
            <span className="status-pill status-neutral">Progress Chart</span>
          </summary>
          <div className="member-details-body">
            <ProgressChart exercises={exercises} liftLogs={liftLogs} />
          </div>
        </details>
      )}
    </div>
  );
}
