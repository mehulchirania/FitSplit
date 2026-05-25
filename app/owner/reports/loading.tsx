import { SkeletonList, SkeletonStatsRow } from "@/components/skeletons";

export default function ReportsLoading() {
  return (
    <main className="page">
      <div className="sk-page">
        <div className="sk-heading sk-pulse" />
        <SkeletonStatsRow count={6} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))",
            gap: "1rem",
            marginTop: "1rem"
          }}
        >
          <SkeletonList rows={4} />
          <SkeletonList rows={4} />
          <SkeletonList rows={6} />
          <SkeletonList rows={4} />
        </div>
      </div>
    </main>
  );
}
