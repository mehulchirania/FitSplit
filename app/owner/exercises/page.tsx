import { Breadcrumb } from "@/components/breadcrumb";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { Dumbbell, Video } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { createCatalogExercise, updateCatalogExercise } from "@/lib/firebase/actions";
import { getExerciseCatalog } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

const ALL_MUSCLE_GROUPS = [
  "Back",
  "Biceps",
  "Cardio",
  "Chest",
  "Core",
  "Legs",
  "Shoulders",
  "Triceps"
];

export default async function ExerciseCatalogPage() {
  const currentUser = await requireRole(["admin", "owner"]);
  const canManageDefaultVideos = currentUser.role === "admin";
  const { exercises, catalog: exerciseCatalogByMuscle } = await getExerciseCatalog(currentUser.gymId);

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Dashboard", href: "/owner" }, { label: "Exercise Catalog" }]} />
          <h1>Exercise library</h1>
          <p>
            Owner-managed catalog used to build all workout programs. Members only see exercises that appear in their assigned plan.
          </p>
        </div>
        <aside className="summary-panel">
          <div className="panel-title">
            <h2>Catalog</h2>
            <span className="status-pill status-active">{exercises.length} exercises</span>
          </div>
          <div className="detail-window">
            <span>
              Muscle groups
              <strong>{exerciseCatalogByMuscle.length}</strong>
            </span>
            <span>
              With video
              <strong>{exercises.filter((exercise) => exercise.videoUrl).length}</strong>
            </span>
          </div>
        </aside>
      </section>

      <section className="catalog-grid">
        {exerciseCatalogByMuscle.map((group) => (
          <article className="list-panel" key={group.muscleGroup}>
            <div className="panel-title">
              <h2>
                <Dumbbell className="panel-icon" />
                {group.muscleGroup}
              </h2>
              <span className="status-pill status-neutral">
                {group.exercises.length} exercise{group.exercises.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="catalog-list">
              {group.exercises.map((exercise) => (
                <div className="catalog-exercise-entry" key={exercise.id}>
                  <details className="exercise-edit-details">
                    <summary className="catalog-exercise-row">
                      <div
                        className="catalog-exercise-thumb"
                        style={exercise.thumbnailUrl ? { backgroundImage: `url(${exercise.thumbnailUrl})` } : undefined}
                      >
                        {!exercise.thumbnailUrl ? <Dumbbell className="catalog-thumb-placeholder" /> : null}
                      </div>
                      <div className="catalog-exercise-copy">
                        <strong>{exercise.name}</strong>
                        <p>{[exercise.equipment].filter(Boolean).join(" / ")}</p>
                      </div>
                      <div className="catalog-exercise-actions">
                        {exercise.videoUrl ? (
                          <a
                            aria-label={`Open ${exercise.name} video`}
                            className="video-indicator"
                            href={exercise.videoUrl}
                            rel="noopener noreferrer"
                            target="_blank"
                            title="Open video"
                          >
                            <Video />
                          </a>
                        ) : null}
                        <span className="button button-secondary catalog-edit-toggle">
                          <span className="catalog-edit-open">Edit</span>
                          <span className="catalog-edit-close">Close edit</span>
                        </span>
                      </div>
                    </summary>
                    <div className="exercise-edit-panel">
                      <ConfirmActionForm
                        action={updateCatalogExercise}
                        confirmMessage={`Save changes to "${exercise.name}"?`}
                        confirmTitle="Update exercise?"
                        pendingLabel="Saving..."
                        submitLabel="Save changes"
                      >
                        <input name="exerciseId" type="hidden" value={exercise.id} />
                        <div className="form-grid">
                          <label>
                            Exercise name
                            <input defaultValue={exercise.name} name="name" required />
                          </label>
                          <label>
                            Muscle group
                            <select defaultValue={exercise.muscleGroup} name="muscleGroup" required>
                              {ALL_MUSCLE_GROUPS.map((muscleGroup) => (
                                <option key={muscleGroup} value={muscleGroup}>
                                  {muscleGroup}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Equipment
                            <input defaultValue={exercise.equipment} name="equipment" placeholder="e.g. Barbell, dumbbell" />
                          </label>
                          <label>
                            Thumbnail URL
                            <input defaultValue={exercise.thumbnailUrl} name="thumbnailUrl" placeholder="https://..." type="url" />
                          </label>
                          {canManageDefaultVideos ? (
                            <>
                              <label>
                                Video source
                                <select defaultValue={exercise.videoSource} name="videoSource">
                                  <option value="none">None</option>
                                  <option value="youtube">YouTube</option>
                                  <option value="vimeo">Vimeo</option>
                                </select>
                              </label>
                              <label>
                                YouTube / video URL
                                <input defaultValue={exercise.videoUrl} name="videoUrl" placeholder="https://youtube.com/watch?v=..." type="url" />
                              </label>
                            </>
                          ) : (
                            <div className="form-note">
                              <strong>Video managed by admin</strong>
                              <span>{exercise.videoUrl ? "This exercise already has a video source." : "No video source is attached yet."}</span>
                            </div>
                          )}
                        </div>
                        <label style={{ marginTop: 8 }}>
                          Coaching instructions
                          <textarea defaultValue={exercise.instructions} name="instructions" placeholder="Setup, cues, range of motion" rows={3} />
                        </label>
                      </ConfirmActionForm>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      {exerciseCatalogByMuscle.length === 0 ? (
        <div className="md-empty" style={{ marginTop: 16 }}>
          <h2>No exercises yet</h2>
          <p>Add the first exercise using the form below.</p>
        </div>
      ) : null}

      <section className="list-panel" id="add-exercise" style={{ marginTop: 20 }}>
        <div className="panel-title">
          <h2>Add new exercise</h2>
          <span className="status-pill status-neutral">Owner only</span>
        </div>
        <div className="notification-list">
          <ConfirmActionForm
            action={createCatalogExercise}
            className="form-panel"
            confirmMessage="Add this exercise to the catalog?"
            confirmTitle="Save exercise?"
            pendingLabel="Saving..."
            submitLabel="Add exercise"
          >
            <div className="form-grid">
              <label>
                Exercise name
                <input name="name" placeholder="e.g. Incline dumbbell press" required />
              </label>
              <label>
                Muscle group
                <select defaultValue="Chest" name="muscleGroup" required>
                  {ALL_MUSCLE_GROUPS.map((muscleGroup) => (
                    <option key={muscleGroup} value={muscleGroup}>
                      {muscleGroup}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Equipment
                <input name="equipment" placeholder="Dumbbells, cable, machine" />
              </label>
              <label>
                Thumbnail URL
                <input name="thumbnailUrl" placeholder="https://..." type="url" />
              </label>
              {canManageDefaultVideos ? (
                <>
                  <label>
                    Video source
                    <select defaultValue="none" name="videoSource">
                      <option value="none">None</option>
                      <option value="youtube">YouTube</option>
                      <option value="vimeo">Vimeo</option>
                    </select>
                  </label>
                  <label>
                    YouTube / video URL
                    <input name="videoUrl" placeholder="https://youtube.com/watch?v=..." type="url" />
                  </label>
                </>
              ) : (
                <div className="form-note">
                  <strong>Video managed by admin</strong>
                  <span>Admin can attach or update default exercise videos.</span>
                </div>
              )}
            </div>
            <label style={{ marginTop: 8 }}>
              Coaching instructions
              <textarea name="instructions" placeholder="Setup, tempo, range of motion, cues" rows={3} />
            </label>
          </ConfirmActionForm>
        </div>
      </section>
    </main>
  );
}
