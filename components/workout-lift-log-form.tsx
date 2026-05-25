"use client";

import type React from "react";
import type { Exercise, LiftLog, WorkoutExercise } from "@/types/domain";
import type { FormActionState } from "@/types/action-state";
import { getExerciseName } from "@/lib/workout-utils";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import * as Select from "@radix-ui/react-select";

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
  offlineSyncStatus: FormActionState | null;
  isOfflineSyncing: boolean;
  lastLogByExercise: Map<string, LiftLog>;
  prMap: Map<string, number>;
  liftLogs: LiftLog[];
  liftFormRef: React.RefObject<HTMLFormElement | null>;
  selectedExerciseId: string;
  onExerciseChange: (id: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  onRetryOfflineSync: () => void;
};

export function WorkoutLiftLogForm({
  memberId,
  exercises,
  uniqueLoggableExercises,
  otherExercises,
  logSuccess,
  isNewPR,
  offlineLogsCount,
  offlineSyncStatus,
  isOfflineSyncing,
  lastLogByExercise,
  prMap,
  liftLogs,
  liftFormRef,
  selectedExerciseId,
  onExerciseChange,
  onSubmit,
  isSubmitting,
  onRetryOfflineSync,
}: WorkoutLiftLogFormProps) {
  return (
    <div className="lift-log-panel">
      <div className="panel-title lift-log-title">
        <div className="lift-log-heading">
          <h2>Log your sets</h2>
          {offlineLogsCount > 0 && (
            <span className="status-pill status-expired">
              {offlineLogsCount} unsynced
            </span>
          )}
        </div>
        <AnimatePresence>
          {logSuccess && (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              className="lift-log-success"
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {isNewPR ? "New PR!" : "Set logged!"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {offlineLogsCount > 0 && (
          <motion.div
            animate={{ opacity: 1, height: "auto" }}
            className="offline-sync-banner"
            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
            initial={{ opacity: 0, height: 0, overflow: "hidden" }}
            transition={{ duration: 0.2 }}
          >
            <div>
              <strong>Offline sets waiting</strong>
              <p>{offlineLogsCount} set{offlineLogsCount === 1 ? "" : "s"} will sync when your connection is stable.</p>
            </div>
            <button
              className="button button-secondary"
              disabled={isOfflineSyncing}
              onClick={onRetryOfflineSync}
              type="button"
            >
              {isOfflineSyncing ? "Syncing..." : "Retry sync"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {offlineSyncStatus && (
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className={`form-message form-message-${offlineSyncStatus.status}`}
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
          >
            {offlineSyncStatus.message}
          </motion.p>
        )}
      </AnimatePresence>

      <form ref={liftFormRef} className="lift-log-form" onSubmit={onSubmit}>
        <input name="memberId" type="hidden" value={memberId} />
        <input name="sessionId" type="hidden" value={`session-${memberId}`} />

        {/* C3: Radix Select replaces native <select> — gains keyboard nav, ARIA combobox semantics. */}
        {/* A hidden <input> carries the value for the form submission. */}
        <input type="hidden" name="exerciseId" value={selectedExerciseId || uniqueLoggableExercises[0]?.exerciseId || ""} />
        <label className="lift-log-exercise-field">
          Exercise
          <Select.Root
            value={selectedExerciseId || uniqueLoggableExercises[0]?.exerciseId || ""}
            onValueChange={onExerciseChange}
            required
          >
            <Select.Trigger
              className="radix-select-trigger"
              aria-label="Select exercise"
              style={{
                alignItems: "center",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text)",
                cursor: "pointer",
                display: "flex",
                fontSize: "0.9rem",
                gap: "8px",
                justifyContent: "space-between",
                padding: "8px 12px",
                width: "100%"
              }}
            >
              <Select.Value />
              <Select.Icon>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content
                position="popper"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  maxHeight: "320px",
                  overflowY: "auto",
                  zIndex: 200,
                  width: "var(--radix-select-trigger-width)"
                }}
              >
                <Select.Viewport>
                  {uniqueLoggableExercises.length > 0 && (
                    <Select.Group>
                      <Select.Label
                        style={{
                          color: "var(--text-faint)",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          padding: "8px 12px 4px",
                          textTransform: "uppercase"
                        }}
                      >
                        Today&apos;s plan
                      </Select.Label>
                      {uniqueLoggableExercises.map((item) => (
                        <Select.Item
                          key={item.exerciseId}
                          value={item.exerciseId}
                          style={{
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            outline: "none",
                            padding: "8px 12px"
                          }}
                          className="radix-select-item"
                        >
                          <Select.ItemText>{getExerciseName(item.exerciseId, exercises)}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Group>
                  )}

                  {uniqueLoggableExercises.length > 0 && otherExercises.length > 0 && (
                    <Select.Separator style={{ background: "var(--border)", height: "1px", margin: "4px 0" }} />
                  )}

                  {otherExercises.length > 0 && (
                    <Select.Group>
                      <Select.Label
                        style={{
                          color: "var(--text-faint)",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          padding: "8px 12px 4px",
                          textTransform: "uppercase"
                        }}
                      >
                        Other exercises
                      </Select.Label>
                      {otherExercises.map((ex) => (
                        <Select.Item
                          key={ex.id}
                          value={ex.id}
                          style={{
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            outline: "none",
                            padding: "8px 12px"
                          }}
                          className="radix-select-item"
                        >
                          <Select.ItemText>{ex.name} ({ex.muscleGroup})</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Group>
                  )}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
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

        <button className="button button-primary lift-log-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging..." : "Log Set"}
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
          ) : liftLogs.slice(0, 8).map((log, index) => {
            const isPR = log.weight != null && log.exerciseId && prMap.get(log.exerciseId) === log.weight;
            return (
              <div key={log.id} role="row" data-new={logSuccess && index === 0 ? "true" : undefined}>
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
