import { SkeletonList, SkeletonPulse } from "@/components/skeletons";

export default function MemberExercisesLoading() {
  return (
    <div className="sk-page">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[80, 70, 90, 75, 85, 80].map((w, i) => (
          <SkeletonPulse key={i} style={{ height: 28, width: w, borderRadius: 20 }} />
        ))}
      </div>
      <SkeletonList rows={10} withAvatar={false} />
    </div>
  );
}
