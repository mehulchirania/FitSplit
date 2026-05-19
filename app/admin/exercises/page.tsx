import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { CatalogVideoPreview } from "@/components/catalog-video-preview";
import { Dumbbell } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { approveCatalogExerciseRequest, createCatalogExercise, rejectCatalogExerciseRequest, resetExerciseVideos, updateCatalogExercise } from "@/lib/firebase/actions";
import { getExerciseCatalog, getGymWorkspaces, getPendingExerciseRequests } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

const ALL_MUSCLE_GROUPS = [
  "Back", "Biceps", "Cardio", "Chest", "Core", "Legs", "Shoulders", "Triceps"
];

const VIDEO_SOURCES = [
  { value: "none", label: "None" },
  { value: "youtube", label: "YouTube" },
  { value: "vimeo", label: "Vimeo" },
];

export default async function AdminExercisesPage({
  searchParams
}: {
  searchParams: Promise<{ gym?: string }>;
}) {
  await requireRole(["admin"]);

  const { gym: gymParam } = await searchParams;
  const { gyms } = await getGymWorkspaces();
  const selectedGymId = gymParam ?? gyms[0]?.id ?? "shg";
  const selectedGym = gyms.find((g) => g.id === selectedGymId) ?? gyms[0];

  const [{ exercises, catalog: exerciseCatalogByMuscle }, { requests: pendingRequests }] = await Promise.all([
    getExerciseCatalog(selectedGymId),
    getPendingExerciseRequests()
  ]);

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Admin", href: "/admin" }, { label: "Exercise Catalog" }]} />
          <h1>Exercise catalog</h1>
          <p>
            Review and edit exercise definitions, video links, and coaching notes across all gyms.
          </p>

          {/* Gym selector */}
          {gyms.length > 1 && (
            <div className="quick-actions" style={{ marginTop: 16 }}>
              {gyms.map((gym) => (
                <Link
                  key={gym.id}
                  className={`button ${gym.id === selectedGymId ? "button-primary" : "button-secondary"}`}
                  href={`/admin/exercises?gym=${gym.id}`}
                >
                  {gym.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="summary-panel">
          <div className="panel-title">
            <h2>
              <Dumbbell /> {selectedGym?.name ?? "Catalog"}
            </h2>
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

      {/* ── Pending exercise requests from gym owners ── */}
      {pendingRequests.length > 0 && (
        <section className="list-panel" style={{ marginBottom: 20 }}>
          <div className="panel-title">
            <h2><Dumbbell /> Exercise requests from gyms</h2>
            <span className="status-pill status-expiring">{pendingRequests.length} pending</span>
          </div>
          <div className="notification-list">
            {pendingRequests.map((req) => (
              <article key={req.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: "0.95rem" }}>{req.name}</strong>
                    <p style={{ color: "var(--text-soft)", fontSize: "0.82rem", margin: "2px 0 0" }}>
                      {req.muscleGroup}{req.equipment ? ` · ${req.equipment}` : ""} · Requested by {req.gymName ?? req.gymId}
                    </p>
                    {req.instructions && (
                      <p style={{ color: "var(--text-soft)", fontSize: "0.82rem", marginTop: 4, fontStyle: "italic" }}>{req.instructions}</p>
                    )}
                  </div>
                  {/* One-click dismiss */}
                  <form action={async (fd: FormData) => {
                    "use server";
                    await rejectCatalogExerciseRequest(fd);
                  }}>
                    <input name="requestId" type="hidden" value={req.id} />
                    <button className="button button-secondary" style={{ fontSize: "0.78rem", padding: "4px 10px", minHeight: 28 }} type="submit">
                      Dismiss
                    </button>
                  </form>
                </div>

                {/* Editable approve form */}
                <details style={{ marginTop: 10 }}>
                  <summary className="button button-primary" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", padding: "6px 14px", listStyle: "none" }}>
                    Review &amp; Add to catalog
                  </summary>
                  <form
                    action={async (fd: FormData) => {
                      "use server";
                      await approveCatalogExerciseRequest(fd);
                    }}
                    style={{ marginTop: 10, display: "grid", gap: 10 }}
                  >
                    <input name="requestId" type="hidden" value={req.id} />
                    <div className="form-grid">
                      <label>
                        Exercise name
                        <input defaultValue={req.name} name="name" required />
                      </label>
                      <label>
                        Muscle group
                        <select defaultValue={req.muscleGroup} name="muscleGroup" required>
                          {ALL_MUSCLE_GROUPS.map((mg) => (
                            <option key={mg} value={mg}>{mg}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Equipment
                        <input defaultValue={req.equipment ?? ""} name="equipment" placeholder="e.g. Cable, Barbell" />
                      </label>
                    </div>
                    <label>
                      Coaching instructions
                      <textarea defaultValue={req.instructions ?? ""} name="instructions" placeholder="Setup, cues, range of motion" rows={2} />
                    </label>
                    <button className="button button-primary" style={{ width: "fit-content" }} type="submit">
                      Add to catalog
                    </button>
                  </form>
                </details>
              </article>
            ))}
          </div>
        </section>
      )}

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
                              {ALL_MUSCLE_GROUPS.map((mg) => (
                                <option key={mg} value={mg}>{mg}</option>
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
                            <input defaultValue={exercise.videoUrl} name="videoUrl" placeholder="https://youtube.com/shorts/..." type="url" />
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

      {exerciseCatalogByMuscle.length === 0 && (
        <div className="md-empty" style={{ marginTop: 16 }}>
          <h2>No exercises yet</h2>
          <p>Add the first exercise using the form below.</p>
        </div>
      )}

      <section className="list-panel" id="add-exercise" style={{ marginTop: 20 }}>
        <div className="panel-title">
          <h2>Add new exercise</h2>
          <span className="status-pill status-neutral">Admin</span>
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
                  {ALL_MUSCLE_GROUPS.map((mg) => (
                    <option key={mg} value={mg}>{mg}</option>
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
              <label>
                Tutorial video URL
                <input name="videoUrl" placeholder="https://youtube.com/shorts/..." type="url" />
              </label>
              <label>
                Tutorial video source
                <select defaultValue="none" name="videoSource">
                  {VIDEO_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
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
