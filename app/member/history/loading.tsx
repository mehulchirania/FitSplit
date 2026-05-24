import { SkeletonCard, SkeletonList, SkeletonPulse } from "@/components/skeletons";

export default function HistoryLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse className="sk-heading" />
      <SkeletonCard height={180} />
      <SkeletonList rows={6} withAvatar={false} />
    </div>
  );
}
