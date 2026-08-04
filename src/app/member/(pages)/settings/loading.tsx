import { SkeletonAvatar, SkeletonCard, SkeletonPulse } from "@/components/skeletons";

export default function SettingsLoading() {
  return (
    <div className="sk-page">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <SkeletonAvatar size={64} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <SkeletonPulse style={{ height: 18, width: 160, borderRadius: 6 }} />
          <SkeletonPulse style={{ height: 12, width: 200, borderRadius: 4 }} />
        </div>
      </div>
      <SkeletonCard height={140} />
      <SkeletonCard height={140} />
    </div>
  );
}
