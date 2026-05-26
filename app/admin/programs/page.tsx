import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { GymSelector } from "@/components/gym-selector";
import { WorkoutProgramGallery } from "@/components/workout-program-gallery";
import { Dumbbell } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  getActiveProgramAssignments,
  getExerciseCatalog,
  getGymWorkspaces,
  getMembers,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function AdminProgramsPage({
  searchParams
}: {
  searchParams: Promise<{ gym?: string }>;
}) {
  await requireRole(["admin"]);

  const { gym: gymParam } = await searchParams;
  const { gyms } = await getGymWorkspaces();
  const selectedGymId = gymParam ?? gyms[0]?.id ?? PRIMARY_GYM_ID;
  const selectedGym = gyms.find((g) => g.id === selectedGymId) ?? gyms[0];

  const [
    { exercises, catalog },
    { programs },
    { assignments },
    { members },
    allGymProgramData
  ] = await Promise.all([
    getExerciseCatalog(selectedGymId),
    getWorkoutPrograms(selectedGymId),
    getActiveProgramAssignments(selectedGymId),
    getMembers(selectedGymId),
    Promise.all(
      gyms.map(async (gym) => {
        const [{ exercises }, { programs }, { assignments }, { members }] = await Promise.all([
          getExerciseCatalog(gym.id),
          getWorkoutPrograms(gym.id),
          getActiveProgramAssignments(gym.id),
          getMembers(gym.id)
        ]);

        return {
          assignments,
          exercises,
          gymId: gym.id,
          gymName: gym.name,
          members,
          programs: programs.filter((program) => program.source === "gym")
        };
      })
    )
  ]);

  const predefinedCount = programs.filter((p) => p.source !== "gym").length;
  const customCount = allGymProgramData.reduce((count, group) => count + group.programs.length, 0);

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Admin", href: "/admin" }, { label: "Workout Programs" }]} />
          <h1>Workout programs</h1>
          <p>
            Review all training plans across gyms. Programs are created by gym owners and assigned to members.
          </p>

          <GymSelector gyms={gyms} pathname="/admin/programs" selectedGymId={selectedGymId} />
        </div>

        <aside className="summary-panel">
          <div className="panel-title">
            <h2>
              <Dumbbell /> {selectedGym?.name ?? "Programs"}
            </h2>
            <span className="status-pill status-active">
              {programs.length} plan{programs.length !== 1 ? "s" : ""}
            </span>
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
              Active assignments
              <strong>{assignments.length}</strong>
            </span>
            <span>
              Members
              <strong>{members.length}</strong>
            </span>
          </div>
        </aside>
      </section>

      <WorkoutProgramGallery
        assignments={assignments}
        catalog={catalog}
        customGroups={allGymProgramData}
        exercises={exercises}
        members={members}
        programs={programs}
      />

      {programs.length === 0 && (
        <div className="md-empty" style={{ marginTop: 16 }}>
          <h2>No programs yet</h2>
          <p>
            Programs are created by gym owners from their dashboard.{" "}
            <Link href={`/admin/gyms/${selectedGymId}`}>Go to {selectedGym?.name} settings</Link>.
          </p>
        </div>
      )}
    </main>
  );
}
