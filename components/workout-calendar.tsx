"use client";

import { useState, useMemo } from "react";
import type { WorkoutCalendarDay } from "@/lib/firebase/read-models/progress";
import type { DayLog, LiftLog } from "@/types/domain";

type Props = {
  liftLogs: LiftLog[];
  dayLogs: DayLog[];
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildCalendarDays(liftLogs: LiftLog[], dayLogs: DayLog[]): Map<string, WorkoutCalendarDay> {
  const map = new Map<string, WorkoutCalendarDay>();

  // Trained: any date with a lift log
  for (const log of liftLogs) {
    if (!log.loggedAt) continue;
    const date = log.loggedAt.slice(0, 10);
    if (!map.has(date)) {
      map.set(date, { date, trained: false, skipped: false, makeupPending: false });
    }
    map.get(date)!.trained = true;
  }

  // Skipped / makeup pending: day logs
  for (const dl of dayLogs) {
    if (!dl.loggedAt) continue;
    const date = dl.loggedAt.slice(0, 10);
    if (!map.has(date)) {
      map.set(date, { date, trained: false, skipped: false, makeupPending: false });
    }
    const entry = map.get(date)!;
    if (dl.status === "skipped") {
      entry.skipped = true;
      entry.skipReason = dl.skipReason;
      if (dl.makeupStatus === "pending") entry.makeupPending = true;
    }
  }

  return map;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  // getDay() returns 0=Sun; convert to Mon=0
  const dow = new Date(year, month, 1).getDay();
  return (dow + 6) % 7;
}

type DayDetail = {
  date: string;
  trained: boolean;
  skipped: boolean;
  makeupPending: boolean;
  skipReason?: string;
};

export function WorkoutCalendar({ liftLogs, dayLogs }: Props) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);

  const calendarMap = useMemo(() => buildCalendarDays(liftLogs, dayLogs), [liftLogs, dayLogs]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth);
  const todayStr = now.toISOString().slice(0, 10);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(null);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(null);
  }

  // Build cells: leading blanks + day cells
  const cells: Array<null | { day: number; date: string; info: WorkoutCalendarDay | undefined }> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const month = String(viewMonth + 1).padStart(2, "0");
    const dayStr = String(d).padStart(2, "0");
    const date = `${viewYear}-${month}-${dayStr}`;
    cells.push({ day: d, date, info: calendarMap.get(date) });
  }

  const SKIP_REASON_LABELS: Record<string, string> = {
    rest: "Rest day",
    no_time: "No time",
    equipment: "No equipment",
    sick: "Sick",
    other: "Other"
  };

  // Totals for summary row
  const trainedCount = [...calendarMap.values()].filter(
    (d) => d.trained && d.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`)
  ).length;
  const skippedCount = [...calendarMap.values()].filter(
    (d) => d.skipped && d.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`)
  ).length;

  return (
    <div className="workout-calendar">
      {/* Header */}
      <div className="cal-nav">
        <button
          aria-label="Previous month"
          className="cal-nav-btn"
          onClick={prevMonth}
          type="button"
        >
          ‹
        </button>
        <h3 className="cal-month-label">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h3>
        <button
          aria-label="Next month"
          className="cal-nav-btn"
          disabled={viewYear === now.getFullYear() && viewMonth === now.getMonth()}
          onClick={nextMonth}
          type="button"
        >
          ›
        </button>
      </div>

      {/* Summary */}
      <div className="cal-summary">
        <span className="cal-legend-item">
          <span className="cal-dot cal-dot--trained" aria-hidden="true" />
          Trained: {trainedCount}
        </span>
        <span className="cal-legend-item">
          <span className="cal-dot cal-dot--skipped" aria-hidden="true" />
          Skipped: {skippedCount}
        </span>
        <span className="cal-legend-item">
          <span className="cal-dot cal-dot--makeup" aria-hidden="true" />
          Makeup pending
        </span>
      </div>

      {/* Day-of-week headers */}
      <div className="cal-grid cal-grid--header">
        {DAY_LABELS.map((l) => (
          <div className="cal-dow" key={l}>{l}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="cal-grid">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div className="cal-cell cal-cell--empty" key={`blank-${idx}`} />;
          }
          const { day, date, info } = cell;
          const isToday = date === todayStr;
          const isSelected = selectedDay?.date === date;
          const isFuture = date > todayStr;

          let cellClass = "cal-cell";
          if (isToday) cellClass += " cal-cell--today";
          if (isSelected) cellClass += " cal-cell--selected";
          if (isFuture) cellClass += " cal-cell--future";

          return (
            <button
              aria-label={`${day} ${MONTH_NAMES[viewMonth]}: ${
                info?.trained ? "trained" : info?.skipped ? "skipped" : "no activity"
              }`}
              aria-pressed={isSelected}
              className={cellClass}
              disabled={isFuture}
              key={date}
              onClick={() =>
                setSelectedDay(isSelected ? null : {
                  date,
                  trained: Boolean(info?.trained),
                  skipped: Boolean(info?.skipped),
                  makeupPending: Boolean(info?.makeupPending),
                  skipReason: info?.skipReason
                })
              }
              type="button"
            >
              <span className="cal-cell-day">{day}</span>
              {info && (
                <span className="cal-cell-dots" aria-hidden="true">
                  {info.trained && <span className="cal-dot cal-dot--trained" />}
                  {info.skipped && !info.trained && <span className="cal-dot cal-dot--skipped" />}
                  {info.makeupPending && <span className="cal-dot cal-dot--makeup" />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="cal-detail" role="status" aria-live="polite">
          <p className="cal-detail-date">
            {new Date(selectedDay.date + "T12:00:00").toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long"
            })}
          </p>
          <div className="cal-detail-badges">
            {selectedDay.trained && (
              <span className="status-pill status-active">Trained</span>
            )}
            {selectedDay.skipped && (
              <span className="status-pill status-expired">
                Skipped{selectedDay.skipReason
                  ? ` · ${SKIP_REASON_LABELS[selectedDay.skipReason] ?? selectedDay.skipReason}`
                  : ""}
              </span>
            )}
            {selectedDay.makeupPending && (
              <span className="status-pill status-expiring">Makeup pending</span>
            )}
            {!selectedDay.trained && !selectedDay.skipped && (
              <span className="status-pill status-neutral">No activity logged</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
