"use client";

import { useMemo, useState } from "react";
import { nowInIST } from "@/lib/workout-utils";
import type { ActivityLog, DayLog, LiftLog, MacroLog, MacroNutritionTarget } from "@/types/domain";

type Props = {
  liftLogs: LiftLog[];
  dayLogs: DayLog[];
  activityLogs?: ActivityLog[];
  macroLogs?: MacroLog[];
  macroTarget?: MacroNutritionTarget;
};

type WorkoutCalendarDay = {
  date: string;
  trained: boolean;
  skipped: boolean;
  makeupPending: boolean;
  dayTitle?: string;
  skipReason?: string;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SKIP_REASON_LABELS: Record<string, string> = {
  rest: "Rest day",
  no_time: "No time",
  equipment: "No equipment",
  sick: "Sick",
  other: "Other"
};

const DEFAULT_MACRO_TARGET: Required<MacroNutritionTarget> = {
  calories: 2200,
  protein: 140,
  carbs: 240,
  fat: 70,
  waterLiters: 3,
  notes: ""
};

type CalendarInfo = WorkoutCalendarDay & {
  prLogged?: boolean;
  cardioLogged?: boolean;
  stretchLogged?: boolean;
  macroMet?: boolean;
};

function dateKeyFromIso(iso?: string) {
  return iso ? iso.slice(0, 10) : "";
}

function isMacroTargetMet(log: MacroLog, target?: MacroNutritionTarget) {
  const goals = {
    calories: target?.calories || DEFAULT_MACRO_TARGET.calories,
    protein: target?.protein || DEFAULT_MACRO_TARGET.protein,
    carbs: target?.carbs || DEFAULT_MACRO_TARGET.carbs,
    fat: target?.fat || DEFAULT_MACRO_TARGET.fat
  };
  const calories = Math.round(log.protein * 4 + log.carbs * 4 + log.fat * 9);
  return (
    log.protein >= goals.protein &&
    log.carbs >= goals.carbs &&
    log.fat >= goals.fat &&
    calories >= goals.calories
  );
}

function buildCalendarDays(
  liftLogs: LiftLog[],
  dayLogs: DayLog[],
  activityLogs: ActivityLog[],
  macroLogs: MacroLog[],
  macroTarget?: MacroNutritionTarget
): Map<string, CalendarInfo> {
  const map = new Map<string, CalendarInfo>();
  const prByExercise = liftLogs.reduce<Map<string, number>>((acc, log) => {
    if (log.weight && log.exerciseId) {
      acc.set(log.exerciseId, Math.max(acc.get(log.exerciseId) ?? 0, log.weight));
    }
    return acc;
  }, new Map());

  const ensure = (date: string) => {
    if (!map.has(date)) {
      map.set(date, { date, trained: false, skipped: false, makeupPending: false });
    }
    return map.get(date)!;
  };

  for (const log of liftLogs) {
    const date = dateKeyFromIso(log.loggedAt);
    if (!date) continue;
    const entry = ensure(date);
    entry.trained = true;
    if (log.weight && prByExercise.get(log.exerciseId) === log.weight) {
      entry.prLogged = true;
    }
  }

  for (const dl of dayLogs) {
    const date = dateKeyFromIso(dl.loggedAt);
    if (!date) continue;
    const entry = ensure(date);
    if (dl.status === "completed") {
      entry.trained = true;
    } else if (dl.status === "skipped") {
      entry.skipped = true;
      entry.skipReason = dl.skipReason;
      if (dl.makeupStatus === "pending") entry.makeupPending = true;
    }
  }

  for (const activity of activityLogs) {
    const date = dateKeyFromIso(activity.loggedAt);
    if (!date) continue;
    const entry = ensure(date);
    if (activity.type === "cardio") entry.cardioLogged = true;
    if (activity.type === "stretch") entry.stretchLogged = true;
  }

  for (const macroLog of macroLogs) {
    if (!macroLog.date) continue;
    const entry = ensure(macroLog.date);
    if (isMacroTargetMet(macroLog, macroTarget)) {
      entry.macroMet = true;
    }
  }

  return map;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const dow = new Date(year, month, 1).getDay();
  return (dow + 6) % 7;
}

type DayDetail = CalendarInfo;

export function WorkoutCalendar({
  liftLogs,
  dayLogs,
  activityLogs = [],
  macroLogs = [],
  macroTarget
}: Props) {
  const now = nowInIST();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);

  const calendarMap = useMemo(
    () => buildCalendarDays(liftLogs, dayLogs, activityLogs, macroLogs, macroTarget),
    [activityLogs, dayLogs, liftLogs, macroLogs, macroTarget]
  );

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

  const cells: Array<null | { day: number; date: string; info: CalendarInfo | undefined }> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(viewMonth + 1).padStart(2, "0");
    const ds = String(d).padStart(2, "0");
    const date = `${viewYear}-${m}-${ds}`;
    cells.push({ day: d, date, info: calendarMap.get(date) });
  }

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const trainedCount = [...calendarMap.values()].filter((d) => d.trained && d.date.startsWith(monthPrefix)).length;
  const activityCount = [...calendarMap.values()].filter((d) => (d.cardioLogged || d.stretchLogged) && d.date.startsWith(monthPrefix)).length;
  const skippedCount = [...calendarMap.values()].filter((d) => d.skipped && d.date.startsWith(monthPrefix)).length;

  return (
    <div className="workout-calendar">
      <div className="cal-header">
        <button aria-label="Previous month" className="cal-nav-btn" onClick={prevMonth} type="button">‹</button>
        <div className="cal-header-center">
          <h3 className="cal-month-label">{MONTH_NAMES[viewMonth]} {viewYear}</h3>
          <div className="cal-month-stats">
            <span className="cal-stat-chip cal-stat-trained">
              <span className="cal-dot cal-dot--trained" aria-hidden="true" />
              {trainedCount} trained
            </span>
            {activityCount > 0 && (
              <span className="cal-stat-chip">
                <span className="cal-dot cal-dot--cardio" aria-hidden="true" />
                {activityCount} extra
              </span>
            )}
            {skippedCount > 0 && (
              <span className="cal-stat-chip cal-stat-skipped">
                <span className="cal-dot cal-dot--skipped" aria-hidden="true" />
                {skippedCount} skipped
              </span>
            )}
          </div>
        </div>
        <button
          aria-label="Next month"
          className="cal-nav-btn"
          disabled={viewYear === now.getFullYear() && viewMonth === now.getMonth()}
          onClick={nextMonth}
          type="button"
        >›</button>
      </div>

      <div className="cal-grid cal-grid--header">
        {DAY_LABELS.map((label) => <div className="cal-dow" key={label}>{label}</div>)}
      </div>

      <div className="cal-grid">
        {cells.map((cell, idx) => {
          if (!cell) return <div className="cal-cell cal-cell--empty" key={`blank-${idx}`} />;
          const { day, date, info } = cell;
          const isToday = date === todayStr;
          const isSelected = selectedDay?.date === date;
          const isFuture = date > todayStr;

          let cellClass = "cal-cell";
          if (info?.trained) cellClass += " cal-cell--trained";
          if (info?.skipped && !info.trained) cellClass += " cal-cell--skipped";
          if (isToday) cellClass += " cal-cell--today";
          if (isSelected) cellClass += " cal-cell--selected";
          if (isFuture) cellClass += " cal-cell--future";

          return (
            <button
              aria-label={`${day} ${MONTH_NAMES[viewMonth]} activity`}
              aria-pressed={isSelected}
              className={cellClass}
              disabled={isFuture}
              key={date}
              onClick={() => setSelectedDay(isSelected ? null : {
                date,
                trained: Boolean(info?.trained),
                skipped: Boolean(info?.skipped),
                makeupPending: Boolean(info?.makeupPending),
                skipReason: info?.skipReason,
                prLogged: Boolean(info?.prLogged),
                cardioLogged: Boolean(info?.cardioLogged),
                stretchLogged: Boolean(info?.stretchLogged),
                macroMet: Boolean(info?.macroMet)
              })}
              type="button"
            >
              <span className="cal-cell-day">{day}</span>
              <span className="cal-markers" aria-hidden="true">
                {info?.trained && <span className="cal-dot cal-dot--trained" />}
                {info?.prLogged && <span className="cal-dot cal-dot--pr" />}
                {info?.cardioLogged && <span className="cal-dot cal-dot--cardio" />}
                {info?.stretchLogged && <span className="cal-dot cal-dot--stretch" />}
                {info?.macroMet && <span className="cal-dot cal-dot--macro" />}
                {info?.makeupPending && <span className="cal-dot cal-dot--makeup" />}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="cal-detail" role="status" aria-live="polite">
          <p className="cal-detail-date">
            {new Date(`${selectedDay.date}T12:00:00`).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "Asia/Kolkata"
            })}
          </p>
          <div className="cal-detail-badges">
            {selectedDay.trained && <span className="status-pill status-active">Workout logged</span>}
            {selectedDay.prLogged && <span className="status-pill status-active">PR logged</span>}
            {selectedDay.cardioLogged && <span className="status-pill status-neutral">Cardio logged</span>}
            {selectedDay.stretchLogged && <span className="status-pill status-neutral">Stretch logged</span>}
            {selectedDay.macroMet && <span className="status-pill status-active">Macro target met</span>}
            {selectedDay.skipped && (
              <span className="status-pill status-expired">
                Skipped{selectedDay.skipReason ? ` / ${SKIP_REASON_LABELS[selectedDay.skipReason] ?? selectedDay.skipReason}` : ""}
              </span>
            )}
            {selectedDay.makeupPending && <span className="status-pill status-expiring">Makeup pending</span>}
            {!selectedDay.trained && !selectedDay.skipped && !selectedDay.cardioLogged && !selectedDay.stretchLogged && !selectedDay.macroMet && (
              <span className="status-pill status-neutral">No activity logged</span>
            )}
          </div>
        </div>
      )}

      <div className="cal-legend">
        <span className="cal-legend-item"><span className="cal-dot cal-dot--trained" aria-hidden="true" />Workout</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot--pr" aria-hidden="true" />PR</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot--cardio" aria-hidden="true" />Cardio</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot--stretch" aria-hidden="true" />Stretch</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot--macro" aria-hidden="true" />Macros</span>
      </div>
    </div>
  );
}
