"use client";

import dynamic from "next/dynamic";
import type { SessionProps } from "./workout-session";

// The logger restores an in-progress workout from this device's storage, so it only renders in
// the browser. The skeleton keeps the layout stable while it loads.
const WorkoutSession = dynamic(() => import("./workout-session"), {
  ssr: false,
  loading: () => (
    <main className="fs-wk" aria-busy="true" aria-label="Loading workout">
      <div className="fs-skel fs-skel--bar" />
      <div className="fs-skel fs-skel--title" />
      <div className="fs-skel fs-skel--block" />
    </main>
  )
});

export function WorkoutSessionLoader(props: SessionProps) {
  return <WorkoutSession {...props} />;
}
