import { BackButton } from "@/components/back-button";
import { WorkoutProgramGallery } from "@/components/workout-program-gallery";
import { requireRole } from "@/lib/auth";
import {
  getExerciseCatalog,
  getGymDetail,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function MemberProgramsPage() {
  const currentUser = await requireRole(["member"]);
  const [{ programs }, { exercises }, { gym }] = await Promise.all([
    getWorkoutPrograms(currentUser.gymId),
    getExerciseCatalog(currentUser.gymId),
    getGymDetail(currentUser.gymId)
  ]);

  return (
    <main className="page-shell">
      <section className="page-header">
        <BackButton role="member" />
        <p className="eyebrow">Workout library</p>
        <h1>Workout programs</h1>
        <p>
          Browse the predefined FitSplit plans and gym-created programs available at{" "}
          {gym?.name ?? "your gym"}. This view is read-only.
        </p>
      </section>

      <WorkoutProgramGallery
        assignments={[]}
        exercises={exercises}
        members={[]}
        programs={programs}
        readOnly
      />
    </main>
  );
}
