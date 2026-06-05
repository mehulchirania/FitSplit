import { SkeletonCard, SkeletonList, SkeletonPulse, SkeletonStatsRow } from "@/components/skeletons";

export default function TrainingLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse className="sk-heading" />
      <SkeletonStatsRow count={3} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SkeletonPulse style={{ height: 16, width: 140, borderRadius: 5 }} />
          <SkeletonList rows={5} withAvatar={false} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SkeletonPulse style={{ height: 16, width: 140, borderRadius: 5 }} />
          <SkeletonList rows={5} withAvatar={false} />
        </div>
      </div>
      <SkeletonCard height={100} />
    </div>
  );
}
