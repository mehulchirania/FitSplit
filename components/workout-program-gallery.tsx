"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { X } from "@/components/icons";
import { WeeklyProgramSchedule } from "@/components/weekly-program-schedule";
import { CustomPlanBuilder } from "@/components/custom-plan-builder";
import { deleteCustomWorkoutProgram } from "@/lib/firebase/actions";
import { callArchiveCustomProgram } from "@/lib/firebase/functions";
import { initialFormActionState } from "@/types/action-state";
import type { Exercise, Member, MuscleGroup, ProgramAssignment, WorkoutDay, WorkoutProgram } from "@/types/domain";

type CatalogGroup = { muscleGroup: MuscleGroup; exercises: Exercise[] };

const splitLabels: Record<string, string> = {
  ppl_x2: "PPL x 2",
  ppl_upper_lower: "PPL Upper Lower",
  bro_split: "Bro Split",
  combo_x2: "Modified Arnold Split x 2",
  custom: "Custom"
};

type CustomProgramGroup = {
  assignments: ProgramAssignment[];
  exercises: Exercise[];
  gymId: string;
  gymName: string;
  members: Member[];
  programs: WorkoutProgram[];
};

type ProgramContext = {
  assignments: ProgramAssignment[];
  exercises: Exercise[];
  members: Member[];
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

function programInsight(program: WorkoutProgram) {
  return program.selectionHints?.trainerNotes ?? program.bestFor?.slice(0, 2).join(" / ") ?? program.goal;
}

function dayExerciseNames(day: WorkoutDay, names: Map<string, string>) {
  return day.exercises
    .map((item) => names.get(item.exerciseId))
    .filter((name): name is string => Boolean(name));
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

function ProgramRow({
  assignedNames,
  isCustom,
  onDelete,
  onEdit,
  onView,
  program,
  showAssignments = true,
}: {
  assignedNames: string[];
  exerciseNames: Map<string, string>;
  isCustom: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onView: () => void;
  program: WorkoutProgram;
  showAssignments?: boolean;
}) {
  const days = trainingDays(program);
  return (
    <div className="adm-prog-row" role="row">
      <div className="adm-prog-row__title">
        <strong>{program.title}</strong>
        <span>{splitLabels[program.splitType] ?? program.splitType}</span>
      </div>
      <span style={{ fontSize: 12, color: "var(--text-soft)" }}>
        {days.length} days · {exerciseCount(program)} exercises
      </span>
      <span style={{ fontSize: 12, color: "var(--text-soft)" }}>{program.difficulty}</span>
      {showAssignments ? (
        <span style={{ fontSize: 12 }}>
          {assignedNames.length > 0
            ? `${assignedNames.length} member${assignedNames.length > 1 ? "s" : ""}`
            : <span style={{ color: "var(--text-faint)" }}>—</span>}
        </span>
      ) : (
        <span />
      )}
      <span className={isCustom ? "adm-tag adm-tag--ok" : "adm-tag adm-tag--neutral"}>
        {isCustom ? "Custom" : "Preset"}
      </span>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={onView}>
          View
        </button>
        {isCustom && onEdit && (
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={onEdit}>
            Edit
          </button>
        )}
        {isCustom && onDelete && (
          <button
            type="button"
            className="adm-btn adm-btn--sm"
            style={{ background: "color-mix(in srgb,var(--danger) 12%,transparent)", color: "var(--danger)", border: "1px solid color-mix(in srgb,var(--danger) 25%,transparent)" }}
            onClick={onDelete}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export function WorkoutProgramGallery({
  assignments,
  catalog = [],
  customGroups = [],
  exercises,
  members,
  programs,
  readOnly = false
}: {
  assignments: ProgramAssignment[];
  catalog?: CatalogGroup[];
  customGroups?: CustomProgramGroup[];
  exercises: Exercise[];
  members: Member[];
  programs: WorkoutProgram[];
  readOnly?: boolean;
}) {
  const [selectedProgram, setSelectedProgram] = useState<WorkoutProgram | null>(null);
  const [selectedProgramContext, setSelectedProgramContext] = useState<ProgramContext | null>(null);
  const [editProgram, setEditProgram] = useState<WorkoutProgram | null>(null);
  const [showPredefined, setShowPredefined] = useState(readOnly);
  const editDirtyRef = useRef(false); // track unsaved edits in the edit dialog
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const exerciseNames = useMemo(() => exerciseNameById(exercises), [exercises]);
  const predefinedPrograms = programs.filter((p) => p.source !== "gym");
  const customPrograms = programs.filter((p) => p.source === "gym");
  const visibleCustomGroups = customGroups.filter((group) => group.programs.length > 0);
  const totalCustomPrograms = visibleCustomGroups.length
    ? visibleCustomGroups.reduce((count, group) => count + group.programs.length, 0)
    : customPrograms.length;
  const deleteProgramPool = visibleCustomGroups.length
    ? visibleCustomGroups.flatMap((group) => group.programs)
    : customPrograms;
  const activeContext = selectedProgramContext ?? { assignments, exercises, members };

  // ESC closes whichever dialog is open; edit dialog warns if dirty
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (editProgram) {
        if (editDirtyRef.current) {
          if (!window.confirm("You have unsaved changes. Discard and close?")) return;
        }
        setEditProgram(null);
        editDirtyRef.current = false;
      } else if (selectedProgram) {
        setSelectedProgram(null);
        setSelectedProgramContext(null);
      } else if (confirmDeleteId) {
        setConfirmDeleteId(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editProgram, selectedProgram, confirmDeleteId]);

  function closeEditDialog() {
    if (editDirtyRef.current) {
      if (!window.confirm("You have unsaved changes. Discard and close?")) return;
    }
    setEditProgram(null);
    editDirtyRef.current = false;
  }

  function viewProgram(program: WorkoutProgram, context?: ProgramContext) {
    setSelectedProgram(program);
    setSelectedProgramContext(context ?? null);
    setEditProgram(null);
  }

  function handleDelete(programId: string, programTitle: string) {
    startDelete(async () => {
      try {
        const result = await callArchiveCustomProgram({ programId });
        setDeleteStatus(result.data.message);
        setConfirmDeleteId(null);
      } catch {
        const fd = new FormData();
        fd.set("programId", programId);
        fd.set("programTitle", programTitle);
        const result = await deleteCustomWorkoutProgram(initialFormActionState, fd);
        setDeleteStatus(result.message);
        setConfirmDeleteId(null);
      }
    });
  }

  function renderCustomSection() {
    return (
      <div style={{ marginBottom: 16 }}>
        <div className="adm-card__head" style={{ padding: "14px 0 10px" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text)" }}>Custom gym plans</h2>
            <p style={{ fontSize: 12, color: "var(--text-soft)", margin: "3px 0 0" }}>
              {readOnly
                ? "Gym-created plans available in your workspace."
                : "Programs created by gyms, grouped by workspace so defaults never mix with custom plans."}
            </p>
          </div>
          <span className="adm-tag adm-tag--neutral">
            {totalCustomPrograms} plan{totalCustomPrograms === 1 ? "" : "s"}
          </span>
        </div>
        {deleteStatus && (
          <p style={{ padding: "6px 0", fontSize: 12, color: "var(--brand)", fontWeight: 600 }}>
            {deleteStatus}
          </p>
        )}
        {visibleCustomGroups.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {visibleCustomGroups.map((group) => {
              const groupExerciseNames = exerciseNameById(group.exercises);
              const groupContext = {
                assignments: group.assignments,
                exercises: group.exercises,
                members: group.members,
              };
              return (
                <div key={group.gymId}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "var(--text)" }}>{group.gymName}</h3>
                    <span style={{ fontSize: 11, color: "var(--text-soft)" }}>
                      {group.programs.length} custom plan{group.programs.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="adm-card" style={{ overflow: "hidden" }}>
                    <div className="adm-prog-head" role="rowgroup">
                      <span>Program</span><span>Structure</span><span>Level</span>
                      <span>Assigned</span><span>Type</span><span />
                    </div>
                    {group.programs.map((program) => (
                      <ProgramRow
                        assignedNames={assignmentNames(program, group.assignments, group.members)}
                        exerciseNames={groupExerciseNames}
                        isCustom
                        key={`${group.gymId}-${program.id}`}
                        onDelete={readOnly ? undefined : () => setConfirmDeleteId(program.id)}
                        onEdit={readOnly ? undefined : () => { setEditProgram(program); setSelectedProgram(null); setSelectedProgramContext(null); }}
                        onView={() => viewProgram(program, groupContext)}
                        program={program}
                        showAssignments={!readOnly}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : customPrograms.length ? (
          <div className="adm-card" style={{ overflow: "hidden" }}>
            <div className="adm-prog-head" role="rowgroup">
              <span>Program</span><span>Structure</span><span>Level</span>
              <span>Assigned</span><span>Type</span><span />
            </div>
            {customPrograms.map((program) => (
              <ProgramRow
                assignedNames={assignmentNames(program, assignments, members)}
                exerciseNames={exerciseNames}
                isCustom
                key={program.id}
                onDelete={readOnly ? undefined : () => setConfirmDeleteId(program.id)}
                onEdit={readOnly ? undefined : () => { setEditProgram(program); setSelectedProgram(null); setSelectedProgramContext(null); }}
                onView={() => viewProgram(program)}
                program={program}
                showAssignments={!readOnly}
              />
            ))}
          </div>
        ) : (
          <div className="adm-card">
            <div className="adm-empty">
              {readOnly
                ? "No gym-created custom plans are available yet."
                : "No gym-created custom plans saved yet. Owners can create gym-specific plans from their programs page."}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderPredefinedSection() {
    return (
      <div style={{ marginBottom: 16 }}>
        <div className="adm-card__head" style={{ padding: "14px 0 10px" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text)" }}>Predefined workout plans</h2>
            <p style={{ fontSize: 12, color: "var(--text-soft)", margin: "3px 0 0" }}>
              Built-in FitSplit splits such as PPL, Bro Split, and Arnold Split. These are read-only reference plans.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="adm-tag adm-tag--neutral">{predefinedPrograms.length} plans</span>
            <button
              type="button"
              className="adm-btn adm-btn--ghost adm-btn--sm"
              onClick={() => setShowPredefined((v) => !v)}
            >
              {showPredefined ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {showPredefined && (
          <div className="adm-card" style={{ overflow: "hidden" }}>
            <div className="adm-prog-head" role="rowgroup">
              <span>Program</span><span>Structure</span><span>Level</span>
              <span>Assigned</span><span>Type</span><span />
            </div>
            {predefinedPrograms.map((program) => (
              <ProgramRow
                assignedNames={assignmentNames(program, assignments, members)}
                exerciseNames={exerciseNames}
                isCustom={false}
                key={program.id}
                onView={() => viewProgram(program)}
                program={program}
                showAssignments={!readOnly}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {/* Custom plans at top — what the owner built */}
        {renderCustomSection()}
        {/* Predefined plans collapsed by default */}
        {renderPredefinedSection()}
      </div>

      {/* View full plan dialog */}
      {selectedProgram && !editProgram ? (
        <div className="dialog-backdrop" role="presentation">
          <div
            aria-modal="true"
            className="program-dialog adm-card"
            role="dialog"
            style={{ maxWidth: 740, width: "90vw", maxHeight: "85vh", overflowY: "auto", position: "relative" }}
          >
            <div className="adm-card__head" style={{ position: "sticky", top: 0, background: "var(--bg-elevated)", zIndex: 1 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{selectedProgram.title}</h3>
                <p style={{ fontSize: 12, color: "var(--text-soft)", margin: "3px 0 0" }}>
                  {trainingDays(selectedProgram).length} training days · {exerciseCount(selectedProgram)} exercises
                  {!readOnly
                    ? ` · ${assignmentNames(selectedProgram, activeContext.assignments, activeContext.members).length} assigned members`
                    : ""}
                </p>
              </div>
              <button
                aria-label="Close program"
                className="adm-btn adm-btn--ghost adm-btn--sm"
                onClick={() => { setSelectedProgram(null); setSelectedProgramContext(null); }}
                type="button"
              >
                ✕ Close
              </button>
            </div>
            <div className="adm-card__body">
              <p style={{ fontSize: 13, color: "var(--text-soft)", marginBottom: 12 }}>{selectedProgram.description}</p>
              {selectedProgram.bestFor?.length || selectedProgram.selectionHints ? (
                <div className="program-selection-guide">
                  <div>
                    <span>Best for</span>
                    <strong>{selectedProgram.bestFor?.join(" / ") ?? selectedProgram.goal}</strong>
                  </div>
                  <div>
                    <span>Training rhythm</span>
                    <strong>{selectedProgram.selectionHints?.frequency ?? `${selectedProgram.daysPerWeek} days per week`}</strong>
                  </div>
                  <div>
                    <span>Weekly variety</span>
                    <strong>
                      {selectedProgram.weeklyVariations?.length
                        ? `${selectedProgram.weeklyVariations.length} rotating exercise weeks`
                        : "Fixed weekly schedule"}
                    </strong>
                  </div>
                </div>
              ) : null}
              <WeeklyProgramSchedule exercises={activeContext.exercises} program={selectedProgram} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit program dialog — ep-modal shell (scoped dark tokens, fully opaque) */}
      {editProgram && catalog.length > 0 ? (
        <div
          role="presentation"
          style={{
            position: "fixed", inset: 0, zIndex: 9900,
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24, overflow: "hidden",
          }}
          /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
          onKeyDown={() => { editDirtyRef.current = true; }}
          onChange={() => { editDirtyRef.current = true; }}
        >
          <CustomPlanBuilder
            catalog={catalog}
            initialProgram={editProgram}
            onSuccess={() => { setEditProgram(null); editDirtyRef.current = false; }}
            onCancel={closeEditDialog}
          />
        </div>
      ) : null}

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <div className="dialog-backdrop" role="presentation">
          <div
            aria-modal="true"
            className="confirm-dialog adm-card"
            role="dialog"
            style={{ maxWidth: 420, width: "90vw", position: "relative" }}
          >
            <div className="adm-card__head">
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Delete this plan?</h3>
            </div>
            <div className="adm-card__body">
              <p style={{ color: "var(--text-soft)", fontSize: 13, marginBottom: 16 }}>
                This will permanently remove the plan. Members currently assigned to it will lose their assignment.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  className="adm-btn adm-btn--ghost"
                  onClick={() => setConfirmDeleteId(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="adm-btn"
                  disabled={isDeleting}
                  onClick={() => {
                    const program = deleteProgramPool.find((p) => p.id === confirmDeleteId);
                    if (program) handleDelete(program.id, program.title);
                  }}
                  style={{ background: "var(--danger)", color: "#fff" }}
                  type="button"
                >
                  {isDeleting ? "Deleting..." : "Delete plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
