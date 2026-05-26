/* eslint-disable @typescript-eslint/no-unused-vars */
import { Breadcrumb } from "@/components/breadcrumb";
import { ExerciseCatalogView } from "@/components/exercise-catalog-view";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { createCatalogExercise } from "@/lib/firebase/actions";
import { getExerciseCatalog } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function ExerciseCatalogPage() {
  const currentUser = await requireRole(["admin", "owner"]);
  const { exercises, catalog: exerciseCatalogByMuscle } = await getExerciseCatalog(
    currentUser.gymId ?? PRIMARY_GYM_ID
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
        exercises={exercises}
        createAction={createCatalogExercise}
      />
    </main>
  );
}
