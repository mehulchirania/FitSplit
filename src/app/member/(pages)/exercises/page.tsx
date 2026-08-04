import { requireRole } from "@/lib/auth";
import { getExerciseCatalog } from "@/lib/firebase/read-models";
import { MemberExerciseCatalogScreen } from "@/components/member-exercise-catalog-screen";

export const dynamic = "force-dynamic";

export default async function MemberExerciseLibraryPage() {
  const currentUser = await requireRole(["member"]);

  const { catalog } = await getExerciseCatalog(currentUser.gymId);

  return (
    <div className="m3d-subpage">
      <MemberExerciseCatalogScreen catalog={catalog} />
    </div>
  );
}
