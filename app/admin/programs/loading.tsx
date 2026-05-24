import { SkeletonCard, SkeletonPulse } from "@/components/skeletons";

export default function AdminProgramsLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse className="sk-heading" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} height={160} />
        ))}
      </div>
    </div>
  );
}
