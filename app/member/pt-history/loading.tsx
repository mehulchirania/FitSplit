import { SkeletonCard, SkeletonPulse } from "@/components/skeletons";

export default function PtHistoryLoading() {
  return (
    <div className="sk-page">
      <SkeletonPulse className="sk-heading" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} height={100} />
        ))}
      </div>
    </div>
  );
}
