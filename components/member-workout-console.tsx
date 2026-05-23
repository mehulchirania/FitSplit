"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clearDayLog, endWorkoutSession, logDayStatus, logLiftSet, saveMemberAiTrainerNote, syncOfflineLifts } from "@/lib/firebase/actions";
import { generateSmartSwaps } from "@/lib/ai";
import type { DayLog, Exercise, LiftLog, SkipReason, WorkoutExercise, WorkoutProgram } from "@/types/domain";
import type { FormActionState } from "@/types/action-state";
import { initialFormActionState } from "@/types/action-state";
import { Dumbbell } from "@/components/icons";
import { ExerciseList } from "@/components/exercise-list";
import dynamic from "next/dynamic";

const ProgressChart = dynamic(() => import("@/components/progress-chart").then(mod => mod.ProgressChart), {
  ssr: false,
  loading: () => <p className="form-message">Loading chart...</p>
});

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Returns the ISO date string (YYYY-MM-DD) for the Monday of the given date's week. */
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // shift so Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const SKIP_REASONS: { value: SkipReason; label: string }[] = [
  { value: "rest",      label: "Rest day" },
  { value: "no_time",   label: "No time" },
  { value: "equipment", label: "No equipment" },
  { value: "sick",      label: "Feeling sick" },
  { value: "other",     label: "Other" },
];

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
  liftExerciseId?: string;
  liftWeight?: number;
};

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

function getExerciseName(exerciseId: string, exercises: Exercise[]) {
  return exercises.find((exercise) => exercise.id === exerciseId)?.name ?? "Exercise";
}

function getDayMuscleTargets(items: WorkoutExercise[], exercises: Exercise[]) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const exercise = exercises.find((entry) => entry.id === item.exerciseId);
    if (!exercise) {
      continue;
    }

    counts.set(exercise.muscleGroup, (counts.get(exercise.muscleGroup) ?? 0) + 1);
  }

  const sortedGroups = Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([muscleGroup]) => muscleGroup);

  return {
    primary: sortedGroups[0] ?? "Full body",
    secondary: sortedGroups.slice(1, 4)
  };
}

