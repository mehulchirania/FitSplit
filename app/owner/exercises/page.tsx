import { Breadcrumb } from "@/components/breadcrumb";
import { ExerciseEditForm } from "@/components/exercise-edit-form";
import { ExerciseCatalogView } from "@/components/exercise-catalog-view";
import { requireRole } from "@/lib/auth";
import { createCatalogExercise } from "@/lib/firebase/actions";
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
      </section>      <ExerciseCatalogView
        predefined={predefined}
        custom={custom}
        exerciseCatalogByMuscle={exerciseCatalogByMuscle}
      />

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
