"use client";

import { useState } from "react";
import Link from "next/link";
import { countLabel } from "@/lib/today";
import { ChevronRight } from "./icons";
import { Sheet } from "./sheet";

export type UpcomingDay = {
  id: string;
  title: string;
  /** 1-based position in the plan. */
  position: number;
  href: string;
  exercises: Array<{ name: string; sets: number; reps: string }>;
};

/** The rest of the plan after today's workout. Tap one to preview it, or start it instead. */
export function UpcomingDays({ days }: { days: UpcomingDay[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [kept, setKept] = useState<UpcomingDay | null>(null);
  const open = days.find((d) => d.id === openId) ?? null;
  const shown = open ?? kept;

  return (
    <>
      <div className="fs-group">
        {days.map((d) => (
          <button
            key={d.id}
            type="button"
            className="fs-row fs-row--tap"
            onClick={() => {
              setKept(d);
              setOpenId(d.id);
            }}
          >
            <span className="fs-row__main">
              <span className="fs-row__title">{d.title}</span>
              <span className="fs-row__sub">
                Day {d.position} · {countLabel(d.exercises.length, "exercise")}
              </span>
            </span>
            <ChevronRight size={18} className="fs-row__chev" />
          </button>
        ))}
      </div>

      <Sheet
        open={open !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
        title={shown?.title ?? ""}
        footer={
          shown && (
            <Link href={shown.href} className="fs-btn fs-btn--primary fs-btn--lg">
              Start this workout
            </Link>
          )
        }
      >
        {shown && (
          <ol className="fs-plain-list">
            {shown.exercises.map((e, i) => (
              <li key={`${e.name}-${i}`}>
                <span>{e.name}</span>
                <span className="fs-num">
                  {e.sets} × {e.reps}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Sheet>
    </>
  );
}
