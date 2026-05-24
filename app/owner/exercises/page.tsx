import { Breadcrumb } from "@/components/breadcrumb";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { CloseDetailsButton } from "@/components/close-details-button";
import { CatalogVideoPreview } from "@/components/catalog-video-preview";
import { ExerciseThumbnailPreview } from "@/components/exercise-thumbnail-preview";
import { ExerciseEditForm } from "@/components/exercise-edit-form";
import { TutorialToggleButton, MuscleGroupTutorialToggle } from "@/components/tutorial-toggle";
import { ChevronDown, Dumbbell } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import {
  createCatalogExercise,
  resetExerciseVideos,
  setExerciseTutorialVisibility,
  setMuscleGroupTutorialVisibility,
  updateCatalogExercise,
} from "@/lib/firebase/actions";
import { getExerciseCatalog } from "@/lib/firebase/read-models";
import type { Exercise } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function ExerciseCatalogPage() {
  const currentUser = await requireRole(["admin", "owner"]);
  const { exercises, catalog: exerciseCatalogByMuscle } = await getExerciseCatalog(
    currentUser.gymId
  );

  const predefined = exercises.filter((e) => e.source !== "custom");
  const custom = exercises.filter((e) => e.source === "custom");

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb
            crumbs={[{ label: "Dashboard", href: "/owner" }, { label: "Exercise Catalog" }]}
          />
          <h1>Exercise Catalog</h1>
          <p>
            Manage your gym&apos;s video demos and control which tutorial videos your members see.
            Tutorial videos are provided by FitSplit — use the toggles to show or hide them per exercise.
          </p>
        </div>
        <aside className="summary-panel">
          <div className="panel-title">
            <h2>Catalog</h2>
            <span className="status-pill status-active">{exercises.length} exercises</span>
          </div>
          <div className="detail-window">
            <span>
              FitSplit defaults
              <strong>{predefined.length}</strong>
            </span>
            <span>
              Custom
              <strong>{custom.length}</strong>
            </span>
            <span>
              Tutorials visible
              <strong>{exercises.filter((e) => e.showTutorial !== false).length}</strong>
            </span>
            <span>
              Gym videos set
              <strong>{exercises.filter((e) => e.gymVideoUrl).length}</strong>
            </span>
          </div>
        </aside>
      </section>

      {/* ── FitSplit Catalog (predefined) ─────────────────────────── */}
      <OwnerCatalogSection
        exercises={predefined}
        exerciseCatalogByMuscle={exerciseCatalogByMuscle
          .map((g) => ({
            ...g,
            exercises: g.exercises.filter((e) => e.source !== "custom"),
          }))
          .filter((g) => g.exercises.length > 0)}
        isDefaultSection
        sectionCount={predefined.length}
        sectionLabel="FitSplit catalog"
      />

      {/* ── Custom exercises ──────────────���────────────────────────── */}
      {custom.length > 0 && (
        <OwnerCatalogSection
          exercises={custom}
          exerciseCatalogByMuscle={exerciseCatalogByMuscle
            .map((g) => ({
              ...g,
              exercises: g.exercises.filter((e) => e.source === "custom"),
            }))
            .filter((g) => g.exercises.length > 0)}
          sectionCount={custom.length}
          sectionLabel="Custom exercises"
        />
      )}

      {/* ── Add new exercise ───────────────────────────────────────── */}
      <section className="list-panel catalog-add-section" id="add-exercise">
        <div className="panel-title">
          <h2>Add new exercise</h2>
        </div>
        <div className="notification-list">
          <ExerciseEditForm action={createCatalogExercise} isCreate isOwner />
        </div>
      </section>
    </main>
  );
}

// ── OwnerCatalogSection ─────────────────────���───────────────────────────────

function OwnerCatalogSection({
  exercises: _exercises,
  exerciseCatalogByMuscle,
  isDefaultSection = false,
  sectionCount,
  sectionLabel,
}: {
  exercises: Exercise[];
  exerciseCatalogByMuscle: Array<{ muscleGroup: string; exercises: Exercise[] }>;
  isDefaultSection?: boolean;
  sectionCount: number;
  sectionLabel: string;
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
                  {/* Master tutorial toggle for this muscle group */}
                  <MuscleGroupTutorialToggle
                    action={setMuscleGroupTutorialVisibility}
                    allOn={allTutorialsOn}
                    exerciseIds={exerciseIds}
                  />
                  <ChevronDown className="catalog-group-chevron" />
                </div>
              </summary>

              <div className="catalog-list">
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
                          {/* Per-exercise tutorial toggle */}
                          <TutorialToggleButton
                            action={setExerciseTutorialVisibility}
                            exerciseId={exercise.id}
                            showTutorial={exercise.showTutorial !== false}
                          />
                          {/* Gym video preview (if set) */}
                          {exercise.gymVideoUrl && (
                            <CatalogVideoPreview
                              exerciseName={exercise.name}
                              gymVideoUrl={exercise.gymVideoUrl}
                              muscleGroup={exercise.muscleGroup}
                              videoUrl=""
                            />
                          )}
                          <span className="button button-secondary catalog-edit-toggle">
                            <span className="catalog-edit-open">Edit</span>
                            <span className="catalog-edit-close">Close</span>
                          </span>
                        </div>
                      </summary>

                      <div className="exercise-edit-panel">
                        {/* ── Owner edit form (gym video + basic info only) ── */}
                        <ExerciseEditForm
                          action={updateCatalogExercise}
                          exercise={exercise}
                          isOwner
                        />

                        {/* ── Restore default videos (predefined only) ── */}
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
