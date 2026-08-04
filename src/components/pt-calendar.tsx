"use client";

// C11: Replaced FullCalendar (~170 KB) with a lightweight custom month-grid
// calendar. No external calendar dependency — saves ~170 KB from the bundle.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reschedulePTSession } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import { nowInIST } from "@/lib/workout-utils";
import type { PTSession } from "@/types/domain";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// isoDate reads back via toISOString() (always UTC). For that to reliably
// round-trip to the SAME calendar-day string a session was actually
// scheduled for, every Date this is called on must be constructed as a UTC
// anchor too (see startD/endD/firstDay below) — mixing UTC extraction with
// local-time-forcing construction (a bare `new Date(str)` on a full
// datetime, or the multi-arg `new Date(y, m, d)` constructor, both of which
// are local-time) silently shifts which calendar cell a session lands under
// whenever the runtime's timezone isn't UTC, and disagrees between the
// server's render and the client's for the same reason as a hydration
// mismatch.
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shortMonth(d: Date) {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

function statusColor(status: PTSession["status"]) {
  switch (status) {
    case "active":    return "var(--success)";
    case "scheduled": return "var(--brand)";
    case "completed": return "var(--text-soft)";
    case "cancelled": return "var(--danger)";
    default:          return "var(--text-faint)";
  }
}

export function PTCalendar({ sessions }: { sessions: PTSession[] }) {
  const router = useRouter();
  const today = nowInIST();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [isPending, startTransition] = useTransition();

  // Build a map from ISO date → sessions that overlap that day.
  const sessionsByDate = new Map<string, PTSession[]>();
  for (const s of sessions) {
    const start = s.planStartDate ?? s.scheduledAt;
    const end   = s.planEndDate ?? start;
    if (!start) continue;

    // Anchor at noon, not midnight — a literal "T00:00:00" forces local-time
    // parsing, which round-trips to a different calendar day via isoDate()'s
    // toISOString() (UTC) whenever the runtime isn't UTC. Noon is far enough
    // from any midnight boundary that it survives being reinterpreted in
    // either direction without shifting day, on any runtime.
    const startD = new Date(start + "T12:00:00");
    const endD   = new Date(end   + "T12:00:00");
    const cursor = new Date(startD);
    while (cursor <= endD) {
      const key = isoDate(cursor);
      if (!sessionsByDate.has(key)) sessionsByDate.set(key, []);
      sessionsByDate.get(key)!.push(s);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Month grid: weeks × 7 days. The multi-arg Date constructor is always
  // local-time, so anchor explicitly at UTC (Date.UTC + getUTC*) — otherwise
  // this computation depends on the runtime's own timezone, which differs
  // between the server render and a non-UTC browser.
  const firstDay = new Date(Date.UTC(viewYear, viewMonth, 1));
  const startOffset = firstDay.getUTCDay(); // 0=Sun
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();

  // Cells: leading nulls then day numbers.
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];
  // Pad to full week rows.
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const todayKey = isoDate(today);

  async function handleDrop(e: React.DragEvent, newDateKey: string) {
    e.preventDefault();
    const sessionId = e.dataTransfer.getData("text/plain");
    if (!sessionId) return;
    
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status !== "scheduled") return;

    // Retain the original time
    const oldTime = session.scheduledAt ? session.scheduledAt.split("T")[1] : "06:00:00";
    
    const formData = new FormData();
    formData.set("ptSessionId", sessionId);
    formData.set("scheduledAt", `${newDateKey}T${oldTime}`);

    startTransition(async () => {
      await reschedulePTSession(initialFormActionState, formData);
      router.refresh();
    });
  }

  return (
    <div className="pt-calendar-wrapper" style={{ userSelect: "none" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <button
          type="button"
          onClick={prevMonth}
          className="button button-secondary"
          style={{ padding: "4px 10px", fontSize: "1rem", minHeight: "32px" }}
          aria-label="Previous month"
        >
          ‹
        </button>
        <strong style={{ flex: 1, textAlign: "center", fontSize: "1rem" }}>
          {shortMonth(new Date(Date.UTC(viewYear, viewMonth, 1)))}
        </strong>
        <button
          type="button"
          onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
          className="button button-secondary"
          style={{ padding: "4px 10px", fontSize: "0.8rem", minHeight: "32px" }}
        >
          Today
        </button>
        <button
          type="button"
          onClick={nextMonth}
          className="button button-secondary"
          style={{ padding: "4px 10px", fontSize: "1rem", minHeight: "32px" }}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day-of-week header row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "2px" }}>
        {DAYS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "var(--text-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "4px 0"
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
        {cells.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`empty-${idx}`}
                style={{
                  minHeight: "72px",
                  background: "color-mix(in srgb, var(--text) 1.5%, transparent)",
                  borderRadius: "8px"
                }}
              />
            );
          }

          const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const daySessions = sessionsByDate.get(dateKey) ?? [];
          const isToday = dateKey === todayKey;

          return (
            <div
              key={dateKey}
              style={{
                minHeight: "72px",
                background: isToday
                  ? "var(--brand-soft)"
                  : "color-mix(in srgb, var(--text) 2%, transparent)",
                border: isToday
                  ? "1px solid color-mix(in srgb, var(--brand) 30%, transparent)"
                  : "1px solid var(--border)",
                borderRadius: "8px",
                padding: "6px 4px",
                display: "flex",
                flexDirection: "column",
                gap: "3px",
                overflow: "hidden",
                opacity: isPending ? 0.7 : 1
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => handleDrop(e, dateKey)}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: isToday ? 800 : 500,
                  color: isToday ? "var(--brand)" : "var(--text-soft)",
                  textAlign: "right",
                  paddingRight: "2px"
                }}
              >
                {day}
              </span>

              {daySessions.slice(0, 3).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  title={`${s.memberName ?? "Member"} — ${s.trainerName ?? "Trainer"} (${s.status})`}
                  onClick={() =>
                    router.push(
                      s.status === "active"
                        ? `/owner/training/session/${s.id}`
                        : `/owner/members/${s.memberId}`
                    )
                  }
                  draggable={s.status === "scheduled"}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", s.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  style={{
                    background: `color-mix(in srgb, ${statusColor(s.status)} 18%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${statusColor(s.status)} 35%, transparent)`,
                    borderRadius: "4px",
                    color: statusColor(s.status),
                    cursor: s.status === "scheduled" ? "grab" : "pointer",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    overflow: "hidden",
                    padding: "2px 4px",
                    textAlign: "left",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    width: "100%",
                    opacity: isPending ? 0.5 : 1
                  }}
                >
                  {s.memberName ?? "Member"}
                </button>
              ))}

              {daySessions.length > 3 && (
                <span
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-faint)",
                    textAlign: "center"
                  }}
                >
                  +{daySessions.length - 3} more
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="pt-cal-legend">
        {(["active", "scheduled", "completed", "cancelled"] as const).map((s) => (
          <span key={s} className="pt-cal-legend-item">
            <span
              className="pt-cal-legend-dot"
              style={{ background: statusColor(s) }}
            />
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
}
