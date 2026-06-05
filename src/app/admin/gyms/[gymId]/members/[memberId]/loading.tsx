import { SkeletonCard, SkeletonPulse } from "@/components/skeletons";

export default function AdminMemberDetailLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse style={{ height: 14, width: 280, borderRadius: 5, marginBottom: 18 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <SkeletonPulse style={{ width: 52, height: 52, borderRadius: 14 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <SkeletonPulse style={{ height: 20, width: 200, borderRadius: 6 }} />
          <SkeletonPulse style={{ height: 13, width: 140, borderRadius: 5 }} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SkeletonCard height={220} />
        <SkeletonCard height={160} />
      </div>
    </div>
  );
}
