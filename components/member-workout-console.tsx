"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  endWorkoutSession,
  logLiftSet,
  startWorkoutSession,
  syncOfflineLifts
} from "@/lib/firebase/actions";
import type { Exercise, LiftLog, WorkoutExercise, WorkoutProgram } from "@/types/domain";
import type { FormActionState } from "@/types/action-state";
import { initialFormActionState } from "@/types/action-state";
import { Activity, Dumbbell } from "@/components/icons";
import { ExerciseList } from "@/components/exercise-list";

const sessionKey = "fitsplit-active-workout";
const activeCountKey = "fitsplit-active-workouts";
const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type Modification = {
  injury: string;
  summary: string;
  swaps: Array<{ from: string; to: string; reason: string }>;
  addedStretches: Array<{ name: string; reason: string }>;
  routine: WorkoutExercise[];
};

type PendingEvent = {
  confirmLabel: string;
  message: string;
  run: () => Promise<FormActionState>;
  title: string;
};

function getStoredActiveCount() {
  if (typeof window === "undefined") {
    return 0;
  }

  return Number(window.localStorage.getItem(activeCountKey) ?? "0");
}

function setStoredActiveCount(nextCount: number) {
  const normalizedCount = Math.max(0, nextCount);
  window.localStorage.setItem(activeCountKey, String(normalizedCount));
  window.dispatchEvent(new CustomEvent("fitsplit-capacity-change"));
  return normalizedCount;
}

function getBusyness(count: number) {
  if (count <= 1) {
    return { label: "Quiet", tone: "status-active", dot: "Green" };
  }

  if (count <= 4) {
    return { label: "Moderate", tone: "status-expiring", dot: "Yellow" };
  }

  return { label: "Busy", tone: "status-expired", dot: "Red" };
}

function getDefaultDayIndex(dayCount: number) {
  const mondayFirstIndex = (new Date().getDay() + 6) % 7;
  return Math.min(Math.max(mondayFirstIndex, 0), Math.max(dayCount - 1, 0));
}

function getInjuryRule(injury: string) {
  const value = injury.toLowerCase();

  if (value.includes("shoulder")) {
    return {
      avoidMuscles: ["Shoulders", "Chest"],
      avoidTerms: ["overhead", "press", "bench", "fly"],
      preferredMuscles: ["Legs", "Core", "Back"],
      summary:
        "Reduced shoulder-loaded pressing and replaced it with lower-body, core, and controlled pulling work.",
      stretches: ["stretch-band-pulls"]
    };
  }

  if (value.includes("knee")) {
    return {
      avoidMuscles: ["Legs"],
      avoidTerms: ["squat", "lunge", "leg press", "extension"],
      preferredMuscles: ["Chest", "Back", "Core"],
      summary:
        "Removed knee-dominant leg work and shifted the session toward upper-body and trunk-safe movements.",
      stretches: ["stretch-quad"]
    };
  }

  if (value.includes("back") || value.includes("spine") || value.includes("lower back")) {
    return {
      avoidMuscles: ["Back"] as string[],
      avoidTerms: ["deadlift", "row", "good morning"],
      preferredMuscles: ["Chest", "Shoulders", "Biceps"] as string[],
      summary:
        "Avoided spinal loading and rebuilt the day around supported upper-body push/pull work.",
      stretches: ["stretch-cat-cow"]
    };
  }

  return {
    avoidMuscles: [] as string[],
    avoidTerms: [] as string[],
    preferredMuscles: ["Core", "Cardio", "Chest"] as string[],
    summary:
      "Generated a conservative recovery routine while the owner reviews the limitation details.",
    stretches: [] as string[]
  };
}

function isContraindicated(
  item: WorkoutExercise,
  injury: string,
  exercises: Exercise[]
) {
  const exercise = exercises.find((entry) => entry.id === item.exerciseId);
  const rule = getInjuryRule(injury);

  if (!exercise) {
    return false;
  }

  const text = `${exercise.name} ${exercise.instructions}`.toLowerCase();
  return (
    rule.avoidMuscles.includes(exercise.muscleGroup as string) ||
    rule.avoidTerms.some((term) => text.includes(term))
  );
}

