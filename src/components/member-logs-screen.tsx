"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Dumbbell } from "@/components/icons";
import { nowInIST } from "@/lib/workout-utils";
import type {
  ActivityLog,
  DayLog,
  Exercise,
  LiftLog,
  MacroLog,
  MacroNutritionTarget,
  MemberProfile
} from "@/types/domain";

interface LogsScreenProps {
  liftLogs: LiftLog[];
  exercises: Exercise[];
  dayLogs: DayLog[];
  activityLogs: ActivityLog[];
  macroLogs: MacroLog[];
  macroTarget?: MemberProfile["macroNutritionTarget"];
}

const SKIP_REASON_LABELS: Record<string, string> = {
  rest: "Rest day",
  no_time: "No time",
  equipment: "No equipment",
  sick: "Feeling sick",
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

const DAYS_PER_PAGE = 5;

type FeedItem = {
  id: string;
  kind: "lift" | "pr" | "cardio" | "stretch" | "macro" | "day-done" | "day-skip" | "day-mod";
  title: string;
  meta: string;
  loggedAt: string;
};

type DayGroup = {
  key: string;
  items: FeedItem[];
};

function dateKeyFromIso(iso?: string) {
  return iso ? iso.slice(0, 10) : "";
}

function todayKey() {
  return nowInIST().toISOString().slice(0, 10);
}

function yesterdayKey() {
  const d = nowInIST();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function formatGroupLabelSafe(key: string) {
  const today = todayKey();
  const yesterday = yesterdayKey();
  try {
    const full = new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Kolkata"
    })
      .format(new Date(`${key}T12:00:00`))
      .toUpperCase();
    if (key === today) return `TODAY · ${full}`;
    if (key === yesterday) return `YESTERDAY · ${full}`;
    return full;
  } catch {
    return key;
  }
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata"
    }).format(new Date(iso));
  } catch {
    return "";
  }
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

function iconGlyph(kind: FeedItem["kind"]) {
  switch (kind) {
    case "pr":
      return "★";
    case "cardio":
      return "~";
    case "stretch":
      return "◡";
    case "macro":
      return "◆";
    case "day-done":
      return "✓";
    case "day-skip":
      return "×";
    case "day-mod":
      return "•";
    default:
      return "✓";
  }
}

