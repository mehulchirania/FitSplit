import { Dumbbell } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { getExerciseCatalog } from "@/lib/firebase/read-models";
import { CatalogVideoPreview } from "@/components/catalog-video-preview";

export const dynamic = "force-dynamic";

export default async function MemberExerciseLibraryPage() {
  const currentUser = await requireRole(["member"]);
  
  const { catalog: exerciseCatalogByMuscle } = await getExerciseCatalog(currentUser.gymId);

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Dashboard", href: "/member" }, { label: "Exercise Library" }]} />
          <h1>Exercise Library</h1>
          <p>
            Browse the full library of exercises and watch demonstration videos carefully curated by your gym.
          </p>
        </div>
      </section>

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
                    <div
                      className="catalog-exercise-thumb"
                      style={exercise.thumbnailUrl ? { backgroundImage: `url(${exercise.thumbnailUrl})` } : undefined}
                    >
                      {!exercise.thumbnailUrl ? <Dumbbell className="catalog-thumb-placeholder" /> : null}
                    </div>
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
    </main>
  );
}

// Simple Breadcrumb component inline for members since the main Breadcrumb might be admin-styled or we can import it
function Breadcrumb({ crumbs }: { crumbs: { label: string, href?: string }[] }) {
    return (
        <nav aria-label="Breadcrumb" className="breadcrumb">
            <ol>
                {crumbs.map((crumb, i) => (
                    <li key={i}>
                        {crumb.href ? (
                            <a href={crumb.href}>{crumb.label}</a>
                        ) : (
                            <span aria-current="page">{crumb.label}</span>
                        )}
                        {i < crumbs.length - 1 && <span className="separator">/</span>}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
