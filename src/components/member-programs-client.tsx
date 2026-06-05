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
  beginner: "var(--success, #22c55e)",
  intermediate: "var(--warning)",
  advanced: "var(--danger)",
};

function ProgramCard({ program, assignedProgramId }: { program: WorkoutProgram; assignedProgramId: string | null }) {
  const isAssigned = program.id === assignedProgramId;
  const activeDays = program.days.filter((d) => d.exercises.length > 0);
  const exerciseCount = program.days.reduce((n, d) => n + d.exercises.length, 0);

  return (
    <article className={`mp-card${isAssigned ? " mp-card--assigned" : ""}`}>
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
        <span className="mp-card__diff" style={{ color: DIFFICULTY_COLORS[program.difficulty ?? ""] ?? "var(--text-faint)" }}>
          {program.difficulty ?? ""}
        </span>
      </div>

      <h2 className="mp-card__title">{program.title}</h2>
      {program.description && <p className="mp-card__desc">{program.description}</p>}

      <div className="mp-card__stats">
        <span><strong>{activeDays.length}</strong> days/week</span>
        <span><strong>{exerciseCount}</strong> exercises</span>
        {program.daysPerWeek && <span><strong>{program.daysPerWeek}×</strong> weekly</span>}
      </div>

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
              <span className="mp-day-row__count">{day.exercises.length} ex</span>
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
}

export function MemberProgramsClient({ programs, assignedProgramId, gymName }: MemberProgramsClientProps) {
  const [showAll, setShowAll] = useState(false);

  // Gym-custom plans always first
  const gymPlans = programs.filter((p) => p.source === "gym");
  // FitSplit predefined catalog
  const catalogPlans = programs.filter((p) => p.source !== "gym");
  // Assigned plan (may be either)
  const assignedProgram = programs.find((p) => p.id === assignedProgramId);

  const CATALOG_PREVIEW = 4;
  const visibleCatalog = showAll ? catalogPlans : catalogPlans.slice(0, CATALOG_PREVIEW);

  return (
    <div className="mp-root">

      {/* ── Assigned plan highlight ────────────────────────────────── */}
      {assignedProgram && (
        <section className="mp-section">
          <div className="mp-section__head">
            <h2 className="mp-section__title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ color: "var(--brand)" }}>
                <path d="M12 2l3.1 6.3L22 9.3l-5 4.9 1.2 6.8L12 17.8l-6.2 3.2L7 14.2 2 9.3l6.9-1z"/>
              </svg>
              Your current plan
            </h2>
          </div>
          <div className="mp-grid">
            <ProgramCard program={assignedProgram} assignedProgramId={assignedProgramId} />
          </div>
        </section>
      )}

      {/* ── Gym-custom plans ───────────────────────────────────────── */}
      {gymPlans.length > 0 && (
        <section className="mp-section">
          <div className="mp-section__head">
            <h2 className="mp-section__title">{gymName} plans</h2>
            <span className="mp-section__count">{gymPlans.length}</span>
          </div>
          <p className="mp-section__desc">Custom programs designed by your gym for its members.</p>
          <div className="mp-grid">
            {gymPlans.map((p) => (
              <ProgramCard key={p.id} program={p} assignedProgramId={assignedProgramId} />
            ))}
          </div>
        </section>
      )}

      {/* ── FitSplit catalog ───────────────────────────────────────── */}
      {catalogPlans.length > 0 && (
        <section className="mp-section">
          <div className="mp-section__head">
            <h2 className="mp-section__title">FitSplit catalog</h2>
            <span className="mp-section__count">{catalogPlans.length}</span>
          </div>
          <p className="mp-section__desc">Proven training templates — ask your trainer to assign one.</p>
          <div className="mp-grid">
            {visibleCatalog.map((p) => (
              <ProgramCard key={p.id} program={p} assignedProgramId={assignedProgramId} />
            ))}
          </div>
          {catalogPlans.length > CATALOG_PREVIEW && (
            <button
              type="button"
              className="mp-show-more"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show less" : `Show all ${catalogPlans.length} plans`}
            </button>
          )}
        </section>
      )}

      {programs.length === 0 && (
        <div className="mp-empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 6.5l11 11"/><path d="M3 9l3-3 3 3-3 3z"/>
            <path d="M15 15l3-3 3 3-3 3z"/>
          </svg>
          <p>No workout programs available yet.</p>
        </div>
      )}
    </div>
  );
}