function findAlternative(
  usedIds: Set<string>,
  injury: string,
  exercises: Exercise[],
  originalMuscleGroup?: string
) {
  const rule = getInjuryRule(injury);
  // Determine mechanic type of the original exercise to prevent push/pull confusion
  const PUSH_MUSCLES = ["Chest", "Shoulders", "Triceps"];
  const PULL_MUSCLES = ["Back", "Biceps"];
  const originalIsPush = originalMuscleGroup && PUSH_MUSCLES.includes(originalMuscleGroup);
  const originalIsPull = originalMuscleGroup && PULL_MUSCLES.includes(originalMuscleGroup);

  return exercises.find((exercise) => {
    if (usedIds.has(exercise.id)) return false;
    if (!exercise.ownerOnly) return false;
    if (!rule.preferredMuscles.includes(exercise.muscleGroup as string)) return false;
    // If original was a pull exercise and preferred is a push exercise, skip (and vice versa)
    // unless the original's muscle group is contraindicated
    const thisIsPush = PUSH_MUSCLES.includes(exercise.muscleGroup as string);
    const thisIsPull = PULL_MUSCLES.includes(exercise.muscleGroup as string);
    if (originalMuscleGroup && !rule.avoidMuscles.includes(originalMuscleGroup)) {
      if (originalIsPush && thisIsPull) return false;
      if (originalIsPull && thisIsPush) return false;
    }
    return true;
  });
}

function createModification(
  activeDay: WorkoutProgram["days"][number],
  injury: string,
  exercises: Exercise[]
): Modification {
  const usedIds = new Set(activeDay.exercises.map((item) => item.exerciseId));
  const swaps: Modification["swaps"] = [];
  const addedStretches: Modification["addedStretches"] = [];
  const routine = activeDay.exercises.map((item) => {
    if (!isContraindicated(item, injury, exercises)) {
      return item;
    }

    const original = exercises.find((exercise) => exercise.id === item.exerciseId);
    const alternative = findAlternative(usedIds, injury, exercises, original?.muscleGroup as string | undefined);

    if (!original || !alternative) {
      return item;
    }

    usedIds.add(alternative.id);
    swaps.push({
      from: original.name,
      to: alternative.name,
      reason: `Swapped to protect your ${injury}. Maintains similar movement pattern.`
    });

    return { ...item, exerciseId: alternative.id, notes: "AI Semi-Personal Trainer swap" };
  });

  const rule = getInjuryRule(injury);
  if (rule.stretches && rule.stretches.length > 0) {
    const stretchExercises = rule.stretches.map((stretchId) => {
      const ex = exercises.find(e => e.id === stretchId);
      if (ex) {
        addedStretches.push({
          name: ex.name,
          reason: `Therapeutic warm-up for your reported ${injury}.`
        });
      }
      return {
        exerciseId: stretchId,
        sets: 2,
        reps: "10-15",
        restSeconds: 30,
        notes: "AI Suggestion: Warm-up stretch"
      };
    });
    routine.unshift(...stretchExercises);
  }

  if (!swaps.length && !addedStretches.length) {
    const recoveryExercises = exercises
      .filter((exercise) => getInjuryRule(injury).preferredMuscles.includes(exercise.muscleGroup as string))
      .slice(0, 4)
      .map((exercise, index) => ({
        exerciseId: exercise.id,
        sets: index === 0 ? 2 : 3,
        reps: index === 0 ? "easy warm-up" : "12-15",
        restSeconds: 60,
        notes: "AI Semi-Personal Trainer recovery routine"
      }));

    return {
      injury,
      summary: getInjuryRule(injury).summary,
      swaps: [{
        from: "Original training intensity",
        to: "Dedicated recovery routine",
        reason: "No direct contraindicated exercise was detected, so the plan was softened."
      }],
      addedStretches: [],
      routine: recoveryExercises
    };
  }

  return {
    injury,
    summary: getInjuryRule(injury).summary,
    swaps,
    addedStretches,
    routine
  };
}

const WORKOUT_START_KEY = "fitsplit-workout-start";
const MAX_SESSION_SECONDS = 4 * 60 * 60; // 4 hours

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getExerciseName(exerciseId: string, exercises: Exercise[]) {
  return exercises.find((exercise) => exercise.id === exerciseId)?.name ?? "Exercise";
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("GPS location is not available on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 12000
    });
  });
}

