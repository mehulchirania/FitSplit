"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { bulkAssignProgram, bulkToggleMemberAccess } from "@/lib/firebase/actions";
import { callBulkAssignProgram, callBulkToggleMemberAccess } from "@/lib/firebase/functions";
import { AddMemberForm } from "@/components/add-member-form";

// ── Types ────────────────────────────────────────────────────────────────────

export type HybridMember = {
  id: string;
  fullName: string;
  avatarInitials: string;
  isActive: boolean;
  username?: string;
  goal?: string;
  joinedAt: string;
  membershipStatus?: "active" | "expiring_soon" | "expired";
  membershipEndDate?: string;
  currentPackageName?: string;
  assignedTrainer?: string;
  hasPlan: boolean;
  programTitle?: string;
  daysToExpiry: number | null;
};

export type HybridProgram = { id: string; title: string };

// ── Icon helpers (inline SVG) ────────────────────────────────────────────────

function IconAlertTriangle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function IconDumbbell() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 5v14M18 5v14"/><path d="M4 7h4M16 7h4M4 17h4M16 17h4"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  );
}
function IconRepeat() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  );
}
function IconX({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconChevLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}
function IconChevRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}
function IconMoreDots() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/>
    </svg>
  );
}
function IconInbox() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  );
}
function IconPlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}
function IconPause() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}
function IconSparkle() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarColor(id: string): string {
  let n = 0;
  for (const c of id) n = ((n * 31) + c.charCodeAt(0)) & 0xfffff;
  return `mhv-avatar--c${(n % 6) + 1}`;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "2-digit" }).format(new Date(iso));
  } catch { return iso; }
}

const PAGE_SIZE = 10;

type Bucket = "all" | "active" | "no-plan" | "expiring";
type SortKey = "name" | "newest" | "oldest" | "expiry" | "status";

// ── Queue card ────────────────────────────────────────────────────────────────

type QCardType = "expired" | "expiring" | "noplan";

function QCard({ m, type, onDismiss }: {
  m: HybridMember;
  type: QCardType;
  onDismiss: (id: string) => void;
}) {
  const config = {
    expired: {
      tone: "danger" as const,
      icon: <IconAlertTriangle />,
      label: "Expired",
      sub: `${Math.abs(m.daysToExpiry ?? 0)}d ago${m.currentPackageName ? ` · ${m.currentPackageName}` : ""}`,
      actionLabel: "View member",
      actionIcon: <IconRepeat />,
    },
    expiring: {
      tone: "warn" as const,
      icon: <IconCalendar />,
      label: "Expiring",
      sub: `in ${m.daysToExpiry ?? "?"}d${m.currentPackageName ? ` · ${m.currentPackageName}` : ""}`,
      actionLabel: "Send renewal",
      actionIcon: <IconRepeat />,
    },
    noplan: {
      tone: "accent" as const,
      icon: <IconDumbbell />,
      label: "No plan",
      sub: m.goal ? `Goal: ${m.goal}` : "Workout unassigned",
      actionLabel: "Assign plan",
      actionIcon: <IconSparkle />,
    },
  }[type];

  return (
    <div className={`mhv-qcard mhv-qcard--${config.tone}`}>
      <div className="mhv-qcard__top">
        <div className={`mhv-avatar ${avatarColor(m.id)}`} aria-hidden>
          {m.avatarInitials}
        </div>
        <div className="mhv-qcard__id">
          <div className="mhv-qcard__name">{m.fullName}</div>
          {m.username && <div className="mhv-qcard__handle">@{m.username}</div>}
        </div>
        <button
          className="mhv-qcard__dismiss"
          onClick={() => onDismiss(m.id)}
          aria-label="Dismiss"
          title="Snooze for now"
          type="button"
        >
          <IconX size={12} />
        </button>
      </div>

      <div className="mhv-qcard__reason">
        <span className={`mhv-qcard__tag mhv-qcard__tag--${config.tone}`}>
          {config.icon} {config.label}
        </span>
        <span className="mhv-qcard__sub">{config.sub}</span>
      </div>

      <Link
        href={`/owner/members/${m.id}`}
        className="mhv-qcard__action"
        onClick={() => onDismiss(m.id)}
      >
        {config.actionIcon} {config.actionLabel}
      </Link>
    </div>
  );
}

// ── Membership cell ───────────────────────────────────────────────────────────

