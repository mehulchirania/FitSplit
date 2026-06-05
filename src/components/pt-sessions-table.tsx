"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { startPTSession } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import { PTCalendarDynamic } from "@/components/pt-calendar-dynamic";
import type { PTSession } from "@/types/domain";

/* ── Icons ── */
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
  </svg>
);
const ChevIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);
const ListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
  </svg>
);
const CalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
);
const BoltIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2 3 14h9l-1 8 10-12h-9z"/>
  </svg>
);

/* ── Helpers ── */
type StatusFilter = "all" | PTSession["status"];
const STATUS_ORDER: PTSession["status"][] = ["scheduled", "active", "completed", "cancelled"];
const STATUS_LABEL: Record<PTSession["status"], string> = {
  scheduled: "Scheduled", active: "Active", completed: "Completed", cancelled: "Cancelled",
};
const STATUS_COLOR: Record<PTSession["status"], string> = {
  scheduled: "var(--warning)", active: "var(--brand)", completed: "#60a5fa", cancelled: "var(--danger)",
};

function fmtDate(iso?: string) {
  if (!iso) return { day: "—", wd: "" };
  try {
    const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
    return {
      day: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d),
      wd: new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(d),
    };
  } catch { return { day: iso.slice(0, 10), wd: "" }; }
}

function planDate(s: PTSession) {
  return s.planStartDate ?? s.scheduledAt;
}

function planDur(s: PTSession) {
  if (s.planDurationDays) return `${s.planDurationDays}d`;
  return `${s.durationMinutes ?? 45} min`;
}

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();
}

/* ── Activate button ── */
function ActivateBtn({ sessionId }: { sessionId: string }) {
  const [, startT] = useTransition();
  const [done, setDone] = useState(false);

  function handleActivate() {
    startT(async () => {
      const fd = new FormData();
      fd.set("ptSessionId", sessionId);
      await startPTSession(initialFormActionState, fd);
      setDone(true);
    });
  }

  if (done) return <span className="ptd-pill ptd-pill--active">Active</span>;
  return (
    <button type="button" className="ptd-act ptd-act--primary" onClick={handleActivate}>
      <BoltIcon /> Activate
    </button>
  );
}

/* ── Row actions ── */
function RowActions({ session }: { session: PTSession }) {
  if (session.status === "scheduled") {
    return (
      <div className="ptd-acts">
        <ActivateBtn sessionId={session.id} />
        <Link className="ptd-act" href={`/owner/training?book=1&reschedule=${session.id}`}>
          Reschedule
        </Link>
      </div>
    );
  }
  if (session.status === "active") {
    return (
      <div className="ptd-acts">
        <Link className="ptd-act ptd-act--primary" href={`/owner/training/session/${session.id}`}>
          Console →
        </Link>
      </div>
    );
  }
  if (session.status === "completed") {
    return (
      <div className="ptd-acts">
        <Link className="ptd-act ptd-act--quiet" href={`/owner/training/session/${session.id}`}>
          View
        </Link>
      </div>
    );
  }
  return null;
}

/* ── Main component ── */
interface Props {
  sessions: PTSession[];
  trainers: { id: string; fullName: string }[];
  gymId: string;
  activePtPlanCount: number;
  plansWithExercises: number;
  memberFilter?: string;
}

