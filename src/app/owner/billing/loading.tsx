import { SkeletonList, SkeletonPulse, SkeletonStatsRow } from "@/components/skeletons";

export default function BillingLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse className="sk-heading" />
      <SkeletonStatsRow count={4} />
      <SkeletonList rows={6} withAvatar={false} />
    </div>
  );
}
