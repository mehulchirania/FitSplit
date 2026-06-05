"use client";

import dynamic from "next/dynamic";
import type { PTSession } from "@/types/domain";

const PTCalendar = dynamic(
  () => import("@/components/pt-calendar").then((module) => ({ default: module.PTCalendar })),
  {
    ssr: false,
    loading: () => <div className="pt-calendar-loading">Loading calendar...</div>
  }
);

export function PTCalendarDynamic({ sessions }: { sessions: PTSession[] }) {
  return <PTCalendar sessions={sessions} />;
}
