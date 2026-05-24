import { SkeletonList, SkeletonPulse } from "@/components/skeletons";

export default function ActivityLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse className="sk-heading" />
      <SkeletonList rows={8} withAvatar={false} />
    </div>
  );
}
