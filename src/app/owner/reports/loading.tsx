import { SkeletonList, SkeletonPulse, SkeletonStatsRow } from "@/components/skeletons";

export default function ReportsLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse className="sk-heading" />
      <SkeletonStatsRow count={4} />
      <SkeletonPulse style={{ height: 220, borderRadius: 12 }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))",
          gap: "1rem",
        }}
      >
        <SkeletonList rows={4} />
        <SkeletonList rows={4} />
        <SkeletonList rows={6} />
        <SkeletonList rows={4} />
      </div>
    </div>
  );
}
