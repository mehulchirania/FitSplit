"use client";

import { useMemo, useState, useTransition } from "react";
import { Dumbbell, X } from "@/components/icons";
import { WeeklyProgramSchedule } from "@/components/weekly-program-schedule";
import { CustomPlanBuilder } from "@/components/custom-plan-builder";
import { deleteCustomWorkoutProgram } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { Exercise, Member, MuscleGroup, ProgramAssignment, WorkoutDay, WorkoutProgram } from "@/types/domain";

type CatalogGroup = { muscleGroup: MuscleGroup; exercises: Exercise[] };

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
  isCustom,
  onDelete,
  onEdit,
  onView,
  program
}: {
  assignedNames: string[];
  exerciseNames: Map<string, string>;
  isCustom: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
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
            {isCustom ? "Custom" : "Predefined"}
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

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button className="button button-primary" onClick={onView} type="button" style={{ flex: 1 }}>
            View plan
          </button>
          {isCustom && onEdit && (
            <button className="button button-secondary" onClick={onEdit} type="button" style={{ flex: 1 }}>
              Edit
            </button>
          )}
          {isCustom && onDelete && (
            <button className="button button-secondary" onClick={onDelete} type="button"
              style={{ background: "color-mix(in srgb,var(--danger) 10%,var(--bg-elevated))", color: "var(--danger)", border: "1px solid color-mix(in srgb,var(--danger) 25%,transparent)", flex: "0 0 auto" }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function WorkoutProgramGallery({
  assignments,
  catalog = [],
  exercises,
  members,
  programs
}: {
  assignments: ProgramAssignment[];
  catalog?: CatalogGroup[];
  exercises: Exercise[];
  members: Member[];
  programs: WorkoutProgram[];
}) {
  const [selectedProgram, setSelectedProgram] = useState<WorkoutProgram | null>(null);
  const [editProgram, setEditProgram] = useState<WorkoutProgram | null>(null);
  const [showPredefined, setShowPredefined] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const exerciseNames = useMemo(() => exerciseNameById(exercises), [exercises]);
  const predefinedPrograms = programs.filter((p) => p.source !== "gym");
  const customPrograms = programs.filter((p) => p.source === "gym");

  function handleDelete(programId: string, programTitle: string) {
    startDelete(async () => {
      const fd = new FormData();
      fd.set("programId", programId);
      fd.set("programTitle", programTitle);
      const result = await deleteCustomWorkoutProgram(initialFormActionState, fd);
      setDeleteStatus(result.message);
      setConfirmDeleteId(null);
    });
  }

  function renderCustomSection() {
    return (
      <section className="list-panel program-library-section">
        <div className="panel-title">
          <div>
            <h2>Custom gym plans</h2>
            <p className="member-meta">Programs created by this gym — edit or delete them at any time.</p>
          </div>
          <span className="status-pill status-neutral">
            {customPrograms.length} plan{customPrograms.length === 1 ? "" : "s"}
          </span>
        </div>
        {deleteStatus && (
          <p style={{ padding: "8px 20px", fontSize: "0.82rem", color: "var(--brand-strong)", fontWeight: 600 }}>
            {deleteStatus}
          </p>
        )}
        {customPrograms.length ? (
          <div className="program-grid program-grid-compact">
            {customPrograms.map((program) => (
              <ProgramCard
                assignedNames={assignmentNames(program, assignments, members)}
                exerciseNames={exerciseNames}
                isCustom
                key={program.id}
                onDelete={() => setConfirmDeleteId(program.id)}
                onEdit={() => { setEditProgram(program); setSelectedProgram(null); }}
                onView={() => { setSelectedProgram(program); setEditProgram(null); }}
                program={program}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No custom plans saved yet. Use the builder below to create your first gym plan.</p>
          </div>
        )}
      </section>
    );
  }

  function renderPredefinedSection() {
    return (
      <section className="list-panel program-library-section">
        <div className="panel-title">
          <div>
            <h2>Predefined workout plans</h2>
            <p className="member-meta">Built-in splits from the FitSplit catalog — assign to members but cannot be edited.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="status-pill status-neutral">{predefinedPrograms.length} plans</span>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setShowPredefined((v) => !v)}
              style={{ fontSize: "0.78rem", padding: "4px 10px", minHeight: 28 }}
            >
              {showPredefined ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {showPredefined && (
          <div className="program-grid program-grid-compact">
            {predefinedPrograms.map((program) => (
              <ProgramCard
                assignedNames={assignmentNames(program, assignments, members)}
                exerciseNames={exerciseNames}
                isCustom={false}
                key={program.id}
                onView={() => { setSelectedProgram(program); setEditProgram(null); }}
                program={program}
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <div className="program-library">
        {/* Custom plans at top — what the owner built */}
        {renderCustomSection()}
        {/* Predefined plans collapsed by default */}
        {renderPredefinedSection()}
      </div>

      {/* View full plan dialog */}
      {selectedProgram && !editProgram ? (
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

      {/* Edit program dialog */}
      {editProgram && catalog.length > 0 ? (
        <div className="dialog-backdrop" role="presentation">
          <div aria-modal="true" className="program-dialog" role="dialog" style={{ maxWidth: 680, overflow: "auto", maxHeight: "90vh" }}>
            <div className="panel-title" style={{ marginBottom: 0 }}>
              <h2>Edit plan</h2>
              <button
                aria-label="Close editor"
                className="icon-button neutral-icon-button"
                onClick={() => setEditProgram(null)}
                type="button"
              >
                <X />
              </button>
            </div>
            <CustomPlanBuilder
              catalog={catalog}
              initialProgram={editProgram}
              onSuccess={() => setEditProgram(null)}
            />
          </div>
        </div>
      ) : null}

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <div className="dialog-backdrop" role="presentation">
          <div aria-modal="true" className="confirm-dialog" role="dialog">
            <h2>Delete this plan?</h2>
            <p style={{ color: "var(--text-soft)", fontSize: "0.9rem" }}>
              This will permanently remove the plan. Members currently assigned to it will lose their assignment.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                className="button button-secondary"
                onClick={() => setConfirmDeleteId(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button button-danger"
                disabled={isDeleting}
                onClick={() => {
                  const program = customPrograms.find((p) => p.id === confirmDeleteId);
                  if (program) handleDelete(program.id, program.title);
                }}
                type="button"
              >
                {isDeleting ? "Deleting..." : "Delete plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
