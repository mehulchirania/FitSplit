"use client";

import { useMemo, useState } from "react";
import { Dumbbell, X } from "@/components/icons";
import { WeeklyProgramSchedule } from "@/components/weekly-program-schedule";
import type { Exercise, Member, ProgramAssignment, WorkoutDay, WorkoutProgram } from "@/types/domain";

const splitLabels: Record<string, string> = {
  ppl_x2: "PPL x 2",
  ppl_upper_lower: "PPL Upper Lower",
  bro_split: "Bro Split",
  combo_x2: "Chest+Tricep / Back+Bicep / Legs+Shoulder x2",
  custom: "Custom"
};

function exerciseNameById(exercises: Exercise[]) {
  return new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
}

function trainingDays(program: WorkoutProgram) {
  return program.days.filter((day) => day.exercises.length > 0);
}

function exerciseCount(program: WorkoutProgram) {
  return program.days.reduce((count, day) => count + day.exercises.length, 0);
}

function dayExerciseNames(day: WorkoutDay, names: Map<string, string>) {
  return day.exercises.map((item) => names.get(item.exerciseId) ?? item.exerciseId);
}

function assignmentNames(
  program: WorkoutProgram,
  assignments: ProgramAssignment[],
  members: Member[]
) {
  const memberById = new Map(members.map((member) => [member.id, member.fullName]));
  return assignments
    .filter((assignment) => assignment.programId === program.id && assignment.status === "active")
    .map((assignment) => memberById.get(assignment.memberId) ?? assignment.memberId)
    .sort((left, right) => left.localeCompare(right));
}

function ProgramCard({
  assignedNames,
  exerciseNames,
  onView,
  program
}: {
  assignedNames: string[];
  exerciseNames: Map<string, string>;
  onView: () => void;
  program: WorkoutProgram;
}) {
  const activeDays = trainingDays(program);
  const previewDays = activeDays.slice(0, 3);

  return (
    <article className="program-card program-card-compact">
      <div className="program-card-body">
        <div className="program-card-topline">
          <p className="eyebrow">{splitLabels[program.splitType]}</p>
          <span className="status-pill status-neutral">
            {program.source === "gym" ? "Custom" : "Predefined"}
          </span>
        </div>
        <h2>
          <Dumbbell className="program-title-icon" /> {program.title}
        </h2>
        <p>{program.description}</p>
        <div className="program-stat-row">
          <span>
            <strong>{activeDays.length}</strong>
            training days
          </span>
          <span>
            <strong>{exerciseCount(program)}</strong>
            exercises
          </span>
          <span>
            <strong>{assignedNames.length}</strong>
            members
          </span>
        </div>

        <div className="program-day-preview">
          {previewDays.length ? (
            previewDays.map((day) => (
              <div className="program-day-line" key={day.id}>
                <strong>{day.title}</strong>
                <span>{dayExerciseNames(day, exerciseNames).slice(0, 4).join(", ")}</span>
              </div>
            ))
          ) : (
            <p className="program-empty-copy">No exercises have been added to this plan yet.</p>
          )}
        </div>

        <div className="assigned-preview">
          <span>Assigned members</span>
          <strong>
            {assignedNames.length ? assignedNames.slice(0, 3).join(", ") : "None yet"}
            {assignedNames.length > 3 ? ` +${assignedNames.length - 3}` : ""}
          </strong>
        </div>

        <button className="button button-primary" onClick={onView} type="button">
          View full plan
        </button>
      </div>
    </article>
  );
}

export function WorkoutProgramGallery({
  assignments,
  exercises,
  members,
  programs
}: {
  assignments: ProgramAssignment[];
  exercises: Exercise[];
  members: Member[];
  programs: WorkoutProgram[];
}) {
  const [selectedProgram, setSelectedProgram] = useState<WorkoutProgram | null>(null);
  const exerciseNames = useMemo(() => exerciseNameById(exercises), [exercises]);
  const predefinedPrograms = programs.filter((program) => program.source !== "gym");
  const customPrograms = programs.filter((program) => program.source === "gym");

  function renderSection(title: string, description: string, sectionPrograms: WorkoutProgram[]) {
    return (
      <section className="list-panel program-library-section">
        <div className="panel-title">
          <div>
            <h2>{title}</h2>
            <p className="member-meta">{description}</p>
          </div>
          <span className="status-pill status-neutral">
            {sectionPrograms.length} plan{sectionPrograms.length === 1 ? "" : "s"}
          </span>
        </div>
        {sectionPrograms.length ? (
          <div className="program-grid program-grid-compact">
            {sectionPrograms.map((program) => (
              <ProgramCard
                assignedNames={assignmentNames(program, assignments, members)}
                exerciseNames={exerciseNames}
                key={program.id}
                onView={() => setSelectedProgram(program)}
                program={program}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No custom plans have been saved for this gym yet.</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <div className="program-library">
        {renderSection(
          "Predefined workout plans",
          "Built-in splits from the FitSplit catalog, already mapped to exercise names, sets, and reps.",
          predefinedPrograms
        )}
        {renderSection(
          "Custom gym plans",
          "Owner-created programs saved by this gym, with member assignment visibility.",
          customPrograms
        )}
      </div>

      {selectedProgram ? (
        <div className="dialog-backdrop" role="presentation">
          <div aria-modal="true" className="program-dialog" role="dialog">
            <div className="panel-title">
              <div>
                <h2>{selectedProgram.title}</h2>
                <p className="member-meta">
                  {trainingDays(selectedProgram).length} training days · {exerciseCount(selectedProgram)} exercises ·{" "}
                  {assignmentNames(selectedProgram, assignments, members).length} assigned members
                </p>
              </div>
              <button
                aria-label="Close program"
                className="icon-button neutral-icon-button"
                onClick={() => setSelectedProgram(null)}
                type="button"
              >
                <X />
              </button>
            </div>
            <p>{selectedProgram.description}</p>
            <WeeklyProgramSchedule exercises={exercises} program={selectedProgram} />
          </div>
        </div>
      ) : null}
    </>
  );
}
