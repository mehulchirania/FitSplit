"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import type { DailySessionCount } from "@/lib/firebase/read-models/sessions";

// ── Data types ─────────────────────────────────────────────────────────────

export type DashAction = {
  id: string;
  kind: "expired" | "expiring" | "payment" | "noplan";
  memberName: string;
  memberId?: string;
  subtitle: string;
  href: string;
  ctaLabel: string;
};

export type PTSessionItem = {
  id: string;
  time: string;
  memberName: string;
  trainerName?: string;
  status: "completed" | "active" | "scheduled" | "cancelled";
};

export type FloorSlot = {
  slotId: string;
  label: string;
  time: string;
  memberCount: number;
};

type MixItem = {
  plan: string;
  count: number;
};

type ActivityItem = {
  id: string;
  body: string;
  createdAt: string;
  type: string;
  actionHref?: string;
};

export type OwnerDashboardData = {
  gymName: string;
  ownerFirstName: string;
  todayLabel: string;
  totalMembers: number;
  activeMembers: number;
  noPlanCount: number;
  pendingPaymentsCount: number;
  expiringCount: number;
  expiredCount: number;
  actions: DashAction[];
  recentJoins: { id: string; name: string; initials: string; joinedAt: string; goal?: string }[];
  floor: FloorSlot[];
  ptSessions: PTSessionItem[];
  inGym: { id: string; name: string; initials: string }[];
  attendanceTrend: DailySessionCount[];
  membershipMix: MixItem[];
  notifications: ActivityItem[];
  /** staffType-trainer viewing the shared workspace — money surfaces are hidden */
  isTrainer?: boolean;
};

// ── Icons (inline SVG) ──────────────────────────────────────────────────────

const IC = {
  today: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  people: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  money: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  ops: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  insights: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  bell: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  plus: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  expired: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  expiring: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  payment: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  noplan: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
    </svg>
  ),
  user: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  dumbbell: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 5v14"/><path d="M18 5v14"/><line x1="6" y1="12" x2="18" y2="12"/><rect x="3" y="8" width="3" height="8" rx="1"/><rect x="18" y="8" width="3" height="8" rx="1"/>
    </svg>
  ),
  calendar: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  chart: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  floor: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
    </svg>
  ),
  trendUp: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  renew: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
    </svg>
  ),
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 2)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const MIX_COLORS = [
  "var(--brand)", "var(--accent)", "#e9a800", "var(--danger)", "var(--text-soft)", "#7c5cbf",
];

// ── Sidebar is now in components/odp-sidebar.tsx and provided by app/owner/layout.tsx

// ── TODAY tab ───────────────────────────────────────────────────────────────

