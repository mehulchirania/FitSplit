"use client";

import type { FormActionState } from "@/types/action-state";

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SessionTimerBar({
  elapsedSeconds,
  isSessionPending,
  onEndWorkout,
  sessionStatus
}: {
  elapsedSeconds: number;
  isSessionPending: boolean;
  onEndWorkout: () => void;
  sessionStatus: FormActionState | null;
}) {
  return (
    <div className="workout-session-bar">
      <span className="session-elapsed">
        <svg
          aria-hidden="true"
          fill="none"
          height="14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {formatElapsed(elapsedSeconds)}
        {elapsedSeconds >= 3 * 3600 && (
          <span className="status-pill status-expired" style={{ marginLeft: 8 }}>
            Auto-ends at 4h
          </span>
        )}
      </span>
      <button
        className="button button-danger session-end-btn"
        disabled={isSessionPending}
        onClick={onEndWorkout}
        type="button"
      >
        {isSessionPending ? "Ending..." : "End Workout"}
      </button>
      {sessionStatus && (
        <span
          className={`form-message form-message-${sessionStatus.status}`}
          style={{ marginLeft: 12 }}
        >
          {sessionStatus.message}
        </span>
      )}
    </div>
  );
}
