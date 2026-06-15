/**
 * Lightweight placeholder shown while a recharts-backed chart loads as a
 * separate async chunk (see the dynamic() wrappers in the *-chart.tsx files).
 * Keeps ~318 kB of recharts off the initial First Load JS of chart routes.
 * Reuses the design system's `.sk-pulse` shimmer (light + dark) from 13-skeletons.css.
 */
export function ChartSkeleton({ height = 180 }: { height?: number }) {
  return (
    <div
      aria-hidden
      className="sk-pulse"
      style={{ height, minHeight: height, width: "100%", borderRadius: "12px" }}
    />
  );
}
