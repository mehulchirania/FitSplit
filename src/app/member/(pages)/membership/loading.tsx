import { SkeletonCard, SkeletonList, SkeletonPulse } from "@/components/skeletons";

export default function MembershipLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse style={{ height: 26, width: 180, borderRadius: 7 }} />
      <SkeletonCard height={110} />
      <SkeletonList rows={4} withAvatar={false} />
    </div>
  );
}
