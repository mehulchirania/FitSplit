import { CustomPlanBuilder } from "@/components/custom-plan-builder";
import { WorkoutProgramGallery } from "@/components/workout-program-gallery";
import { requireRole } from "@/lib/auth";
import { getExerciseCatalog, getWorkoutPrograms } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const currentUser = await requireRole(["admin", "owner"]);
  const gymId = currentUser.gymId;

  const [{ catalog, exercises }, { programs }] = await Promise.all([
    getExerciseCatalog(gymId),
    getWorkoutPrograms(gymId)
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
          <CustomPlanBuilder catalog={catalog} />
        </aside>
      </section>

      <WorkoutProgramGallery exercises={exercises} programs={programs} />
    </main>
  );
}
