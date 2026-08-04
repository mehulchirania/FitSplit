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
  onExerciseSelect?: (exerciseId: string) => void;
}

export function ProgressChart({ exercises, liftLogs, onExerciseSelect }: Props) {
  // Build exercise options — one entry per exercise, logs sorted oldest → newest
  const exerciseMap = new Map<string, { name: string; logs: { date: string; rawDate: string; weight: number }[] }>();

  for (const log of liftLogs) {
    if (!log.weight || !log.loggedAt) continue;
    const exercise = exercises.find((e) => e.id === log.exerciseId);
    if (!exercise) continue;
    if (!exerciseMap.has(log.exerciseId)) {
      exerciseMap.set(log.exerciseId, { name: exercise.name, logs: [] });
    }
    exerciseMap.get(log.exerciseId)!.logs.push({
      date: formatDate(log.loggedAt),
      rawDate: log.loggedAt.slice(0, 10),
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
      <div style={{
        alignItems: "center",
        background: "var(--bg-subtle)",
        border: "1px dashed var(--border)",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "32px 20px",
        textAlign: "center"
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-faint)", opacity: 0.5 }} aria-hidden>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <p style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.9rem", margin: 0 }}>No lift data yet</p>
        <span style={{ color: "var(--text-faint)", fontSize: "0.8rem" }}>
          Log at least one set during a workout to see your strength chart.
        </span>
      </div>
    );
  }

  // Sort ascending (oldest left → newest right = psychological "improving" direction)
  const chartData = [...(selected?.logs ?? [])].sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  const maxWeight = Math.max(...chartData.map((d) => d.weight), 0);
  const minWeight = Math.min(...chartData.map((d) => d.weight), 0);

  function selectExercise(id: string) {
    setSelectedId(id);
    onExerciseSelect?.(id);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Exercise selector */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => selectExercise(opt.id)}
            title={`Click to pre-fill "${opt.name}" in the log form`}
            style={{
              padding: "5px 12px",
              borderRadius: "999px",
              border: "1px solid",
              borderColor: selectedId === opt.id ? "color-mix(in srgb, var(--brand) 40%, transparent)" : "var(--border)",
              background: selectedId === opt.id ? "color-mix(in srgb, var(--brand) 10%, transparent)" : "transparent",
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

      {/* Hint when onExerciseSelect is wired */}
      {onExerciseSelect && (
        <p style={{ fontSize: "11px", color: "var(--text-faint)", margin: 0 }}>
          Tap an exercise above to jump straight to logging it ↓
        </p>
      )}

      {/* Chart */}
      <div style={{ height: 180, minHeight: 180, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
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
                background: "color-mix(in srgb, var(--bg-elevated) 90%, transparent)",
                border: "1px solid var(--border)",
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
              stroke="var(--brand)"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorWeight)"
              dot={{ fill: "var(--brand)", r: 4, strokeWidth: 0, strokeOpacity: 0.2 }}
              activeDot={{ r: 6, strokeWidth: 4, stroke: "color-mix(in srgb, var(--brand) 30%, transparent)" }}
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
