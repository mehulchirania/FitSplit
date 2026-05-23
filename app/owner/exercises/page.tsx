import { Breadcrumb } from "@/components/breadcrumb";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { CloseDetailsButton } from "@/components/close-details-button";
import { CatalogVideoPreview } from "@/components/catalog-video-preview";
import { ExerciseThumbnailPreview } from "@/components/exercise-thumbnail-preview";
import { ExerciseEditForm } from "@/components/exercise-edit-form";
import { ChevronDown, Dumbbell } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import {
  createCatalogExercise,
  resetExerciseVideos,
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
          <h1>Exercise library</h1>
          <p>
            Owner-managed catalog used to build all workout programs. Members only see exercises
            that appear in their assigned plan.
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
              With tutorial
              <strong>{exercises.filter((e) => e.videoUrl).length}</strong>
            </span>
            <span>
              With gym demo
              <strong>{exercises.filter((e) => e.gymVideoUrl).length}</strong>
            </span>
          </div>
        </aside>
      </section>

      {/* ── FitSplit Catalog (predefined) ─────────────────────────── */}
      <CatalogSection
        exercises={predefined}
        exerciseCatalogByMuscle={exerciseCatalogByMuscle.map((g) => ({
          ...g,
          exercises: g.exercises.filter((e) => e.source !== "custom"),
        })).filter((g) => g.exercises.length > 0)}
        sectionLabel="FitSplit catalog"
        sectionCount={predefined.length}
        isDefaultSection
      />

      {/* ── Custom exercises ───────────────────────────────────────── */}
      {custom.length > 0 && (
        <CatalogSection
          exercises={custom}
          exerciseCatalogByMuscle={exerciseCatalogByMuscle.map((g) => ({
            ...g,
            exercises: g.exercises.filter((e) => e.source === "custom"),
          })).filter((g) => g.exercises.length > 0)}
          sectionLabel="Custom exercises"
          sectionCount={custom.length}
        />
      )}

      {/* ── Add new exercise ───────────────────────────────────────── */}
      <section className="list-panel catalog-add-section" id="add-exercise">
        <div className="panel-title">
          <h2>Add new exercise</h2>
          <span className="status-pill status-neutral">Owner only</span>
        </div>
        <div className="notification-list">
          <ExerciseEditForm action={createCatalogExercise} isCreate />
        </div>
      </section>
    </main>
  );
}

// ── CatalogSection ──────────────────────────────────────────────────────────

function CatalogSection({
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
        {exerciseCatalogByMuscle.map((group) => (
          <details className="catalog-group-panel" key={group.muscleGroup} open>
            <summary className="catalog-group-summary">
              <div className="catalog-group-summary-inner">
                <Dumbbell className="panel-icon" />
                <span className="catalog-group-name">{group.muscleGroup}</span>
                <span className="status-pill status-neutral" style={{ marginLeft: "auto" }}>
                  {group.exercises.length}
                </span>
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
                          {exercise.equipment || <em style={{ opacity: 0.5 }}>No equipment set</em>}
                        </p>
                      </div>
                      <div className="catalog-exercise-actions">
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
                      {/* ── Main edit form ── */}
                      <ExerciseEditForm action={updateCatalogExercise} exercise={exercise} />

                      {/* ── Restore default videos ── */}
                      {isDefaultSection && (
                        <div className="exercise-restore-section">
                          <p className="exercise-restore-hint">
                            Restore both video URLs to the original seeded defaults from{" "}
                            <code>workouts.json</code>.
                          </p>
                          <div style={{ display: "flex", gap: 8 }}>
                            <ConfirmActionForm
                              action={resetExerciseVideos}
                              confirmMessage={`Reset "${exercise.name}" videos to the original seeded defaults? This will overwrite any custom video links.`}
                              confirmTitle="Restore default videos?"
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
        ))}
      </div>
    </section>
  );
}
