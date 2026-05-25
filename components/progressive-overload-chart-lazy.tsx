"use client";

// A6: Lazy-loaded wrapper for ProgressiveOverloadChart.
import nextDynamic from "next/dynamic";

export const ProgressiveOverloadChart = nextDynamic(
  () => import("@/components/progressive-overload-chart").then((m) => m.ProgressiveOverloadChart),
  { ssr: false, loading: () => <p className="form-message">Loading chart…</p> }
);
