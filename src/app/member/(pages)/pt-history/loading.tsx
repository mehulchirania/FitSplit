import { SkeletonList, SkeletonPulse } from "@/components/skeletons";

export default function PTHistoryLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse style={{ height: 26, width: 200, borderRadius: 7 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <SkeletonPulse style={{ height: 24, width: 100, borderRadius: 20 }} />
        <SkeletonPulse style={{ height: 24, width: 100, borderRadius: 20 }} />
      </div>
      <SkeletonList rows={4} withAvatar={false} />
    </div>
  );
}
