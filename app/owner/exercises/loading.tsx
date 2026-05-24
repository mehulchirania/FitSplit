import { SkeletonList, SkeletonPulse } from "@/components/skeletons";

export default function ExercisesLoading() {
  return (
    <div className="sk-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SkeletonPulse className="sk-heading" />
        <SkeletonPulse style={{ height: 36, width: 140, borderRadius: 8 }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[70, 80, 90, 75, 85].map((w, i) => (
          <SkeletonPulse key={i} style={{ height: 28, width: w, borderRadius: 20 }} />
        ))}
      </div>
      <SkeletonList rows={10} withAvatar={false} />
    </div>
  );
}
