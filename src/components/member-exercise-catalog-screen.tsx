import { Dumbbell } from "@/components/icons";
import { CatalogVideoPreview } from "@/components/catalog-video-preview";
import { ExerciseThumbnailPreview } from "@/components/exercise-thumbnail-preview";
import type { Exercise, MuscleGroup } from "@/types/domain";

/**
 * Exercise catalog grid, grouped by muscle group. Shared by the /member
 * "Exercises" tab (instant, no navigation) and the standalone
 * /member/exercises route (deep links, bookmarks) so both stay in sync.
 */
export function MemberExerciseCatalogScreen({
  catalog
}: {
  catalog: Array<{ muscleGroup: MuscleGroup; exercises: Exercise[] }>;
}) {
  return (
    <>
      <div className="m3d-pagehead">
        <div>
          <span className="m3d-pagehead__eyebrow">Library</span>
          <h1 className="m3d-pagehead__title">Exercise Catalog</h1>
        </div>
      </div>

      <section className="catalog-grid" style={{ marginTop: 32 }}>
        {catalog.map((group) => (
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
                  <div className="catalog-exercise-row" style={{ padding: "16px 20px" }}>
                    <ExerciseThumbnailPreview
                      alt={exercise.name}
                      className="catalog-exercise-thumb"
                      thumbnailUrl={exercise.thumbnailUrl}
                    />
                    <div className="catalog-exercise-copy">
                      <strong>{exercise.name}</strong>
                      <p>{[exercise.equipment].filter(Boolean).join(" / ")}</p>
                      {exercise.instructions && (
                        <p style={{ marginTop: 8, fontSize: "0.85rem", color: "var(--text-soft)" }}>
                          {exercise.instructions}
                        </p>
                      )}
                    </div>
                    <div className="catalog-exercise-actions">
                      <CatalogVideoPreview
                        exerciseName={exercise.name}
                        gymVideoUrl={exercise.gymVideoUrl}
                        muscleGroup={exercise.muscleGroup}
                        videoUrl={exercise.videoUrl}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      {catalog.length === 0 && (
        <div className="md-empty" style={{ marginTop: 32 }}>
          <h2>No exercises found</h2>
          <p>The exercise catalog is currently empty.</p>
        </div>
      )}
    </>
  );
}
