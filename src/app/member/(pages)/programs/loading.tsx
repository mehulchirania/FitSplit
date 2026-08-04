import { SkeletonCard, SkeletonPulse } from "@/components/skeletons";

export default function ProgramsLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse className="sk-heading" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} height={170} />
        ))}
      </div>
    </div>
  );
}
