import { SkeletonBanner, SkeletonList, SkeletonPulse, SkeletonStatsRow } from "@/components/skeletons";

export default function MembersLoading() {
  return (
    <div className="sk-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SkeletonPulse className="sk-heading" />
        <SkeletonPulse style={{ height: 36, width: 120, borderRadius: 8 }} />
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        {[80, 100, 90, 110].map((w, i) => (
          <SkeletonPulse key={i} style={{ height: 32, width: w, borderRadius: 20 }} />
        ))}
      </div>

      {/* Stats strip */}
      <SkeletonStatsRow count={3} />

      {/* Member rows */}
      <SkeletonList rows={8} withAvatar />

      <SkeletonBanner />
    </div>
  );
}
