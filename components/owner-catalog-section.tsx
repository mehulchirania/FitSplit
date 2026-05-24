"use client";

import { ConfirmActionForm } from "@/components/confirm-action-form";
import { CloseDetailsButton } from "@/components/close-details-button";
import { CatalogVideoPreview } from "@/components/catalog-video-preview";
import { ExerciseThumbnailPreview } from "@/components/exercise-thumbnail-preview";
import { ExerciseEditForm } from "@/components/exercise-edit-form";
import { TutorialToggleButton, MuscleGroupTutorialToggle } from "@/components/tutorial-toggle";
import { ChevronDown, Dumbbell } from "@/components/icons";
import {
  resetExerciseVideos,
  setExerciseTutorialVisibility,
  setMuscleGroupTutorialVisibility,
  updateCatalogExercise,
} from "@/lib/firebase/actions";
import type { Exercise } from "@/types/domain";

export function OwnerCatalogSection({
  exercises: _exercises,
  exerciseCatalogByMuscle,
  isDefaultSection = false,
  sectionCount,
  sectionLabel,
  viewMode = "list"
}: {
  exercises: Exercise[];
  exerciseCatalogByMuscle: Array<{ muscleGroup: string; exercises: Exercise[] }>;
  isDefaultSection?: boolean;
  sectionCount: number;
  sectionLabel: string;
  viewMode?: "list" | "card";
}) {
  if (exerciseCatalogByMuscle.length === 0) return null;

  return (
    <section className="catalog-section">
      <div className="catalog-section-header">
        <h2 className="catalog-section-title">{sectionLabel}</h2>
        <span className="status-pill status-neutral">{sectionCount} exercises</span>
      </div>

      <div className="catalog-grid">
        {exerciseCatalogByMuscle.map((group) => {
          const allTutorialsOn = group.exercises.every((e) => e.showTutorial !== false);
          const exerciseIds = group.exercises.map((e) => e.id);

          return (
            <details className="catalog-group-panel" key={group.muscleGroup} open>
              <summary className="catalog-group-summary">
                <div className="catalog-group-summary-inner">
                  <Dumbbell className="panel-icon" />
                  <span className="catalog-group-name">{group.muscleGroup}</span>
                  <span className="status-pill status-neutral" style={{ marginLeft: "auto" }}>
                    {group.exercises.length}
                  </span>
                  <MuscleGroupTutorialToggle
                    action={setMuscleGroupTutorialVisibility}
                    allOn={allTutorialsOn}
                    exerciseIds={exerciseIds}
                  />
                  <ChevronDown className="catalog-group-chevron" />
                </div>
              </summary>

              <div className={`catalog-list ${viewMode === "card" ? "catalog-list-cards" : ""}`}>
                {group.exercises.map((exercise) => (
                  <div className="catalog-exercise-entry" key={exercise.id}>
                    <details className="exercise-edit-details">
                      <summary className="catalog-exercise-row">
                        <ExerciseThumbnailPreview
                          alt={exercise.name}
                          className="catalog-exercise-thumb"
                          thumbnailUrl={exercise.thumbnailUrl}
                        />
                        <div className="catalog-exercise-copy">
                          <strong>{exercise.name}</strong>
                          <p>
                            {exercise.equipment || (
                              <em style={{ opacity: 0.5 }}>No equipment set</em>
                            )}
                          </p>
                        </div>
                        <div className="catalog-exercise-actions">
                          <TutorialToggleButton
                            action={setExerciseTutorialVisibility}
                            exerciseId={exercise.id}
                            showTutorial={exercise.showTutorial !== false}
                          />
                          <CatalogVideoPreview
                            exerciseName={exercise.name}
                            gymVideoUrl={exercise.gymVideoUrl}
                            muscleGroup={exercise.muscleGroup}
                            videoUrl={exercise.videoUrl}
                          />
                          <span className="button button-secondary catalog-edit-toggle">
                            <span className="catalog-edit-open">Edit</span>
                            <span className="catalog-edit-close">Close</span>
                          </span>
                        </div>
                      </summary>

                      <div className="exercise-edit-panel">
                        <ExerciseEditForm
                          action={updateCatalogExercise}
                          exercise={exercise}
                          isOwner
                        />

                        {isDefaultSection && (
                          <div className="exercise-restore-section">
                            <p className="exercise-restore-hint">
                              Clear your gym video and restore the FitSplit defaults from{" "}
                              <code>workouts.json</code>.
                            </p>
                            <div style={{ display: "flex", gap: 8 }}>
                              <ConfirmActionForm
                                action={resetExerciseVideos}
                                confirmMessage={`Clear gym video for "${exercise.name}" and restore seeded defaults?`}
                                confirmTitle="Restore defaults?"
                                pendingLabel="Restoring..."
                                submitClassName="button button-secondary"
                                submitLabel="Restore defaults"
                              >
                                <input name="exerciseId" type="hidden" value={exercise.id} />
                                <input name="exerciseName" type="hidden" value={exercise.name} />
                              </ConfirmActionForm>
                              <CloseDetailsButton label="Cancel" />
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