export function MemberWorkoutConsole({
  exercises,
  initialActiveSessionCount,
  initialLiftLogs,
  memberId,
  program
}: {
  exercises: Exercise[];
  initialActiveSessionCount: number;
  initialLiftLogs: LiftLog[];
  memberId: string;
  program: WorkoutProgram;
}) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [injury, setInjury] = useState("");
  const [modification, setModification] = useState<Modification | null>(null);
  const [liftLogs, setLiftLogs] = useState(initialLiftLogs);
  const [pendingEvent, setPendingEvent] = useState<PendingEvent | null>(null);
  const [eventStatus, setEventStatus] = useState<FormActionState | null>(null);
  const [isEventPending, setIsEventPending] = useState(false);
  const [offlineLogsCount, setOfflineLogsCount] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() =>
    getDefaultDayIndex(program.days.length)
  );
  const busyness = useMemo(() => getBusyness(activeCount), [activeCount]);
  const selectedDay = program.days[selectedDayIndex] ?? program.days[0];
  const visibleWorkoutDay = modification && selectedDay
    ? { ...selectedDay, exercises: modification.routine }
    : selectedDay;
  const loggableExercises = visibleWorkoutDay?.exercises ?? [];
  const uniqueLoggableExercises = Array.from(
    new Map(loggableExercises.map((item) => [item.exerciseId, item])).values()
  );

  useEffect(() => {
    setIsActive(window.localStorage.getItem(sessionKey) === "active");
    setActiveCount(Math.max(initialActiveSessionCount, getStoredActiveCount()));
    
    function handleOnline() {
      const offlineLogs = JSON.parse(window.localStorage.getItem("fitsplit-offline-logs") || "[]");
      if (offlineLogs.length > 0) {
        syncOfflineLifts(offlineLogs).then((res) => {
           if (res.status === "success") {
             window.localStorage.removeItem("fitsplit-offline-logs");
             setOfflineLogsCount(0);
           }
        });
      }
    }
    
    setOfflineLogsCount(JSON.parse(window.localStorage.getItem("fitsplit-offline-logs") || "[]").length);
    if (typeof navigator !== "undefined" && navigator.onLine) {
       handleOnline();
    }
    
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [initialActiveSessionCount]);

  // Elapsed workout clock — ticks while active, auto-ends at 4 hours
  useEffect(() => {
    if (!isActive) {
      setElapsedSeconds(0);
      return;
    }

    // Restore elapsed time from stored start timestamp
    const storedStart = window.localStorage.getItem(WORKOUT_START_KEY);
    const startTime = storedStart ? Number(storedStart) : Date.now();
    if (!storedStart) {
      window.localStorage.setItem(WORKOUT_START_KEY, String(startTime));
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);

      if (elapsed >= MAX_SESSION_SECONDS) {
        // Auto-end after 4 hours
        const formData = new FormData();
        formData.set("sessionId", `active-${memberId}`);
        endWorkoutSession(initialFormActionState, formData).then(() => {
          window.localStorage.removeItem(sessionKey);
          window.localStorage.removeItem(WORKOUT_START_KEY);
          setIsActive(false);
          setActiveCount(setStoredActiveCount(getStoredActiveCount() - 1));
          setElapsedSeconds(0);
          router.refresh();
        });
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [isActive, memberId, router]);

  function startWorkout() {
    if (isActive) {
      return;
    }

    setPendingEvent({
      confirmLabel: "Start workout",
      message: "This will request GPS permission, verify gym check-in, and update live capacity.",
      title: "Start workout session?",
      run: async () => {
        const formData = new FormData();
        formData.set("memberId", memberId);
        formData.set("sessionId", `active-${memberId}`);
        const position = await getCurrentPosition();
        formData.set("latitude", String(position.coords.latitude));
        formData.set("longitude", String(position.coords.longitude));
        formData.set("deviceInfo", navigator.userAgent);
        const result = await startWorkoutSession(initialFormActionState, formData);

        if (result.status === "success") {
          window.localStorage.setItem(sessionKey, "active");
          window.localStorage.setItem(WORKOUT_START_KEY, String(Date.now()));
          setIsActive(true);
          setActiveCount(setStoredActiveCount(getStoredActiveCount() + 1));
          router.refresh();
        }

        return result;
      }
    });
  }

  function endWorkout() {
    if (!isActive) {
      return;
    }

    setPendingEvent({
      confirmLabel: "End workout",
      message: "This will close your active workout session and update live gym capacity.",
      title: "End workout session?",
      run: async () => {
        const formData = new FormData();
        formData.set("sessionId", `active-${memberId}`);
        const result = await endWorkoutSession(initialFormActionState, formData);

        if (result.status === "success") {
          window.localStorage.removeItem(sessionKey);
          window.localStorage.removeItem(WORKOUT_START_KEY);
          setIsActive(false);
          setElapsedSeconds(0);
          setActiveCount(setStoredActiveCount(getStoredActiveCount() - 1));
          router.refresh();
        }

        return result;
      }
    });
  }

  function updateInjury() {
    if (!injury.trim()) {
      return;
    }

    if (!selectedDay) {
      return;
    }

    setModification(createModification(selectedDay, injury.trim(), exercises));
  }

  function handleLiftLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const exerciseName = getExerciseName(String(formData.get("exerciseId") ?? ""), exercises);

    setPendingEvent({
      confirmLabel: "Log lift",
      message: `This will save a lift entry for ${exerciseName}.`,
      title: "Log this lift?",
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
           const existingLogs = JSON.parse(window.localStorage.getItem("fitsplit-offline-logs") || "[]");
           existingLogs.push(newLog);
           window.localStorage.setItem("fitsplit-offline-logs", JSON.stringify(existingLogs));
           setLiftLogs((current) => [newLog, ...current].slice(0, 12));
           setOfflineLogsCount(existingLogs.length);
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
           const existingLogs = JSON.parse(window.localStorage.getItem("fitsplit-offline-logs") || "[]");
           existingLogs.push(newLog);
           window.localStorage.setItem("fitsplit-offline-logs", JSON.stringify(existingLogs));
           setLiftLogs((current) => [newLog, ...current].slice(0, 12));
           setOfflineLogsCount(existingLogs.length);
           return { status: "success", message: "Saved offline. Will sync when connected." } as FormActionState;
        }
      }
    });
  }

  async function confirmPendingEvent() {
    if (!pendingEvent) {
      return;
    }

    setIsEventPending(true);
    const result = await pendingEvent.run().catch((error) => ({
      status: "error" as const,
      message: error instanceof Error ? error.message : "Unable to complete this action."
    }));
    setIsEventPending(false);
    setPendingEvent(null);
    setEventStatus(result);
  }

  return (
    <section className="content-grid">
      <div className="list-panel">
        <div className="panel-title">
          <h2>
            <Dumbbell /> Today&apos;s workout
          </h2>
          <span className="status-pill status-neutral">
            {program.daysPerWeek} days/week
          </span>
        </div>

        <div className="workout-session-panel">
          <div>
            <p className="eyebrow">Attendance proxy</p>
            <h2>{isActive ? "Workout in progress" : "Ready to train"}</h2>
            {isActive ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "clamp(1.4rem, 3vw, 2rem)",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: elapsedSeconds > 3 * 3600 ? "var(--danger)" : "var(--brand)"
                }}>
                  ⏱ {formatElapsed(elapsedSeconds)}
                </span>
                {elapsedSeconds > 3 * 3600 && (
                  <span className="status-pill status-expired">Auto-ends at 4h</span>
                )}
              </div>
            ) : (
              <p>Start and end buttons update live gym capacity.</p>
            )}
          </div>
          <div className="quick-actions">
            <button
              className="button button-primary"
              disabled={isActive}
              onClick={startWorkout}
              type="button"
            >
              Start Workout
            </button>
            <button
              className="button button-secondary"
              disabled={!isActive}
              onClick={endWorkout}
              type="button"
            >
              End Workout
            </button>
          </div>
        </div>

        <div className="notification-list">
          <div className="weekly-schedule">
            <div className="day-tabs" aria-label="Weekly workout days">
              {program.days.map((day, index) => (
                <button
                  className={selectedDayIndex === index ? "is-selected" : ""}
                  key={day.id}
                  onClick={() => {
                    setSelectedDayIndex(index);
                    setModification(null);
                  }}
                  type="button"
                >
                  <span>{dayNames[index] ?? `Day ${day.dayNumber}`}</span>
                  <strong>{day.title}</strong>
                </button>
              ))}
            </div>
            {visibleWorkoutDay ? (
              <article className="selected-workout-day" key={visibleWorkoutDay.id}>
                <p className="eyebrow">
                  {dayNames[selectedDayIndex] ?? `Day ${visibleWorkoutDay.dayNumber}`}
                </p>
                <h2>{visibleWorkoutDay.title}</h2>
                <p>{modification ? modification.summary : visibleWorkoutDay.focus}</p>

                {/* Stretches section — shown when modified */}
                {modification && modification.routine.some(item => item.notes?.includes("stretch") || item.notes?.includes("Warm-up")) && (
                  <>
                    <p className="eyebrow" style={{ marginTop: "12px", color: "var(--brand)" }}>🧘 Stretches &amp; Warm-ups</p>
                    <ExerciseList
                      exercises={exercises}
                      items={visibleWorkoutDay.exercises.filter(item => item.notes?.includes("stretch") || item.notes?.includes("Warm-up"))}
                    />
                    <p className="eyebrow" style={{ marginTop: "12px" }}>🏋️ Weight Exercises</p>
                    <ExerciseList
                      exercises={exercises}
                      items={visibleWorkoutDay.exercises.filter(item => !item.notes?.includes("stretch") && !item.notes?.includes("Warm-up"))}
                    />
                  </>
                )}

                {/* Default (no modification) */}
                {!modification && (
                  <ExerciseList exercises={exercises} items={visibleWorkoutDay.exercises} />
                )}
              </article>
            ) : null}
          </div>
        </div>

        <div className="lift-log-panel">
          <div className="panel-title" style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <h2>Progressive overload</h2>
              {offlineLogsCount > 0 && (
                <span className="status-pill status-expired">
                  {offlineLogsCount} unsynced (Offline)
                </span>
              )}
            </div>
            <span className="status-pill status-neutral">Historical lift data</span>
          </div>
          <form className="lift-log-form" onSubmit={handleLiftLog}>
            <input name="memberId" type="hidden" value={memberId} />
            <input name="sessionId" type="hidden" value={`session-${memberId}`} />
            <label>
              Exercise
              <select name="exerciseId">
                {uniqueLoggableExercises.map((item) => (
                  <option key={item.exerciseId} value={item.exerciseId}>
                    {getExerciseName(item.exerciseId, exercises)}
                  </option>
                ))}
              </select>
            </label>
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
              <input name="reps" placeholder="8, 8, 7" required />
            </label>
            <button className="button button-primary" type="submit">
              Log lift
            </button>
          </form>
          <div className="lift-log-table" role="table" aria-label="Historical lift data">
            <div role="row">
              <span>Exercise</span>
              <span>Weight</span>
              <span>Sets</span>
              <span>Reps</span>
            </div>
            {liftLogs.slice(0, 8).map((log) => (
              <div key={log.id} role="row">
                <span>{getExerciseName(log.exerciseId, exercises)}</span>
                <span>{log.weight} kg</span>
                <span>{log.sets}</span>
                <span>{log.reps}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="list-panel">
        <div className="injury-card">
          <h2>AI Semi-Personal Trainer</h2>
          <p>
            Update Injury/Limitation to let the AI swap risky exercises or
            create a conservative recovery routine for owner review.
          </p>
          <label>
            Injury or limitation
            <textarea
              onChange={(event) => setInjury(event.target.value)}
              placeholder="Example: shoulder pain during overhead press"
              value={injury}
            />
          </label>
          <button className="button button-primary" onClick={updateInjury} type="button">
            Update Injury/Limitation
          </button>
        </div>

        {modification ? (
          <div className="ai-modification-panel">
            <p className="eyebrow">Plan modified</p>
            <h2>AI Adjustments for {modification.injury}</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-soft)", margin: 0 }}>{modification.summary}</p>

            {modification.swaps.length > 0 && (
              <>
                <p className="eyebrow" style={{ margin: "8px 0 4px", color: "var(--warning)" }}>🔄 Exercises Swapped</p>
                {modification.swaps.map((swap) => (
                  <span key={`${swap.from}-${swap.to}`}>
                    <strong>{swap.from}</strong> → <strong>{swap.to}</strong>
                    <br />
                    <small style={{ color: "var(--text-soft)" }}>{swap.reason}</small>
                  </span>
                ))}
              </>
            )}

            {modification.addedStretches.length > 0 && (
              <>
                <p className="eyebrow" style={{ margin: "8px 0 4px", color: "var(--brand)" }}>🧘 Stretches Added for Pain Management</p>
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

      {pendingEvent ? (
        <div className="dialog-backdrop" role="presentation">
          <div
            aria-describedby="event-confirm-dialog-message"
            aria-modal="true"
            className="confirm-dialog"
            role="dialog"
          >
            <h2>{pendingEvent.title}</h2>
            <p id="event-confirm-dialog-message">{pendingEvent.message}</p>
            <div className="quick-actions">
              <button
                className="button button-secondary"
                disabled={isEventPending}
                onClick={() => setPendingEvent(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={isEventPending}
                onClick={confirmPendingEvent}
                type="button"
              >
                {isEventPending ? "Updating..." : pendingEvent.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {eventStatus ? (
        <div className="dialog-backdrop" role="presentation">
          <div
            aria-live="polite"
            aria-modal="true"
            className="confirm-dialog"
            role="dialog"
          >
            <h2>{eventStatus.status === "success" ? "Update complete" : "Update failed"}</h2>
            <p className={`form-message form-message-${eventStatus.status}`}>
              {eventStatus.message}
            </p>
            <div className="quick-actions">
              <button
                className="button button-primary"
                onClick={() => setEventStatus(null)}
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
