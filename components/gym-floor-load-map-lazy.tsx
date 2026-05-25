"use client";

// A6: Lazy-loaded wrapper for GymFloorLoadMap so Recharts is not bundled in
// the initial page payload.
import nextDynamic from "next/dynamic";

export const GymFloorLoadMap = nextDynamic(
  () => import("@/components/gym-floor-load-map").then((m) => m.GymFloorLoadMap),
  { ssr: false, loading: () => <p className="form-message">Loading floor map…</p> }
);
