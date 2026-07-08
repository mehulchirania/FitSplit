import { SkeletonAvatar, SkeletonCard, SkeletonList, SkeletonPulse, SkeletonText } from "@/components/skeletons";

export default function MemberDetailLoading() {
  return (
    <div className="sk-page">
      {/* Hero card skeleton: avatar + two text lines + chip row + 4-stat strip */}
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "22px 24px 0",
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <SkeletonAvatar size={64} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <SkeletonPulse style={{ height: 22, width: 220, borderRadius: 7 }} />
            <SkeletonPulse style={{ height: 13, width: 160, borderRadius: 5 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <SkeletonPulse style={{ height: 24, width: 140, borderRadius: 999 }} />
              <SkeletonPulse style={{ height: 24, width: 110, borderRadius: 999 }} />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 0,
            borderTop: "1px solid var(--border)",
            marginTop: 18,
            marginLeft: -24,
            marginRight: -24,
            width: "calc(100% + 48px)",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
              <SkeletonPulse style={{ height: 16, width: "60%", borderRadius: 5 }} />
              <SkeletonPulse style={{ height: 11, width: "40%", borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Two-column workspace, collapses below 1080px like mpd-workspace-layout */}
      <div className="mpd-workspace-layout" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <SkeletonCard height={200} />
          <SkeletonCard height={160} />
          <SkeletonList rows={4} withAvatar={false} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <SkeletonCard height={140} />
          <SkeletonCard height={220} />
          <SkeletonText lines={4} />
        </div>
      </div>
    </div>
  );
}