function TodayTab({ d, dismissed, setTab }: {
  d: OwnerDashboardData;
  dismissed: Set<string>;
  onDismiss: (id: string) => void;
  setTab: (t: string) => void;
}) {
  const visible = d.actions.filter((a) => !dismissed.has(a.id));
  const shown   = visible.slice(0, 6);
  const rest    = visible.length - 6;
  const expiryTotal = d.expiringCount + d.expiredCount;

  const priorityIcon = (kind: DashAction["kind"]) => {
    if (kind === "expired")  return IC.expired;
    if (kind === "payment")  return IC.payment;
    if (kind === "expiring") return IC.expiring;
    return IC.noplan;
  };

  return (
    <div className="odp2-today">
      {/* Hero card */}
      <div className="odp2-hero">
        <div className="odp2-hero__left">
          <span className="odp2-hero__eyebrow">{d.todayLabel}</span>
          <h2>Good morning, {d.ownerFirstName}.</h2>
          <p>
            {visible.length > 0
              ? `${visible.length} thing${visible.length === 1 ? "" : "s"} need your attention.`
              : "All caught up — nothing urgent today."}
          </p>
        </div>
        <div className="odp2-hero__kpis">
          {!d.isTrainer && (
            <button className="odp2-hero__kpi" onClick={() => setTab("money")} title="View renewals">
              <span className="odp2-hero__kpi-label">
                {IC.renew} Renewals due
              </span>
              <span className="odp2-hero__kpi-val">{expiryTotal}</span>
              <span className="odp2-hero__kpi-sub">{d.expiredCount} already lapsed</span>
            </button>
          )}
          <button className="odp2-hero__kpi" onClick={() => setTab("people")} title="View members without plans">
            <span className="odp2-hero__kpi-label">
              {IC.dumbbell} Plans pending
            </span>
            <span className="odp2-hero__kpi-val">{d.noPlanCount}</span>
            <span className="odp2-hero__kpi-sub">members without a workout</span>
          </button>
          {!d.isTrainer && (
            <button className="odp2-hero__kpi" onClick={() => setTab("money")} title="View pending payments">
              <span className="odp2-hero__kpi-label">
                {IC.payment} Pending payments
              </span>
              <span className="odp2-hero__kpi-val">{d.pendingPaymentsCount}</span>
              <span className="odp2-hero__kpi-sub">awaiting your approval</span>
            </button>
          )}
        </div>
      </div>

      {/* Two-column grid */}
      <div className="odp2-today-cols">
        {/* Priorities */}
        <div className="odp2-card">
          <div className="odp2-card-head">
            <h3>
              <span className="odp2-pulse" />
              Priorities
              {visible.length > 0 && <span className="odp2-count">{visible.length}</span>}
            </h3>
            <Link href="/owner/members" className="">All actions →</Link>
          </div>
          <div className="odp2-card-body odp2-card-body--flush">
            {shown.length === 0 ? (
              <p className="odp2-empty">Nothing urgent right now.</p>
            ) : (
              <>
                {shown.map((a) => (
                  dismissed.has(a.id) ? null : (
                    <div key={a.id} className={`odp2-prow odp2-prow--${a.kind}`}>
                      <div className="odp2-prow-icon">{priorityIcon(a.kind)}</div>
                      <div className="odp2-prow-body">
                        <strong>{a.memberName}</strong>
                        <small>{a.subtitle}</small>
                      </div>
                      <Link href={a.href} className="odp2-prow-cta">
                        {a.ctaLabel}
                      </Link>
                    </div>
                  )
                ))}
                {rest > 0 && (
                  <button
                    className="odp2-priorities-more"
                    onClick={() => setTab("people")}
                  >
                    + {rest} more priorities
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="odp2-today-right">
          {/* Today's PT */}
          <div className="odp2-card">
            <div className="odp2-card-head">
              <h3>{IC.calendar} Today&apos;s PT</h3>
              <Link href="/owner/training">Schedule →</Link>
            </div>
            <div className="odp2-card-body odp2-card-body--flush">
              {d.ptSessions.length === 0 ? (
                <p className="odp2-empty">No PT sessions today.</p>
              ) : (
                d.ptSessions.slice(0, 5).map((s) => (
                  <div key={s.id} className="odp2-pt-row">
                    <div className="odp2-pt-time">{s.time}</div>
                    <div className="odp2-pt-body">
                      <strong>{s.memberName}</strong>
                      {s.trainerName && <small>{s.trainerName}</small>}
                    </div>
                    <span className={`odp2-pt-pill odp2-pt-pill--${s.status === "active" ? "active" : s.status === "completed" ? "completed" : "scheduled"}`}>
                      {s.status === "completed" ? "DONE" : s.status === "active" ? "LIVE" : "SOON"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity */}
          <div className="odp2-card">
            <div className="odp2-card-head">
              <h3>{IC.trendUp} Activity</h3>
              <Link href="/owner/notifications">See all →</Link>
            </div>
            <div className="odp2-card-body odp2-card-body--flush">
              {d.notifications.length === 0 ? (
                <div className="odp2-activity-empty">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  <span>All caught up — no new activity</span>
                </div>
              ) : (
                d.notifications.slice(0, 8).map((n) => {
                  const icon = n.type.startsWith("pt_") ? IC.today
                    : n.type === "member_created" ? IC.user
                    : n.type.startsWith("membership") ? IC.bell
                    : n.type === "program_assigned" ? IC.dumbbell
                    : IC.bell;
                  const row = (
                    <div className="odp2-activity-row">
                      <div className="odp2-activity-icon">{icon}</div>
                      <div className="odp2-activity-body">
                        <span>{n.body}</span>
                        <small>{relativeTime(n.createdAt)}</small>
                      </div>
                      {n.actionHref && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "var(--text-faint)" }}>
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      )}
                    </div>
                  );
                  return n.actionHref ? (
                    <Link key={n.id} href={n.actionHref} className="odp2-activity-link">
                      {row}
                    </Link>
                  ) : (
                    <div key={n.id}>{row}</div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PEOPLE tab ──────────────────────────────────────────────────────────────

function PeopleTab({ d, dismissed }: { d: OwnerDashboardData; dismissed: Set<string> }) {
  const noplan = d.actions.filter((a) => a.kind === "noplan" && !dismissed.has(a.id));

  return (
    <div className="odp2-tab-page">
      <div className="odp2-tab-grid">
        <div className="odp2-card">
          <div className="odp2-card-head">
            <h3>
              {IC.dumbbell} Without a plan
              {noplan.length > 0 && <span className="odp2-count">{noplan.length}</span>}
            </h3>
            <Link href="/owner/members?filter=no-plan">View all →</Link>
          </div>
          <div className="odp2-card-body odp2-card-body--flush">
            {noplan.length === 0 ? (
              <p className="odp2-empty">All active members have a plan.</p>
            ) : (
              noplan.slice(0, 8).map((a) => (
                <div key={a.id} className="odp2-person">
                  <div className="odp2-avatar">
                    {a.memberName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </div>
                  <div className="odp2-person-body">
                    <strong>{a.memberName}</strong>
                    <small>{a.subtitle}</small>
                  </div>
                  <Link href={a.href} className="odp2-action-cta">Assign</Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="odp2-card">
          <div className="odp2-card-head">
            <h3>{IC.user} Recent joins</h3>
            <Link href="/owner/members">All members →</Link>
          </div>
          <div className="odp2-card-body odp2-card-body--flush">
            {d.recentJoins.length === 0 ? (
              <p className="odp2-empty">No new members this week.</p>
            ) : (
              d.recentJoins.map((m) => (
                <div key={m.id} className="odp2-person">
                  <div className="odp2-avatar">{m.initials}</div>
                  <div className="odp2-person-body">
                    <strong>{m.name}</strong>
                    <small>{m.goal ? `Goal: ${m.goal}` : "New member"}</small>
                  </div>
                  <Link href={`/owner/members/${m.id}`} className="odp2-action-cta">View</Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="odp2-card">
          <div className="odp2-card-head"><h3>{IC.people} Breakdown</h3></div>
          <div className="odp2-card-body">
            <div className="odp2-bd">
              {[
                { v: d.totalMembers,                      l: "Total members",    pill: null },
                { v: d.activeMembers,                     l: "Active",           pill: d.totalMembers > 0 ? `${Math.round((d.activeMembers / d.totalMembers) * 100)}%` : null, brand: true },
                { v: d.totalMembers - d.activeMembers,    l: "Inactive / paused",pill: null },
                { v: d.recentJoins.length,                l: "New this week",    pill: d.recentJoins.length > 0 ? "↑" : null, brand: true },
              ].map(({ v, l, pill, brand }) => (
                <div key={l} className="odp2-bd-row">
                  <strong>{v}</strong>
                  <span>{l}</span>
                  {pill && <em className={`odp2-bd-pill${brand ? " odp2-bd-pill--brand" : ""}`}>{pill}</em>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MONEY tab ───────────────────────────────────────────────────────────────

function MoneyTab({ d, dismissed }: { d: OwnerDashboardData; dismissed: Set<string> }) {
  const payments  = d.actions.filter((a) => a.kind === "payment"  && !dismissed.has(a.id));
  const expiring  = d.actions.filter((a) => (a.kind === "expiring" || a.kind === "expired") && !dismissed.has(a.id));
  const expiryTotal = d.expiringCount + d.expiredCount;

  return (
    <div className="odp2-tab-page">
      <div className="odp2-money-kpis">
        {[
          { label: "Pending payments",  val: d.pendingPaymentsCount, sub: "awaiting approval",       mod: "warn" },
          { label: "Expiring · 30 days",val: d.expiringCount,        sub: `${d.expiredCount} lapsed`,mod: "danger" },
          { label: "Total members",     val: d.totalMembers,          sub: `${d.activeMembers} active`,mod: "neutral" },
          { label: "Plans assigned",    val: d.totalMembers - d.noPlanCount, sub: d.noPlanCount > 0 ? `${d.noPlanCount} unassigned` : "All covered", mod: "brand" },
        ].map(({ label, val, sub, mod }) => (
          <div key={label} className={`odp2-kpi odp2-kpi--${mod}`}>
            <span className="odp2-kpi-label">{label}</span>
            <span className="odp2-kpi-val">{val}</span>
            <span className="odp2-kpi-sub">{sub}</span>
          </div>
        ))}
      </div>

      <div className="odp2-tab-grid">
        <div className="odp2-card">
          <div className="odp2-card-head">
            <h3>
              {IC.payment} Pending payments
              {payments.length > 0 && <span className="odp2-count">{payments.length}</span>}
            </h3>
            <Link href="/owner/billing">Open billing →</Link>
          </div>
          <div className="odp2-card-body odp2-card-body--flush">
            {payments.length === 0 ? (
              <p className="odp2-empty">No pending payments.</p>
            ) : (
              payments.map((a) => (
                <div key={a.id} className={`odp2-prow odp2-prow--${a.kind}`}>
                  <div className="odp2-prow-icon">{IC.payment}</div>
                  <div className="odp2-prow-body">
                    <strong>{a.memberName}</strong>
                    <small>{a.subtitle}</small>
                  </div>
                  <Link href={a.href} className="odp2-prow-cta">{a.ctaLabel}</Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="odp2-card">
          <div className="odp2-card-head">
            <h3>
              {IC.expiring} Expiring &amp; expired
              {expiryTotal > 0 && <span className="odp2-count">{expiryTotal}</span>}
            </h3>
            <Link href="/owner/members?filter=expiring">View all →</Link>
          </div>
          <div className="odp2-card-body odp2-card-body--flush">
            {expiring.length === 0 ? (
              <p className="odp2-empty">No expiring memberships.</p>
            ) : (
              expiring.map((a) => (
                <div key={a.id} className={`odp2-prow odp2-prow--${a.kind}`}>
                  <div className="odp2-prow-icon">{a.kind === "expired" ? IC.expired : IC.expiring}</div>
                  <div className="odp2-prow-body">
                    <strong>{a.memberName}</strong>
                    <small>{a.subtitle}</small>
                  </div>
                  <Link href={a.href} className="odp2-prow-cta">{a.ctaLabel}</Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── OPERATIONS tab ──────────────────────────────────────────────────────────

function OpsTab({ d }: { d: OwnerDashboardData }) {
  return (
    <div className="odp2-tab-page">
      <div className="odp2-tab-grid">
        <div className="odp2-card">
          <div className="odp2-card-head">
            <h3>
              <span className="odp2-pulse" />
              {IC.floor} Training slots
              {d.inGym.length > 0 && <span className="odp2-count">{d.inGym.length} now</span>}
            </h3>
          </div>
          <div className="odp2-card-body">
            {d.floor.length === 0 ? (
              <p className="odp2-empty" style={{ padding: 0 }}>No slot data.</p>
            ) : (
              <div className="odp2-slots">
                {d.floor.map((slot) => {
                  const pct = slot.memberCount > 0
                    ? Math.min((slot.memberCount / Math.max(...d.floor.map((s) => s.memberCount), 1)) * 100, 100) : 0;
                  return (
                    <div key={slot.slotId}>
                      <div className="odp2-slot-row">
                        <div className="odp2-slot-info">
                          <strong>{slot.label}</strong>
                          <small>{slot.time}</small>
                        </div>
                        <span className="odp2-slot-count">{slot.memberCount}</span>
                      </div>
                      <div className="odp2-slot-bar">
                        <div className="odp2-slot-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="odp2-card">
          <div className="odp2-card-head"><h3>{IC.user} Who&apos;s training</h3></div>
          <div className="odp2-card-body">
            {d.inGym.length === 0 ? (
              <p className="odp2-empty" style={{ padding: 0 }}>Nobody training right now.</p>
            ) : (
              <div className="odp2-roster">
                {d.inGym.slice(0, 12).map((m) => (
                  <div key={m.id} className="odp2-roster-row">
                    <div className="odp2-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{m.initials}</div>
                    <strong>{m.name}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="odp2-card" style={{ gridColumn: "1 / -1" }}>
          <div className="odp2-card-head">
            <h3>{IC.calendar} Today&apos;s PT schedule</h3>
            <Link href="/owner/training">Full schedule →</Link>
          </div>
          <div className="odp2-card-body odp2-card-body--flush">
            {d.ptSessions.length === 0 ? (
              <p className="odp2-empty">No PT sessions today.</p>
            ) : (
              d.ptSessions.map((s) => (
                <div key={s.id} className="odp2-pt-row">
                  <div className="odp2-pt-time">{s.time}</div>
                  <div className="odp2-pt-body">
                    <strong>{s.memberName}</strong>
                    {s.trainerName && <small>{s.trainerName}</small>}
                  </div>
                  <span className={`odp2-pt-pill odp2-pt-pill--${s.status === "active" ? "active" : s.status === "completed" ? "completed" : "scheduled"}`}>
                    {s.status === "completed" ? "DONE" : s.status === "active" ? "LIVE" : "SOON"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── INSIGHTS tab ────────────────────────────────────────────────────────────

function InsightsTab({ d }: { d: OwnerDashboardData }) {
  const trend  = d.attendanceTrend.slice(-14);
  const maxAtt = Math.max(...trend.map((t) => t.sessions), 1);
  const total  = d.membershipMix.reduce((s, m) => s + m.count, 0);

  return (
    <div className="odp2-tab-page">
      <div className="odp2-tab-grid">
        <div className="odp2-card">
          <div className="odp2-card-head"><h3>{IC.chart} Attendance — 14 days</h3></div>
          <div className="odp2-card-body">
            {trend.length === 0 ? (
              <p className="odp2-empty" style={{ padding: 0 }}>No data yet.</p>
            ) : (
              <>
                <div className="odp2-att-bars">
                  {trend.map((t, i) => {
                    const isToday = i === trend.length - 1;
                    return (
                      <div
                        key={t.date}
                        className={`odp2-att-bar${isToday ? " odp2-att-bar--today" : ""}`}
                        style={{ height: `${Math.max((t.sessions / maxAtt) * 100, 4)}%` }}
                        title={`${t.date}: ${t.sessions}`}
                      >
                        {(isToday || t.sessions === maxAtt) && (
                          <span className="odp2-att-bar-tip">{t.sessions}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="odp2-att-axis"><span>14 days ago</span><span>today</span></div>
              </>
            )}
          </div>
        </div>

        <div className="odp2-card">
          <div className="odp2-card-head"><h3>{IC.people} Membership mix</h3></div>
          <div className="odp2-card-body">
            {d.membershipMix.length === 0 ? (
              <p className="odp2-empty" style={{ padding: 0 }}>No data.</p>
            ) : (
              <>
                <div className="odp2-mix-bar">
                  {d.membershipMix.map((m, i) => (
                    <div key={m.plan} className="odp2-mix-seg"
                      style={{ flex: m.count, background: MIX_COLORS[i % MIX_COLORS.length] }}
                      title={`${m.plan}: ${m.count}`}
                    />
                  ))}
                </div>
                <div className="odp2-mix-legend">
                  {d.membershipMix.map((m, i) => (
                    <div key={m.plan} className="odp2-mix-row">
                      <span className="odp2-mix-dot" style={{ background: MIX_COLORS[i % MIX_COLORS.length] }} />
                      <span className="odp2-mix-label">{m.plan}</span>
                      <strong>{m.count}</strong>
                      <small>{total > 0 ? `${Math.round((m.count / total) * 100)}%` : "—"}</small>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="odp2-card" style={{ gridColumn: "1 / -1" }}>
          <div className="odp2-card-head"><h3>{IC.trendUp} Quick stats</h3></div>
          <div className="odp2-card-body">
            <div className="odp2-quick">
              {[
                { l: "Active members",     v: d.activeMembers },
                { l: "Plans assigned",     v: d.totalMembers - d.noPlanCount },
                { l: "Expiring (30 days)", v: d.expiringCount },
                { l: "Expired / lapsed",   v: d.expiredCount },
              ].map(({ l, v }) => (
                <div key={l} className="odp2-quick-item">
                  <span>{l}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Root export ─────────────────────────────────────────────────────────────
// Note: the odp2-workspace shell (sidebar + header) is provided by app/owner/layout.tsx.
// This component renders only the tab bar + scrollable tab content.

export function OwnerDashboardTabs({ data }: { data: OwnerDashboardData }) {
  const [tab, setTab]             = useState<string>("today");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleActions = useMemo(
    () => data.actions.filter((a) => !dismissed.has(a.id)),
    [data.actions, dismissed]
  );
  void visibleActions;

  function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  const noPlanBadge = data.actions.filter((a) => a.kind === "noplan").length;
  const moneyBadge  = data.actions.filter((a) =>
    a.kind === "payment" || a.kind === "expired" || a.kind === "expiring"
  ).length;

  const tabs = [
    { v: "today",    label: "Today",      icon: IC.today,    badge: 0 },
    { v: "people",   label: "People",     icon: IC.people,   badge: noPlanBadge },
    { v: "money",    label: "Money",      icon: IC.money,    badge: moneyBadge },
    { v: "ops",      label: "Operations", icon: IC.ops,      badge: 0 },
    { v: "insights", label: "Insights",   icon: IC.insights, badge: 0 },
  ].filter((t) => !data.isTrainer || t.v !== "money");

  return (
    <>
      {/* Tab bar — sits above the scroll area */}
      <div className="odp2-tabbar">
        {tabs.map((t) => (
          <button
            key={t.v}
            className={`odp2-tab${tab === t.v ? " odp2-tab--on" : ""}`}
            onClick={() => setTab(t.v)}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge > 0 && <span className="odp2-tab-badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Tab content inside its own scroll area */}
      <div className="odp2-scroll">
        {tab === "today"    && <TodayTab    d={data} dismissed={dismissed} onDismiss={dismiss} setTab={setTab} />}
        {tab === "people"   && <PeopleTab   d={data} dismissed={dismissed} />}
        {tab === "money" && !data.isTrainer && <MoneyTab d={data} dismissed={dismissed} />}
        {tab === "ops"      && <OpsTab      d={data} />}
        {tab === "insights" && <InsightsTab d={data} />}
      </div>
    </>
  );
}
