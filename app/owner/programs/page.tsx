import { CustomPlanBuilder } from "@/components/custom-plan-builder";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { WorkoutProgramGallery } from "@/components/workout-program-gallery";
import { getExerciseCatalog, getWorkoutPrograms } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const [{ catalog, exercises }, { programs, isPersisted }] = await Promise.all([
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
            Titan V2 Fitness now has the requested split templates, each built
            from the owner-only exercise catalog.
          </p>
        </div>
        <aside className="builder-stack">
          <WorkspaceSwitcher />
          <CustomPlanBuilder catalog={catalog} />
          <span className={`status-pill ${isPersisted ? "status-active" : "status-neutral"}`}>
            {isPersisted ? "Reading programs from Firestore" : "Using mock seed data"}
          </span>
        </aside>
      </section>

      <WorkoutProgramGallery exercises={exercises} programs={programs} />
    </main>
  );
}
