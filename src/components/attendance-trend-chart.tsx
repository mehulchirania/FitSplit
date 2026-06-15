"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "./chart-skeleton";

// recharts (~318 kB) loads as a separate async chunk, off the initial First Load JS.
export const AttendanceTrendChart = dynamic(
  () => import("./attendance-trend-chart.impl").then((m) => m.AttendanceTrendChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
