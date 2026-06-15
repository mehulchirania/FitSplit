"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "./chart-skeleton";

// recharts (~318 kB) loads as a separate async chunk, off the initial First Load JS.
export const ProfileMetricsWidget = dynamic(
  () => import("./profile-metrics-widget.impl").then((m) => m.ProfileMetricsWidget),
  { ssr: false, loading: () => <ChartSkeleton height={120} /> }
);
