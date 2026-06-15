"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "./chart-skeleton";

// recharts (~318 kB) loads as a separate async chunk, off the initial First Load JS.
export const MuscleRadarChart = dynamic(
  () => import("./muscle-radar-chart.impl").then((m) => m.MuscleRadarChart),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> }
);
