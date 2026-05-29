import { Dumbbell } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { getExerciseCatalog } from "@/lib/firebase/read-models";
import { CatalogVideoPreview } from "@/components/catalog-video-preview";
import { ExerciseThumbnailPreview } from "@/components/exercise-thumbnail-preview";

export const dynamic = "force-dynamic";

export default async function MemberExerciseLibraryPage() {
  const currentUser = await requireRole(["member"]);
  
  const { catalog: exerciseCatalogByMuscle } = await getExerciseCatalog(currentUser.gymId);

  return (
    <div className="m3d-subpage">
      <div className="m3d-subpage__head">
        <h1>Exercise Catalog</h1>
        <p>Browse the full library and watch demonstration videos curated by your gym.</p>
      </div>

      <section className="catalog-grid" style={{ marginTop: 32 }}>
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
      
      {exerciseCatalogByMuscle.length === 0 && (
        <div className="md-empty" style={{ marginTop: 32 }}>
          <h2>No exercises found</h2>
          <p>The exercise catalog is currently empty.</p>
        </div>
      )}
    </div>
  );
}

