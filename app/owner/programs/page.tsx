import { Breadcrumb } from "@/components/breadcrumb";
import { CustomPlanBuilder } from "@/components/custom-plan-builder";
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
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Dashboard", href: "/owner" }, { label: "Workout Programs" }]} />
          <h1>Training plans</h1>
          <p>
            All workout programs for your gym. Assign a plan to any member from their profile page.
          </p>
        </div>
        <aside className="summary-panel">
          <div className="panel-title">
            <h2>Programs</h2>
            <span className="status-pill status-active">{programs.length} plan{programs.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="detail-window">
            <span>
              Predefined
              <strong>{predefinedCount}</strong>
            </span>
            <span>
              Custom
              <strong>{customCount}</strong>
            </span>
            <span>
              Catalog exercises
              <strong>{exercises.length}</strong>
            </span>
          </div>
        </aside>
      </section>

      {/* Primary: existing programs */}
      <WorkoutProgramGallery
        assignments={assignments}
        catalog={catalog}
        exercises={exercises}
        members={members}
        programs={programs}
      />

      {/* Secondary: create a custom program */}
      <section className="list-panel" style={{ marginTop: 20 }}>
        <div className="panel-title">
          <h2>Create a custom program</h2>
        </div>
        <div style={{ padding: "0 4px 4px" }}>
          <CustomPlanBuilder catalog={catalog} />
        </div>
      </section>
    </main>
  );
}
