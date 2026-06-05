/* eslint-disable @typescript-eslint/no-unused-vars */
import Link from "next/link";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { CloseDetailsButton } from "@/components/close-details-button";
import { CatalogVideoPreview } from "@/components/catalog-video-preview";
import { ExerciseThumbnailPreview } from "@/components/exercise-thumbnail-preview";
import { ExerciseEditForm } from "@/components/exercise-edit-form";
import { GymSelector } from "@/components/gym-selector";
import { AdminExerciseSearch } from "@/components/admin-exercise-search";
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
  searchParams: Promise<{ gym?: string; q?: string }>;
}) {
  await requireRole(["admin"]);

  const { gym: gymParam, q = "" } = await searchParams;
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
  const qLow = q.toLowerCase();
  const predefined = exercises.filter((e) => {
    const base = e.source !== "custom";
    if (!qLow) return base;
    return base && (e.name.toLowerCase().includes(qLow) || e.muscleGroup.toLowerCase().includes(qLow));
  });
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
    <div className="odp2-scroll">
      {/* ── Header ── */}
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Admin / Exercises</div>
          <h1 className="adm-title">Exercise catalog</h1>
        </div>
        <div className="adm-head-actions">
          <GymSelector gyms={gyms} pathname="/admin/exercises" selectedGymId={selectedGymId} />
        </div>
      </div>

      <p className="adm-page-desc">
        Review and edit exercise definitions, video links, and coaching notes across all gyms.
      </p>

      {/* ── Search bar (live, client-side debounced) ── */}
      <div className="adm-filter-bar" style={{ marginBottom: 16 }}>
        <AdminExerciseSearch initialValue={q} gymParam={gymParam} />
      </div>

      {/* ── Add new exercise (collapsible, at the top) ── */}
      <details className="adm-details-panel" style={{ marginBottom: 16 }}>
        <summary className="adm-details-panel__summary">+ Add new exercise</summary>
        <div className="adm-details-panel__body">
          <ExerciseEditForm action={createCatalogExercise} isCreate />
        </div>
      </details>

      {/* ── KPI row ── */}
      <div className="adm-kpis" style={{ marginBottom: 20 }}>
        <div className="adm-kpi adm-kpi--brand">
          <small>TOTAL EXERCISES</small>
          <strong>{exercises.length}</strong>
        </div>
        <div className="adm-kpi">
          <small>FITSPLIT DEFAULTS</small>
          <strong>{predefined.length}</strong>
        </div>
        <div className="adm-kpi adm-kpi--accent">
          <small>CUSTOM (GYMS)</small>
          <strong>{customCount}</strong>
        </div>
        <div className="adm-kpi adm-kpi--warn">
          <small>PENDING REQUESTS</small>
          <strong>{pendingRequests.length}</strong>
        </div>
      </div>

      {/* ── Pending exercise requests ── */}
      {pendingRequests.length > 0 && (
        <div className="adm-card" style={{ marginBottom: 16 }}>
          <div className="adm-card__head">
            <h3>Exercise requests from gyms</h3>
            <span className="adm-inbox-tag adm-inbox-tag--warn">{pendingRequests.length} pending</span>
          </div>
          <div className="adm-card__body adm-card__body--flush">
            {pendingRequests.map((req, i) => (
              <div
                key={req.id}
                style={{
                  padding: "14px 16px",
                  borderBottom: i < pendingRequests.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{req.name}</strong>
                    <p style={{ color: "var(--text-soft)", fontSize: 11.5, margin: "2px 0 0" }}>
                      {req.muscleGroup}{req.equipment ? ` · ${req.equipment}` : ""} · Requested by {req.gymName ?? req.gymId}
                    </p>
                    {req.instructions && (
                      <p style={{ color: "var(--text-soft)", fontSize: 11.5, marginTop: 4, fontStyle: "italic" }}>
                        {req.instructions}
                      </p>
                    )}
                  </div>
                  <form action={async (fd: FormData) => { "use server"; await rejectCatalogExerciseRequest(fd); }}>
                    <input name="requestId" type="hidden" value={req.id} />
                    <button className="adm-btn adm-btn--ghost" style={{ fontSize: 11 }} type="submit">Dismiss</button>
                  </form>
                </div>
                <details className="adm-details-panel" style={{ marginTop: 10, border: "1px solid var(--border)" }}>
                  <summary className="adm-details-panel__summary">Review &amp; Add to catalog</summary>
                  <div className="adm-details-panel__body">
                    <form action={async (fd: FormData) => { "use server"; await approveCatalogExerciseRequest(fd); }} style={{ display: "grid", gap: 10 }}>
                      <input name="requestId" type="hidden" value={req.id} />
                      <div className="form-grid">
                        <label>Exercise name<input defaultValue={req.name} name="name" required /></label>
                        <label>
                          Muscle group
                          <select defaultValue={req.muscleGroup} name="muscleGroup" required>
                            {ALL_MUSCLE_GROUPS.map((mg) => <option key={mg} value={mg}>{mg}</option>)}
                          </select>
                        </label>
                        <label>Equipment<input defaultValue={req.equipment ?? ""} name="equipment" placeholder="e.g. Cable, Barbell" /></label>
                      </div>
                      <label>Coaching instructions<textarea defaultValue={req.instructions ?? ""} name="instructions" placeholder="Setup, cues, range of motion" rows={2} /></label>
                      <button className="adm-btn" style={{ width: "fit-content" }} type="submit">Add to catalog</button>
                    </form>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FitSplit Catalog ── */}
      <AdminCatalogSection
        exercises={predefined}
        exerciseCatalogByMuscle={exerciseCatalogByMuscle
          .map((g) => ({ ...g, exercises: g.exercises.filter((e) => e.source !== "custom") }))
          .filter((g) => g.exercises.length > 0)}
        filter={q}
        isDefaultSection
        sectionCount={predefined.length}
        sectionLabel="FitSplit catalog"
      />

      {/* ── Custom exercises by gym ── */}
      {customByGym.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className="adm-card__head" style={{ padding: "12px 0 8px" }}>
            <h3>Custom exercises by gym</h3>
            <span className="adm-inbox-tag adm-inbox-tag--accent">{customCount} custom</span>
          </div>
          {customByGym.map((entry) => (
            <AdminCatalogSection
              key={entry.gym.id}
              exercises={entry.exercises}
              exerciseCatalogByMuscle={entry.grouped}
              filter={q}
              sectionCount={entry.exercises.length}
              sectionLabel={entry.gym.name}
            />
          ))}
        </div>
      )}

      {exerciseCatalogByMuscle.length === 0 && (
        <div className="adm-card">
          <div className="adm-empty">No exercises yet. Use &ldquo;+ Add new exercise&rdquo; above to add the first one.</div>
        </div>
      )}
    </div>
  );
}

// ── AdminCatalogSection ───────────────────────────────────────────────────────

function AdminCatalogSection({
  exercises: _exercises,
  exerciseCatalogByMuscle,
  filter = "",
  isDefaultSection = false,
  sectionCount,
  sectionLabel,
}: {
  exercises: Exercise[];
  exerciseCatalogByMuscle: Array<{ muscleGroup: string; exercises: Exercise[] }>;
  filter?: string;
  isDefaultSection?: boolean;
  sectionCount: number;
  sectionLabel: string;
}) {
  const filterLow = filter.toLowerCase();
  const filteredGroups = filterLow
    ? exerciseCatalogByMuscle
        .map((g) => ({
          ...g,
          exercises: g.exercises.filter(
            (e) =>
              e.name.toLowerCase().includes(filterLow) ||
              e.muscleGroup.toLowerCase().includes(filterLow)
          ),
        }))
        .filter((g) => g.exercises.length > 0)
    : exerciseCatalogByMuscle;

  if (filteredGroups.length === 0) return null;

  const visibleCount = filteredGroups.reduce((sum, g) => sum + g.exercises.length, 0);

  return (
    <details className="adm-details-panel" style={{ marginBottom: 12 }} open={!isDefaultSection || !!filterLow}>
      <summary
        className="adm-details-panel__summary"
        style={{ fontWeight: 700, color: "var(--text)", fontSize: 13 }}
      >
        {sectionLabel}
        <span className="adm-inbox-tag adm-inbox-tag--ok" style={{ marginLeft: "auto", marginRight: 8 }}>
          {visibleCount} exercises
        </span>
      </summary>
      <div style={{ borderTop: "1px solid var(--border)" }}>
        {filteredGroups.map((group, gi) => (
          <details
            key={group.muscleGroup}
            open
            style={{ borderBottom: gi < filteredGroups.length - 1 ? "1px solid var(--border)" : "none" }}
          >
            <summary className="adm-ex-group-summary">
              <span className="adm-ex-group-name">{group.muscleGroup}</span>
              <span className="adm-inbox-tag adm-inbox-tag--ok" style={{ marginLeft: "auto", marginRight: 8 }}>
                {group.exercises.length}
              </span>
              <span className="adm-ex-group-chevron">▸</span>
            </summary>
            <div className="adm-ex-list">
              {group.exercises.map((exercise) => (
                <div
                  key={exercise.id}
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <details className="exercise-edit-details">
                    <summary className="adm-ex-row">
                      <ExerciseThumbnailPreview
                        alt={exercise.name}
                        className="catalog-exercise-thumb"
                        thumbnailUrl={exercise.thumbnailUrl}
                      />
                      <div className="adm-ex-row__copy">
                        <strong>{exercise.name}</strong>
                        <p>{exercise.equipment || <em style={{ opacity: 0.5 }}>No equipment set</em>}</p>
                      </div>
                      <div className="adm-ex-row__actions">
                        <CatalogVideoPreview
                          exerciseName={exercise.name}
                          gymVideoUrl={exercise.gymVideoUrl}
                          muscleGroup={exercise.muscleGroup}
                          videoUrl={exercise.videoUrl}
                        />
                        <span className="adm-btn adm-btn--ghost catalog-edit-toggle" style={{ fontSize: 11 }}>
                          <span className="catalog-edit-open">Edit</span>
                          <span className="catalog-edit-close">Close</span>
                        </span>
                      </div>
                    </summary>
                    <div className="exercise-edit-panel" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
                      <ExerciseEditForm action={updateCatalogExercise} exercise={exercise} />
                      {isDefaultSection && (
                        <div className="exercise-restore-section">
                          <p className="exercise-restore-hint">
                            Restore both video URLs to the original seeded defaults from <code>workouts.json</code>.
                          </p>
                          <div style={{ display: "flex", gap: 8 }}>
                            <ConfirmActionForm
                              action={resetExerciseVideos}
                              confirmMessage={`Reset "${exercise.name}" videos to the original seeded defaults? This will overwrite any custom video links.`}
                              confirmTitle="Restore default videos?"
                              pendingLabel="Restoring..."
                              submitClassName="adm-btn adm-btn--ghost"
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
    </details>
  );
}
