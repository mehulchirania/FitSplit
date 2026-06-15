"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { LiftLog, Exercise } from "@/types/domain";

export function ProgressiveOverloadChart({
  liftLogs,
  exercises,
}: {
  liftLogs: LiftLog[];
  exercises: Exercise[];
}) {
  const exercisesWithLogs = useMemo(() => {
    const ids = new Set(liftLogs.map((log) => log.exerciseId));
    return exercises.filter((ex) => ids.has(ex.id));
  }, [liftLogs, exercises]);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    exercisesWithLogs[0]?.id || ""
  );

  const { chartData, prValue } = useMemo(() => {
    if (!selectedExerciseId) return { chartData: [], prValue: 0 };

    const logsForExercise = liftLogs.filter(
      (log) => log.exerciseId === selectedExerciseId
    );

    const maxWeightPerDay = new Map<string, number>();

    logsForExercise.forEach((log) => {
      const dateStr = log.loggedAt.split("T")[0];
      const currentMax = maxWeightPerDay.get(dateStr) || 0;
      if (log.weight > currentMax) {
        maxWeightPerDay.set(dateStr, log.weight);
      }
    });

    const sortedData = Array.from(maxWeightPerDay.entries())
      .map(([date, maxWeight]) => {
        const [year, month, day] = date.split("-");
        const formattedDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        ).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
        return { date: formattedDate, rawDate: date, weight: maxWeight };
      })
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    const prValue = sortedData.reduce((max, d) => Math.max(max, d.weight), 0);

    return { chartData: sortedData, prValue };
  }, [liftLogs, selectedExerciseId]);

  if (exercisesWithLogs.length === 0) {
    return (
      <section className="form-panel" style={{ marginTop: "24px" }}>
        <p className="eyebrow" style={{ margin: 0 }}>Progressive Overload</p>
        <p style={{ marginTop: "12px", marginBottom: 0 }}>
          Log some lifts during your workouts to see your strength progress!
        </p>
      </section>
    );
  }

  return (
    <section className="form-panel" style={{ marginTop: "24px" }}>
      <div className="panel-title" style={{ padding: 0, border: "none", marginBottom: "20px" }}>
        <p className="eyebrow" style={{ margin: 0 }}>Progressive Overload</p>
        <select
          className="exercise-select"
          value={selectedExerciseId}
          onChange={(e) => setSelectedExerciseId(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          {exercisesWithLogs.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ width: "100%", height: 320, minHeight: 320, minWidth: 0 }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart
              data={chartData}
              margin={{ top: 16, right: 16, bottom: 5, left: -20 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="var(--text-faint)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={12}
              />
              <YAxis
                stroke="var(--text-faint)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
                dx={-8}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-elevated)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  borderRadius: "10px",
                  boxShadow: "var(--shadow)",
                  padding: "12px"
                }}
                itemStyle={{ color: "var(--brand)", fontWeight: "bold" }}
                formatter={(value) => [`${Number(value ?? 0)} kg`, "Max Weight"]}
              />
              {/* PR reference line */}
              {prValue > 0 && (
                <ReferenceLine
                  y={prValue}
                  stroke="var(--brand)"
                  strokeDasharray="6 4"
                  strokeOpacity={0.55}
                  label={{
                    value: `PR ${prValue} kg`,
                    position: "insideTopRight",
                    fontSize: 11,
                    fill: "var(--brand)",
                    fontWeight: 600
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="weight"
                name="Max Weight"
                stroke="var(--brand)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, fill: "var(--brand)", stroke: "var(--bg-elevated)", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>No data to display.</p>
        )}
      </div>
    </section>
  );
}
