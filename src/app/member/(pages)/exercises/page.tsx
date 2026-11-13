import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getExerciseLibrary } from "@/lib/firebase/read-models";
import { LIBRARY_PAGE_SIZE } from "@/lib/exercise-library";
import { MemberExerciseCatalogScreen } from "@/components/member-exercise-catalog-screen";

export const dynamic = "force-dynamic";

type Params = { q?: string; muscle?: string; equipment?: string; page?: string };

export default async function MemberExerciseLibraryPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAuth();
  const { q = "", muscle = "", equipment = "", page = "1" } = await searchParams;
  const pageNumber = Math.max(1, Number(page) || 1);

  const { total, results, muscleGroups, equipment: equipmentOptions } = getExerciseLibrary({
    q,
    muscleGroup: muscle,
    equipment,
    page: pageNumber
  });

  const pageCount = Math.max(1, Math.ceil(total / LIBRARY_PAGE_SIZE));
  const pageHref = (n: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (muscle) sp.set("muscle", muscle);
    if (equipment) sp.set("equipment", equipment);
    if (n > 1) sp.set("page", String(n));
    return `/member/exercises${sp.size ? `?${sp}` : ""}`;
  };

  const catalog = muscleGroups
    .map((group) => ({ muscleGroup: group, exercises: results.filter((e) => e.muscleGroup === group) }))
    .filter((group) => group.exercises.length > 0);

  return (
    <div className="m3d-subpage">
      <MemberExerciseCatalogScreen
        catalog={catalog}
        toolbar={
          <>
            <form action="/member/exercises" className="catalog-filters" role="search">
              <input aria-label="Search exercises" defaultValue={q} name="q" placeholder="Search exercises" type="search" />
              <select aria-label="Muscle group" defaultValue={muscle} name="muscle">
                <option value="">All muscles</option>
                {muscleGroups.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select aria-label="Equipment" defaultValue={equipment} name="equipment">
                <option value="">All equipment</option>
                {equipmentOptions.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <button className="button-primary" type="submit">Search</button>
            </form>
            <p className="catalog-filters__count">
              {total} exercise{total === 1 ? "" : "s"}
              {pageCount > 1 ? ` · page ${pageNumber} of ${pageCount}` : ""}
            </p>
          </>
        }
        footer={
          pageCount > 1 && (
            <nav className="catalog-pager" aria-label="Pagination">
              {pageNumber > 1 && <Link className="button-secondary" href={pageHref(pageNumber - 1)}>Previous</Link>}
              {pageNumber < pageCount && <Link className="button-secondary" href={pageHref(pageNumber + 1)}>Next</Link>}
            </nav>
          )
        }
      />
    </div>
  );
}
