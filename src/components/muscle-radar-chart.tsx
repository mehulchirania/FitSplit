"use client";

import { useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { Exercise, LiftLog } from "@/types/domain";

export function MuscleRadarChart({
  liftLogs,
  exercises
}: {
  liftLogs: LiftLog[];
  exercises: Exercise[];
}) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {
      Chest: 0,
      Back: 0,
      Shoulders: 0,
      Arms: 0,
      Legs: 0,
      Core: 0
    };

    const exerciseMap = new Map(exercises.map(e => [e.id, e]));

    // Count sets per muscle group over all time (or we could limit to recent)
    for (const log of liftLogs) {
      const ex = exerciseMap.get(log.exerciseId);
      if (ex) {
        let group = ex.muscleGroup as string;
        if (group === "Biceps" || group === "Triceps") group = "Arms";
        if (counts[group] !== undefined) {
          counts[group] += (log.sets || 1);
        }
      }
    }

    return Object.entries(counts).map(([subject, A]) => ({
      subject,
      A,
      fullMark: Math.max(10, ...Object.values(counts))
    }));
  }, [liftLogs, exercises]);

  // Hide if no data
  if (data.every(d => d.A === 0)) {
    return null;
  }

  return (
    <section className="list-panel" style={{ marginTop: 16 }}>
      <div className="panel-title">
        <h2>Muscle Distribution</h2>
        <span className="status-pill status-active">Total Sets</span>
      </div>
      <div style={{ width: "100%", height: 320, background: "var(--bg-subtle)", borderRadius: "var(--radius)", padding: "16px 0", border: "1px solid var(--border)" }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--text-soft)", fontSize: 13, fontWeight: 500 }} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)" }}
              itemStyle={{ color: "var(--brand)" }}
              formatter={(value) => [`${Number(value ?? 0)} sets`, "Volume"]}
            />
            <Radar name="Sets" dataKey="A" stroke="var(--brand)" fill="var(--brand)" fillOpacity={0.5} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
