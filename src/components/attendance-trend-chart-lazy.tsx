"use client";

// A6/C10: Lazy-loaded wrapper for AttendanceTrendChart.
import nextDynamic from "next/dynamic";

export const AttendanceTrendChart = nextDynamic(
  () => import("@/components/attendance-trend-chart").then((m) => m.AttendanceTrendChart),
  { ssr: false, loading: () => <p className="form-message">Loading attendance chart…</p> }
);
