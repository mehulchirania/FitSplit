import { SkeletonList, SkeletonPulse } from "@/components/skeletons";

export default function AdminExercisesLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse className="sk-heading" />
      <SkeletonList rows={10} withAvatar={false} />
    </div>
  );
}
