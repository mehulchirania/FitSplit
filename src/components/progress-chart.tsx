"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "./chart-skeleton";

// recharts (~318 kB) loads as a separate async chunk, off the initial First Load JS.
export const ProgressChart = dynamic(
  () => import("./progress-chart.impl").then((m) => m.ProgressChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
