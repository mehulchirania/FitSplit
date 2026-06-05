import { SkeletonList, SkeletonPulse, SkeletonStatsRow } from "@/components/skeletons";

export default function GymsLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse className="sk-heading" />
      <SkeletonStatsRow count={3} />
      <SkeletonList rows={6} withAvatar />
    </div>
  );
}
