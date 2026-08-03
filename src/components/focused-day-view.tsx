"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { clearDayLog, logDayStatus } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { FormActionState } from "@/types/action-state";
import type { WorkoutDay, Exercise, LiftLog, ProgramAssignment, DayLog } from "@/types/domain";
import { CatalogVideoPreview } from "@/components/catalog-video-preview";
import { estimateSessionMinutes } from "@/lib/workout-utils";

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M8 5l12 7-12 7z" />
    </svg>
  );
}
function ChevDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function ChevUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  );
}
function TrophyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M8 4h8v6a4 4 0 01-8 0V4zM6 5H4a2 2 0 002 4M18 5h2a2 2 0 01-2 4M10 14v3l-1 3h6l-1-3v-3"/>
    </svg>
  );
}

export function FocusedDayView({
  day,
  exercises,
  liftLogs,
  assignment,
  memberId,
  programId,
  weekStart,
  currentDayLog
}: {
  day: WorkoutDay;
  exercises: Exercise[];
  liftLogs: LiftLog[];
  assignment: ProgramAssignment | null;
  memberId: string;
  programId: string;
  weekStart: string;
  currentDayLog: DayLog | null;
  programTitle: string;
}) {
  const router = useRouter();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [dayLogStatus, setDayLogStatus] = useState<FormActionState | null>(null);
  const [isDayLogPending, setIsDayLogPending] = useState(false);
  // Day status / skip reason is a secondary action — collapsed by default so
  // it is never the first thing a member sees after tapping "Start workout".
  const [dayLogOpen, setDayLogOpen] = useState(false);
  const makeupExerciseIds = day.exercises.slice(0, 3).map((exercise) => exercise.exerciseId).join(",");
  const dayLogLabel = currentDayLog?.status === "completed"
    ? "Done"
    : currentDayLog?.status === "skipped"
      ? "Skipped"
      : currentDayLog?.status === "modified"
        ? "Modified"
        : "No note";

  async function handleDayLogSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement && submitter.name) {
      formData.set(submitter.name, submitter.value);
    }

    setIsDayLogPending(true);
    setDayLogStatus(null);
    try {
      const result = await logDayStatus(initialFormActionState, formData);
      setDayLogStatus(result);
      if (result.status === "success") {
        toast.success(result.message);
        router.refresh();
      }
    } finally {
      setIsDayLogPending(false);
    }
  }

  async function handleClearDayLog() {
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("dayId", day.id);
    formData.set("weekStart", weekStart);

    setIsDayLogPending(true);
    setDayLogStatus(null);
    try {
      const result = await clearDayLog(initialFormActionState, formData);
      setDayLogStatus(result);
      if (result.status === "success") {
        toast.success(result.message);
        router.refresh();
      }
    } finally {
      setIsDayLogPending(false);
    }
  }

  if (day.exercises.length === 0) {
    return (
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <p style={{ color: "var(--text-soft)" }}>No exercises scheduled for this day.</p>
        <Link href="/member/programs" className="button button-primary" style={{ marginTop: "20px", display: "inline-flex" }}>
          Back to programs
        </Link>
      </div>
    );
  }

  return (
    <div className="fdv-root">
      {/* Stats bar */}
      <div className="fdv-stats">
        <div className="fdv-stat">
          <strong>{day.exercises.length}</strong>
          <span>exercises</span>
        </div>
        <div className="fdv-stat">
          <strong>{day.exercises.reduce((s, e) => s + (e.sets ?? 0), 0)}</strong>
          <span>total sets</span>
        </div>
        <div className="fdv-stat">
          <strong>~{estimateSessionMinutes(day.exercises)}</strong>
          <span>min</span>
        </div>
        {day.focus && (
          <div className="fdv-stat fdv-stat--focus">
            <span className="fdv-focus-label">{day.focus}</span>
          </div>
        )}
      </div>

      {/* Primary action — logging sets happens on the Train tab, where the
          actual set-by-set logger lives. This page is a preview/reference. */}
      <Link href="/member" className="fdv-log-cta">
        <PlayIcon />
        Log this workout
      </Link>

      {/* Warm-up hint */}
      <div className="fdv-warmup">
        <span className="fdv-warmup__icon">🔥</span>
        <span>Warm up for 5–10 min before starting — dynamic stretches, light cardio, or joint mobility.</span>
      </div>

      {/* Exercise list */}
      <div className="fdv-list">
        {day.exercises.map((ex, idx) => {
          const dictEx = exercises.find((e) => e.id === ex.exerciseId);
          const name = dictEx?.name ?? ex.exerciseId;
          const isExpanded = expandedIdx === idx;

          // Lift log data
          let lastLog: LiftLog | undefined;
          let pr = 0;
          for (const log of liftLogs) {
            if (log.exerciseId === ex.exerciseId) {
              if ((log.weight ?? 0) > pr) pr = log.weight ?? 0;
              if (!lastLog || new Date(log.loggedAt) > new Date(lastLog.loggedAt)) lastLog = log;
            }
          }
          const isPR = lastLog && pr === lastLog.weight && pr > 0;

          return (
            <div key={ex.exerciseId + idx} className={`fdv-row${isExpanded ? " fdv-row--open" : ""}`}>
              {/* Main row — always visible */}
              <button
                className="fdv-row__main"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                type="button"
                aria-expanded={isExpanded}
              >
                <span className="fdv-row__num">{idx + 1}</span>
                <div className="fdv-row__body">
                  <strong className="fdv-row__name">{name}</strong>
                  {dictEx?.muscleGroup && (
                    <span className="fdv-row__group">{dictEx.muscleGroup}</span>
                  )}
                </div>
                <div className="fdv-row__prescription">
                  <strong>{ex.sets} × {ex.reps || (ex.durationSeconds ? `${ex.durationSeconds}s` : "—")}</strong>
                </div>
                {/* Compact video icons */}
                {dictEx && (dictEx.gymVideoUrl || dictEx.videoUrl) && (
                  <div className="fdv-row__vid" onClick={(e) => e.stopPropagation()}>
                    <CatalogVideoPreview
                      exerciseName={name}
                      gymVideoUrl={dictEx.gymVideoUrl}
                      muscleGroup={dictEx.muscleGroup ?? ""}
                      videoUrl={dictEx.videoUrl}
                    />
                  </div>
                )}
                <span className="fdv-row__chev">{isExpanded ? <ChevUp /> : <ChevDown />}</span>
              </button>

              {/* Expanded detail — inline below the row */}
              {isExpanded && (
                <div className="fdv-row__detail">
                  {ex.notes && (
                    <p className="fdv-row__notes">{ex.notes}</p>
                  )}
                  {dictEx?.instructions && (
                    <p className="fdv-row__instructions">{dictEx.instructions}</p>
                  )}
                  {/* Last logged + PR */}
                  <div className="fdv-row__history">
                    <div className="fdv-history-item">
                      <span>Last logged</span>
                      {lastLog ? (
                        <strong>
                          {lastLog.weight}kg × {lastLog.sets} × {lastLog.reps}
                          {isPR && <span className="fdv-pr-chip"><TrophyIcon /> PR</span>}
                        </strong>
                      ) : (
                        <strong style={{ color: "var(--text-faint)" }}>No prior logs</strong>
                      )}
                    </div>
                    {pr > 0 && (
                      <div className="fdv-history-item">
                        <span>Personal best</span>
                        <strong>{pr} kg</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cool-down hint */}
      <div className="fdv-warmup fdv-cooldown">
        <span className="fdv-warmup__icon">🧊</span>
        <span>Cool down with static stretches — hold each for 20–30 seconds to aid recovery.</span>
      </div>

      {/* Day status / skip reason — secondary, collapsed by default */}
      <div className="fdv-daystatus">
        <button
          type="button"
          className="fdv-daystatus__toggle"
          onClick={() => setDayLogOpen((v) => !v)}
          aria-expanded={dayLogOpen}
        >
          <span>
            <span className="fdv-day-log__eyebrow">This week</span>
            <strong>Day status</strong>
          </span>
          {currentDayLog ? (
            <span className={`fdv-day-log__chip fdv-day-log__chip--${currentDayLog.status}`}>
              {dayLogLabel}
            </span>
          ) : (
            <span className="fdv-day-log__chip">No note</span>
          )}
          <span className="fdv-row__chev">{dayLogOpen ? <ChevUp /> : <ChevDown />}</span>
        </button>

        {dayLogOpen && (
          <form className="fdv-day-log" onSubmit={handleDayLogSubmit}>
            <input name="memberId" type="hidden" value={memberId} />
            <input name="programId" type="hidden" value={programId} />
            <input name="dayId" type="hidden" value={day.id} />
            <input name="weekStart" type="hidden" value={weekStart} />
            <input name="makeupExerciseIds" type="hidden" value={makeupExerciseIds} />
            <div className="fdv-day-log__fields">
              <label>
                Skip reason
                <select name="skipReason" defaultValue={currentDayLog?.skipReason ?? "no_time"}>
                  <option value="no_time">No time</option>
                  <option value="rest">Rest day</option>
                  <option value="equipment">Equipment unavailable</option>
                  <option value="sick">Sick or injured</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Note
                <textarea
                  name="note"
                  defaultValue={currentDayLog?.note ?? ""}
                  maxLength={400}
                  placeholder="Optional context for your coach"
                  rows={2}
                />
              </label>
            </div>
            {dayLogStatus ? (
              <p className={`form-message form-message-${dayLogStatus.status}`}>
                {dayLogStatus.message}
              </p>
            ) : null}
            <div className="fdv-day-log__actions">
              <button className="button button-primary" name="status" type="submit" value="completed" disabled={isDayLogPending}>
                {isDayLogPending ? "Saving..." : "Mark done"}
              </button>
              <button className="button button-secondary" name="status" type="submit" value="modified" disabled={isDayLogPending}>
                {isDayLogPending ? "Saving..." : "Save note"}
              </button>
              <button className="button button-secondary" name="status" type="submit" value="skipped" disabled={isDayLogPending}>
                Mark skipped
              </button>
              {currentDayLog ? (
                <button className="button button-ghost" type="button" onClick={handleClearDayLog} disabled={isDayLogPending}>
                  Clear
                </button>
              ) : null}
            </div>
          </form>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fdv-footer">
        <Link href="/member/programs" className="fdv-back">
          ← Back to programs
        </Link>
        {assignment && (
          <span className="fdv-assigned-note">
            Assigned {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : ""}
          </span>
        )}
      </div>
    </div>
  );
}
