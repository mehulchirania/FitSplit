import { CustomPlanBuilder } from "@/components/custom-plan-builder";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { WorkoutProgramGallery } from "@/components/workout-program-gallery";
import { requireRole } from "@/lib/auth";
import { getExerciseCatalog, getWorkoutPrograms } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  await requireRole(["admin", "owner"]);

  const [{ catalog, exercises }, { programs }] = await Promise.all([
    getExerciseCatalog(),
    getWorkoutPrograms()
  ]);
  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <p className="eyebrow">Workout splits</p>
          <h1>Training plans from the catalog.</h1>
          <p>
            Sri Shakti Hanuman Gym now has the requested split templates, each built
            from the owner-only exercise catalog.
          </p>
        </div>
        <aside className="builder-stack">
          <WorkspaceSwitcher />
          <CustomPlanBuilder catalog={catalog} />
        </aside>
      </section>

      <WorkoutProgramGallery exercises={exercises} programs={programs} />
    </main>
  );
}
