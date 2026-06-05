import { SkeletonCard, SkeletonList, SkeletonPulse, SkeletonStatsRow } from "@/components/skeletons";

export default function TrainerLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse className="sk-heading" />
      <SkeletonStatsRow count={3} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SkeletonList rows={4} withAvatar={false} />
        <SkeletonList rows={4} withAvatar={false} />
      </div>
      <SkeletonCard height={120} />
    </div>
  );
}
