"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
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
      <div style={{ height: 180, minHeight: 180, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C8F135" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#C8F135" stopOpacity={0} />
              </linearGradient>
            </defs>
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
                background: "rgba(10, 10, 10, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "var(--text)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)"
              }}
              formatter={(val) => [`${Number(val ?? 0)} kg`, "Weight"]}
              labelStyle={{ color: "var(--text-soft)", marginBottom: "6px", fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="weight"
              stroke="#C8F135"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorWeight)"
              dot={{ fill: "#C8F135", r: 4, strokeWidth: 0, strokeOpacity: 0.2 }}
              activeDot={{ r: 6, strokeWidth: 4, stroke: "rgba(200,241,53,0.3)" }}
            />
          </AreaChart>
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
