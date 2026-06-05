"use client";

import { MemberProgressPanel } from "@/components/member-progress-panel";
import { MemberHistory } from "@/components/member-history";
import { WorkoutCalendar } from "@/components/workout-calendar";
import { EditableMetrics } from "@/components/editable-metrics";
import { MacroProgressPanel } from "@/components/macro-progress-panel";
import { ProfileMetricsWidget } from "@/components/profile-metrics-widget";
import { GymNoticeBoard } from "@/components/gym-notice-board";
import { CatalogVideoPreview } from "@/components/catalog-video-preview";
import type { Exercise, LiftLog, DayLog, ActivityLog, MacroLog, WorkoutProgram, ProgramAssignment, GymNotice } from "@/types/domain";
import type { MemberProfile, Member } from "@/types/domain";
import React, { useState, useEffect, useTransition, useRef } from "react";
import Link from "next/link";
import { logoutUser } from "@/lib/auth";

/* ── Inline SVG icon helpers ──────────────────────── */
// Omit conflicting SVG attrs (d is string in SVG spec but we pass ReactNode; strokeWidth handled via sw)
type IconProps = { d?: React.ReactNode; size?: number; fill?: string; sw?: number } & Omit<React.SVGProps<SVGSVGElement>, "d" | "strokeWidth">;
const Icon = ({ d, size = 20, fill, sw = 1.7, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || "none"} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

type P = IconProps;
const Icons = {
  Lightning: (p: P) => <Icon {...p} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" stroke="none" />,
  Home:      (p: P) => <Icon {...p} d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-3v-7H10v7H7a2 2 0 01-2-2v-9z" />,
  Dumbbell:  (p: P) => <Icon {...p} d={<><path d="M6.5 6.5l11 11" /><path d="M3 9l3-3 3 3-3 3z" /><path d="M15 15l3-3 3 3-3 3z" /><path d="M2 12.5l1.5-1.5" /><path d="M22 11.5l-1.5 1.5" /></>} />,
  Chart:     (p: P) => <Icon {...p} d={<><path d="M3 21V3" /><path d="M21 21H3" /><path d="M7 17v-5" /><path d="M12 17v-9" /><path d="M17 17v-12" /></>} />,
  User:      (p: P) => <Icon {...p} d={<><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>} />,
  Flame:     (p: P) => <Icon {...p} d={<><path d="M12 3s4 3 4 9a4 4 0 11-8 0c0-1.5.5-3 1.5-4.2C10 6 8.5 4.5 12 3z" /><path d="M12 13a1.5 1.5 0 010 3" /></>} />,
  Play:      (p: P) => <Icon {...p} fill="currentColor" stroke="none" d="M8 5l12 7-12 7z" />,
  Check:     (p: P) => <Icon {...p} d="M4 12l5 5L20 6" />,
  CheckCircle:(p: P) => <Icon {...p} d={<><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-5" /></>} />,
  Plus:      (p: P) => <Icon {...p} d="M12 5v14M5 12h14" />,
  ChevR:     (p: P) => <Icon {...p} d="M9 6l6 6-6 6" />,
  Calendar:  (p: P) => <Icon {...p} d={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>} />,
  Mail:      (p: P) => <Icon {...p} d={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 7 9-7" /></>} />,
  Bell:      (p: P) => <Icon {...p} d={<><path d="M6 9a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" /><path d="M10 21a2 2 0 004 0" /></>} />,
  Heart:     (p: P) => <Icon {...p} d="M12 21s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z" />,
  Trophy:    (p: P) => <Icon {...p} d={<><path d="M8 4h8v6a4 4 0 01-8 0V4z" /><path d="M6 5H4a2 2 0 002 4" /><path d="M18 5h2a2 2 0 01-2 4" /><path d="M10 14v3l-1 3h6l-1-3v-3" /></>} />,
  Settings:  (p: P) => <Icon {...p} d={<><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 00-2-1.2L14 3h-4l-.5 2.5a7 7 0 00-2 1.2L5.1 5.8l-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.9c.6.5 1.3.9 2 1.2L10 21h4l.5-2.5c.7-.3 1.4-.7 2-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" /></>} />,
  Note:      (p: P) => <Icon {...p} d={<><path d="M5 4h11l3 3v13a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" /><path d="M8 9h7M8 13h7M8 17h4" /></>} />,
  Search:    (p: P) => <Icon {...p} d={<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>} />,
  Send:      (p: P) => <Icon {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  Video:     (p: P) => <Icon {...p} d={<><rect x="2" y="7" width="14" height="10" rx="2" /><path d="M16 11l5-4v10l-5-4" /></>} />,
  Swap:      (p: P) => <Icon {...p} d={<><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" /></>} />,
  LogOut:    (p: P) => <Icon {...p} d={<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>} />,
  Square:    (p: P) => <Icon {...p} d={<rect x="6" y="6" width="12" height="12" rx="2" />} fill="currentColor" stroke="none" />,
};

/* ── Props types ─────────────────────────────────────────────────── */
interface MemberCoachShellProps {
  firstName: string;
  gymName: string;
  gymLogoUrl?: string | null;
  gymPhone?: string | null;
  gymEmail?: string | null;
  gymLocationUrl?: string | null;
  gymNotices?: GymNotice[] | null;
  weeklyStreak: number;
  daysTrainedThisWeek: number;
  liftLogCount: number;
  membershipStatus?: string | null;
  membershipEndDate?: string | null;
  coachNote?: string | null;
  coachNoteFrom?: string | null;
  coachNoteUpdatedAt?: string | null;
  program: WorkoutProgram | null;
  assignment: ProgramAssignment | null;
  exercises: Exercise[];
  liftLogs: LiftLog[];
  dayLogs: DayLog[];
  activityLogs: ActivityLog[];
  macroLogs: MacroLog[];
  macroLog?: MacroLog | null;
  macroTarget?: MemberProfile["macroNutritionTarget"];
  injuryNote?: string | null;
  memberId: string;
  gymId: string;
  todayDate: string;
  member: Member;
  profile: MemberProfile;
  currentWeek: number | null;
  initialActiveSessionCount: number;
}

/* ── Avatar helper ───────────────────────────────────────────────── */
function Avatar({ initials, size = "md", className = "" }: { initials: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  return <span className={`mcr-avatar mcr-avatar--${size} ${className}`}>{initials}</span>;
}

/* ── Sidebar (Desktop) ───────────────────────────────────────────── */
function Sidebar({
  tab, setTab, firstName, gymName, gymLogoUrl,
}: {
  tab: string;
  setTab: (t: string) => void;
  firstName: string;
  gymName: string;
  gymLogoUrl?: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    startTransition(async () => {
      window.localStorage.removeItem("fitsplit-remember-me");
      await logoutUser();
    });
  };

  const tabItems = [
    { v: "train",    label: "Train",    icon: <Icons.Dumbbell size={18} /> },
    { v: "progress", label: "Progress", icon: <Icons.Chart size={18} /> },
    { v: "calendar", label: "Calendar", icon: <Icons.Calendar size={18} /> },
    { v: "body",     label: "Body",     icon: <Icons.Heart size={18} /> },
    { v: "coach",    label: "Coach",    icon: <Icons.Mail size={18} /> },
  ];

  const gymShort = gymName.split(" · ")[0];
  const initials = firstName.charAt(0).toUpperCase();

  // Chevron + logout icons inlined
  const ChevD = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
  const LogOutIco = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );

  return (
    <aside className="m3d-side">
      {/* Brand + gym co-brand lockup — clicking goes to dashboard */}
      <button
        className="m3d-side__logo m3d-side__logo--btn"
        onClick={() => setTab("train")}
        type="button"
        aria-label="Go to dashboard"
      >
        {gymLogoUrl ? (
          <div className="m3d-side__cobrand">
            <div className="m3d-side__logo-mark m3d-side__logo-mark--sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-512.png" alt="FitSplit" width={42} height={42} className="m3d-logo-img" />
            </div>
            <span className="m3d-side__cobrand-sep">×</span>
            <div className="m3d-side__logo-mark m3d-side__logo-mark--sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gymLogoUrl} alt={gymShort} width={42} height={42} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "10px" }} />
            </div>
          </div>
        ) : (
          <div className="m3d-side__logo-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-512.png" alt="FitSplit" width={52} height={52} className="m3d-logo-img" />
          </div>
        )}
        <div className="m3d-side__logo-text">
          <span className="m3d-side__logo-name">FitSplit</span>
          <span className="m3d-side__gym-sub">{gymShort}</span>
        </div>
      </button>

      {/* Nav */}
      <nav className="m3d-side__nav">
        {tabItems.map((it) => (
          <button
            key={it.v}
            className={`m3d-side__item${tab === it.v ? " m3d-side__item--on" : ""}`}
            onClick={() => setTab(it.v)}
            type="button"
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        ))}
        {/* Quick links — full-page views for less-frequent actions */}
        <div className="m3d-side__section-sep" />
        <Link href="/member/programs" className="m3d-side__item m3d-side__item--link">
          <Icons.Note size={18} />
          <span>Programs</span>
        </Link>
        <Link href="/member/exercises" className="m3d-side__item m3d-side__item--link">
          <Icons.Search size={18} />
          <span>Exercises</span>
        </Link>
      </nav>

      {/* ── Snowflake-style profile footer ── */}
      <div className="m3d-side__user-footer" ref={menuRef}>
        {/* Popup menu — opens upward */}
        {menuOpen && (
          <>
            <div className="m3d-user-menu__overlay" onClick={() => setMenuOpen(false)} />
            <div className="m3d-user-menu">
              <div className="m3d-user-menu__header">
                <Avatar initials={initials} size="sm" />
                <div>
                  <div className="m3d-user-menu__name">{firstName}</div>
                  <div className="m3d-user-menu__role">Member</div>
                </div>
              </div>
              <div className="m3d-user-menu__divider" />
              <Link href="/member/settings" className="m3d-user-menu__item" onClick={() => setMenuOpen(false)}>
                <Icons.User size={14} /> Profile &amp; metrics
              </Link>
              <Link href="/member/settings" className="m3d-user-menu__item" onClick={() => setMenuOpen(false)}>
                <Icons.Settings size={14} /> Settings
              </Link>
              <Link href="/member/membership" className="m3d-user-menu__item" onClick={() => setMenuOpen(false)}>
                <Icons.Bell size={14} /> Membership
              </Link>
              <Link href="/member/coach" className="m3d-user-menu__item" onClick={() => setMenuOpen(false)}>
                <Icons.Mail size={14} /> Message coach
              </Link>
              <div className="m3d-user-menu__divider" />
              <button
                className="m3d-user-menu__item m3d-user-menu__item--danger"
                onClick={handleLogout}
                disabled={isPending}
                type="button"
              >
                <LogOutIco /> {isPending ? "Logging out…" : "Log out"}
              </button>
            </div>
          </>
        )}

        {/* Main trigger */}
        <button
          className="m3d-user-btn"
          type="button"
          onClick={() => setMenuOpen((p) => !p)}
          aria-label="Account menu"
        >
          <Avatar initials={initials} size="sm" />
          <div className="m3d-user-btn__id">
            <strong>{firstName}</strong>
            <span>Member</span>
          </div>
          <span style={{ opacity: 0.45, display: "flex", alignItems: "center" }}><ChevD /></span>
        </button>

        {/* Standalone logout button */}
        <button
          className="m3d-user-out"
          type="button"
          title="Log out"
          onClick={handleLogout}
          disabled={isPending}
        >
          <LogOutIco />
        </button>
      </div>
    </aside>
  );
}

/* ── Desktop TopBar ──────────────────────────────────────────────── */
function DesktopTopBar({ onToast, unreadCount = 0 }: { onToast: (t: string) => void; unreadCount?: number }) {
  return (
    <header className="m3d-top">
      <div className="m3d-top__crumbs">
        <span className="m3d-top__crumb">Dashboard</span>
        <span className="m3d-top__crumb-sep">/</span>
        <span className="m3d-top__crumb m3d-top__crumb--current">Today</span>
      </div>
      <div className="m3d-top__right">
        <button className="m3d-top__icon" onClick={() => unreadCount > 0 ? onToast(`${unreadCount} new notification${unreadCount > 1 ? "s" : ""}`) : onToast("No new notifications")} type="button" aria-label="Notifications">
          <Icons.Bell size={18} />
          {unreadCount > 0 && <span className="m3d-top__icon-dot" />}
        </button>
      </div>
    </header>
  );
}

/* ── Mobile TopBar ───────────────────────────────────────────────── */
function MobileTopBar({ firstName, gymName, unreadCount = 0, onNotif }: {
  firstName: string;
  gymName: string;
  gymLogoUrl?: string | null;
  unreadCount?: number;
  onNotif: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isPending, startTransition] = useTransition();
  const gymShort = gymName.split(" · ")[0];

  const handleLogout = () => {
    setShowMenu(false);
    startTransition(async () => {
      window.localStorage.removeItem("fitsplit-remember-me");
      await logoutUser();
    });
  };

  return (
    <div className="mcr-topbar">
      <div className="mcr-topbar__left">
        <span className="mcr-topbar__gym">{gymShort}</span>
        <div className="mcr-topbar__hi">Hi, {firstName} 👋</div>
      </div>
      <div className="mcr-topbar__right">
        <button className="mcr-topbar__icon" onClick={onNotif} aria-label="Notifications" type="button">
          <Icons.Bell size={18} />
          {unreadCount > 0 && <span className="mcr-topbar__dot" />}
        </button>
        <div className="mcr-avatar-wrap">
          <button
            className="mcr-topbar__avatar-btn"
            onClick={() => setShowMenu((v) => !v)}
            aria-label="Account menu"
            type="button"
          >
            <Avatar initials={firstName.charAt(0)} size="md" />
          </button>

          {showMenu && (
            <>
              {/* Click-away overlay */}
              <div className="mcr-user-menu__overlay" onClick={() => setShowMenu(false)} />
              <div className="mcr-user-menu">
                <div className="mcr-user-menu__header">
                  <Avatar initials={firstName.charAt(0)} size="sm" />
                  <span>{firstName}</span>
                </div>
                <Link href="/member/settings" className="mcr-user-menu__item" onClick={() => setShowMenu(false)}>
                  <Icons.Settings size={15} /> Settings
                </Link>
                <Link href="/member/membership" className="mcr-user-menu__item" onClick={() => setShowMenu(false)}>
                  <Icons.Bell size={15} /> Membership
                </Link>
                <Link href="/member/coach" className="mcr-user-menu__item" onClick={() => setShowMenu(false)}>
                  <Icons.Mail size={15} /> Message coach
                </Link>
                <div className="mcr-user-menu__divider" />
                <button
                  className="mcr-user-menu__item mcr-user-menu__item--danger"
                  onClick={handleLogout}
                  disabled={isPending}
                  type="button"
                >
                  <Icons.LogOut size={15} /> {isPending ? "Logging out…" : "Log out"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Mobile Bottom Tab Bar ───────────────────────────────────────── */
function MobileTabBar({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const tabItems = [
    { v: "train",    label: "Train",    icon: <Icons.Dumbbell size={22} /> },
    { v: "progress", label: "Progress", icon: <Icons.Chart size={22} /> },
    { v: "body",     label: "Body",     icon: <Icons.Heart size={22} /> },
  ];
  return (
    <nav className="mcr-tabbar">
      {/* Coach — links to dedicated full-page view */}
      <Link href="/member/coach" className="mcr-tabbar__item">
        <Icons.Mail size={22} />
        <span>Coach</span>
      </Link>
      {tabItems.map((t) => (
        <button
          key={t.v}
          className={`mcr-tabbar__item${tab === t.v ? " mcr-tabbar__item--on" : ""}`}
          onClick={() => setTab(t.v)}
          type="button"
        >
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}


/* ── Compact coach note banner (train tab) ──────────────────────── */
function CoachNoteBanner({ coachNote, coachNoteFrom }: {
  coachNote?: string | null;
  coachNoteFrom?: string | null;
}) {
  if (!coachNote) return null;
  const initials = coachNoteFrom
    ? coachNoteFrom.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "PT";
  return (
    <div className="m3d-coach-banner">
      <div className="m3d-coach-banner__avatar">{initials}</div>
      <div className="m3d-coach-banner__body">
        <span className="m3d-coach-banner__from">{coachNoteFrom ?? "Your coach"}</span>
        <span className="m3d-coach-banner__note">{coachNote.length > 90 ? coachNote.slice(0, 90) + "…" : coachNote}</span>
      </div>
      <Link href="/member/coach" className="m3d-coach-banner__link" aria-label="Open coach thread">
        <Icons.ChevR size={14} />
      </Link>
    </div>
  );
}

/* ── Stats section (mobile coach tab) ───────────────────────────── */
function StatsSection({ weeklyStreak, daysTrainedThisWeek, weeklyTarget, profile, liftLogs }: {
  weeklyStreak: number;
  daysTrainedThisWeek: number;
  weeklyTarget: number;
  profile: MemberProfile;
  liftLogs: LiftLog[];
}) {
  // Find best set across all logs
  const bestWeight = liftLogs.length > 0
    ? Math.max(...liftLogs.map((l) => l.weight ?? 0))
    : 0;

  return (
    <section className="mcr-stats">
      <h3 className="mcr-stats__title">Your progress</h3>
      <div className="mcr-stats__grid">
        <div className="mcr-stat">
          <div className="mcr-stat__icon" style={{ color: "var(--warning)" }}><Icons.Flame size={16} /></div>
          <strong>{weeklyStreak > 0 ? weeklyStreak : "—"}<small>w</small></strong>
          <span>streak</span>
        </div>
        <div className="mcr-stat">
          <div className="mcr-stat__icon" style={{ color: "var(--brand)" }}><Icons.Dumbbell size={16} /></div>
          <strong>{daysTrainedThisWeek}<small>/{weeklyTarget}</small></strong>
          <span>this week</span>
        </div>
        <div className="mcr-stat">
          <div className="mcr-stat__icon" style={{ color: "var(--accent)" }}><Icons.Trophy size={16} /></div>
          <strong>{bestWeight > 0 ? bestWeight : "—"}<small>kg</small></strong>
          <span>best lift</span>
        </div>
        <div className="mcr-stat">
          <div className="mcr-stat__icon" style={{ color: "var(--danger)" }}><Icons.Heart size={16} /></div>
          <strong>{profile.weightKg ?? "—"}<small>{profile.weightKg ? "kg" : ""}</small></strong>
          <span>body wt.</span>
        </div>
      </div>
    </section>
  );
}

/* ── Membership row ──────────────────────────────────────────────── */
function MembershipRow({ membershipStatus, membershipEndDate }: {
  membershipStatus?: string | null;
  membershipEndDate?: string | null;
}) {
  const daysLeft = membershipEndDate
    ? Math.ceil((new Date(membershipEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const statusText = membershipStatus === "active"
    ? daysLeft !== null ? `Active · renews in ${daysLeft}d` : "Active"
    : membershipStatus === "expiring_soon"
    ? `Expiring soon${daysLeft !== null ? ` · ${daysLeft}d left` : ""}`
    : membershipStatus === "expired"
    ? "Expired — please renew"
    : "No membership";

  const isUrgent = membershipStatus === "expiring_soon" || membershipStatus === "expired";

  return (
    <section className={`mcr-membership${isUrgent ? " mcr-membership--urgent" : ""}`}>
      <div>
        <span className="mcr-membership__label">Membership</span>
        <strong>{statusText}</strong>
      </div>
      <Link href="/member/membership" className="mcr-membership__btn">Manage</Link>
    </section>
  );
}

/* ── Today's session — desktop table view ───────────────────────── */
function normalizeMuscleToken(value?: string | null) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getAlternateExercises(original: Exercise | undefined, exercises: Exercise[]) {
  if (!original) return [];

  const originalGroup = normalizeMuscleToken(original.muscleGroup);

  return exercises
    .filter((candidate) => {
      if (candidate.id === original.id) return false;
      return normalizeMuscleToken(candidate.muscleGroup) === originalGroup;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getNextExerciseSwap(original: Exercise | undefined, currentExerciseId: string, exercises: Exercise[]) {
  const alternates = getAlternateExercises(original, exercises);
  if (!alternates.length) return null;

  const currentIndex = alternates.findIndex((candidate) => candidate.id === currentExerciseId);
  return alternates[(currentIndex + 1) % alternates.length] ?? alternates[0];
}

function getExerciseSwapKey(dayId: string | undefined, selectedDayIndex: number, exerciseId: string, index: number) {
  return `${dayId ?? `day-${selectedDayIndex}`}:${exerciseId}:${index}`;
}

function TodaySessionList({ program, currentWeek, exercises, isWorkoutActive, onToggleWorkout, selectedDayIndex, onSelectDay }: {
  program: WorkoutProgram;
  currentWeek: number | null;
  exercises: Exercise[];
  isWorkoutActive: boolean;
  onToggleWorkout: () => void;
  selectedDayIndex: number;
  onSelectDay: (idx: number) => void;
}) {
  const day = program.days?.[selectedDayIndex];
  const totalSets = (day?.exercises ?? []).reduce((s, e) => s + (e.sets ?? 0), 0);
  const liftsCount = day?.exercises?.length ?? 0;
  const estMin = liftsCount * 8;
  const [exerciseSwaps, setExerciseSwaps] = useState<Record<string, string>>({});

  return (
    <section className="m3d-today">
      <div className="m3d-today__head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="m3d-today__eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icons.Note size={13} />
            Your coach&apos;s plan
          </div>
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
            {program.days?.map((d, i) => (
              <button
                key={d.id}
                onClick={() => onSelectDay(i)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: selectedDayIndex === i ? '1px solid color-mix(in srgb, var(--brand) 38%, var(--border))' : '1px solid var(--border)',
                  background: selectedDayIndex === i ? 'color-mix(in srgb, var(--brand) 12%, var(--bg-elevated))' : 'transparent',
                  color: selectedDayIndex === i ? 'var(--text)' : 'var(--text-soft)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: selectedDayIndex === i ? 'inset 0 0 0 1px color-mix(in srgb, var(--brand) 12%, transparent)' : 'none'
                }}
              >
                Day {d.dayNumber}: {d.title}
              </button>
            ))}
          </div>

          <h2 className="m3d-today__title" style={{ marginTop: 0 }}>{day?.title ?? program.title}</h2>
          <span className="m3d-today__sub">
            Week {currentWeek ?? 1} · {liftsCount} lifts · {totalSets} sets · est. {estMin} min
          </span>
        </div>
        <div className="m3d-today__cta" style={{ alignSelf: 'flex-start', marginTop: '45px' }}>
          <button 
            className="m3d-today__start-btn" 
            onClick={onToggleWorkout} 
            type="button"
            style={isWorkoutActive ? { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-soft)' } : undefined}
          >
            {isWorkoutActive ? <Icons.Square size={14} /> : <Icons.Play size={16} />} 
            {isWorkoutActive ? "Stop workout" : "Start workout"}
          </button>
        </div>
      </div>

      <div className="m3d-today__exercises">
        {(day?.exercises ?? []).map((ex, idx) => {
          const rowKey = getExerciseSwapKey(day?.id, selectedDayIndex, ex.exerciseId, idx);
          const originalEx = exercises.find((e) => e.id === ex.exerciseId);
          const activeExerciseId = exerciseSwaps[rowKey] ?? ex.exerciseId;
          const dictEx = exercises.find((e) => e.id === activeExerciseId) ?? originalEx;
          const nextSwap = getNextExerciseSwap(originalEx, activeExerciseId, exercises);
          const isSwapped = Boolean(exerciseSwaps[rowKey]) && Boolean(originalEx) && dictEx?.id !== originalEx?.id;
          return (
            <div key={ex.exerciseId + idx} className="m3d-ex">
              <div className="m3d-ex__num">{idx + 1}</div>
              <div className="m3d-ex__body">
                <span className="m3d-ex__name">{dictEx?.name ?? "Unknown"}</span>
                <div className="m3d-ex__group">
                  <span>{dictEx?.muscleGroup ?? "—"}</span>
                  {isSwapped && originalEx ? (
                    <span className="m3d-ex__swap-note">Alternative for {originalEx.name}</span>
                  ) : null}
                </div>
              </div>
              <div className="m3d-ex__sets">
                <small>SETS × REPS</small>
                <strong>{ex.sets} × {ex.reps}</strong>
              </div>
              <div className="m3d-ex__actions">
                <button
                  className="m3d-ex__swap"
                  disabled={!nextSwap}
                  title={nextSwap ? `Swap with ${nextSwap.name}` : "No same-muscle alternative found"}
                  type="button"
                  onClick={() => {
                    if (!nextSwap) return;
                    setExerciseSwaps((current) => ({ ...current, [rowKey]: nextSwap.id }));
                  }}
                >
                  <Icons.Swap size={13} />
                  <span>{nextSwap ? "Swap" : "No swap"}</span>
                </button>
                <div className="m3d-ex__video-wrap">
                  {dictEx && (dictEx.gymVideoUrl || dictEx.videoUrl) ? (
                    <CatalogVideoPreview
                      exerciseName={dictEx.name}
                      gymVideoUrl={dictEx.gymVideoUrl}
                      muscleGroup={dictEx.muscleGroup ?? ""}
                      videoUrl={dictEx.videoUrl}
                    />
                  ) : (
                    <button className="m3d-ex__open" aria-label="Open details" type="button">
                      <Icons.ChevR size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Mobile Today card ───────────────────────────────────────────── */
function MobileTodayCard({ program, currentWeek, exercises, isWorkoutActive, onToggleWorkout, selectedDayIndex, onSelectDay }: {
  program: WorkoutProgram;
  currentWeek: number | null;
  exercises: Exercise[];
  isWorkoutActive: boolean;
  onToggleWorkout: () => void;
  selectedDayIndex: number;
  onSelectDay: (idx: number) => void;
}) {
  const day = program.days?.[selectedDayIndex];
  const liftsCount = day?.exercises?.length ?? 0;
  const totalSets = (day?.exercises ?? []).reduce((s, e) => s + (e.sets ?? 0), 0);
  const estMin = liftsCount * 8;
  const [exerciseSwaps, setExerciseSwaps] = useState<Record<string, string>>({});

  return (
    <section className="mcr-today">
      <div className="mcr-today__eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icons.Note size={13} />
        Your coach&apos;s plan
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
        {program.days?.map((d, i) => (
          <button
            key={d.id}
            onClick={() => onSelectDay(i)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedDayIndex === i ? '1px solid color-mix(in srgb, var(--brand) 38%, var(--border))' : '1px solid var(--border)',
              background: selectedDayIndex === i ? 'color-mix(in srgb, var(--brand) 12%, var(--bg-elevated))' : 'transparent',
              color: selectedDayIndex === i ? 'var(--text)' : 'var(--text-soft)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              boxShadow: selectedDayIndex === i ? 'inset 0 0 0 1px color-mix(in srgb, var(--brand) 12%, transparent)' : 'none'
            }}
          >
            Day {d.dayNumber}: {d.title}
          </button>
        ))}
      </div>

      <div className="mcr-today__head">
        <div>
          <h2 className="mcr-today__title">{day?.title ?? program.title}</h2>
          <span className="mcr-today__sub">Week {currentWeek ?? 1} · {liftsCount} lifts · {totalSets} sets · ~{estMin}m</span>
        </div>
        <div className="mcr-today__day-num">
          <strong>{liftsCount}</strong>
          <small>lifts</small>
        </div>
      </div>

      <div className="mcr-today__exercises">
        {(day?.exercises ?? []).slice(0, 6).map((ex, idx) => {
          const rowKey = getExerciseSwapKey(day?.id, selectedDayIndex, ex.exerciseId, idx);
          const originalEx = exercises.find((e) => e.id === ex.exerciseId);
          const activeExerciseId = exerciseSwaps[rowKey] ?? ex.exerciseId;
          const dictEx = exercises.find((e) => e.id === activeExerciseId) ?? originalEx;
          const nextSwap = getNextExerciseSwap(originalEx, activeExerciseId, exercises);
          const isSwapped = Boolean(exerciseSwaps[rowKey]) && Boolean(originalEx) && dictEx?.id !== originalEx?.id;
          return (
            <div key={ex.exerciseId + idx} className="mcr-ex">
              <div className="mcr-ex__num">{idx + 1}</div>
              <div className="mcr-ex__body">
                <div className="mcr-ex__name">{dictEx?.name ?? "Unknown"}</div>
                <div className="mcr-ex__meta">
                  <span>{ex.sets} × {ex.reps}</span>
                  {dictEx && (dictEx.gymVideoUrl || dictEx.videoUrl) && (
                    <>
                      <span className="mcr-ex__sep">·</span>
                      <span className="mcr-ex__video-wrap-sm">
                        <CatalogVideoPreview
                          exerciseName={dictEx.name}
                          gymVideoUrl={dictEx.gymVideoUrl}
                          muscleGroup={dictEx.muscleGroup ?? ""}
                          videoUrl={dictEx.videoUrl}
                        />
                      </span>
                    </>
                  )}
                </div>
                {isSwapped && originalEx ? (
                  <div className="mcr-ex__swap-note">Alternative for {originalEx.name}</div>
                ) : null}
                <div className="mcr-ex__actions">
                  <button
                    className="mcr-ex__swap"
                    disabled={!nextSwap}
                    title={nextSwap ? `Swap with ${nextSwap.name}` : "No same-muscle alternative found"}
                    type="button"
                    onClick={() => {
                      if (!nextSwap) return;
                      setExerciseSwaps((current) => ({ ...current, [rowKey]: nextSwap.id }));
                    }}
                  >
                    <Icons.Swap size={12} />
                    <span>{nextSwap ? "Swap" : "No swap"}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button 
        className="mcr-today__start" 
        onClick={onToggleWorkout} 
        type="button"
        style={isWorkoutActive ? { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-soft)' } : undefined}
      >
        {isWorkoutActive ? <Icons.Square size={14} /> : <Icons.Play size={16} />} 
        {isWorkoutActive ? "Stop workout" : "Start workout"}
      </button>
    </section>
  );
}

/* ── PT card ─────────────────────────────────────────────────────── */
function PTCard() {
  return (
    <section className="m3d-card">
      <div className="m3d-card__head">
        <div className="m3d-card__head-icon" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          <Icons.Calendar size={16} />
        </div>
        <div>
          <span className="m3d-card__eyebrow">PERSONAL TRAINING</span>
          <strong className="m3d-card__title">PT History</strong>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-soft)", margin: "0 0 12px", lineHeight: 1.6 }}>
        View your personal training sessions, session notes, and exercise logs from your trainer.
      </p>
      <Link href="/member/pt-history" className="m3d-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
        <Icons.Calendar size={13} /> View PT sessions →
      </Link>
    </section>
  );
}

/* ── PRs card ────────────────────────────────────────────────────── */
function PRsCard({ liftLogs, exercises }: { liftLogs: LiftLog[]; exercises: Exercise[] }) {
  // Find top-3 PRs (max weight per exercise)
  const prsByEx = new Map<string, { weight: number; reps?: number; loggedAt?: string }>();
  for (const log of liftLogs) {
    if (!log.exerciseId) continue;
    const current = prsByEx.get(log.exerciseId);
    if (!current || (log.weight ?? 0) > current.weight) {
      prsByEx.set(log.exerciseId, { weight: log.weight ?? 0, reps: log.reps ? Number(log.reps) : undefined, loggedAt: log.loggedAt });
    }
  }
  const prs = [...prsByEx.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 3)
    .map(([exId, data]) => {
      const ex = exercises.find((e) => e.id === exId);
      return { name: ex?.name ?? exId, ...data };
    });

  return (
    <section className="m3d-card">
      <div className="m3d-card__head">
        <div className="m3d-card__head-icon" style={{ background: "color-mix(in srgb, var(--warning) 18%, transparent)", color: "var(--warning)" }}>
          <Icons.Trophy size={16} />
        </div>
        <div>
          <span className="m3d-card__eyebrow">RECENT PRs</span>
          <strong className="m3d-card__title">Personal records</strong>
        </div>
      </div>
      {prs.length === 0 ? (
        <p className="mcr-empty-small">No lift logs yet — start your first workout!</p>
      ) : (
        <ul className="m3d-prs">
          {prs.map((pr) => (
            <li key={pr.name}>
              <div>
                <strong>{pr.name}</strong>
                <span>{pr.loggedAt ? new Date(pr.loggedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</span>
              </div>
              <span className="m3d-prs__weight">{pr.weight}<small>kg{pr.reps ? ` × ${pr.reps}` : ""}</small></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Body & Macros card ──────────────────────────────────────────── */
function BodyMacrosCard({ profile, macroLog }: { member?: Member; profile: MemberProfile; macroLog?: MacroLog | null }) {
  const targetKcal = profile.macroNutritionTarget?.calories ?? 1800;
  const actualKcal = macroLog ? ((macroLog.protein ?? 0) * 4 + (macroLog.carbs ?? 0) * 4 + (macroLog.fat ?? 0) * 9) : 0;
  const kcalPct = Math.min(100, Math.round((actualKcal / targetKcal) * 100));

  const tp = profile.macroNutritionTarget?.protein ?? 110;
  const tc = profile.macroNutritionTarget?.carbs ?? 210;
  const tf = profile.macroNutritionTarget?.fat ?? 55;
  const ap = macroLog?.protein ?? 0;
  const ac = macroLog?.carbs ?? 0;
  const af = macroLog?.fat ?? 0;

  return (
    <section className="m3d-card">
      <div className="m3d-card__head">
        <div className="m3d-card__head-icon" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
          <Icons.Heart size={16} />
        </div>
        <div>
          <span className="m3d-card__eyebrow">BODY · TODAY</span>
          <strong className="m3d-card__title">Weight & macros</strong>
        </div>
        <button className="m3d-btn-ghost m3d-body-log" type="button">
          <Icons.Plus size={13} /> Log
        </button>
      </div>
      <div className="m3d-body-row">
        <div className="m3d-body-stat">
          <span>Weight</span>
          <strong>{profile.weightKg ?? "—"}<small>{profile.weightKg ? "kg" : ""}</small></strong>
          <em>body weight</em>
        </div>
        <div className="m3d-body-stat">
          <span>Height</span>
          <strong>{profile.heightCm ?? "—"}<small>{profile.heightCm ? "cm" : ""}</small></strong>
          <em>stature</em>
        </div>
        <div className="m3d-body-stat">
          <span>Kcal</span>
          <strong>{actualKcal > 0 ? actualKcal : "—"}</strong>
          <em>of {targetKcal} target</em>
        </div>
      </div>
      <div className="m3d-macros">
        <div className="m3d-macros__head">
          <span>Today&apos;s intake</span>
          <strong>{actualKcal > 0 ? actualKcal : 0}<small> / {targetKcal} kcal · {kcalPct}%</small></strong>
        </div>
        <div className="m3d-macros__row">
          <div className="m3d-macro">
            <div className="m3d-macro__head"><span>Protein</span><small>{ap}/{tp}g</small></div>
            <div className="m3d-macro__bar"><div className="m3d-macro__fill m3d-macro__fill--p" style={{ width: `${Math.min(100, (ap/tp)*100)}%` }} /></div>
          </div>
          <div className="m3d-macro">
            <div className="m3d-macro__head"><span>Carbs</span><small>{ac}/{tc}g</small></div>
            <div className="m3d-macro__bar"><div className="m3d-macro__fill m3d-macro__fill--c" style={{ width: `${Math.min(100, (ac/tc)*100)}%` }} /></div>
          </div>
          <div className="m3d-macro">
            <div className="m3d-macro__head"><span>Fat</span><small>{af}/{tf}g</small></div>
            <div className="m3d-macro__bar"><div className="m3d-macro__fill m3d-macro__fill--f" style={{ width: `${Math.min(100, (af/tf)*100)}%` }} /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Main export ─────────────────────────────────────────────────── */
export function MemberCoachShell(props: MemberCoachShellProps) {
  const {
    firstName, gymName, gymLogoUrl, gymNotices,
    weeklyStreak, daysTrainedThisWeek, liftLogCount,
    membershipStatus, membershipEndDate,
    coachNote, coachNoteFrom,
    program, currentWeek, exercises, liftLogs, dayLogs, activityLogs,
    macroLogs, macroLog, macroTarget, injuryNote,
    memberId, gymId, todayDate,
    member, profile, initialActiveSessionCount,
  } = props;

  const [tab, setTab] = useState("train");
  const [toast, setToast] = useState<string | null>(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [selectedPreviewDay, setSelectedPreviewDay] = useState(0);

  function handleToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    document.body.classList.add("member-desktop-full");
    return () => document.body.classList.remove("member-desktop-full");
  }, []);

  useEffect(() => {
    const startedAt = window.localStorage.getItem("fitsplit-workout-start");
    if (startedAt) {
      const startMs = parseInt(startedAt, 10);
      if (Date.now() - startMs < 4 * 60 * 60 * 1000) {
        setIsWorkoutActive(true);
      } else {
        window.localStorage.removeItem("fitsplit-workout-start");
      }
    }
  }, []);

  const handleToggleWorkout = () => {
    if (isWorkoutActive) {
      setIsWorkoutActive(false);
      window.localStorage.removeItem("fitsplit-workout-start");
      handleToast("Workout ended");
    } else {
      setIsWorkoutActive(true);
      window.localStorage.setItem("fitsplit-workout-start", Date.now().toString());
      handleToast("Workout started! Your streak is active.");
    }
  };

  return (
    <div className="m3d-root">
      {/* ── Desktop Sidebar ── */}
      <Sidebar tab={tab} setTab={setTab} firstName={firstName} gymName={gymName} gymLogoUrl={gymLogoUrl} />

      {/* ── Main Content ── */}
      <div className="m3d-main">
        {/* Desktop topbar (hidden on mobile) */}
        <DesktopTopBar onToast={handleToast} />

        <div className="m3d-content">

          {/* coach tab redirected — kept as no-op since nav links to /member/coach directly */}

          {/* ── Train tab (default home) ── */}
          {tab === "train" && (
            <>
              {/* Desktop page header */}
              <div className="m3d-pagehead">
                <div>
                  <span className="m3d-pagehead__eyebrow">
                    {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                  </span>
                  <h1 className="m3d-pagehead__title">Hi, {firstName} — let&apos;s train.</h1>
                </div>
                <div className="m3d-pagehead__chips">
                  <div className="m3d-chip">
                    <Icons.Flame size={14} />
                    <strong>{weeklyStreak > 0 ? weeklyStreak : "—"}<small>w</small></strong>
                    <span>streak</span>
                  </div>
                  <div className="m3d-chip">
                    <Icons.Dumbbell size={14} />
                    <strong>{daysTrainedThisWeek}<small>/7</small></strong>
                    <span>this week</span>
                  </div>
                  <div className="m3d-chip">
                    <Icons.Trophy size={14} />
                    <strong>{liftLogCount}</strong>
                    <span>sets logged</span>
                  </div>
                </div>
              </div>

              {/* Mobile top bar (hidden on desktop) */}
              <MobileTopBar
                firstName={firstName}
                gymName={gymName}
                gymLogoUrl={gymLogoUrl}
                onNotif={() => handleToast("No new notifications")}
              />

              <div className="m3d-grid">
                <div className="m3d-grid__left">
                  {/* Compact coach note banner */}
                  <CoachNoteBanner coachNote={coachNote} coachNoteFrom={coachNoteFrom} />

                  {/* Mobile-only stats strip */}
                  <StatsSection
                    weeklyStreak={weeklyStreak}
                    daysTrainedThisWeek={daysTrainedThisWeek}
                    weeklyTarget={4}
                    profile={profile}
                    liftLogs={liftLogs}
                  />

                  {program ? (
                    <>
                      {/* Desktop view: table layout */}
                      <div className="mcr-desktop-only">
                        <TodaySessionList
                          program={program}
                          currentWeek={currentWeek}
                          exercises={exercises}
                          isWorkoutActive={isWorkoutActive}
                          onToggleWorkout={handleToggleWorkout}
                          selectedDayIndex={selectedPreviewDay}
                          onSelectDay={setSelectedPreviewDay}
                        />
                      </div>
                      {/* Mobile view: card layout */}
                      <div className="mcr-mobile-only">
                        <MobileTodayCard
                          program={program}
                          currentWeek={currentWeek}
                          exercises={exercises}
                          isWorkoutActive={isWorkoutActive}
                          onToggleWorkout={handleToggleWorkout}
                          selectedDayIndex={selectedPreviewDay}
                          onSelectDay={setSelectedPreviewDay}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="mcr-no-plan">
                      <div className="mcr-no-plan__icon"><Icons.Dumbbell size={28} /></div>
                      <h2>No workout plan assigned</h2>
                      <p>Your trainer hasn&apos;t assigned a program yet. <Link href="/member/coach">Reach out to your coach →</Link></p>
                    </div>
                  )}

                  {gymNotices && gymNotices.length > 0 && (
                    <div className="mcr-notices-wrap">
                      <GymNoticeBoard notices={gymNotices} />
                    </div>
                  )}

                  {/* Mobile-only membership row */}
                  <div className="mcr-mobile-only">
                    <MembershipRow membershipStatus={membershipStatus} membershipEndDate={membershipEndDate} />
                  </div>
                </div>

                <div className="m3d-grid__right">
                  <BodyMacrosCard member={member} profile={profile} macroLog={macroLog} />
                  <PRsCard liftLogs={liftLogs} exercises={exercises} />
                  <PTCard />
                  {/* Desktop-only membership */}
                  <section className="m3d-card">
                    <div className="m3d-membership">
                      <div>
                        <small className="mcr-eyebrow-tiny">Membership</small>
                        <strong>
                          {membershipStatus === "active" ? "Active" :
                           membershipStatus === "expiring_soon" ? "Expiring soon" :
                           membershipStatus === "expired" ? "Expired" : "—"}
                          {membershipEndDate ? ` · ${Math.ceil((new Date(membershipEndDate).getTime() - Date.now()) / 86400000)}d left` : ""}
                        </strong>
                      </div>
                      <Link href="/member/membership" className="m3d-btn-ghost m3d-btn-sm">Manage</Link>
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}

          {/* ── Progress tab ── */}
          {tab === "progress" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <MemberProgressPanel exercises={exercises} initialLiftLogs={liftLogs} memberId={memberId} program={program} />
              <MemberHistory liftLogs={liftLogs} exercises={exercises} dayLogs={dayLogs} activityLogs={activityLogs} macroLogs={macroLogs} macroTarget={macroTarget} />
            </div>
          )}

          {/* ── Calendar tab ── */}
          {tab === "calendar" && (
            <WorkoutCalendar liftLogs={liftLogs} dayLogs={dayLogs} activityLogs={activityLogs} macroLogs={macroLogs} macroTarget={macroTarget} />
          )}

          {/* ── Body tab ── */}
          {tab === "body" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <ProfileMetricsWidget profile={profile} />
              <EditableMetrics member={{ ...member, ...profile }} />
              <MacroProgressPanel memberId={memberId} gymId={gymId} date={todayDate} target={macroTarget} initialActual={macroLog ?? undefined} macroHistory={macroLogs} />
            </div>
          )}

          {/* ── Coach tab (inline) ── */}
          {tab === "coach" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: 640 }}>
              <div className="m3d-pagehead" style={{ marginBottom: 0 }}>
                <div>
                  <span className="m3d-pagehead__eyebrow">Coach</span>
                  <h1 className="m3d-pagehead__title" style={{ fontSize: 22 }}>Message your coach</h1>
                </div>
              </div>
              {coachNote ? (
                <div className="m3d-card" style={{ padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div className="m3d-card__head-icon" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
                      <Icons.Mail size={15} />
                    </div>
                    <div>
                      <span className="m3d-card__eyebrow">LATEST NOTE FROM YOUR COACH</span>
                      <strong className="m3d-card__title" style={{ display: "block" }}>{coachNoteFrom ?? "Your trainer"}</strong>
                    </div>
                  </div>
                  <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.7, color: "var(--text)" }}>{coachNote}</p>
                  <Link href="/member/coach" className="m3d-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                    <Icons.Mail size={13} /> Open full conversation →
                  </Link>
                </div>
              ) : (
                <div className="m3d-card" style={{ padding: "32px 24px", textAlign: "center" }}>
                  <Icons.Mail size={28} style={{ color: "var(--text-faint)", marginBottom: 12 }} />
                  <p style={{ color: "var(--text-soft)", marginBottom: 16 }}>No coach note yet. Your trainer will leave you a message here before your session.</p>
                  <Link href="/member/coach" className="m3d-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                    <Icons.Mail size={13} /> Open conversation →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <MobileTabBar tab={tab} setTab={setTab} />

      {/* ── Toast ── */}
      {toast && (
        <div className="mcr-toast">
          <Icons.CheckCircle size={16} /> {toast}
        </div>
      )}
    </div>
  );
}
