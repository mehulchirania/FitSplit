"use client";

import { useState } from "react";
import { ChevronRight, ExternalIcon } from "./icons";
import { Sheet } from "./sheet";

export type ExerciseRow = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  description: string;
  steps: string[];
  videoUrl: string;
};

export function ExerciseList({ exercises }: { exercises: ExerciseRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [kept, setKept] = useState<ExerciseRow | null>(null);
  const open = exercises.find((e) => e.id === openId) ?? null;
  const shown = open ?? kept;

  return (
    <>
      <div className="fs-group">
        {exercises.map((e) => (
          <button
            key={e.id}
            type="button"
            className="fs-row fs-row--tap"
            onClick={() => {
              setKept(e);
              setOpenId(e.id);
            }}
          >
            <span className="fs-row__main">
              <span className="fs-row__title">{e.name}</span>
              <span className="fs-row__sub">
                {e.muscleGroup} · {e.equipment}
              </span>
            </span>
            <ChevronRight size={18} className="fs-row__chev" />
          </button>
        ))}
        {exercises.length === 0 && <p className="fs-empty">No exercises match. Try a different search.</p>}
      </div>

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpenId(null)} title={shown?.name ?? ""}>
        {shown && (
          <div className="fs-stack fs-stack--lg">
            <p className="fs-soft">
              {shown.muscleGroup} · {shown.equipment}
            </p>
            {shown.description && <p>{shown.description}</p>}
            {shown.steps.length > 0 && (
              <div className="fs-stack">
                <h3 className="fs-subhead">How to do it</h3>
                <ol className="fs-steps">
                  {shown.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
            {shown.videoUrl && (
              <a className="fs-btn fs-btn--secondary" href={shown.videoUrl} target="_blank" rel="noopener noreferrer">
                Watch tutorial <ExternalIcon size={16} />
              </a>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
