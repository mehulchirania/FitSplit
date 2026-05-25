import { SkeletonList, SkeletonStatsRow } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="page" style={{ maxWidth: "760px" }}>
      <SkeletonStatsRow count={1} />
      <SkeletonList rows={6} />
    </main>
  );
}
