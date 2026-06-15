"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "./chart-skeleton";

// recharts (~318 kB) loads as a separate async chunk, off the initial First Load JS.
export const ProgressiveOverloadChart = dynamic(
  () => import("./progressive-overload-chart.impl").then((m) => m.ProgressiveOverloadChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
