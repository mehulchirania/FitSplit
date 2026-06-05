/* eslint-disable @typescript-eslint/no-unused-vars */
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
    <div className="odp2-scroll">
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Dashboard / Exercise Catalog</div>
          <h1 className="adm-title">Exercise catalog</h1>
        </div>
        <div className="adm-head-actions">
          <a href="#add-exercise" className="adm-btn">+ Add exercise</a>
        </div>
      </div>
      <p className="adm-page-desc">
        Manage your gym&apos;s video demos and control which tutorial videos your members see.
        Tutorial videos are provided by FitSplit.
      </p>

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
          <small>CUSTOM</small>
          <strong>{custom.length}</strong>
        </div>
        <div className="adm-kpi">
          <small>WITH GYM VIDEO</small>
          <strong>{exercises.filter((e) => e.gymVideoUrl).length}</strong>
        </div>
      </div>

      <ExerciseCatalogView
        exercises={exercises}
        createAction={createCatalogExercise}
      />
    </div>
  );
}
