import type { Exercise, WorkoutProgram } from "@/types/domain";
import type { ExerciseSwapRecord } from "@/lib/firebase/read-models/swaps";
import { Swap } from "@/components/icons";

interface ExerciseSwapNotesProps {
  swapsByDay: Record<string, ExerciseSwapRecord>;
  program: WorkoutProgram;
  exercises: Exercise[];
}

/**
 * Read-only list of a member's exercise substitutions, grouped by program
 * day — "Barbell Bench Press → Pec Deck Fly" etc. Swaps used to live only in
 * the member's browser localStorage; this is what makes them visible to the
 * trainer who assigned the plan, instead of the trainer only ever seeing the
 * original prescription while the member has quietly been training
 * something else every session.
 */
export function ExerciseSwapNotes({ swapsByDay, program, exercises }: ExerciseSwapNotesProps) {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  const rows = program.days.flatMap((day) => {
    const record = swapsByDay[day.id];
    if (!record) return [];
    return Object.entries(record.swaps)
      .map(([exIdxRaw, swappedId]) => {
        const exIdx = Number(exIdxRaw);
        const original = day.exercises[exIdx];
        if (!original) return null;
        const originalName = exerciseById.get(original.exerciseId)?.name ?? original.exerciseId;
        const swappedName = exerciseById.get(swappedId)?.name ?? swappedId;
        if (originalName === swappedName) return null; // swapped back to the original — nothing to show
        return { key: `${day.id}-${exIdxRaw}`, dayTitle: day.title, dayNumber: day.dayNumber, originalName, swappedName };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  });

  if (rows.length === 0) return null;

  return (
    <div className="list-panel mpd-swap-notes">
      <div className="panel-title">
        <div>
          <p className="eyebrow">What they&apos;re actually training</p>
          <h2><Swap /> Exercise substitutions</h2>
        </div>
      </div>
      <ul className="mpd-swap-notes__list">
        {rows.map((row) => (
          <li key={row.key} className="mpd-swap-notes__row">
            <span className="mpd-swap-notes__day">Day {row.dayNumber}</span>
            <span className="mpd-swap-notes__swap">
              {row.originalName} <span aria-hidden="true">→</span> {row.swappedName}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
