import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getExerciseLibrary } from "@/lib/firebase/read-models";
import { LIBRARY_PAGE_SIZE } from "@/lib/exercise-library";
import { ExerciseList, type ExerciseRow } from "@/components/app/exercise-list";
import { SearchIcon } from "@/components/app/icons";

export const dynamic = "force-dynamic";

type Params = { q?: string; muscle?: string; page?: string };
const MUSCLES = ["Chest", "Back", "Legs", "Shoulders", "Biceps", "Triceps", "Core"];

export default async function ExercisesPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAuth();
  const { q = "", muscle = "", page = "1" } = await searchParams;
  const pageNumber = Math.max(1, Number(page) || 1);
  const { total, results } = getExerciseLibrary({ q, muscleGroup: muscle, page: pageNumber });
  const pageCount = Math.max(1, Math.ceil(total / LIBRARY_PAGE_SIZE));

  const href = (next: { muscle?: string; page?: number }) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    const m = next.muscle ?? muscle;
    if (m) sp.set("muscle", m);
    if (next.page && next.page > 1) sp.set("page", String(next.page));
    return `/member/exercises${sp.size ? `?${sp}` : ""}`;
  };

  const rows: ExerciseRow[] = results.map((e) => ({
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup,
    equipment: e.equipment,
    description: e.muscleTargetDescription ?? "",
    steps: e.instructions.split("\n").map((s) => s.trim()).filter(Boolean),
    videoUrl: e.videoSource === "youtube" ? e.videoUrl : ""
  }));

  return (
    <main className="fs-page">
      <header className="fs-head">
        <h1 className="fs-title">Exercises</h1>
        <p className="fs-soft">
          {total.toLocaleString("en-US")} {total === 1 ? "exercise" : "exercises"}
          {pageCount > 1 ? ` · page ${pageNumber} of ${pageCount}` : ""}
        </p>
      </header>

      <form action="/member/exercises" role="search" className="fs-search-form">
        <label className="fs-search">
          <SearchIcon size={18} />
          <input type="search" name="q" defaultValue={q} placeholder="Search exercises" aria-label="Search exercises" enterKeyHint="search" />
        </label>
        {muscle && <input type="hidden" name="muscle" value={muscle} />}
      </form>

      <nav className="fs-chips fs-chips--scroll" aria-label="Muscle group">
        <Link href={href({ muscle: "" })} className="fs-chip" aria-pressed={muscle === ""} scroll={false}>
          All
        </Link>
        {MUSCLES.map((m) => (
          <Link key={m} href={href({ muscle: muscle === m ? "" : m })} className="fs-chip" aria-pressed={muscle === m} scroll={false}>
            {m}
          </Link>
        ))}
      </nav>

      <ExerciseList exercises={rows} />

      {pageCount > 1 && (
        <nav className="fs-pager" aria-label="Pagination">
          {pageNumber > 1 ? (
            <Link className="fs-btn fs-btn--secondary" href={href({ page: pageNumber - 1 })}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          {pageNumber < pageCount && (
            <Link className="fs-btn fs-btn--secondary" href={href({ page: pageNumber + 1 })}>
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
