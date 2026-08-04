import { SkeletonList, SkeletonPulse } from "@/components/skeletons";

export default function ExercisesLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse style={{ height: 26, width: 240, borderRadius: 7 }} />
      <SkeletonPulse style={{ height: 14, width: 320, borderRadius: 5 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
        <SkeletonList rows={3} withAvatar={false} />
        <SkeletonList rows={3} withAvatar={false} />
        <SkeletonList rows={3} withAvatar={false} />
        <SkeletonList rows={3} withAvatar={false} />
      </div>
    </div>
  );
}
