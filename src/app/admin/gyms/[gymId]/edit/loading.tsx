import { SkeletonCard, SkeletonPulse } from "@/components/skeletons";

export default function EditGymLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse style={{ height: 28, width: 300, borderRadius: 7 }} />
      <SkeletonPulse style={{ height: 54, borderRadius: 12 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SkeletonCard height={220} />
        <SkeletonCard height={220} />
      </div>
      <SkeletonCard height={320} />
    </div>
  );
}
