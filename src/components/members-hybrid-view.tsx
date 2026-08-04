"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { bulkAssignProgram, bulkToggleMemberAccess, createMemberProfile } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { FormActionState } from "@/types/action-state";
import { AddMemberForm } from "@/components/add-member-form";
import type { AddMemberPreview } from "@/components/add-member-form";

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
  /** True for a row inserted optimistically while the create request is still in flight. */
  pending?: boolean;
};

export type HybridProgram = { id: string; title: string };

// ── Icon helpers (inline SVG) ────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarColor(id: string): string {
  let n = 0;
  for (const c of id) n = ((n * 31) + c.charCodeAt(0)) & 0xfffff;
  return `mhv-avatar--c${(n % 6) + 1}`;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(iso));
  } catch { return iso; }
}

const PAGE_SIZE = 10;
const RAIL_CAP = 5;

export type Bucket = "all" | "active" | "no-plan" | "expiring";
type SortKey = "name" | "newest" | "oldest" | "expiry" | "status";
type QType = "expired" | "expiring" | "noplan";

// ── Attention rail row ────────────────────────────────────────────────────────

function RailRow({ m, type, onDismiss }: {
  m: HybridMember;
  type: QType;
  onDismiss: (id: string) => void;
}) {
  const sub =
    type === "expired"
      ? `Expired ${Math.abs(m.daysToExpiry ?? 0)}d ago${m.currentPackageName ? ` · ${m.currentPackageName}` : ""}`
      : type === "expiring"
        ? `Expires in ${m.daysToExpiry ?? "?"}d${m.currentPackageName ? ` · ${m.currentPackageName}` : ""}`
        : m.goal ? `Goal: ${m.goal}` : "Workout unassigned";

  return (
    <div className="mhv-rrow" role="listitem">
      <Link href={`/owner/members/${m.id}`} className="mhv-rrow__link">
        <span className={`mhv-avatar mhv-avatar--sm ${avatarColor(m.id)}`} aria-hidden>
          {m.avatarInitials}
        </span>
        <span className="mhv-rrow__text">
          <span className="mhv-rrow__name">{m.fullName}</span>
          <span className="mhv-rrow__sub">{sub}</span>
        </span>
        <span className="mhv-rrow__chev" aria-hidden><IconChevRight /></span>
      </Link>
      <button
        type="button"
        className="mhv-rrow__dismiss"
        onClick={() => onDismiss(m.id)}
        aria-label={`Snooze ${m.fullName}`}
        title="Snooze for now"
      >
        <IconX size={11} />
      </button>
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
  initialMembers: rawMembers,
  programs,
  initialBucket = "all",
}: {
  initialMembers: HybridMember[];
  programs: HybridProgram[];
  initialBucket?: Bucket;
}) {
  // The persisted membershipStatus is written by a scheduled sweep and can lag
  // the real end date — a member at daysToExpiry <= 0 must never render as
  // "Expiring · in -24d" (docs/14 U6). Normalize once; everything downstream
  // (stats, rail buckets, pills, copy) stays consistent.
  const normalizedMembers = useMemo(
    () =>
      rawMembers.map((m) =>
        m.daysToExpiry != null &&
        m.daysToExpiry <= 0 &&
        (m.membershipStatus === "expiring_soon" || m.membershipStatus === "active")
          ? { ...m, membershipStatus: "expired" as const }
          : m
      ),
    [rawMembers]
  );

  // Optimistic member list — a newly-added member appears here the instant
  // "Add member" is confirmed, before the server round-trip finishes. React
  // reverts this back to `normalizedMembers` automatically once the create
  // transition below finishes and fresh server data flows back in via
  // router.refresh(), so no manual cleanup is needed on success OR failure.
  const [optimisticMembers, addOptimisticMember] = useOptimistic(
    normalizedMembers,
    (state, newMember: HybridMember) => [newMember, ...state]
  );

  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<Bucket>(initialBucket);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageState, setPageState] = useState({ key: "all||name", page: 1 });
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Set<QType>>(new Set());
  const [bulkMode, setBulkMode] = useState<"assign" | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState(programs[0]?.id ?? "");
  const [showAddMember, setShowAddMember] = useState(false);
  const [createError, setCreateError] = useState<FormActionState | null>(null);
  // optimistic access state
  const [accessById, setAccessById] = useState<Map<string, boolean>>(
    () => new Map(normalizedMembers.map((m) => [m.id, m.isActive]))
  );
  const [isPending, startTransition] = useTransition();
  const [isCreatingMember, startCreateTransition] = useTransition();
  const cbAllRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ── Derived stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = optimisticMembers.length;
    const active = optimisticMembers.filter((m) => accessById.get(m.id) ?? m.isActive).length;
    const noPlan = optimisticMembers.filter((m) => !m.hasPlan).length;
    const expiring = optimisticMembers.filter((m) => m.membershipStatus === "expiring_soon").length;
    const expired = optimisticMembers.filter((m) => m.membershipStatus === "expired").length;
    return { total, active, noPlan, expiring, expired };
  }, [optimisticMembers, accessById]);

  // ── Attention rail groups ──────────────────────────────────────────────────

  const railGroups = useMemo(() => {
    const defs: { type: QType; label: string; tone: "danger" | "warn" | "accent" }[] = [
      { type: "expired", label: "Expired", tone: "danger" },
      { type: "expiring", label: "Expiring soon", tone: "warn" },
      { type: "noplan", label: "No workout plan", tone: "accent" },
    ];
    const byType: Record<QType, HybridMember[]> = { expired: [], expiring: [], noplan: [] };
    for (const m of optimisticMembers) {
      // Skip rows still saving — flagging "no plan yet" while the create
      // request is mid-flight is just noise for something that resolves in
      // well under a second.
      if (dismissed.has(m.id) || m.pending) continue;
      if (m.membershipStatus === "expired") byType.expired.push(m);
      else if (m.membershipStatus === "expiring_soon") byType.expiring.push(m);
      else if (!m.hasPlan) byType.noplan.push(m);
    }
    return defs
      .map((d) => ({ ...d, items: byType[d.type] }))
      .filter((g) => g.items.length > 0);
  }, [optimisticMembers, dismissed]);

  const queueCount = railGroups.reduce((sum, g) => sum + g.items.length, 0);

  function toggleGroup(type: QType) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) { next.delete(type); } else { next.add(type); }
      return next;
    });
  }

  // ── Filtered + sorted directory ────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = optimisticMembers;
    if (bucket === "active") list = list.filter((m) => m.pending || (accessById.get(m.id) ?? m.isActive));
    else if (bucket === "no-plan") list = list.filter((m) => m.pending || !m.hasPlan);
    else if (bucket === "expiring") list = list.filter(
      (m) => m.pending || m.membershipStatus === "expired" || m.membershipStatus === "expiring_soon"
    );

    const q = query.trim().toLowerCase();
    if (q) list = list.filter((m) =>
      m.pending ||
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
    // Array.prototype.sort is stable (ES2019+), so this second pass only
    // moves pending rows to the front — it can't otherwise be sure a
    // just-added member is visible without switching sort/filter/page first.
    return [...list].sort(cmp[sortKey]).sort((a, b) => Number(b.pending) - Number(a.pending));
  }, [optimisticMembers, bucket, query, sortKey, accessById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageKey = `${bucket}|${query}|${sortKey}`;
  const page = pageState.key === pageKey ? pageState.page : 1;
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
    });
  }

  // ── Add member ─────────────────────────────────────────────────────────────

  function handleCreateMember(formData: FormData, preview: AddMemberPreview) {
    setCreateError(null);
    const optimisticId = `optimistic-${Date.now()}`;
    const initials = preview.fullName
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

    startCreateTransition(async () => {
      addOptimisticMember({
        id: optimisticId,
        fullName: preview.fullName,
        avatarInitials: initials || "?",
        isActive: true,
        username: preview.username,
        goal: preview.goal,
        joinedAt: new Date().toISOString().slice(0, 10),
        hasPlan: Boolean(preview.programTitle),
        programTitle: preview.programTitle,
        daysToExpiry: null,
        pending: true,
      });
      // Close immediately — the row is already visible in the table, so
      // there's nothing left for the owner to wait on here.
      setShowAddMember(false);

      const result = await createMemberProfile(initialFormActionState, formData);

      if (result.status === "success") {
        toast.success(result.message);
        router.refresh();
      } else {
        setCreateError(result);
        setShowAddMember(true);
        toast.error(result.message);
      }
    });
  }

  // ── Filter tabs ────────────────────────────────────────────────────────────

  const tabs: { key: Bucket; label: string; value: number; tone?: string }[] = [
    { key: "all", label: "All", value: stats.total },
    { key: "active", label: "Active", value: stats.active, tone: "brand" },
    { key: "no-plan", label: "Needs plan", value: stats.noPlan, tone: "accent" },
    { key: "expiring", label: "Renewals", value: stats.expiring + stats.expired, tone: "danger" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mhv-root">

      {/* ── Header ── */}
      <header className="mhv-header">
        <div className="mhv-header-copy">
          <nav aria-label="breadcrumb" className="mhv-crumbs">
            <Link href="/owner">Dashboard</Link>
            <span aria-hidden>/</span>
            <span>Members</span>
          </nav>
          <h1 className="mhv-title">Members</h1>
          <p className="mhv-subtitle">
            {queueCount > 0 ? (
              <><strong>{queueCount}</strong> {queueCount === 1 ? "member needs" : "members need"} your attention · {stats.total} in the directory.</>
            ) : (
              <>All caught up — {stats.total} members in the directory.</>
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
          <AddMemberForm
            programs={programs}
            isPending={isCreatingMember}
            error={createError}
            onConfirm={handleCreateMember}
          />
        </div>
      )}

      {/* ── Two-column workspace ── */}
      <div className="mhv-layout">

        {/* ── Directory (primary) ── */}
        <section className="mhv-panel" aria-label="Member directory">
          {/* Toolbar */}
          <div className="mhv-toolbar">
            <div className="mhv-tabs" role="group" aria-label="Filter members">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`mhv-tab${bucket === t.key ? " mhv-tab--on" : ""}`}
                  onClick={() => setBucket(t.key)}
                  aria-pressed={bucket === t.key}
                >
                  {t.tone && <span className={`mhv-ldot mhv-ldot--${t.tone}`} aria-hidden />}
                  {t.label}
                  <span className="mhv-tab__count">{t.value}</span>
                </button>
              ))}
            </div>

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
              <option value="name">Name (A–Z)</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="expiry">Expiring soonest</option>
              <option value="status">Active first</option>
            </select>
          </div>

          {/* Table */}
          <div className="mhv-table-wrap">
            <table className="mhv-table">
              <colgroup>
                <col style={{ width: 44 }} />
                <col />
                <col style={{ width: 190 }} />
                <col style={{ width: 175 }} />
                <col className="mhv-col-joined" style={{ width: 100 }} />
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
                  // The optimistic row has no real member ID yet — links into
                  // it, selection, and bulk actions all need to wait for the
                  // create request to resolve into a real record.
                  if (m.pending) {
                    return (
                      <tr key={m.id} className="mhv-row mhv-row--pending" aria-busy="true">
                        <td />
                        <td>
                          <div className="mhv-member">
                            <div className={`mhv-avatar ${avatarColor(m.id)}`} aria-hidden>
                              {m.avatarInitials}
                            </div>
                            <div>
                              <span className="mhv-member__name">{m.fullName}</span>
                              <div className="mhv-member__sub">
                                {m.username && <span>@{m.username}</span>}
                                {m.username && m.goal && <span> · </span>}
                                {m.goal && <span className="mhv-member__goal">{m.goal}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td><span className="mhv-pill mhv-pill--ghost">Adding…</span></td>
                        <td>
                          {m.hasPlan ? (
                            <span className="mhv-pill mhv-pill--ghost">{m.programTitle ?? "Assigned"}</span>
                          ) : (
                            <span className="mhv-pill mhv-pill--outline">No plan</span>
                          )}
                        </td>
                        <td className="mhv-col-joined" />
                        <td />
                      </tr>
                    );
                  }
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
                  onClick={() => setPageState((current) => ({
                    key: pageKey,
                    page: Math.max(1, (current.key === pageKey ? current.page : safePage) - 1)
                  }))}
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
                  onClick={() => setPageState((current) => ({
                    key: pageKey,
                    page: Math.min(totalPages, (current.key === pageKey ? current.page : safePage) + 1)
                  }))}
                  aria-label="Next page"
                >
                  Next <IconChevRight />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Attention rail ── */}
        <aside className="mhv-rail" aria-label="Members needing attention">
          <div className="mhv-rail__head">
            <h2 className="mhv-section-title">
              {queueCount > 0 && <span className="mhv-section-title__pulse" aria-hidden />}
              Needs attention
              {queueCount > 0 && (
                <span className="mhv-section-title__count">{queueCount}</span>
              )}
            </h2>
          </div>

          {queueCount === 0 ? (
            <div className="mhv-rail__clear" role="status" aria-live="polite">
              <div className="mhv-rail__clear-icon"><IconTrophy /></div>
              <div>
                <strong>All clear.</strong>
                <p>No renewals due, no plans missing.</p>
              </div>
            </div>
          ) : (
            railGroups.map((g) => {
              const open = openGroups.has(g.type);
              const shown = open ? g.items : g.items.slice(0, RAIL_CAP);
              return (
                <section key={g.type} className="mhv-rgroup">
                  <header className="mhv-rgroup__head">
                    <span className={`mhv-ldot mhv-ldot--${g.tone}`} aria-hidden />
                    <span className="mhv-rgroup__label">{g.label}</span>
                    <span className="mhv-rgroup__count">{g.items.length}</span>
                  </header>
                  <div role="list" aria-label={g.label}>
                    {shown.map((m) => (
                      <RailRow
                        key={m.id}
                        m={m}
                        type={g.type}
                        onDismiss={(id) => setDismissed((prev) => new Set([...prev, id]))}
                      />
                    ))}
                  </div>
                  {g.items.length > RAIL_CAP && (
                    <button
                      type="button"
                      className="mhv-rgroup__more"
                      onClick={() => toggleGroup(g.type)}
                    >
                      {open ? "Show less" : `Show ${g.items.length - RAIL_CAP} more`}
                    </button>
                  )}
                </section>
              );
            })
          )}
        </aside>
      </div>

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
