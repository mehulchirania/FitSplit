import { SkeletonList, SkeletonPulse } from "@/components/skeletons";

export default function MembersLoading() {
  return (
    <div className="sk-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SkeletonPulse className="sk-heading" />
        <SkeletonPulse style={{ height: 36, width: 120, borderRadius: 8 }} />
      </div>

      {/* Filter tabs + search toolbar */}
      <div style={{ display: "flex", gap: 8 }}>
        {[80, 100, 90, 110].map((w, i) => (
          <SkeletonPulse key={i} style={{ height: 36, width: w, borderRadius: 10 }} />
        ))}
        <SkeletonPulse style={{ height: 36, flex: 1, maxWidth: 320, borderRadius: 10, marginLeft: "auto" }} />
      </div>

      {/* Directory rows + attention rail (wraps to one column on narrow screens) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 400px", minWidth: 0 }}>
          <SkeletonList rows={8} withAvatar />
        </div>
        <div style={{ flex: "1 1 260px", maxWidth: 300 }}>
          <SkeletonList rows={5} withAvatar />
        </div>
      </div>
    </div>
  );
}
