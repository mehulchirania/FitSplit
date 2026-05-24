"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Plus, X } from "@/components/icons";
import { bookPTSession } from "@/lib/firebase/actions";
import { callAssignPTPlan } from "@/lib/firebase/functions";
import { initialFormActionState } from "@/types/action-state";
import type { Exercise, Member, WorkoutExercise } from "@/types/domain";
import { FormActionContext, FieldError } from "./form-action-context";

type PersonOption = Pick<Member, "id" | "fullName" | "username" | "staffType">;
type PlannedExercise = WorkoutExercise & { localId: string };

function toDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function defaultPlanStartDate() {
  const d = new Date();
  return toDateInput(d);
}

function personLabel(person: PersonOption) {
  const username = person.username ? ` · ${person.username}` : "";
  const staffType = person.staffType ? ` · ${person.staffType}` : "";
  return `${person.fullName}${username}${staffType}`;
}

function resolvePerson(input: string, people: PersonOption[]) {
  const query = input.trim().toLowerCase();
  return people.find((person) =>
    person.id.toLowerCase() === query ||
    person.fullName.toLowerCase() === query ||
    person.username?.toLowerCase() === query ||
    personLabel(person).toLowerCase() === query
  );
}

function nextLocalId() {
  return Math.random().toString(36).slice(2, 9);
}