function MembershipCell({ m }: { m: HybridMember }) {
  if (!m.membershipStatus) {
    return <span className="mhv-pill mhv-pill--ghost">—</span>;
  }

  const tone =
    m.membershipStatus === "expired" ? "danger"
    : m.membershipStatus === "expiring_soon" ? "warn"
    : "brand";

  const label =
    m.membershipStatus === "expired" ? "Expired"
    : m.membershipStatus === "expiring_soon" ? "Expiring"
    : "Active";

  const sub =
    m.membershipStatus === "expired"
      ? `${Math.abs(m.daysToExpiry ?? 0)}d ago`
      : m.membershipStatus === "expiring_soon"
        ? `in ${m.daysToExpiry ?? "?"}d`
        : m.daysToExpiry != null ? `${m.daysToExpiry}d left` : "";

  return (
    <div className="mhv-ms">
      <span className={`mhv-pill mhv-pill--${tone}`}>
        <span className="mhv-pill__dot" /> {label}
      </span>
      {(sub || m.currentPackageName) && (
        <span className="mhv-ms__sub">
          {[sub, m.currentPackageName].filter(Boolean).join(" · ")}
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MembersHybridView({
  initialMembers,
  programs,
}: {
  initialMembers: HybridMember[];
  programs: HybridProgram[];
}) {
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<Bucket>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState<"assign" | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState(programs[0]?.id ?? "");
  const [showAddMember, setShowAddMember] = useState(false);
  // optimistic access state
  const [accessById, setAccessById] = useState<Map<string, boolean>>(
    () => new Map(initialMembers.map((m) => [m.id, m.isActive]))
  );
  const [isPending, startTransition] = useTransition();
  const cbAllRef = useRef<HTMLInputElement>(null);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = initialMembers.length;
    const active = initialMembers.filter((m) => accessById.get(m.id) ?? m.isActive).length;
    const noPlan = initialMembers.filter((m) => !m.hasPlan).length;
    const expiring = initialMembers.filter((m) => m.membershipStatus === "expiring_soon").length;
    const expired = initialMembers.filter((m) => m.membershipStatus === "expired").length;
    return { total, active, noPlan, expiring, expired };
  }, [initialMembers, accessById]);

  // ── Action queue ───────────────────────────────────────────────────────────

  const queue = useMemo(() => {
    const items: { m: HybridMember; type: QCardType; priority: number }[] = [];
    for (const m of initialMembers) {
      if (dismissed.has(m.id)) continue;
      if (m.membershipStatus === "expired") items.push({ m, type: "expired", priority: 3 });
      else if (m.membershipStatus === "expiring_soon") items.push({ m, type: "expiring", priority: 2 });
      else if (!m.hasPlan) items.push({ m, type: "noplan", priority: 1 });
    }
    return items.sort((a, b) => b.priority - a.priority);
  }, [initialMembers, dismissed]);

  // ── Filtered + sorted directory ────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = initialMembers;
    if (bucket === "active") list = list.filter((m) => accessById.get(m.id) ?? m.isActive);
    else if (bucket === "no-plan") list = list.filter((m) => !m.hasPlan);
    else if (bucket === "expiring") list = list.filter(
      (m) => m.membershipStatus === "expired" || m.membershipStatus === "expiring_soon"
    );

    const q = query.trim().toLowerCase();
    if (q) list = list.filter((m) =>
      m.fullName.toLowerCase().includes(q) ||
      (m.username ?? "").toLowerCase().includes(q)
    );

    const cmp: Record<SortKey, (a: HybridMember, b: HybridMember) => number> = {
      name:    (a, b) => a.fullName.localeCompare(b.fullName),
      newest:  (a, b) => b.joinedAt.localeCompare(a.joinedAt),
      oldest:  (a, b) => a.joinedAt.localeCompare(b.joinedAt),
      expiry:  (a, b) => (a.daysToExpiry ?? 9999) - (b.daysToExpiry ?? 9999),
      status:  (a, b) =>
        Number(accessById.get(b.id) ?? b.isActive) - Number(accessById.get(a.id) ?? a.isActive) ||
        a.fullName.localeCompare(b.fullName),
    };
    return [...list].sort(cmp[sortKey]);
  }, [initialMembers, bucket, query, sortKey, accessById]);

  useEffect(() => { setPage(1); }, [bucket, query, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Checkbox helpers ───────────────────────────────────────────────────────

  const allOnPageSelected = slice.length > 0 && slice.every((m) => selected.has(m.id));
  const someOnPage = !allOnPageSelected && slice.some((m) => selected.has(m.id));
  useEffect(() => {
    if (cbAllRef.current) cbAllRef.current.indeterminate = someOnPage;
  }, [someOnPage]);

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) slice.forEach((m) => next.delete(m.id));
      else slice.forEach((m) => next.add(m.id));
      return next;
    });
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────

  function clearSelection() {
    setSelected(new Set());
    setBulkMode(null);
  }

  function executeBulk(action: "assign" | "suspend" | "restore") {
    const targetIds = Array.from(selected);
    if (!targetIds.length) return;
    const previousAccess = new Map(accessById);
    const program = programs.find((p) => p.id === selectedProgramId);

    if (action !== "assign") {
      const nextActive = action === "restore";
      setAccessById((cur) => {
        const next = new Map(cur);
        targetIds.forEach((id) => next.set(id, nextActive));
        return next;
      });
    }

    startTransition(async () => {
      try {
        let message = "";
        if (action === "assign") {
          const result = await callBulkAssignProgram({
            memberIds: targetIds,
            programId: selectedProgramId,
            programTitle: program?.title,
          });
          message = result.data.message;
        } else {
          const result = await callBulkToggleMemberAccess({
            memberIds: targetIds,
            isActive: action === "restore",
          });
          message = result.data.message;
          const failed = result.data.data?.failed ?? [];
          if (failed.length) {
            setAccessById((cur) => {
              const next = new Map(cur);
              failed.forEach((item) => next.set(item.memberId, previousAccess.get(item.memberId) ?? false));
              return next;
            });
          }
        }
        toast.success(message);
        clearSelection();
      } catch {
        const fd = new FormData();
        fd.set("memberIds", JSON.stringify(targetIds));
        let result;
        if (action === "assign") {
          fd.set("programId", selectedProgramId);
          fd.set("programTitle", program?.title ?? "");
          result = await bulkAssignProgram({ status: "idle", message: "" }, fd);
        } else {
          fd.set("isActive", action === "restore" ? "true" : "false");
          result = await bulkToggleMemberAccess({ status: "idle", message: "" }, fd);
          if (result.status === "error") setAccessById(previousAccess);
        }
        if (result.status === "success") {
          toast.success(result.message);
          clearSelection();
        } else {
          toast.error(result.message);
        }
      }
    });
  }

  // ── KPI chips ──────────────────────────────────────────────────────────────

  const kpis: { key: Bucket; label: string; value: number; hint: string; tone: string }[] = [
    {
      key: "all",
      label: "Total members",
      value: stats.total,
      hint: "All profiles",
      tone: "neutral",
    },
    {
      key: "active",
      label: "Active",
      value: stats.active,
      hint: `${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of base`,
      tone: "brand",
    },
    {
      key: "no-plan",
      label: "Needs a plan",
      value: stats.noPlan,
      hint: "Workout unassigned",
      tone: "warn",
    },
    {
      key: "expiring",
      label: "Renewals due",
      value: stats.expiring + stats.expired,
      hint: stats.expired > 0 ? `${stats.expired} expired` : "Within 21 days",
      tone: "danger",
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mhv-root">

      {/* ── Header ── */}
      <header className="mhv-header">
        <div className="mhv-header-copy">
          <nav aria-label="breadcrumb" style={{ fontSize: "12.5px", color: "var(--text-faint)", marginBottom: 6, display: "flex", gap: 6, alignItems: "center" }}>
            <Link href="/owner" style={{ color: "inherit", textDecoration: "none" }}>Dashboard</Link>
            <span style={{ opacity: 0.5 }}>/</span>
            <span>Members</span>
          </nav>
          <h1 className="mhv-title">Members</h1>
          <p className="mhv-subtitle">
            {queue.length > 0 ? (
              <><strong>{queue.length}</strong> {queue.length === 1 ? "member needs" : "members need"} your attention. {stats.total} in the directory.</>
            ) : (
              <>Queue is clear — {stats.total} members in the directory.</>
            )}
          </p>
        </div>
        <div className="mhv-header-actions">
          <button
            type="button"
            className="mhv-btn mhv-btn--brand"
            onClick={() => setShowAddMember((v) => !v)}
          >
            <IconPlus />
            {showAddMember ? "Close" : "Add member"}
          </button>
        </div>
      </header>

      {/* ── Add member panel ── */}
      {showAddMember && (
        <div className="mhv-add-panel">
          <AddMemberForm />
        </div>
      )}

      {/* ── Action queue ── */}
      {queue.length > 0 ? (
        <section className="mhv-queue-section" aria-label="Action queue">
          <div className="mhv-queue-head">
            <h2 className="mhv-section-title">
              <span className="mhv-section-title__pulse" aria-hidden />
              Action queue
              <span className="mhv-section-title__count">{queue.length}</span>
            </h2>
            <div className="mhv-queue-legend" aria-hidden>
              {stats.expired > 0 && (
                <><span className="mhv-ldot mhv-ldot--danger" /><span>{stats.expired} expired</span></>
              )}
              {stats.expiring > 0 && (
                <><span className="mhv-ldot mhv-ldot--warn" /><span>{stats.expiring} expiring</span></>
              )}
              {stats.noPlan > 0 && (
                <><span className="mhv-ldot mhv-ldot--accent" /><span>{stats.noPlan} no plan</span></>
              )}
            </div>
          </div>
          <div className="mhv-queue" role="list" aria-label="Members needing action">
            {queue.map(({ m, type }) => (
              <div key={m.id} role="listitem">
                <QCard m={m} type={type} onDismiss={(id) => setDismissed((prev) => new Set([...prev, id]))} />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="mhv-queue-empty" role="status" aria-live="polite">
          <div className="mhv-queue-empty__icon"><IconTrophy /></div>
          <div>
            <strong>All clear.</strong>
            <p>No renewals due, no plans missing.</p>
          </div>
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="mhv-kpis" role="group" aria-label="Filter members">
        {kpis.map((k) => (
          <button
            key={k.key}
            type="button"
            className={`mhv-kpi mhv-kpi--${k.tone} ${bucket === k.key ? "mhv-kpi--active" : ""}`}
            onClick={() => setBucket(k.key)}
            aria-pressed={bucket === k.key}
          >
            <span className="mhv-kpi__value">{k.value}</span>
            <span className="mhv-kpi__label">{k.label}</span>
            <span className="mhv-kpi__hint">{k.hint}</span>
          </button>
        ))}
      </div>

      {/* ── Directory ── */}
      <section className="mhv-panel" aria-label="Member directory">
        {/* Toolbar */}
        <div className="mhv-toolbar">
          <h2 className="mhv-section-title mhv-section-title--sm">
            Directory
            <span className="mhv-section-title__count mhv-section-title__count--muted">
              {filtered.length}
            </span>
          </h2>

          <label className="mhv-search" aria-label="Search members">
            <IconSearch />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or @username"
              aria-label="Search members"
            />
            {query && (
              <button
                type="button"
                className="mhv-search__clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <IconX size={12} />
              </button>
            )}
          </label>

          <select
            className="mhv-sort-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="Sort members"
          >
            <option value="name">Sort · Name (A–Z)</option>
            <option value="newest">Sort · Newest first</option>
            <option value="oldest">Sort · Oldest first</option>
            <option value="expiry">Sort · Expiring soonest</option>
            <option value="status">Sort · Active first</option>
          </select>
        </div>

        {/* Table */}
        <div className="mhv-table-wrap">
          <table className="mhv-table">
            <colgroup>
              <col style={{ width: 44 }} />
              <col />
              <col style={{ width: 210 }} />
              <col style={{ width: 195 }} />
              <col className="mhv-col-joined" style={{ width: 110 }} />
              <col style={{ width: 48 }} />
            </colgroup>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="mhv-check"
                    ref={cbAllRef}
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    aria-label="Select all on this page"
                  />
                </th>
                <th>Member</th>
                <th>Membership</th>
                <th>Workout plan</th>
                <th className="mhv-col-joined">Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {slice.map((m) => {
                const sel = selected.has(m.id);
                const isActive = accessById.get(m.id) ?? m.isActive;
                return (
                  <tr
                    key={m.id}
                    className={`mhv-row${sel ? " mhv-row--sel" : ""}`}
                    onClick={() => toggleOne(m.id)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="mhv-check"
                        checked={sel}
                        onChange={() => toggleOne(m.id)}
                        aria-label={`Select ${m.fullName}`}
                      />
                    </td>

                    <td>
                      <div className="mhv-member">
                        <div className={`mhv-avatar ${avatarColor(m.id)}`} aria-hidden>
                          {m.avatarInitials}
                          <span className={`mhv-avatar__dot mhv-avatar__dot--${isActive ? "active" : "suspended"}`} />
                        </div>
                        <div>
                          <Link
                            href={`/owner/members/${m.id}`}
                            className="mhv-member__name"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {m.fullName}
                          </Link>
                          <div className="mhv-member__sub">
                            {m.username && <span>@{m.username}</span>}
                            {m.username && m.goal && <span> · </span>}
                            {m.goal && <span className="mhv-member__goal">{m.goal}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td><MembershipCell m={m} /></td>

                    <td>
                      {m.hasPlan ? (
                        <div className="mhv-plan">
                          <span className="mhv-pill mhv-pill--ghost">{m.programTitle ?? "Assigned"}</span>
                          {m.assignedTrainer && (
                            <span className="mhv-plan__trainer">w/ {m.assignedTrainer}</span>
                          )}
                        </div>
                      ) : (
                        <span className="mhv-pill mhv-pill--outline">No plan</span>
                      )}
                    </td>

                    <td className="mhv-col-joined">
                      <span className="mhv-joined">{formatDate(m.joinedAt)}</span>
                    </td>

                    <td onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/owner/members/${m.id}`}
                        className="mhv-btn mhv-btn--ghost mhv-btn--icon mhv-row__more"
                        aria-label={`Open ${m.fullName}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconMoreDots />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="mhv-empty" role="status">
              <IconInbox />
              <p>{query ? `No matches for "${query}"` : "Nothing here."}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="mhv-foot">
            <span className="mhv-foot__info">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="mhv-pager">
              <button
                type="button"
                className="mhv-btn mhv-btn--ghost mhv-btn--sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <IconChevLeft /> Prev
              </button>
              <span className="mhv-pager__label">
                Page <strong>{safePage}</strong> of {totalPages}
              </span>
              <button
                type="button"
                className="mhv-btn mhv-btn--ghost mhv-btn--sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                Next <IconChevRight />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Dark bulk dock ── */}
      {selected.size > 0 && (
        <div className="mhv-dock" role="toolbar" aria-label="Bulk actions">
          {bulkMode === "assign" ? (
            <>
              <span className="mhv-dock__count">{selected.size} selected</span>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                disabled={isPending}
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <button
                type="button"
                className="mhv-btn mhv-btn--brand mhv-btn--sm"
                disabled={isPending || !selectedProgramId}
                onClick={() => executeBulk("assign")}
              >
                {isPending ? "Assigning…" : `Assign to ${selected.size}`}
              </button>
              <button
                type="button"
                className="mhv-btn mhv-btn--ghost mhv-btn--sm"
                onClick={() => setBulkMode(null)}
              >
                Back
              </button>
            </>
          ) : (
            <>
              <span className="mhv-dock__count">{selected.size} selected</span>
              <div className="mhv-dock__divider" />
              <button
                type="button"
                className="mhv-btn mhv-btn--subtle mhv-btn--sm"
                onClick={() => setBulkMode("assign")}
                disabled={isPending}
              >
                <IconDumbbell /> Assign plan
              </button>
              <button
                type="button"
                className="mhv-btn mhv-btn--subtle mhv-btn--sm"
                onClick={() => { toast.info(`Renewal drafted for ${selected.size} members`); clearSelection(); }}
                disabled={isPending}
              >
                <IconRepeat /> Renew
              </button>
              <button
                type="button"
                className="mhv-btn mhv-btn--subtle mhv-btn--sm"
                onClick={() => { toast.info(`Message drafted for ${selected.size} members`); clearSelection(); }}
                disabled={isPending}
              >
                <IconMail /> Message
              </button>
              <button
                type="button"
                className="mhv-btn mhv-btn--subtle mhv-btn--sm"
                onClick={() => executeBulk("restore")}
                disabled={isPending}
              >
                <IconPlay /> Restore
              </button>
              <button
                type="button"
                className="mhv-btn mhv-btn--danger mhv-btn--sm"
                onClick={() => executeBulk("suspend")}
                disabled={isPending}
              >
                <IconPause /> Suspend
              </button>
              <div className="mhv-dock__divider" />
              <button
                type="button"
                className="mhv-btn mhv-btn--ghost mhv-btn--icon"
                onClick={clearSelection}
                aria-label="Clear selection"
              >
                <IconX size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