export function LogsScreen({
  liftLogs,
  exercises,
  dayLogs,
  activityLogs,
  macroLogs,
  macroTarget
}: LogsScreenProps) {
  const [expanded, setExpanded] = useState(false);
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  const prMap = useMemo(() => {
    return liftLogs.reduce<Map<string, number>>((acc, log) => {
      if (log.weight && log.exerciseId) {
        acc.set(log.exerciseId, Math.max(acc.get(log.exerciseId) ?? 0, log.weight));
      }
      return acc;
    }, new Map());
  }, [liftLogs]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    const byDay = new Map<string, FeedItem[]>();
    const push = (key: string, item: FeedItem) => {
      if (!key) return;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(item);
    };

    for (const log of liftLogs) {
      const key = dateKeyFromIso(log.loggedAt);
      if (!key) continue;
      const isPR = Boolean(log.weight) && log.weight === prMap.get(log.exerciseId);
      const exerciseName = exerciseById.get(log.exerciseId)?.name ?? "Exercise";
      push(key, {
        id: `lift-${log.id}`,
        kind: isPR ? "pr" : "lift",
        title: isPR ? `New PR · ${exerciseName}` : exerciseName,
        meta: `${log.weight} kg × ${log.sets} × ${log.reps}`,
        loggedAt: log.loggedAt
      });
    }

    for (const activity of activityLogs) {
      const key = dateKeyFromIso(activity.loggedAt);
      if (!key) continue;
      push(key, {
        id: `activity-${activity.id}`,
        kind: activity.type === "cardio" ? "cardio" : "stretch",
        title: activity.name,
        meta:
          (activity.duration ? `${activity.duration} min` : "Logged") +
          (activity.distance ? ` · ${activity.distance} km` : ""),
        loggedAt: activity.loggedAt
      });
    }

    for (const macroLog of macroLogs) {
      const key = macroLog.date;
      if (!key) continue;
      const met = isMacroTargetMet(macroLog, macroTarget);
      push(key, {
        id: `macro-${macroLog.id}`,
        kind: "macro",
        title: met ? "Macro target hit" : "Macros logged",
        meta: `${macroLog.protein}g protein · ${macroLog.carbs}g carbs · ${macroLog.fat}g fat`,
        loggedAt: macroLog.loggedAt || `${key}T12:00:00`
      });
    }

    for (const dayLog of dayLogs) {
      const key = dateKeyFromIso(dayLog.loggedAt);
      if (!key) continue;
      const kind: FeedItem["kind"] =
        dayLog.status === "completed" ? "day-done" : dayLog.status === "skipped" ? "day-skip" : "day-mod";
      const title =
        dayLog.status === "completed"
          ? "Workout day completed"
          : dayLog.status === "skipped"
            ? `Day skipped${dayLog.skipReason ? ` · ${SKIP_REASON_LABELS[dayLog.skipReason] ?? "Other"}` : ""}`
            : "Different activity logged";
      push(key, {
        id: `daylog-${dayLog.id}`,
        kind,
        title,
        meta: dayLog.note ?? "",
        loggedAt: dayLog.loggedAt
      });
    }

    const groups: DayGroup[] = Array.from(byDay.entries())
      .map(([key, items]) => ({
        key,
        items: [...items].sort((a, b) => (b.loggedAt ?? "").localeCompare(a.loggedAt ?? ""))
      }))
      .sort((a, b) => b.key.localeCompare(a.key));

    return groups;
  }, [activityLogs, dayLogs, exerciseById, liftLogs, macroLogs, macroTarget, prMap]);

  const visibleGroups = expanded ? dayGroups : dayGroups.slice(0, DAYS_PER_PAGE);
  const hiddenCount = dayGroups.length - visibleGroups.length;

  return (
    <section className="m3d-lg">
      <div className="m3d-pagehead">
        <div>
          <span className="m3d-pagehead__eyebrow">LOGS</span>
          <h1 className="m3d-pagehead__title">Activity</h1>
        </div>
      </div>
      <p className="m3d-lg__intro">Everything you&apos;ve logged, newest first.</p>

      <Link href="/member/pt-history" className="m3d-card m3d-lg__pt-card">
        <div className="m3d-card__head">
          <span className="m3d-card__head-icon m3d-lg__pt-icon">PT</span>
          <div>
            <span className="m3d-card__eyebrow">PERSONAL TRAINING</span>
            <span className="m3d-card__title">View PT session history →</span>
          </div>
        </div>
      </Link>

      {dayGroups.length === 0 ? (
        <div className="m3d-lg__empty">
          <Dumbbell />
          <h2>No activity logged yet</h2>
          <p>Log a set, cardio session, stretch, or macros to build your history.</p>
        </div>
      ) : (
        <div className="m3d-lg__feed">
          {visibleGroups.map((group) => (
            <div key={group.key} className="m3d-lg__group">
              <span className="m3d-lg__group-label">{formatGroupLabelSafe(group.key)}</span>
              <div className="m3d-lg__rows">
                {group.items.map((item) => (
                  <button key={item.id} type="button" className="m3d-lg__row">
                    <span className={`m3d-lg__row-icon m3d-lg__row-icon--${item.kind}`}>
                      {iconGlyph(item.kind)}
                    </span>
                    <span className="m3d-lg__row-text">
                      <span className="m3d-lg__row-title">{item.title}</span>
                      {item.meta && <span className="m3d-lg__row-meta">{item.meta}</span>}
                    </span>
                    <span className="m3d-lg__row-time">
                      {formatTime(item.loggedAt)} <span className="m3d-lg__row-arrow">→</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {dayGroups.length > DAYS_PER_PAGE && (
            <div className="m3d-lg__more-wrap">
              <button type="button" className="m3d-btn-ghost m3d-btn-sm" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Collapse history" : `Show ${hiddenCount} more day${hiddenCount === 1 ? "" : "s"}`}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
