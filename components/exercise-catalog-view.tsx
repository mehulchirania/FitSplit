"use client";

import { useState, useMemo, useActionState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "@/components/icons";
import { ExerciseEditForm } from "@/components/exercise-edit-form";
import { TutorialToggleButton } from "@/components/tutorial-toggle";
import { ExerciseThumbnailPreview } from "@/components/exercise-thumbnail-preview";
import { setExerciseTutorialVisibility, setGymExerciseVideo, updateCatalogExercise } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { FormActionState } from "@/types/action-state";
import type { Exercise } from "@/types/domain";
import { useRouter } from "next/navigation";

type FormAction = (prev: FormActionState, formData: FormData) => Promise<FormActionState>;

function GymVideoInlineForm({ exercise }: { exercise: Exercise }) {
  const [state, formAction, isPending] = useActionState(setGymExerciseVideo, initialFormActionState);
  const router = useRouter();
  const [url, setUrl] = useState(exercise.gymVideoUrl || "");
  const hasChanged = url !== (exercise.gymVideoUrl || "");

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [state.status, router]);

  return (
    <form action={formAction} style={{ display: "flex", gap: "8px", alignItems: "center", margin: 0 }}>
      <input type="hidden" name="exerciseId" value={exercise.id} />
      <input
        type="url"
        name="gymVideoUrl"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        className="bml-search-input"
        style={{ width: "160px", padding: "6px 10px", fontSize: "0.8rem", height: "32px", margin: 0 }}
      />
      {hasChanged && (
        <button
          type="submit"
          disabled={isPending}
          className="button button-primary"
          style={{ padding: "4px 10px", minHeight: "32px", fontSize: "0.8rem", whiteSpace: "nowrap" }}
        >
          Save
        </button>
      )}
    </form>
  );
}

interface Props {
  exercises: Exercise[];
  createAction: FormAction;
}

export function ExerciseCatalogView({ exercises, createAction }: Props) {
  const [activeMuscleGroup, setActiveMuscleGroup] = useState("All");
  const [activeSource, setActiveSource] = useState("All");
  const [activeVideo, setActiveVideo] = useState("All");
  const [search, setSearch] = useState("");

  const muscleGroups = useMemo(() => {
    const groups = new Set(exercises.map(e => e.muscleGroup));
    return ["All", ...Array.from(groups).sort()];
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      if (activeMuscleGroup !== "All" && ex.muscleGroup !== activeMuscleGroup) return false;
      if (activeSource === "FitSplit" && ex.source !== "predefined") return false;
      if (activeSource === "Custom" && ex.source !== "custom") return false;
      if (activeVideo === "Has Gym Video" && !ex.gymVideoUrl) return false;
      if (activeVideo === "No Gym Video" && ex.gymVideoUrl) return false;
      if (search) {
        const query = search.toLowerCase();
        if (!ex.name.toLowerCase().includes(query) && !ex.equipment?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [exercises, activeMuscleGroup, activeSource, activeVideo, search]);

  return (
    <div className="catalog-view-container bml-root" style={{ marginTop: "24px" }}>
      <div className="bml-action-bar">
        <span className="bml-count">{filteredExercises.length} exercises</span>
        
        <input
          type="text"
          className="bml-search-input"
          placeholder="Search catalog..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "200px" }}
        />

        <select
          className="bml-program-select"
          value={activeMuscleGroup}
          onChange={(e) => setActiveMuscleGroup(e.target.value)}
          style={{ minWidth: "140px" }}
        >
          {muscleGroups.map(mg => <option key={mg} value={mg}>{mg === "All" ? "All Muscle Groups" : mg}</option>)}
        </select>

        <select
          className="bml-program-select"
          value={activeSource}
          onChange={(e) => setActiveSource(e.target.value)}
          style={{ minWidth: "120px" }}
        >
          <option value="All">All Sources</option>
          <option value="FitSplit">FitSplit Catalog</option>
          <option value="Custom">Custom Only</option>
        </select>

        <select
          className="bml-program-select"
          value={activeVideo}
          onChange={(e) => setActiveVideo(e.target.value)}
          style={{ minWidth: "140px" }}
        >
          <option value="All">All Video Status</option>
          <option value="Has Gym Video">Has Gym Video</option>
          <option value="No Gym Video">No Gym Video</option>
        </select>

        <div style={{ marginLeft: "auto" }}>
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button className="button button-primary bml-btn" style={{ display: "flex", gap: "6px" }}>
                <Plus width={16} height={16} /> Add Custom Exercise
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="profile-modal-backdrop" />
              <Dialog.Content className="profile-modal">
                <div className="profile-modal-header" style={{ marginBottom: "16px" }}>
                  <Dialog.Title className="profile-modal-title">Add Custom Exercise</Dialog.Title>
                  <Dialog.Close className="icon-button neutral-icon-button" aria-label="Close">
                    <X />
                  </Dialog.Close>
                </div>
                <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "8px" }}>
                  <ExerciseEditForm action={createAction} isCreate isOwner />
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>

      <div className="bml-table-container">
        <table className="bml-table">
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Muscle Group</th>
              <th>Source</th>
              <th>Tutorial Visibility</th>
              <th>Gym Video URL</th>
              <th style={{ width: "80px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExercises.map((exercise) => (
              <tr className="bml-tr" key={exercise.id}>
                <td className="bml-td-member">
                  {/* Using bml-avatar class for sizing, but overriding border-radius for exercise shape */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "44px", height: "44px" }}>
                       <ExerciseThumbnailPreview 
                        alt={exercise.name} 
                        thumbnailUrl={exercise.thumbnailUrl} 
                        className="catalog-exercise-thumb"
                      />
                    </div>
                    <div className="bml-member-info">
                      <strong className="bml-member-name">{exercise.name}</strong>
                      {exercise.equipment && <span className="bml-member-meta">{exercise.equipment}</span>}
                    </div>
                  </div>
                </td>
                <td>
                  <span className="status-pill status-neutral">{exercise.muscleGroup}</span>
                </td>
                <td>
                  {exercise.source === "predefined" ? (
                    <span className="status-pill" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>FitSplit</span>
                  ) : (
                    <span className="status-pill" style={{ background: "var(--bg-muted)", color: "var(--text-soft)" }}>Custom</span>
                  )}
                </td>
                <td>
                  <TutorialToggleButton
                    action={setExerciseTutorialVisibility}
                    exerciseId={exercise.id}
                    showTutorial={exercise.showTutorial !== false}
                  />
                </td>
                <td>
                  <GymVideoInlineForm exercise={exercise} />
                </td>
                <td>
                  {exercise.source === "custom" && (
                    <Dialog.Root>
                      <Dialog.Trigger asChild>
                        <button className="button button-secondary bml-btn">Edit</button>
                      </Dialog.Trigger>
                      <Dialog.Portal>
                        <Dialog.Overlay className="profile-modal-backdrop" />
                        <Dialog.Content className="profile-modal">
                          <div className="profile-modal-header" style={{ marginBottom: "16px" }}>
                            <Dialog.Title className="profile-modal-title">Edit Custom Exercise</Dialog.Title>
                            <Dialog.Close className="icon-button neutral-icon-button" aria-label="Close">
                              <X />
                            </Dialog.Close>
                          </div>
                          <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "8px" }}>
                            <ExerciseEditForm action={updateCatalogExercise} exercise={exercise} isOwner />
                          </div>
                        </Dialog.Content>
                      </Dialog.Portal>
                    </Dialog.Root>
                  )}
                </td>
              </tr>
            ))}
            {filteredExercises.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="bml-empty">No exercises found matching filters.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
