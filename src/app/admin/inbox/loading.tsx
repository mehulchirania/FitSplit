import { SkeletonList, SkeletonPulse } from "@/components/skeletons";

export default function InboxLoading() {
  return (
    <div className="sk-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SkeletonPulse className="sk-heading" />
        <SkeletonPulse style={{ height: 24, width: 80, borderRadius: 20 }} />
      </div>
      <SkeletonList rows={7} withAvatar={false} />
    </div>
  );
}
