import { SkeletonAvatar, SkeletonCard, SkeletonPulse } from "@/components/skeletons";

export default function ProfileLoading() {
  return (
    <div className="sk-page">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <SkeletonAvatar size={56} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <SkeletonPulse style={{ height: 20, width: 200, borderRadius: 6 }} />
          <SkeletonPulse style={{ height: 13, width: 260, borderRadius: 5 }} />
        </div>
      </div>
      <SkeletonCard height={160} />
      <SkeletonCard height={160} />
    </div>
  );
}
