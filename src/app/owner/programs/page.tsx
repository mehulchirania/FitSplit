import { CustomPlanBuilder } from "@/components/custom-plan-builder";
import { OpenDetailsButton } from "@/components/open-details-button";
import { WorkoutProgramGallery } from "@/components/workout-program-gallery";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  getActiveProgramAssignments,
  getExerciseCatalog,
  getMembers,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const currentUser = await requireRole(["admin", "owner"]);
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const [{ catalog, exercises }, { programs }, { assignments }, { members }] = await Promise.all([
    getExerciseCatalog(gymId),
    getWorkoutPrograms(gymId),
    getActiveProgramAssignments(gymId),
    getMembers(gymId)
  ]);

  const predefinedCount = programs.filter((program) => program.source !== "gym").length;
  const customCount = programs.filter((program) => program.source === "gym").length;

  return (
    <div className="odp2-scroll">
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Dashboard / Programs</div>
          <h1 className="adm-title">Training plans</h1>
        </div>
        <div className="adm-head-actions">
          <OpenDetailsButton targetId="create-program" className="adm-btn adm-btn--ghost">+ Custom plan</OpenDetailsButton>
        </div>
      </div>
      <p className="adm-page-desc">
        All workout programs for your gym. Assign a plan to any member from their profile page.
      </p>

      <div className="adm-kpis" style={{ marginBottom: 20 }}>
        <div className="adm-kpi adm-kpi--brand">
          <small>TOTAL PLANS</small>
          <strong>{programs.length}</strong>
        </div>
        <div className="adm-kpi">
          <small>PREDEFINED</small>
          <strong>{predefinedCount}</strong>
        </div>
        <div className="adm-kpi adm-kpi--accent">
          <small>CUSTOM</small>
          <strong>{customCount}</strong>
        </div>
        <div className="adm-kpi">
          <small>EXERCISES</small>
          <strong>{exercises.length}</strong>
        </div>
      </div>

      <WorkoutProgramGallery
        assignments={assignments}
        catalog={catalog}
        exercises={exercises}
        members={members}
        programs={programs}
      />

      <details className="adm-details-panel" id="create-program" style={{ marginTop: 16 }}>
        <summary className="adm-details-panel__summary">Create a custom program</summary>
        <div className="adm-details-panel__body">
          <CustomPlanBuilder catalog={catalog} />
        </div>
      </details>
    </div>
  );
}
