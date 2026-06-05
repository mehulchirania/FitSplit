import { SkeletonAvatar, SkeletonCard, SkeletonList, SkeletonPulse } from "@/components/skeletons";

export default function GymDetailLoading() {
  return (
    <div className="sk-page">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <SkeletonAvatar size={52} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <SkeletonPulse style={{ height: 22, width: 220, borderRadius: 7 }} />
          <SkeletonPulse style={{ height: 13, width: 140, borderRadius: 5 }} />
        </div>
        <SkeletonPulse style={{ height: 32, width: 90, borderRadius: 20 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <SkeletonList rows={6} withAvatar />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SkeletonCard height={120} />
          <SkeletonCard height={100} />
        </div>
      </div>
    </div>
  );
}
