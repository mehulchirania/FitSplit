"use client";

// A6: Lazy-loaded wrapper for ProgressChart.
import nextDynamic from "next/dynamic";

export const ProgressChart = nextDynamic(
  () => import("@/components/progress-chart").then((m) => m.ProgressChart),
  { ssr: false, loading: () => <p className="form-message">Loading chart…</p> }
);
