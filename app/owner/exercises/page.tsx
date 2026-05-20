import { Breadcrumb } from "@/components/breadcrumb";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { CatalogVideoPreview } from "@/components/catalog-video-preview";
import { ExerciseThumbnailPreview } from "@/components/exercise-thumbnail-preview";
import { Dumbbell } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { createCatalogExercise, resetExerciseVideos, updateCatalogExercise } from "@/lib/firebase/actions";
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

const VIDEO_SOURCES = [
  { value: "none", label: "None" },
  { value: "youtube", label: "YouTube" },
  { value: "vimeo", label: "Vimeo" },
];

export default async function ExerciseCatalogPage() {
  const currentUser = await requireRole(["admin", "owner"]);
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
                      <ExerciseThumbnailPreview
                        alt={exercise.name}
                        className="catalog-exercise-thumb"
                        thumbnailUrl={exercise.thumbnailUrl}
                      />
                      <div className="catalog-exercise-copy">
                        <strong>{exercise.name}</strong>
                        <p>{[exercise.equipment].filter(Boolean).join(" / ")}</p>
                      </div>
                      <div className="catalog-exercise-actions">
                        {/* In-app video preview — no new tab */}
                        <CatalogVideoPreview
                          exerciseName={exercise.name}
                          gymVideoUrl={exercise.gymVideoUrl}
                          muscleGroup={exercise.muscleGroup}
                          videoUrl={exercise.videoUrl}
                        />
                        <span className="button button-secondary catalog-edit-toggle">
                          <span className="catalog-edit-open">Edit</span>
                          <span className="catalog-edit-close">Close edit</span>
                        </span>
                      </div>
                    </summary>

                    <div className="exercise-edit-panel">
                      {/* ── Main edit form ── */}
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

                          {/* Tutorial video */}
                          <label>
                            Tutorial video URL
                            <input defaultValue={exercise.videoUrl} name="videoUrl" placeholder="https://youtube.com/watch?v=..." type="url" />
                          </label>
                          <label>
                            Tutorial video source
                            <select defaultValue={exercise.videoSource} name="videoSource">
                              {VIDEO_SOURCES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          </label>

                          {/* Gym demo video */}
                          <label>
                            Gym demo video URL
                            <input defaultValue={exercise.gymVideoUrl} name="gymVideoUrl" placeholder="https://youtube.com/shorts/..." type="url" />
                          </label>
                          <label>
                            Gym demo video source
                            <select defaultValue={exercise.gymVideoSource} name="gymVideoSource">
                              {VIDEO_SOURCES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <label style={{ marginTop: 8 }}>
                          Coaching instructions
                          <textarea defaultValue={exercise.instructions} name="instructions" placeholder="Setup, cues, range of motion" rows={3} />
                        </label>
                      </ConfirmActionForm>

                      {/* ── Restore to default ── */}
                      <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 14 }}>
                        <p style={{ color: "var(--text-soft)", fontSize: "0.82rem", margin: "0 0 10px" }}>
                          Restore both video URLs to the original seeded defaults from{" "}
                          <code style={{ fontSize: "0.78rem" }}>workouts.json</code>.
                        </p>
                        <ConfirmActionForm
                          action={resetExerciseVideos}
                          confirmMessage={`Reset "${exercise.name}" videos to the original seeded defaults? This will overwrite any custom video links.`}
                          confirmTitle="Restore default videos?"
                          pendingLabel="Restoring..."
                          submitClassName="button button-secondary"
                          submitLabel="Restore to default"
                        >
                          <input name="exerciseId" type="hidden" value={exercise.id} />
                          <input name="exerciseName" type="hidden" value={exercise.name} />
                        </ConfirmActionForm>
                      </div>
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
              {/* Tutorial video */}
              <label>
                Tutorial video URL
                <input name="videoUrl" placeholder="https://youtube.com/watch?v=..." type="url" />
              </label>
              <label>
                Tutorial video source
                <select defaultValue="none" name="videoSource">
                  {VIDEO_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
              {/* Gym demo video */}
              <label>
                Gym demo video URL
                <input name="gymVideoUrl" placeholder="https://youtube.com/shorts/..." type="url" />
              </label>
              <label>
                Gym demo video source
                <select defaultValue="none" name="gymVideoSource">
                  {VIDEO_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
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
