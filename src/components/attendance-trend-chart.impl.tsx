"use client";

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Activity } from "@/components/icons";
import type { DailySessionCount } from "@/lib/firebase/read-models";

// iso is a bare "YYYY-MM-DD" date-only string. Parsing it bare (no time
// component) anchors it at a deterministic UTC instant, identical on server
// and client; explicit timeZone then formats that instant back to the
// correct IST calendar day. Appending a literal "T00:00:00" (as this used
// to) forces *local-time* parsing instead, which resolves to a genuinely
// different underlying instant on a UTC server than an IST browser.
function shortLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
}

function dayOfWeek(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" });
}

type CustomTooltipProps = {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
};

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div style={{
      background: "color-mix(in srgb, var(--bg-elevated) 95%, transparent)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "8px 12px",
      fontSize: 13,
    }}>
      <div style={{ color: "var(--text-soft)", marginBottom: 2 }}>
        {label ? `${dayOfWeek(label)}, ${shortLabel(label)}` : ""}
      </div>
      <div style={{ fontWeight: 700, color: val > 0 ? "var(--brand)" : "var(--text-faint)" }}>
        {val} {val === 1 ? "session" : "sessions"}
      </div>
    </div>
  );
}

export function AttendanceTrendChart({ data }: { data: DailySessionCount[] }) {
  const total30  = data.reduce((s, d) => s + d.sessions, 0);
  const thisWeek = data.slice(-7).reduce((s, d) => s + d.sessions, 0);
  const lastWeek = data.slice(-14, -7).reduce((s, d) => s + d.sessions, 0);
  const avg7     = thisWeek / 7;
  const maxVal   = Math.max(...data.map((d) => d.sessions), 1);

  const pct =
    lastWeek > 0
      ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
      : null;

  const hasData = total30 > 0;

  return (
    <div className="list-panel" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "18px 20px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div>
          <p className="eyebrow">Last 30 days</p>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Training Activity</h2>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, lineHeight: 1 }}>{total30}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", marginTop: 2 }}>total sessions</div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, lineHeight: 1 }}>{thisWeek}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", marginTop: 2 }}>this week</div>
          </div>

          {pct !== null && (
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                lineHeight: 1,
                color: pct > 0 ? "var(--success)" : pct < 0 ? "var(--danger)" : "var(--text-soft)",
              }}>
                {pct > 0 ? "↑" : pct < 0 ? "↓" : "—"}{Math.abs(pct)}%
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", marginTop: 2 }}>vs last week</div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      {hasData ? (
        <div style={{ height: 200, padding: "16px 16px 8px 4px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, left: -22, bottom: 0 }}
              barGap={1}
              barCategoryGap="15%"
            >
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => shortLabel(v)}
                tick={{ fill: "var(--text-faint)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={6}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-muted)" }} />

              {avg7 > 0 && (
                <ReferenceLine
                  y={avg7}
                  stroke="color-mix(in srgb, var(--brand) 35%, transparent)"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  label={{
                    value: "7d avg",
                    position: "insideTopRight",
                    fill: "color-mix(in srgb, var(--brand) 55%, transparent)",
                    fontSize: 10,
                  }}
                />
              )}

              <Bar dataKey="sessions" radius={[3, 3, 0, 0]} maxBarSize={20}>
                {data.map((d, i) => {
                  const brightness = d.sessions === 0
                    ? 0
                    : Math.max(0.3, d.sessions / maxVal);
                  return (
                    <Cell
                      key={i}
                      fill={
                        d.sessions === 0
                          ? "var(--border)"
                          : d.sessions >= avg7 && avg7 > 0
                          ? "var(--brand)"
                          : `color-mix(in srgb, var(--brand) ${Math.round(brightness * 70 + 30)}%, transparent)`
                      }
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="atc-empty">
          <Activity />
          <p className="atc-empty__title">No sessions logged yet</p>
          <p className="atc-empty__body">
            Attendance is tracked automatically the first time a member logs a lift each day —
            there&apos;s nothing to set up. This chart fills in as members start training.
          </p>
        </div>
      )}

      {/* Footer legend */}
      {hasData && (
        <div style={{
          padding: "8px 20px 14px",
          display: "flex",
          gap: 16,
          fontSize: "0.72rem",
          color: "var(--text-faint)",
          borderTop: "1px solid var(--border)",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--brand)", display: "inline-block" }} />
            At or above 7-day avg
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "color-mix(in srgb, var(--brand) 50%, transparent)", display: "inline-block" }} />
            Below avg
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--border)", display: "inline-block" }} />
            Rest day
          </span>
        </div>
      )}
    </div>
  );
}
