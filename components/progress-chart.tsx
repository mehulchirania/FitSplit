"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { Exercise, LiftLog } from "@/types/domain";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

interface Props {
  exercises: Exercise[];
  liftLogs: LiftLog[];
}

export function ProgressChart({ exercises, liftLogs }: Props) {
  // Build exercise options that have at least 2 logged entries
  const exerciseMap = new Map<string, { name: string; logs: { date: string; weight: number }[] }>();

  for (const log of liftLogs) {
    if (!log.weight || !log.loggedAt) continue;
    const exercise = exercises.find((e) => e.id === log.exerciseId);
    if (!exercise) continue;
    if (!exerciseMap.has(log.exerciseId)) {
      exerciseMap.set(log.exerciseId, { name: exercise.name, logs: [] });
    }
    exerciseMap.get(log.exerciseId)!.logs.push({
      date: formatDate(log.loggedAt),
      weight: log.weight,
    });
  }

  const options = Array.from(exerciseMap.entries())
    .filter(([, v]) => v.logs.length >= 1)
    .map(([id, v]) => ({ id, name: v.name, logs: v.logs }));

  const [selectedId, setSelectedId] = useState(options[0]?.id ?? "");
  const selected = exerciseMap.get(selectedId);

  if (options.length === 0) {
    return (
      <div style={{ padding: "20px 0", color: "var(--text-faint)", fontSize: "0.85rem" }}>
        Log at least one set to see your progress chart.
      </div>
    );
  }

  const chartData = selected?.logs ?? [];
  const maxWeight = Math.max(...chartData.map((d) => d.weight), 0);
  const minWeight = Math.min(...chartData.map((d) => d.weight), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Exercise selector */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelectedId(opt.id)}
            style={{
              padding: "5px 12px",
              borderRadius: "999px",
              border: "1px solid",
              borderColor: selectedId === opt.id ? "rgba(200,241,53,.4)" : "var(--border)",
              background: selectedId === opt.id ? "rgba(200,241,53,.1)" : "transparent",
              color: selectedId === opt.id ? "var(--brand)" : "var(--text-soft)",
              fontSize: "12px",
              fontWeight: selectedId === opt.id ? 700 : 500,
              cursor: "pointer",
              transition: "all 140ms",
            }}
          >
            {opt.name}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--text-faint)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[Math.max(0, minWeight - 5), maxWeight + 5]}
              tick={{ fill: "var(--text-faint)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--text)",
              }}
              formatter={(val) => [`${Number(val ?? 0)} kg`, "Weight"]}
              labelStyle={{ color: "var(--text-soft)", marginBottom: "4px" }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#C8F135"
              strokeWidth={2}
              dot={{ fill: "#C8F135", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {chartData.length === 1 && (
        <p style={{ fontSize: "12px", color: "var(--text-faint)", margin: 0 }}>
          Log more sets to see your trend line.
        </p>
      )}
    </div>
  );
}