export function PTBookingForm({
  gymId,
  members,
  trainers,
  exercises,
  preselectedMemberId,
  preselectedTrainerId,
  onSuccess
}: {
  gymId: string;
  members: PersonOption[];
  trainers: PersonOption[];
  exercises: Exercise[];
  preselectedMemberId?: string;
  preselectedTrainerId?: string;
  onSuccess?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState(initialFormActionState);
  const [isPending, startTransition] = useTransition();

  const initialMember = members.find((m) => m.id === preselectedMemberId);
  const initialTrainer = trainers.find((t) => t.id === preselectedTrainerId);
  const [memberSearch, setMemberSearch] = useState(initialMember ? personLabel(initialMember) : "");
  const [trainerSearch, setTrainerSearch] = useState(initialTrainer ? personLabel(initialTrainer) : "");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState(exercises[0]?.id ?? "");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8-12");
  const [exerciseNotes, setExerciseNotes] = useState("");
  const [plannedExercises, setPlannedExercises] = useState<PlannedExercise[]>([]);

  const selectedMember = resolvePerson(memberSearch, members);
  const selectedTrainer = resolvePerson(trainerSearch, trainers);
  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise] as const)),
    [exercises]
  );

  const filteredExercises = useMemo(() => {
    const query = exerciseSearch.trim().toLowerCase();
    const filtered = query
      ? exercises.filter((exercise) =>
          exercise.name.toLowerCase().includes(query) ||
          exercise.muscleGroup.toLowerCase().includes(query) ||
          exercise.equipment.toLowerCase().includes(query)
        )
      : exercises;
    return filtered.slice(0, 80);
  }, [exerciseSearch, exercises]);

  const plannedExercisesPayload = JSON.stringify(
    plannedExercises.map(({ localId: _localId, ...entry }) => entry)
  );

  function resetFormAfterSuccess() {
    formRef.current?.reset();
    setMemberSearch(initialMember ? personLabel(initialMember) : "");
    setTrainerSearch(initialTrainer ? personLabel(initialTrainer) : "");
    setExerciseSearch("");
    setSelectedExerciseId(exercises[0]?.id ?? "");
    setSets("3");
    setReps("8-12");
    setExerciseNotes("");
    setPlannedExercises([]);
    onSuccess?.();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    if (!selectedMember || !selectedTrainer || plannedExercises.length === 0) return;

    const formData = new FormData(event.currentTarget);
    const planDurationDays = Number(formData.get("planDurationDays") ?? 30);
    const planStartDate = String(formData.get("planStartDate") ?? "");
    const notes = String(formData.get("notes") ?? "").trim();
    setState(initialFormActionState);

    startTransition(async () => {
      try {
        const result = await callAssignPTPlan({
          gymId,
          memberId: selectedMember.id,
          memberName: selectedMember.fullName,
          trainerId: selectedTrainer.id,
          trainerName: selectedTrainer.fullName,
          planStartDate,
          planDurationDays,
          plannedExercises: plannedExercises.map(({ localId: _localId, ...entry }) => entry),
          notes: notes || undefined
        });
        setState({ status: "success", message: result.data.message });
        resetFormAfterSuccess();
      } catch {
        const result = await bookPTSession(initialFormActionState, formData);
        setState(result);
        if (result.status === "success") {
          resetFormAfterSuccess();
        }
      }
    });
  }

  function addExercise() {
    if (!selectedExerciseId) return;
    setPlannedExercises((current) => [
      ...current,
      {
        localId: nextLocalId(),
        exerciseId: selectedExerciseId,
        sets: Math.max(1, Number(sets) || 3),
        reps: reps.trim() || "8-12",
        notes: exerciseNotes.trim() || undefined
      }
    ]);
    setExerciseNotes("");
  }

  function updatePlannedExercise(localId: string, patch: Partial<WorkoutExercise>) {
    setPlannedExercises((current) =>
      current.map((entry) => (entry.localId === localId ? { ...entry, ...patch } : entry))
    );
  }

  return (
    <FormActionContext.Provider value={state}>
      <form className="pt-booking-form" onSubmit={handleSubmit} ref={formRef}>
        <input name="gymId" type="hidden" value={gymId} />
        <input name="memberId" type="hidden" value={selectedMember?.id ?? ""} />
        <input name="memberName" type="hidden" value={selectedMember?.fullName ?? ""} />
        <input name="trainerId" type="hidden" value={selectedTrainer?.id ?? ""} />
        <input name="trainerName" type="hidden" value={selectedTrainer?.fullName ?? ""} />
        <input name="plannedExercises" type="hidden" value={plannedExercisesPayload} />

        <div className="pt-assignment-grid">
        <label>
          Member
          <input
            autoComplete="off"
            list="pt-member-options"
            name="memberSearch"
            onChange={(event) => setMemberSearch(event.target.value)}
            placeholder="Search member by name or username"
            required
            value={memberSearch}
          />
          <datalist id="pt-member-options">
            {members.map((member) => (
              <option key={member.id} value={personLabel(member)} />
            ))}
          </datalist>
          {memberSearch && !selectedMember && (
            <span className="pt-field-hint is-error">Choose a valid member from the list.</span>
          )}
        </label>

        <label>
          Trainer / owner
          <input
            autoComplete="off"
            list="pt-trainer-options"
            name="trainerSearch"
            onChange={(event) => setTrainerSearch(event.target.value)}
            placeholder="Search trainer or owner"
            required
            value={trainerSearch}
          />
          <datalist id="pt-trainer-options">
            {trainers.map((trainer) => (
              <option key={trainer.id} value={personLabel(trainer)} />
            ))}
          </datalist>
          {trainerSearch && !selectedTrainer && (
            <span className="pt-field-hint is-error">Choose a valid trainer or owner from the list.</span>
          )}
        </label>

        <label>
          PT starts
          <input defaultValue={defaultPlanStartDate()} name="planStartDate" required type="date" />
        </label>

        <label>
          Plan duration
          <input defaultValue="30" inputMode="numeric" min="1" max="365" name="planDurationDays" required type="number" />
          <span className="pt-field-hint">Default is 30 days. Change it for shorter or longer PT packages.</span>
        </label>
      </div>

      <div className="pt-plan-builder">
        <div className="pt-plan-builder-header">
          <div>
            <h3>PT plan exercises</h3>
            <p>This is separate from the member&apos;s normal assigned workout program.</p>
          </div>
          <span className="status-pill status-neutral">
            {plannedExercises.length} planned
          </span>
        </div>

        <div className="pt-exercise-picker">
          <label>
            Search exercise
            <input
              autoComplete="off"
              onChange={(event) => setExerciseSearch(event.target.value)}
              placeholder="Search by exercise, muscle, equipment"
              value={exerciseSearch}
            />
          </label>
          <label>
            Exercise
            <select
              onChange={(event) => setSelectedExerciseId(event.target.value)}
              value={selectedExerciseId}
            >
              {filteredExercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name} · {exercise.muscleGroup}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sets
            <input
              inputMode="numeric"
              min="1"
              onChange={(event) => setSets(event.target.value)}
              type="number"
              value={sets}
            />
          </label>
          <label>
            Reps
            <input
              onChange={(event) => setReps(event.target.value)}
              placeholder="8-12"
              value={reps}
            />
          </label>
          <label className="form-grid-full">
            Exercise notes <span className="optional-label">(optional)</span>
            <input
              maxLength={160}
              onChange={(event) => setExerciseNotes(event.target.value)}
              placeholder="Tempo, range limits, cues"
              value={exerciseNotes}
            />
          </label>
          <button className="button button-secondary" onClick={addExercise} type="button">
            <Plus /> Add exercise
          </button>
        </div>

        {plannedExercises.length > 0 ? (
          <div className="pt-planned-list">
            {plannedExercises.map((entry) => {
              const exercise = exerciseById.get(entry.exerciseId);
              return (
                <article className="pt-planned-row" key={entry.localId}>
                  <div>
                    <strong>{exercise?.name ?? entry.exerciseId}</strong>
                    <span>{exercise?.muscleGroup ?? "Exercise"}</span>
                  </div>
                  <input
                    aria-label="Sets"
                    inputMode="numeric"
                    min="1"
                    onChange={(event) =>
                      updatePlannedExercise(entry.localId, { sets: Number(event.target.value) || 1 })
                    }
                    type="number"
                    value={entry.sets ?? 3}
                  />
                  <input
                    aria-label="Reps"
                    onChange={(event) =>
                      updatePlannedExercise(entry.localId, { reps: event.target.value })
                    }
                    value={entry.reps ?? "8-12"}
                  />
                  <button
                    aria-label="Remove exercise"
                    className="button button-secondary icon-button"
                    onClick={() =>
                      setPlannedExercises((current) =>
                        current.filter((item) => item.localId !== entry.localId)
                      )
                    }
                    type="button"
                  >
                    <X />
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="pt-empty-plan">Add at least one exercise to assign a PT plan.</p>
        )}
      </div>

      <label className="form-grid-full">
        PT notes / goals <span className="optional-label">(optional)</span>
        <textarea
          maxLength={400}
          name="notes"
          placeholder="e.g. 30-day lower body strength block. Member has mild knee pain, avoid deep squat depth."
          rows={2}
        />
      </label>

      {state.status === "error" && state.message && (
        <p className="form-message form-message-error" role="alert">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="form-message form-message-success" role="status">PT plan assigned successfully.</p>
      )}

        <div className="form-actions">
          <button
            className="button button-primary"
            disabled={isPending || !selectedMember || !selectedTrainer || plannedExercises.length === 0}
            type="submit"
          >
            {isPending ? "Assigning..." : "Assign PT plan"}
          </button>
        </div>
      </form>
    </FormActionContext.Provider>
  );
}
