import { SkeletonList, SkeletonPulse, SkeletonStatsRow } from "@/components/skeletons";

export default function TrainersLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse className="sk-heading" />
      <SkeletonStatsRow count={4} />
      <SkeletonList rows={5} withAvatar />
    </div>
  );
}
