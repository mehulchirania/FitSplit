"use client";

import { useState } from "react";
import Link from "next/link";
import type { WorkoutProgram } from "@/types/domain";

interface MemberProgramsClientProps {
  programs: WorkoutProgram[];
  assignedProgramId: string | null;
  gymName: string;
}

const SPLIT_LABELS: Record<string, string> = {
  ppl_x2: "PPL ×2",
  ppl_upper_lower: "PPL / Upper-Lower",
  bro_split: "Bro Split",
  combo_x2: "Arnold Split ×2",
  custom: "Custom",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "var(--success)",
  intermediate: "var(--warning)",
  advanced: "var(--danger)",
};

type FilterKey = "all" | "gym" | "predefined" | "assigned";

export function MemberProgramsClient({
  programs,
  assignedProgramId,
  gymName,
}: MemberProgramsClientProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [splitFilter, setSplitFilter] = useState<string>("all");

  const gymPlans = programs.filter((p) => p.source === "gym");
  const predefinedPlans = programs.filter((p) => p.source !== "gym");
  const splitTypes = [...new Set(programs.map((p) => p.splitType))];

  const filtered = programs.filter((p) => {
    if (filter === "gym" && p.source !== "gym") return false;
    if (filter === "predefined" && p.source === "gym") return false;
    if (filter === "assigned" && p.id !== assignedProgramId) return false;
    if (splitFilter !== "all" && p.splitType !== splitFilter) return false;
    return true;
  });

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: "all",        label: "All plans",     count: programs.length },
    { key: "assigned",   label: "My plan",        count: assignedProgramId ? 1 : 0 },
    { key: "gym",        label: `${gymName}`,     count: gymPlans.length },
    { key: "predefined", label: "Predefined",     count: predefinedPlans.length },
  ];

  return (
    <div className="mp-root">
      {/* Filter strip */}
      <div className="mp-filters">
        <div className="mp-filter-row">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`mp-chip${filter === f.key ? " mp-chip--on" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="mp-chip__count">{f.count}</span>
            </button>
          ))}
        </div>

        {splitTypes.length > 1 && (
          <div className="mp-filter-row mp-filter-row--sub">
            <button
              type="button"
              className={`mp-chip mp-chip--sm${splitFilter === "all" ? " mp-chip--on" : ""}`}
              onClick={() => setSplitFilter("all")}
            >
              All splits
            </button>
            {splitTypes.map((s) => (
              <button
                key={s}
                type="button"
                className={`mp-chip mp-chip--sm${splitFilter === s ? " mp-chip--on" : ""}`}
                onClick={() => setSplitFilter(s)}
              >
                {SPLIT_LABELS[s] ?? s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Count summary */}
      <p className="mp-count">
        {filtered.length === 0
          ? "No programs match this filter."
          : `${filtered.length} program${filtered.length !== 1 ? "s" : ""}`}
      </p>

      {/* Program grid */}
      <div className="mp-grid">
        {filtered.map((program) => {
          const isAssigned = program.id === assignedProgramId;
          const activeDays = program.days.filter((d) => d.exercises.length > 0);
          const exerciseCount = program.days.reduce(
            (n, d) => n + d.exercises.length, 0
          );

          return (
            <article
              key={program.id}
              className={`mp-card${isAssigned ? " mp-card--assigned" : ""}`}
            >
              {isAssigned && (
                <div className="mp-card__badge">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M12 2l3.1 6.3L22 9.3l-5 4.9 1.2 6.8L12 17.8l-6.2 3.2L7 14.2 2 9.3l6.9-1z"/>
                  </svg>
                  Your plan
                </div>
              )}

              <div className="mp-card__top">
                <span className="mp-card__split">{SPLIT_LABELS[program.splitType] ?? program.splitType}</span>
                <span
                  className="mp-card__diff"
                  style={{ color: DIFFICULTY_COLORS[program.difficulty ?? ""] ?? "var(--text-faint)" }}
                >
                  {program.difficulty ?? ""}
                </span>
              </div>

              <h2 className="mp-card__title">{program.title}</h2>
              {program.description && (
                <p className="mp-card__desc">{program.description}</p>
              )}

              <div className="mp-card__stats">
                <span><strong>{activeDays.length}</strong> days/week</span>
                <span><strong>{exerciseCount}</strong> exercises</span>
                {program.daysPerWeek && <span><strong>{program.daysPerWeek}×</strong> weekly</span>}
              </div>

              {/* Day list — links to day detail pages */}
              {activeDays.length > 0 && (
                <div className="mp-card__days">
                  {activeDays.map((day) => (
                    <Link
                      key={day.id}
                      href={`/member/programs/${program.id}/day/${day.id}`}
                      className="mp-day-row"
                    >
                      <div className="mp-day-row__body">
                        <strong>{day.title}</strong>
                        {day.focus && <span>{day.focus}</span>}
                      </div>
                      <span className="mp-day-row__count">
                        {day.exercises.length} ex
                      </span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mp-day-row__chev">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </Link>
                  ))}
                </div>
              )}

              {program.tags?.length ? (
                <div className="mp-card__tags">
                  {program.tags.slice(0, 3).map((t) => (
                    <span key={t} className="mp-tag">{t}</span>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="mp-empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 6.5l11 11"/><path d="M3 9l3-3 3 3-3 3z"/>
            <path d="M15 15l3-3 3 3-3 3z"/>
          </svg>
          <p>No programs match this filter.</p>
          <button type="button" className="mp-chip mp-chip--on" onClick={() => { setFilter("all"); setSplitFilter("all"); }}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
