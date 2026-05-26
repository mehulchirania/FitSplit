"use client";

// Gym Usage panel: slot member distribution + top exercises.
// Pure CSS horizontal bars — no Recharts. Simpler, faster, more readable.

import type { SlotLoad } from "@/lib/firebase/read-models";

const SLOT_COLORS: Record<"A" | "B" | "C" | "D", string> = {
  A: "#22c55e",
  B: "#3b82f6",
  C: "#f59e0b",
  D: "#a855f7",
};

function getTopExercises(slots: SlotLoad[], limit = 8) {
  const map = new Map<string, number>();
  for (const slot of slots) {
    for (const ex of slot.exercises) {
      map.set(ex.exerciseName, (map.get(ex.exerciseName) ?? 0) + ex.count);
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function HBar({
  pct,
  color,
  height = 6,
}: {
  pct: number;
  color: string;
  height?: number;
}) {
  return (
    <div
      style={{
        height,
        borderRadius: 999,
        background: "rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.max(pct, pct > 0 ? 3 : 0)}%`,
          borderRadius: 999,
          background: color,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

export function GymFloorLoadMap({ slots }: { slots: SlotLoad[] }) {
  const maxMembers   = Math.max(...slots.map((s) => s.memberCount), 1);
  const totalMembers = slots.reduce((s, slot) => s + slot.memberCount, 0);
  const topExercises = getTopExercises(slots);
  const maxExCount   = topExercises[0]?.count ?? 1;

  const hasExercises = topExercises.length > 0;
  const hasMembers   = totalMembers > 0;

  return (
    <div className="list-panel" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: "18px 20px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <p className="eyebrow">Program data</p>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Gym Usage</h2>
        </div>
        {hasMembers && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, lineHeight: 1 }}>
              {totalMembers}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", marginTop: 2 }}>
              active program slots
            </div>
          </div>
        )}
      </div>

      {/* Two-column body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        {/* ── Left: Peak Hours ── */}
        <div
          style={{
            padding: "16px 20px 20px",
            borderRight: "1px solid var(--border)",
          }}
        >
          <p className="eyebrow" style={{ marginBottom: 14 }}>Peak Hours</p>

          {slots.map((slot) => {
            const pct = maxMembers > 0
              ? Math.round((slot.memberCount / maxMembers) * 100)
              : 0;
            const color = SLOT_COLORS[slot.slotId];
            return (
              <div key={slot.slotId} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 6,
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: color,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    {slot.time}
                  </span>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color:
                        slot.memberCount > 0
                          ? "var(--text-soft)"
                          : "var(--text-faint)",
                      fontWeight: slot.memberCount > 0 ? 600 : 400,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {slot.memberCount > 0
                      ? `${slot.memberCount} member${slot.memberCount !== 1 ? "s" : ""}`
                      : "empty"}
                  </span>
                </div>
                <HBar pct={pct} color={color} height={7} />
              </div>
            );
          })}

          {!hasMembers && (
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-faint)",
                margin: "8px 0 0",
              }}
            >
              Assign workout programs to members to see slot distribution.
            </p>
          )}
        </div>

        {/* ── Right: Most Trained ── */}
        <div style={{ padding: "16px 20px 20px" }}>
          <p className="eyebrow" style={{ marginBottom: 14 }}>Most Trained</p>

          {hasExercises ? (
            topExercises.map((ex, idx) => {
              const pct = Math.round((ex.count / maxExCount) * 100);
              // Opacity gradient: first bar full, last bar at 45%
              const opacity = 1 - (idx / topExercises.length) * 0.55;
              return (
                <div key={ex.name} style={{ marginBottom: 13 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 5,
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {ex.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-faint)",
                        flexShrink: 0,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      ×{ex.count}
                    </span>
                  </div>
                  <HBar
                    pct={pct}
                    color={`color-mix(in srgb, var(--brand) ${Math.round(opacity * 100)}%, rgba(200,241,53,0.1))`}
                    height={5}
                  />
                </div>
              );
            })
          ) : (
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-faint)",
                margin: "8px 0 0",
              }}
            >
              No program assignments yet. Exercise demand will appear here once members are assigned plans.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "10px 20px 12px",
          borderTop: "1px solid var(--border)",
          fontSize: "0.72rem",
          color: "var(--text-faint)",
        }}
      >
        Based on active program assignments and member time slots.
      </div>
    </div>
  );
}
