"use client";

// C10: Attendance-over-time LineChart for the owner dashboard.
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { DailySessionCount } from "@/lib/firebase/read-models";

type Props = { data: DailySessionCount[] };

function shortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function AttendanceTrendChart({ data }: Props) {
  const hasData = data.some((d) => d.sessions > 0);

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "16px",
        padding: "24px",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "1.1rem",
            fontWeight: 700,
          }}
        >
          Attendance Trend
        </h2>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: "0.8rem",
            color: "var(--text-soft)",
          }}
        >
          Completed workout sessions — last 30 days
        </p>
      </div>

      {hasData ? (
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 4, right: 12, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => shortDate(v)}
                tick={{ fill: "var(--text-faint)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--text-faint)", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(20, 20, 20, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  fontSize: "13px",
                  color: "var(--text)",
                }}
                labelFormatter={(v) => shortDate(String(v))}
                formatter={(val) => [val, "Sessions"]}
                cursor={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="var(--brand)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--brand)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p
          style={{
            textAlign: "center",
            color: "var(--text-faint)",
            fontSize: "0.85rem",
            padding: "40px 0",
          }}
        >
          No completed sessions recorded in the last 30 days.
        </p>
      )}
    </div>
  );
}
