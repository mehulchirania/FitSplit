import { SkeletonCard, SkeletonPulse } from "@/components/skeletons";

export default function OwnerSettingsLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse className="sk-heading" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <SkeletonCard height={200} />
        <SkeletonCard height={200} />
        <SkeletonCard height={160} />
        <SkeletonCard height={160} />
      </div>
    </div>
  );
}
