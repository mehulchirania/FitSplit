import { Activity } from "@/components/icons";
import { getWorkoutInsights } from "@/lib/ai";
import { getExerciseCatalog, getLiftLogsForMember } from "@/lib/firebase/read-models";
import type { Exercise, LiftLog } from "@/types/domain";

/**
 * WorkoutInsightsCard — server component.
 * Renders trainer-style tips from the member's lift logs.
 * No AI API, no loading state, renders at request time.
 */
export async function ProfileAiSummary({ memberId }: { memberId: string }) {
  let liftLogs: LiftLog[] = [];
  let exercises: Exercise[] = [];

  try {
    const [logsResult, exercisesResult] = await Promise.all([
      getLiftLogsForMember(memberId),
      getExerciseCatalog()
    ]);
    liftLogs = logsResult.liftLogs ?? [];
    exercises = exercisesResult.exercises ?? [];
  } catch {
    // silently fall back to empty arrays
  }

  const insight = getWorkoutInsights(liftLogs, exercises);

  return (
    <section className="list-panel" style={{ marginTop: 24 }}>
      <div className="panel-title">
        <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Activity /> Training Insights
        </h2>
        <span className="status-pill status-neutral">Based on your logs</span>
      </div>
      <div style={{ padding: "20px 24px" }}>
        {insight.split("\n\n").map((para, i) => (
          <p
            key={i}
            style={{
              margin: i === 0 ? "0 0 10px" : "10px 0 0",
              fontSize: "0.9rem",
              lineHeight: 1.65,
              color: "var(--text-soft)"
            }}
            dangerouslySetInnerHTML={{
              __html: para.replace(/\*\*(.+?)\*\*/g, "<strong style='color:var(--text)'>$1</strong>")
            }}
          />
        ))}
      </div>
    </section>
  );
}
