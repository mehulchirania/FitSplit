"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "./chart-skeleton";

// recharts (~318 kB) loads as a separate async chunk, off the initial First Load JS.
export const MacroProgressPanel = dynamic(
  () => import("./macro-progress-panel.impl").then((m) => m.MacroProgressPanel),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
