"use client";

import type { DayLog, Exercise, SkipReason } from "@/types/domain";
import type { FormActionState } from "@/types/action-state";
import { WorkoutMakeupCard } from "@/components/workout-makeup-card";
import { SKIP_REASONS } from "@/lib/workout-utils";

export function DaySkipForm({
  currentDayLog,
  dayLogStatus,
  exercises,
  isDayLogging,
  onMakeupUpdate,
  onRemoveDayLog,
  onSaveDayLog,
  setSkipMode,
  setSkipNote,
  setSkipReason,
  skipMode,
  skipNote,
  skipReason
}: {
  currentDayLog: DayLog | null;
  dayLogStatus: FormActionState | null;
  exercises: Exercise[];
  isDayLogging: boolean;
  onMakeupUpdate: (updated: DayLog) => void;
  onRemoveDayLog: () => void;
  onSaveDayLog: () => void;
  setSkipMode: (mode: "none" | "skip" | "other") => void;
  setSkipNote: (note: string) => void;
  setSkipReason: (reason: SkipReason | "") => void;
  skipMode: "none" | "skip" | "other";
  skipNote: string;
  skipReason: SkipReason | "";
}) {
  if (currentDayLog) {
    return (
      <>
        <div className={`day-log-status day-log-status--${currentDayLog.status}`}>
          <div className="day-log-status-body">
            <span className="day-log-status-icon">
              {currentDayLog.status === "skipped" ? "⏭" : "📝"}
            </span>
            <div>
              <strong>
                {currentDayLog.status === "skipped"
                  ? `Skipped${
                      currentDayLog.skipReason
                        ? ` · ${SKIP_REASONS.find((r) => r.value === currentDayLog.skipReason)?.label ?? currentDayLog.skipReason}`
                        : ""
                    }`
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
            onClick={onRemoveDayLog}
            type="button"
          >
            Undo
          </button>
        </div>
        {currentDayLog.status === "skipped" && currentDayLog.makeupStatus === "pending" && (
          <WorkoutMakeupCard
            dayLog={currentDayLog}
            exercises={exercises}
            onUpdate={onMakeupUpdate}
          />
        )}
      </>
    );
  }

  if (skipMode === "none") {
    return (
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
    );
  }

  if (skipMode === "skip") {
    return (
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
            onClick={onSaveDayLog}
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
    );
  }

  // "Did something else" flow
  return (
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
          onClick={onSaveDayLog}
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
  );
}
