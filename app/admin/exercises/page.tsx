/* eslint-disable @typescript-eslint/no-unused-vars */
import { Breadcrumb } from "@/components/breadcrumb";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { CloseDetailsButton } from "@/components/close-details-button";
import { CatalogVideoPreview } from "@/components/catalog-video-preview";
import { ExerciseThumbnailPreview } from "@/components/exercise-thumbnail-preview";
import { ExerciseEditForm } from "@/components/exercise-edit-form";
import { GymSelector } from "@/components/gym-selector";
import { ChevronDown, Dumbbell } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  approveCatalogExerciseRequest,
  createCatalogExercise,
  rejectCatalogExerciseRequest,
  resetExerciseVideos,
  updateCatalogExercise,
} from "@/lib/firebase/actions";
import {
  getExerciseCatalog,
  getGymWorkspaces,
  getPendingExerciseRequests,
} from "@/lib/firebase/read-models";
import type { Exercise } from "@/types/domain";

export const dynamic = "force-dynamic";

const ALL_MUSCLE_GROUPS = [
  "Back", "Biceps", "Cardio", "Chest", "Core", "Legs", "Shoulders", "Triceps",
];

export default async function AdminExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ gym?: string }>;
}) {
  await requireRole(["admin"]);

  const { gym: gymParam } = await searchParams;
  const { gyms } = await getGymWorkspaces();
  const selectedGymId = gymParam ?? gyms[0]?.id ?? PRIMARY_GYM_ID;
  const selectedGym = gyms.find((g) => g.id === selectedGymId) ?? gyms[0];

  const [
    selectedCatalog,
    allGymCatalogs,
    { requests: pendingRequests },
  ] = await Promise.all([
    getExerciseCatalog(selectedGymId),
    Promise.all(
      gyms.map(async (gym) => ({
        gym,
        catalog: await getExerciseCatalog(gym.id),
      }))
    ),
    getPendingExerciseRequests(),
  ]);

  const { exercises, catalog: exerciseCatalogByMuscle } = selectedCatalog;
  const predefined = exercises.filter((e) => e.source !== "custom");
  const customByGym = allGymCatalogs
    .map(({ gym, catalog }) => {
      const customExercises = catalog.exercises.filter((e) => e.source === "custom");
      return {
        gym,
        exercises: customExercises,
        grouped: catalog.catalog
          .map((g) => ({
            ...g,
            exercises: g.exercises.filter((e) => e.source === "custom"),
          }))
          .filter((g) => g.exercises.length > 0),
      };
    })
    .filter((entry) => entry.exercises.length > 0);
  const customCount = customByGym.reduce((sum, entry) => sum + entry.exercises.length, 0);

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb
            crumbs={[{ label: "Admin", href: "/admin" }, { label: "Exercise Catalog" }]}
          />
          <h1>Exercise catalog</h1>
          <p>
            Review and edit exercise definitions, video links, and coaching notes across all gyms.
          </p>

          <GymSelector gyms={gyms} pathname="/admin/exercises" selectedGymId={selectedGymId} />
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
              FitSplit defaults
              <strong>{predefined.length}</strong>
            </span>
            <span>
              Custom
              <strong>{customCount}</strong>
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
            <h2>
              <Dumbbell /> Exercise requests from gyms
            </h2>
            <span className="status-pill status-expiring">
              {pendingRequests.length} pending
            </span>
          </div>
          <div className="notification-list">
            {pendingRequests.map((req) => (
              <article
                key={req.id}
                style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "0.95rem" }}>{req.name}</strong>
                    <p
                      style={{
                        color: "var(--text-soft)",
                        fontSize: "0.82rem",
                        margin: "2px 0 0",
                      }}
                    >
                      {req.muscleGroup}
                      {req.equipment ? ` · ${req.equipment}` : ""} · Requested by{" "}
                      {req.gymName ?? req.gymId}
                    </p>
                    {req.instructions && (
                      <p
                        style={{
                          color: "var(--text-soft)",
                          fontSize: "0.82rem",
                          marginTop: 4,
                          fontStyle: "italic",
                        }}
                      >
                        {req.instructions}
                      </p>
                    )}
                  </div>
                  {/* One-click dismiss */}
                  <form
                    action={async (fd: FormData) => {
                      "use server";
                      await rejectCatalogExerciseRequest(fd);
                    }}
                  >
                    <input name="requestId" type="hidden" value={req.id} />
                    <button
                      className="button button-secondary"
                      style={{ fontSize: "0.78rem", padding: "4px 10px", minHeight: 28 }}
                      type="submit"
                    >
                      Dismiss
                    </button>
                  </form>
                </div>

                {/* Editable approve form */}
                <details style={{ marginTop: 10 }}>
                  <summary
                    className="button button-primary"
                    style={{
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.82rem",
                      padding: "6px 14px",
                      listStyle: "none",
                    }}
                  >
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
                            <option key={mg} value={mg}>
                              {mg}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Equipment
                        <input
                          defaultValue={req.equipment ?? ""}
                          name="equipment"
                          placeholder="e.g. Cable, Barbell"
                        />
                      </label>
                    </div>
                    <label>
                      Coaching instructions
                      <textarea
                        defaultValue={req.instructions ?? ""}
                        name="instructions"
                        placeholder="Setup, cues, range of motion"
                        rows={2}
                      />
                    </label>
                    <button
                      className="button button-primary"
                      style={{ width: "fit-content" }}
                      type="submit"
                    >
                      Add to catalog
                    </button>
                  </form>
                </details>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── FitSplit Catalog (predefined) ─────────────────────────── */}
      <AdminCatalogSection
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

      {/* ── Custom exercises ───────────────────────────────────────── */}
      {customByGym.length > 0 && (
        <section className="catalog-section">
          <div className="catalog-section-header">
            <div>
              <h2 className="catalog-section-title">Custom exercises by gym</h2>
              <p style={{ color: "var(--text-soft)", margin: "4px 0 0" }}>
                Gym-scoped movements stay isolated from the global FitSplit catalog.
              </p>
            </div>
            <span className="status-pill status-neutral">{customCount} custom</span>
          </div>

          {customByGym.map((entry) => (
            <AdminCatalogSection
              exercises={entry.exercises}
              exerciseCatalogByMuscle={entry.grouped}
              key={entry.gym.id}
              sectionCount={entry.exercises.length}
              sectionLabel={entry.gym.name}
            />
          ))}
        </section>
      )}

      {exerciseCatalogByMuscle.length === 0 && (
        <div className="md-empty" style={{ marginTop: 16 }}>
          <h2>No exercises yet</h2>
          <p>Add the first exercise using the form below.</p>
        </div>
      )}

      {/* ── Add new exercise ───────────────────────────────────────── */}
      <section className="list-panel catalog-add-section" id="add-exercise" style={{ marginTop: 20 }}>
        <div className="panel-title">
          <h2>Add new exercise</h2>
          <span className="status-pill status-neutral">Admin</span>
        </div>
        <div className="notification-list">
          <ExerciseEditForm action={createCatalogExercise} isCreate />
        </div>
      </section>
    </main>
  );
}

// ── AdminCatalogSection ─────────────────────────────────────────────────────

function AdminCatalogSection({
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
                          {exercise.equipment || (
                            <em style={{ opacity: 0.5 }}>No equipment set</em>
                          )}
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