export function PTSessionsTable({ sessions, trainers, activePtPlanCount, plansWithExercises, memberFilter }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: sessions.length };
    sessions.forEach((s) => { c[s.status] = (c[s.status] ?? 0) + 1; });
    return c;
  }, [sessions]);

  // Trainer dot index
  const trainerIndex = useMemo(() => {
    const map: Record<string, number> = {};
    trainers.forEach((t, i) => { map[t.id] = i; });
    return map;
  }, [trainers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((s) =>
      (statusFilter === "all" || s.status === statusFilter) &&
      (trainerFilter === "all" || s.trainerId === trainerFilter) &&
      (!q || (s.memberName ?? "").toLowerCase().includes(q) || (s.notes ?? "").toLowerCase().includes(q))
    );
  }, [sessions, statusFilter, trainerFilter, query]);

  const groups = useMemo(() =>
    STATUS_ORDER
      .map((st) => ({ status: st, items: filtered.filter((s) => s.status === st) }))
      .filter((g) => g.items.length > 0),
    [filtered]
  );

  const filterTabs: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Scheduled", value: "scheduled" },
    { label: "Active", value: "active" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <>
      {/* ── KPI strip ── */}
      <div className="ptd-kpibar">
        <div className="ptd-kpi ptd-kpi--accent">
          <span className="ptd-kpi__label">Active monthly plans</span>
          <div className="ptd-kpi__row">
            <span className="ptd-kpi__val">{activePtPlanCount}</span>
            <span className="ptd-kpi__hint">scheduled + active</span>
          </div>
        </div>
        <div className="ptd-kpi">
          <span className="ptd-kpi__label">Plans with exercises</span>
          <div className="ptd-kpi__row">
            <span className="ptd-kpi__val">{plansWithExercises}</span>
            <span className="ptd-kpi__hint">add on assign</span>
          </div>
        </div>
        <div className="ptd-kpi">
          <span className="ptd-kpi__label">Available trainers</span>
          <div className="ptd-kpi__row">
            <span className="ptd-kpi__val">{trainers.length}</span>
            <span className="ptd-kpi__hint">
              {trainers.slice(0, 2).map((t) => t.fullName.split(" ")[0]).join(" · ")}
              {trainers.length > 2 ? ` +${trainers.length - 2}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="ptd-toolbar">
        {/* Status tabs */}
        <div className="ptd-tabs" role="tablist">
          {filterTabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={statusFilter === t.value}
              className={`ptd-tab${statusFilter === t.value ? " ptd-tab--on" : ""}`}
              onClick={() => setStatusFilter(t.value)}
            >
              {t.label}
              <span className="ptd-tab__n">{counts[t.value] ?? 0}</span>
            </button>
          ))}
        </div>

        <span className="ptd-toolbar__spacer" />

        {/* Search */}
        <div className="ptd-search">
          <span className="ptd-search__icon"><SearchIcon /></span>
          <input
            placeholder="Search member or focus…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Trainer filter */}
        {trainers.length > 0 && (
          <div className="ptd-selectwrap">
            <select
              className="ptd-select"
              value={trainerFilter}
              onChange={(e) => setTrainerFilter(e.target.value)}
            >
              <option value="all">All trainers</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>{t.fullName}</option>
              ))}
            </select>
            <span className="ptd-selectwrap__icon"><ChevIcon /></span>
          </div>
        )}

        {/* View toggle */}
        <div className="ptd-seg" role="tablist">
          <button
            role="tab"
            aria-selected={view === "list"}
            className={`ptd-seg__btn${view === "list" ? " is-on" : ""}`}
            onClick={() => setView("list")}
          >
            <ListIcon /> List
          </button>
          <button
            role="tab"
            aria-selected={view === "calendar"}
            className={`ptd-seg__btn${view === "calendar" ? " is-on" : ""}`}
            onClick={() => setView("calendar")}
          >
            <CalIcon /> Calendar
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {view === "calendar" ? (
        <div className="adm-card">
          <div className="adm-card__body">
            <PTCalendarDynamic sessions={filtered} />
          </div>
        </div>
      ) : groups.length === 0 ? (
        <div className="ptd-tablewrap">
          <div className="ptd-empty">
            <CalIcon />
            <p>No {statusFilter === "all" ? "" : statusFilter + " "}PT plans match your filters.</p>
            <Link className="adm-btn adm-btn--sm" href="/owner/training?book=1">+ Assign a PT plan</Link>
          </div>
        </div>
      ) : (
        <div className="ptd-tablewrap">
          <table className="ptd-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Trainer</th>
                <th>Focus / notes</th>
                <th className="ptd-col-dur">Duration</th>
                <th>Status</th>
                <th className="ptd-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <React.Fragment key={g.status}>
                  {/* Group header */}
                  <tr className="ptd-grouprow">
                    <td colSpan={7}>
                      <div className="ptd-grouprow__inner">
                        <span className="ptd-grouprow__label" style={{ color: STATUS_COLOR[g.status] }}>
                          {STATUS_LABEL[g.status]}
                        </span>
                        <span className="ptd-grouprow__count">{g.items.length}</span>
                        <span className="ptd-grouprow__rule" />
                      </div>
                    </td>
                  </tr>
                  {/* Session rows */}
                  {g.items.map((s) => {
                    const { day, wd } = fmtDate(planDate(s));
                    const ti = trainerIndex[s.trainerId] ?? 0;
                    return (
                      <tr key={s.id} className="ptd-prow">
                        <td>
                          <div className="ptd-c-date">
                            {day}
                            {wd && <small>{wd}</small>}
                          </div>
                        </td>
                        <td>
                          <span className="ptd-c-member">
                            <span className="ptd-c-avatar">{initials(s.memberName)}</span>
                            <Link href={`/owner/members/${s.memberId}`}>{s.memberName ?? s.memberId}</Link>
                          </span>
                        </td>
                        <td>
                          <span className={`ptd-c-trainer ptd-t${ti % 4}`}>
                            <span className="ptd-dot" />
                            {s.trainerName ?? s.trainerId}
                          </span>
                        </td>
                        <td className="ptd-c-focus">{s.notes || "—"}</td>
                        <td className="ptd-c-dur">{planDur(s)}</td>
                        <td>
                          <span className={`ptd-pill ptd-pill--${s.status}`}>
                            {STATUS_LABEL[s.status]}
                          </span>
                        </td>
                        <td className="ptd-col-actions">
                          <RowActions session={s} />
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {memberFilter && (
        <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 10 }}>
          Filtered to plans for one member.{" "}
          <Link href="/owner/training" style={{ color: "var(--brand)" }}>Clear filter ×</Link>
        </p>
      )}
    </>
  );
}
