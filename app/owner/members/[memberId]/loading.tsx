import { SkeletonAvatar, SkeletonCard, SkeletonList, SkeletonPulse, SkeletonText } from "@/components/skeletons";

export default function MemberDetailLoading() {
  return (
    <div className="sk-page" style={{ maxWidth: 900 }}>
      {/* Header row: avatar + name + status pill */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <SkeletonAvatar size={56} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <SkeletonPulse style={{ height: 22, width: 200, borderRadius: 7 }} />
          <SkeletonPulse style={{ height: 13, width: 130, borderRadius: 5 }} />
        </div>
        <SkeletonPulse style={{ height: 32, width: 100, borderRadius: 20 }} />
      </div>

      {/* Two-column detail / action layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SkeletonCard height={120} />
          <SkeletonCard height={160} />
          <SkeletonList rows={4} withAvatar={false} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SkeletonCard height={100} />
          <SkeletonCard height={200} />
          <SkeletonText lines={4} />
        </div>
      </div>
    </div>
  );
}
