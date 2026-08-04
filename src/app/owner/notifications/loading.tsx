import { SkeletonList, SkeletonPulse } from "@/components/skeletons";

export default function OwnerNotificationsLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse className="sk-heading" />
      <div style={{ display: "flex", gap: 8 }}>
        {[60, 80, 110, 100, 70].map((w, i) => (
          <SkeletonPulse key={i} style={{ height: 30, width: w, borderRadius: 20 }} />
        ))}
      </div>
      <SkeletonList rows={7} withAvatar={false} />
    </div>
  );
}