export function MemberWorkoutConsole({
  exercises,
  gymId,
  initialActiveSessionCount: _initialActiveSessionCount,
  initialDayLogs = [],
  initialInjuryNote = "",
  initialLiftLogs,
  memberId,
  program
}: {
  exercises: Exercise[];
  gymId: string;
  initialActiveSessionCount: number;
  initialDayLogs?: DayLog[];
  initialInjuryNote?: string;
  initialLiftLogs: LiftLog[];
  memberId: string;
  program: WorkoutProgram;
}) {
  const router = useRouter();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<FormActionState | null>(null);
  const [isSessionPending, setIsSessionPending] = useState(false);
  const [injury, setInjury] = useState(initialInjuryNote);
  const [modification, setModification] = useState<Modification | null>(null);
  const [workoutMode, setWorkoutMode] = useState<"default" | "ai">("default");
  const [liftLogs, setLiftLogs] = useState(initialLiftLogs);
  const [pendingEvent, setPendingEvent] = useState<PendingEvent | null>(null);
  const [eventStatus, setEventStatus] = useState<FormActionState | null>(null);
  const [isEventPending, setIsEventPending] = useState(false);
  const [offlineLogsCount, setOfflineLogsCount] = useState(0);
  const [logSuccess, setLogSuccess] = useState(false);
  const [isNewPR, setIsNewPR] = useState(false);
  const [isAiSwapping, setIsAiSwapping] = useState(false);
  const liftFormRef = useRef<HTMLFormElement>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() =>
    getDefaultDayIndex(program.days.length)
  );
  // Day-skip / did-something-else state
  const [dayLogs, setDayLogs] = useState<DayLog[]>(initialDayLogs);
  const [skipMode, setSkipMode] = useState<"none" | "skip" | "other">("none");
  const [skipReason, setSkipReason] = useState<SkipReason | "">("");
  const [skipNote, setSkipNote] = useState("");
  const [isDayLogging, setIsDayLogging] = useState(false);
  const [dayLogStatus, setDayLogStatus] = useState<FormActionState | null>(null);
  // The current week's Monday — stable for the lifetime of this render
  const weekStart = useMemo(() => getWeekStart(), []);
  // Max weight per exercise for PR detection
  const prMap = liftLogs.reduce<Map<string, number>>((acc, log) => {
    if (log.weight && log.exerciseId) {
      acc.set(log.exerciseId, Math.max(acc.get(log.exerciseId) ?? 0, log.weight));
    }
    return acc;
  }, new Map());

  // Most recent log per exercise — drives the "Last time" hint under the lift form.
  // liftLogs are already ordered newest-first, so the first match wins.
  const lastLogByExercise = liftLogs.reduce<Map<string, LiftLog>>((acc, log) => {
    if (log.exerciseId && !acc.has(log.exerciseId)) {
      acc.set(log.exerciseId, log);
    }
    return acc;
  }, new Map());

  // Which exercise is currently selected in the log-set form (drives the hint
  // and the PR summary highlight). Tracked in component state so we can react
  // to the <select onChange> instead of querying the DOM.
  const [selectedExerciseIdForForm, setSelectedExerciseIdForForm] = useState<string>("");

  const selectedDay = program.days[selectedDayIndex] ?? program.days[0];
  const aiStorageKey = `fitsplit-ai-trainer-${memberId}-${program.id}`;
  const visibleWorkoutDay = workoutMode === "ai" && modification && selectedDay
    ? { ...selectedDay, exercises: modification.routine }
    : selectedDay;
  const loggableExercises = visibleWorkoutDay?.exercises ?? [];
  const dayMuscleTargets = getDayMuscleTargets(loggableExercises, exercises);
  const uniqueLoggableExercises = Array.from(
    new Map(loggableExercises.map((item) => [item.exerciseId, item])).values()
  );

  // DayLog for the currently selected day in the current week
  const currentDayLog = useMemo(
    () => dayLogs.find((dl) => dl.dayId === selectedDay?.id && dl.weekStart === weekStart) ?? null,
    [dayLogs, selectedDay, weekStart]
  );

  // Exercises NOT already in today's plan — for the "other exercises" optgroup
  const plannedExerciseIds = useMemo(
    () => new Set(uniqueLoggableExercises.map((e) => e.exerciseId)),
    [uniqueLoggableExercises]
  );
  const otherExercises = useMemo(
    () => exercises.filter((e) => !plannedExerciseIds.has(e.id)),
    [exercises, plannedExerciseIds]
  );

  // Restore session state from localStorage on mount
  useEffect(() => {
    const storedId = window.localStorage.getItem("fitsplit-session-id");
    const storedStart = window.localStorage.getItem("fitsplit-session-start");
    if (storedId && storedStart) {
      const startMs = Number(storedStart);
      if (Number.isFinite(startMs)) {
        setIsSessionActive(true);
        setSessionId(storedId);
        setElapsedSeconds(Math.floor((Date.now() - startMs) / 1000));
      }
    }
  }, []);

  // Elapsed time counter
  useEffect(() => {
    if (!isSessionActive) return;
    const interval = setInterval(() => {
      const storedStart = window.localStorage.getItem("fitsplit-session-start");
      if (storedStart) {
        setElapsedSeconds(Math.floor((Date.now() - Number(storedStart)) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isSessionActive]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !program.days.length) {
      return;
    }

    const savedCustomization = window.localStorage.getItem(aiStorageKey);
    if (!savedCustomization && !initialInjuryNote.trim()) {
      return;
    }

    try {
      const parsed = savedCustomization ? JSON.parse(savedCustomization) as {
        injury?: string;
        selectedDayIndex?: number;
        mode?: "default" | "ai";
      } : {};
      const savedInjury = parsed.injury?.trim() || initialInjuryNote.trim();
      if (!savedInjury) {
        return;
      }

      const nextIndex = Math.min(
        Math.max(parsed.selectedDayIndex ?? selectedDayIndex, 0),
        program.days.length - 1
      );
      const nextDay = program.days[nextIndex];

      setInjury(savedInjury);
      setSelectedDayIndex(nextIndex);
      setModification(createModification(nextDay, savedInjury, exercises));
      setWorkoutMode(parsed.mode === "default" ? "default" : "ai");
    } catch {
      window.localStorage.removeItem(aiStorageKey);
    }
  }, [aiStorageKey, exercises, initialInjuryNote, program.days, selectedDayIndex]);

  function formatElapsed(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }


  async function handleEndWorkout() {
    if (!sessionId) return;
    setIsSessionPending(true);
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("sessionId", sessionId);
    const result = await endWorkoutSession(initialFormActionState, formData);
    setIsSessionPending(false);
    window.localStorage.removeItem("fitsplit-session-id");
    window.localStorage.removeItem("fitsplit-session-start");
    setIsSessionActive(false);
    setSessionId("");
    setElapsedSeconds(0);
    setSessionStatus(result);
    router.refresh();
  }

  function persistAiCustomization(
    nextInjury: string,
    nextSelectedDayIndex: number,
    nextMode: "default" | "ai"
  ) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      aiStorageKey,
      JSON.stringify({
        injury: nextInjury,
        mode: nextMode,
        selectedDayIndex: nextSelectedDayIndex
      })
    );
  }

  async function updateInjury() {
    const nextInjury = injury.trim();
    if (!nextInjury || !selectedDay) {
      return;
    }

    setIsAiSwapping(true);
    try {
      const aiResult = await generateSmartSwaps(memberId, selectedDay.exercises, nextInjury, exercises);
      if (aiResult && aiResult.routine && aiResult.routine.length > 0) {
        setModification({
          injury: nextInjury,
          summary: aiResult.summary || "Smart anatomical adjustments applied by Gemini.",
          swaps: aiResult.swaps || [],
          addedStretches: aiResult.addedStretches || [],
          routine: aiResult.routine
        });
        setWorkoutMode("ai");
        persistAiCustomization(nextInjury, selectedDayIndex, "ai");
      } else {
        // Fallback to local heuristic
        setModification(createModification(selectedDay, nextInjury, exercises));
        setWorkoutMode("ai");
        persistAiCustomization(nextInjury, selectedDayIndex, "ai");
      }
    } catch (e) {
      console.warn("AI Smart Swaps call failed, using client heuristics...", e);
      setModification(createModification(selectedDay, nextInjury, exercises));
      setWorkoutMode("ai");
      persistAiCustomization(nextInjury, selectedDayIndex, "ai");
    } finally {
      setIsAiSwapping(false);
    }

    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("injuryNotes", nextInjury);
    void saveMemberAiTrainerNote(initialFormActionState, formData);
  }

  async function saveDayLog() {
    if (!selectedDay) return;
    if (skipMode === "skip" && !skipReason) return;
    setIsDayLogging(true);
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("programId", program.id);
    formData.set("dayId", selectedDay.id);
    formData.set("weekStart", weekStart);
    formData.set("status", skipMode === "other" ? "modified" : "skipped");
    if (skipMode === "skip" && skipReason) formData.set("skipReason", skipReason);
    if (skipNote.trim()) formData.set("note", skipNote.trim());
    const result = await logDayStatus(initialFormActionState, formData);
    setIsDayLogging(false);
    setDayLogStatus(result);
    if (result.status === "success") {
      // Optimistic local update so the UI reflects immediately
      const newLog: DayLog = {
        id: `${memberId}_${selectedDay.id}_${weekStart}`,
        memberId,
        gymId,
        programId: program.id,
        dayId: selectedDay.id,
        weekStart,
        status: skipMode === "other" ? "modified" : "skipped",
        skipReason: skipMode === "skip" && skipReason ? skipReason : undefined,
        note: skipNote.trim() || undefined,
        loggedAt: new Date().toISOString()
      };
      setDayLogs((prev) => {
        const filtered = prev.filter((dl) => !(dl.dayId === selectedDay.id && dl.weekStart === weekStart));
        return [newLog, ...filtered];
      });
      setSkipMode("none");
      setSkipReason("");
      setSkipNote("");
    }
  }

  async function removeDayLog() {
    if (!selectedDay) return;
    setIsDayLogging(true);
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("dayId", selectedDay.id);
    formData.set("weekStart", weekStart);
    const result = await clearDayLog(initialFormActionState, formData);
    setIsDayLogging(false);
    if (result.status === "success") {
      setDayLogs((prev) => prev.filter((dl) => !(dl.dayId === selectedDay.id && dl.weekStart === weekStart)));
      setDayLogStatus(null);
    }
  }

  function clearInjuryCustomization() {
    setInjury("");
    setModification(null);
    setWorkoutMode("default");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(aiStorageKey);
    }

    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("injuryNotes", "");
    void saveMemberAiTrainerNote(initialFormActionState, formData);
  }

  function selectWorkoutDay(index: number) {
    const nextDay = program.days[index];
    setSelectedDayIndex(index);
    // Reset skip form so it doesn't bleed across days
    setSkipMode("none");
    setSkipReason("");
    setSkipNote("");
    setDayLogStatus(null);

    const nextInjury = injury.trim();
    if (nextDay && nextInjury) {
      setModification(createModification(nextDay, nextInjury, exercises));
      persistAiCustomization(nextInjury, index, workoutMode);
    }
  }

  function handleLiftLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const exerciseName = getExerciseName(String(formData.get("exerciseId") ?? ""), exercises);

    const exerciseId = String(formData.get("exerciseId") ?? "");
    const weight = Number(formData.get("weight") ?? 0);
    setPendingEvent({
      confirmLabel: "Log lift",
      message: `This will save a lift entry for ${exerciseName}.`,
      title: "Log this lift?",
      liftExerciseId: exerciseId,
      liftWeight: weight,
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

    const prevMaxForExercise = pendingEvent.liftExerciseId
      ? prMap.get(pendingEvent.liftExerciseId) ?? 0
      : 0;
    setIsEventPending(true);
    const result = await pendingEvent.run().catch((error) => ({
      status: "error" as const,
      message: error instanceof Error ? error.message : "Unable to complete this action."
    }));
    setIsEventPending(false);
    setPendingEvent(null);
    setEventStatus(result);
    if (result.status === "success") {
      const isNewRecord =
        pendingEvent.liftExerciseId != null &&
        pendingEvent.liftWeight != null &&
        pendingEvent.liftWeight > prevMaxForExercise;
      setIsNewPR(isNewRecord);
      setLogSuccess(true);
      liftFormRef.current?.reset();
      setTimeout(() => { setLogSuccess(false); setIsNewPR(false); }, 3000);
    }
  }

  return (
    <section className="member-training-layout">
      <div className="member-workout-main">
        <div className="panel-title">
          <h2>
            <Dumbbell /> Today&apos;s workout
          </h2>
          <span className="status-pill status-neutral">
            {program.daysPerWeek} days/week
          </span>
        </div>

        {isSessionActive && (
          <div className="workout-session-bar">
            <span className="session-elapsed">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {formatElapsed(elapsedSeconds)}
              {elapsedSeconds >= 3 * 3600 && <span className="status-pill status-expired" style={{ marginLeft: 8 }}>Auto-ends at 4h</span>}
            </span>
            <button
              className="button button-danger session-end-btn"
              disabled={isSessionPending}
              onClick={handleEndWorkout}
              type="button"
            >
              {isSessionPending ? "Ending..." : "End Workout"}
            </button>
            {sessionStatus && (
              <span className={`form-message form-message-${sessionStatus.status}`} style={{ marginLeft: 12 }}>
                {sessionStatus.message}
              </span>
            )}
          </div>
        )}

        <div className="member-workout-body">
          <div className="weekly-schedule">
            <div className="day-tabs-wrap"><div className="day-tabs" aria-label="Weekly workout days">
              {program.days.map((day, index) => {
                const tabLog = dayLogs.find((dl) => dl.dayId === day.id && dl.weekStart === weekStart);
                return (
                  <button
                    className={[
                      selectedDayIndex === index ? "is-selected" : "",
                      tabLog?.status === "skipped" ? "day-tab-skipped" : "",
                      tabLog?.status === "modified" ? "day-tab-modified" : ""
                    ].filter(Boolean).join(" ")}
                    key={day.id}
                    onClick={() => selectWorkoutDay(index)}
                    type="button"
                  >
                    <span>{dayNames[index] ?? `Day ${day.dayNumber}`}</span>
                    <strong>{day.title}</strong>
                    {tabLog && (
                      <em className="day-tab-status-dot" aria-label={tabLog.status === "skipped" ? "Skipped" : "Modified"}>
                        {tabLog.status === "skipped" ? "⏭" : "📝"}
                      </em>
                    )}
                  </button>
                );
              })}
            </div></div>
            {modification ? (
              <div className="workout-mode-toggle" role="tablist" aria-label="Workout version">
                <button
                  aria-selected={workoutMode === "default"}
                  className={workoutMode === "default" ? "is-selected" : ""}
                  onClick={() => {
                    setWorkoutMode("default");
                    persistAiCustomization(modification.injury, selectedDayIndex, "default");
                  }}
                  role="tab"
                  type="button"
                >
                  Default workout
                </button>
                <button
                  aria-selected={workoutMode === "ai"}
                  className={workoutMode === "ai" ? "is-selected" : ""}
                  onClick={() => {
                    setWorkoutMode("ai");
                    persistAiCustomization(modification.injury, selectedDayIndex, "ai");
                  }}
                  role="tab"
                  type="button"
                >
                  AI customized workout
                </button>
              </div>
            ) : null}
            {visibleWorkoutDay ? (
              <article className="selected-workout-day" key={visibleWorkoutDay.id}>
                <p className="eyebrow">
                  {dayNames[selectedDayIndex] ?? `Day ${visibleWorkoutDay.dayNumber}`}
                </p>
                <p>
                  {workoutMode === "ai" && modification
                    ? modification.summary
                    : visibleWorkoutDay.focus}
                </p>
                <div className="day-muscle-targets" aria-label="Day muscle targets">
                  <span>Primary: {dayMuscleTargets.primary}</span>
                  <span>
                    Secondary: {dayMuscleTargets.secondary.length
                      ? dayMuscleTargets.secondary.join(", ")
                      : "Mobility and stabilizers"}
                  </span>
                </div>

                {/* Stretches section shown when modified */}
                {workoutMode === "ai" && modification && modification.routine.some(item => item.notes?.includes("stretch") || item.notes?.includes("Warm-up")) && (
                  <>
                    <p className="eyebrow" style={{ marginTop: "12px", color: "var(--brand)" }}>Stretches &amp; Warm-ups</p>
                    <ExerciseList
                      exercises={exercises}
                      items={visibleWorkoutDay.exercises.filter(item => item.notes?.includes("stretch") || item.notes?.includes("Warm-up"))}
                    />
                    <p className="eyebrow" style={{ marginTop: "12px" }}>Weight Exercises</p>
                    <ExerciseList
                      exercises={exercises}
                      items={visibleWorkoutDay.exercises.filter(item => !item.notes?.includes("stretch") && !item.notes?.includes("Warm-up"))}
                    />
                  </>
                )}

                {/* Default (no modification) */}
                {(workoutMode === "default" || !modification) && (
                  <ExerciseList exercises={exercises} items={visibleWorkoutDay.exercises} />
                )}

                {/* ── Day-skip / did-something-else section ── */}
                <div className="day-log-section">
                  {currentDayLog ? (
                    // Already have a log — show the status and an undo button
                    <div className={`day-log-status day-log-status--${currentDayLog.status}`}>
                      <div className="day-log-status-body">
                        <span className="day-log-status-icon">
                          {currentDayLog.status === "skipped" ? "⏭" : "📝"}
                        </span>
                        <div>
                          <strong>
                            {currentDayLog.status === "skipped"
                              ? `Skipped${currentDayLog.skipReason ? ` · ${SKIP_REASONS.find((r) => r.value === currentDayLog.skipReason)?.label ?? currentDayLog.skipReason}` : ""}`
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
                        onClick={removeDayLog}
                        type="button"
                      >
                        Undo
                      </button>
                    </div>
                  ) : skipMode === "none" ? (
                    // Default — offer skip or "did something else"
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
                  ) : skipMode === "skip" ? (
                    // Skip flow — pick a reason
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
                          onClick={saveDayLog}
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
                  ) : (
                    // "Did something else" flow — free-text note
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
                          onClick={saveDayLog}
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
                  )}
                </div>
              </article>
            ) : null}
          </div>
        </div>

      </div>

      <aside className="member-workout-side">
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

          <form ref={liftFormRef} className="lift-log-form" onSubmit={handleLiftLog}>
            <input name="memberId" type="hidden" value={memberId} />
            <input name="sessionId" type="hidden" value={`session-${memberId}`} />

            <label className="lift-log-exercise-field">
              Exercise
              <select
                name="exerciseId"
                onChange={(e) => setSelectedExerciseIdForForm(e.target.value)}
                required
                value={selectedExerciseIdForForm || uniqueLoggableExercises[0]?.exerciseId || ""}
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
              const targetId = selectedExerciseIdForForm || uniqueLoggableExercises[0]?.exerciseId;
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

        <div className="injury-card">
          <h2>AI Semi-Personal Trainer</h2>
          <p>
            Update Injury/Limitation to let the AI swap risky exercises or
            create a conservative recovery routine for owner review.
          </p>
          <div style={{ display: "flex", gap: "8px", margin: "12px 0", flexWrap: "wrap" }}>
            <button type="button" className="status-pill status-neutral" style={{ cursor: "pointer", border: "none" }} onClick={() => setInjury("Shoulder pain")}>Shoulder pain</button>
            <button type="button" className="status-pill status-neutral" style={{ cursor: "pointer", border: "none" }} onClick={() => setInjury("Knee pain")}>Knee pain</button>
            <button type="button" className="status-pill status-neutral" style={{ cursor: "pointer", border: "none" }} onClick={() => setInjury("Lower back ache")}>Lower back ache</button>
            {injury && <button type="button" className="status-pill status-expired" style={{ cursor: "pointer", border: "none" }} onClick={clearInjuryCustomization}>Clear</button>}
          </div>
          <label>
            Injury or limitation
            <textarea
              onChange={(event) => setInjury(event.target.value)}
              placeholder="Example: shoulder pain during overhead press"
              value={injury}
            />
          </label>
          <button className="button button-primary" onClick={updateInjury} type="button" disabled={isAiSwapping}>
            {isAiSwapping ? "Applying AI Swaps..." : "Update Injury/Limitation"}
          </button>
        </div>

        {modification ? (
          <div className="ai-modification-panel">
            <p className="eyebrow">Plan modified</p>
            <h2>AI Adjustments for {modification.injury}</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-soft)", margin: 0 }}>{modification.summary}</p>

            {modification.swaps.length > 0 && (
              <>
                <p className="eyebrow" style={{ margin: "8px 0 4px", color: "var(--warning)" }}>Exercises Swapped</p>
                {modification.swaps.map((swap) => (
                  <span key={`${swap.from}-${swap.to}`}>
                    <strong>{swap.from}</strong> -&gt; <strong>{swap.to}</strong>
                    <br />
                    <small style={{ color: "var(--text-soft)" }}>{swap.reason}</small>
                  </span>
                ))}
              </>
            )}

            {modification.addedStretches.length > 0 && (
              <>
                <p className="eyebrow" style={{ margin: "8px 0 4px", color: "var(--brand)" }}>Stretches Added for Pain Management</p>
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
