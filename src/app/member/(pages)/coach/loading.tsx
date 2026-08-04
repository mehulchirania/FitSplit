import { SkeletonPulse } from "@/components/skeletons";

export default function CoachLoading() {
  return (
    <div className="sk-page">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <SkeletonPulse style={{ width: 36, height: 36, borderRadius: "50%" }} />
        <SkeletonPulse style={{ height: 16, width: 160, borderRadius: 6 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SkeletonPulse style={{ height: 40, width: "60%", borderRadius: 16, alignSelf: "flex-start" }} />
        <SkeletonPulse style={{ height: 40, width: "45%", borderRadius: 16, alignSelf: "flex-end" }} />
        <SkeletonPulse style={{ height: 56, width: "70%", borderRadius: 16, alignSelf: "flex-start" }} />
        <SkeletonPulse style={{ height: 32, width: "35%", borderRadius: 16, alignSelf: "flex-end" }} />
      </div>
    </div>
  );
}
