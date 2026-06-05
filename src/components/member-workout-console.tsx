"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import type { DayLog, Exercise, LiftLog, WorkoutProgram } from "@/types/domain";
import { Dumbbell, Edit, SkipForward } from "@/components/icons";
import { ExerciseList } from "@/components/exercise-list";
import { WorkoutLiftLogForm } from "@/components/workout-lift-log-form";
import { SessionTimerBar } from "@/components/workout/session-timer-bar";
import { InjuryNotesForm } from "@/components/workout/injury-notes-form";
import { DaySkipForm } from "@/components/workout/day-skip-form";
import { useWorkoutConsole } from "@/components/workout/use-workout-console";
import { dayNames } from "@/lib/workout-utils";

export function MemberWorkoutConsole({
  exercises,
  gymId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialActiveSessionCount: _initialActiveSessionCount,
  initialDayLogs = [],
  initialInjuryNote = "",
  initialLiftLogs,
  memberId,
  program,
  initialSelectedDayIndex,
  showLiftLogger = false
}: {
  exercises: Exercise[];
  gymId: string;
  initialActiveSessionCount: number;
  initialDayLogs?: DayLog[];
  initialInjuryNote?: string;
  initialLiftLogs: LiftLog[];
  memberId: string;
  program: WorkoutProgram;
  initialSelectedDayIndex?: number;
  showLiftLogger?: boolean;
}) {
  const {
    isSessionActive, sessionStatus, isSessionPending, elapsedSeconds,
    injury, setInjury,
    eventStatus, setEventStatus,
    isEventPending, offlineLogsCount, logSuccess, isNewPR,
    selectedDayIndex, dayLogs, skipMode, setSkipMode,
    skipReason, setSkipReason, skipNote, setSkipNote,
    isDayLogging, dayLogStatus,
    selectedExerciseIdForForm, setSelectedExerciseIdForForm,
    liftLogs,
    weekStart, visibleWorkoutDay, dayMuscleTargets,
    uniqueLoggableExercises, otherExercises, currentDayLog,
    offlineSyncStatus, isOfflineSyncing, lastLogByExercise, prMap,
    liftFormRef,
    handleEndWorkout, saveInjuryNote, clearInjuryNote,
    saveDayLog, removeDayLog, handleMakeupUpdate, selectWorkoutDay,
    handleLiftLog, retryOfflineSync
  } = useWorkoutConsole({
    exercises, gymId, initialDayLogs, initialInjuryNote,
    initialLiftLogs, memberId, program, initialSelectedDayIndex
  });

  return (
    <section className="member-training-layout">
      <div className="member-workout-main">
        <div className="panel-title">
          <h2><Dumbbell /> Today&apos;s workout</h2>
          <span className="status-pill status-neutral">{program.daysPerWeek} days/week</span>
        </div>

        {isSessionActive && (
          <SessionTimerBar
            elapsedSeconds={elapsedSeconds}
            isSessionPending={isSessionPending}
            onEndWorkout={handleEndWorkout}
            sessionStatus={sessionStatus}
          />
        )}

        <div className="member-workout-body">
          <div className="weekly-schedule">
            <div className="day-tabs-wrap">
              <div className="day-tabs" aria-label="Weekly workout days">
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
                        <em
                          className="day-tab-status-icon"
                          aria-label={tabLog.status === "skipped" ? "Skipped" : "Modified"}
                        >
                          {tabLog.status === "skipped" ? <SkipForward /> : <Edit />}
                        </em>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {visibleWorkoutDay ? (
                <motion.article
                  animate={{ opacity: 1, y: 0 }}
                  className="selected-workout-day"
                  exit={{ opacity: 0, y: -6 }}
                  initial={{ opacity: 0, y: 6 }}
                  key={visibleWorkoutDay.id}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <p className="eyebrow">
                    {dayNames[selectedDayIndex] ?? `Day ${visibleWorkoutDay.dayNumber}`}
                  </p>
                  <p>{visibleWorkoutDay.focus}</p>
                  <div className="day-muscle-targets" aria-label="Day muscle targets">
                    <span>Primary: {dayMuscleTargets.primary}</span>
                    <span>
                      Secondary:{" "}
                      {dayMuscleTargets.secondary.length
                        ? dayMuscleTargets.secondary.join(", ")
                        : "Mobility and stabilizers"}
                    </span>
                  </div>

                  <ExerciseList exercises={exercises} items={visibleWorkoutDay.exercises} />

                  <div className="day-log-section">
                    <DaySkipForm
                      currentDayLog={currentDayLog}
                      dayLogStatus={dayLogStatus}
                      exercises={exercises}
                      isDayLogging={isDayLogging}
                      onMakeupUpdate={handleMakeupUpdate}
                      onRemoveDayLog={removeDayLog}
                      onSaveDayLog={saveDayLog}
                      setSkipMode={setSkipMode}
                      setSkipNote={setSkipNote}
                      setSkipReason={setSkipReason}
                      skipMode={skipMode}
                      skipNote={skipNote}
                      skipReason={skipReason}
                    />
                  </div>
                </motion.article>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <aside className="member-workout-side">
        {showLiftLogger && (
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
            selectedExerciseId={selectedExerciseIdForForm}
            onExerciseChange={setSelectedExerciseIdForForm}
            onSubmit={handleLiftLog}
            isSubmitting={isEventPending}
            onRetryOfflineSync={retryOfflineSync}
          />
        )}

        <InjuryNotesForm
          injury={injury}
          onClear={clearInjuryNote}
          onInjuryChange={setInjury}
          onSave={saveInjuryNote}
        />
      </aside>

      {/* Error dialog */}
      <Dialog.Root
        open={Boolean(eventStatus)}
        onOpenChange={(open) => { if (!open) setEventStatus(null); }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-backdrop" />
          <Dialog.Content className="confirm-dialog">
            <Dialog.Title>
              {eventStatus?.status === "success" ? "Update complete" : "Update failed"}
            </Dialog.Title>
            <Dialog.Description asChild>
              <p
                aria-live="polite"
                className={`form-message form-message-${eventStatus?.status ?? "success"}`}
              >
                {eventStatus?.message ?? ""}
              </p>
            </Dialog.Description>
            <div className="quick-actions">
              <Dialog.Close asChild>
                <button className="button button-primary" type="button">Done</button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
