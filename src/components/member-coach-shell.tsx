"use client";

import { MemberProgressPanel } from "@/components/member-progress-panel";
import { MemberHistory } from "@/components/member-history";
import { EditableMetrics } from "@/components/editable-metrics";
import { MacroProgressPanel } from "@/components/macro-progress-panel";
import { ProfileMetricsWidget } from "@/components/profile-metrics-widget";
import { GymNoticeBoard } from "@/components/gym-notice-board";
import { OverviewScreen } from "@/components/member-overview-screen";
import { WorkoutScreen } from "@/components/member-workout-screen";
import { LogsScreen } from "@/components/member-logs-screen";
import { ProgressScreen } from "@/components/member-progress-screen";
import { MacrosScreen } from "@/components/member-macros-screen";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Exercise, LiftLog, DayLog, ActivityLog, MacroLog, MealLog, WorkoutProgram, ProgramAssignment, GymNotice } from "@/types/domain";
import type { MemberProfile, Member } from "@/types/domain";
import React, { useState, useEffect, useMemo, useTransition, useRef } from "react";
import Link from "next/link";
import { logoutUser } from "@/lib/auth";
import { getWeekStart, resolveTodaysSession, estimateSessionMinutes } from "@/lib/workout-utils";

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
  mealLogs: MealLog[];
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

function ChevD() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function LogOutIco() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

/* ── Sidebar (Desktop) ───────────────────────────────────────────── */
function Sidebar({
  screen, setScreen, firstName, gymName, gymLogoUrl,
}: {
  screen: string;
  setScreen: (t: string) => void;
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

  const screenItems = [
    { v: "overview", label: "Overview", icon: <Icons.Home size={18} /> },
    { v: "workout",  label: "Workout",  icon: <Icons.Dumbbell size={18} /> },
    { v: "logs",     label: "Logs",     icon: <Icons.Note size={18} /> },
    { v: "progress", label: "Progress", icon: <Icons.Chart size={18} /> },
    { v: "macros",   label: "Macros",   icon: <Icons.Heart size={18} /> },
  ];

  const gymShort = gymName.split(" · ")[0];
  const initials = firstName.charAt(0).toUpperCase();

  return (
    <aside className="m3d-side">
      {/* Brand + gym co-brand lockup — clicking goes to dashboard */}
      <button
        className="m3d-side__logo m3d-side__logo--btn"
        onClick={() => setScreen("overview")}
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
        {screenItems.map((it) => (
          <button
            key={it.v}
            className={`m3d-side__item${screen === it.v ? " m3d-side__item--on" : ""}`}
            onClick={() => setScreen(it.v)}
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
const SCREEN_CRUMBS: Record<string, string> = {
  overview: "Overview", workout: "Workout", logs: "Logs", progress: "Progress", macros: "Macros",
};

function DesktopTopBar({ screen }: { screen: string }) {
  return (
    <header className="m3d-top">
      <div className="m3d-top__crumbs">
        <span className="m3d-top__crumb">Dashboard</span>
        <span className="m3d-top__crumb-sep">/</span>
        <span className="m3d-top__crumb m3d-top__crumb--current">{SCREEN_CRUMBS[screen] ?? "Overview"}</span>
      </div>
    </header>
  );
}

/* ── Mobile TopBar ───────────────────────────────────────────────── */
function MobileTopBar({ firstName, gymName }: {
  firstName: string;
  gymName: string;
  gymLogoUrl?: string | null;
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
        {/* Members never see the global AppTopbar (it returns null on /member*),
            so this is their only route to the theme control. */}
        <ThemeToggle className="mcr-topbar__theme" />
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
        {weeklyStreak >= 1 && (
          <div className="mcr-stat">
            <div className="mcr-stat__icon" style={{ color: "var(--warning)" }}><Icons.Flame size={16} /></div>
            <strong>{weeklyStreak}<small>w</small></strong>
            <span>streak</span>
          </div>
        )}
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
  const [nowMs] = useState(() => Date.now());
  const daysLeft = membershipEndDate
    ? Math.ceil((new Date(membershipEndDate).getTime() - nowMs) / (1000 * 60 * 60 * 24))
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

/** Weekly training-day target derived from the assigned program; falls back to 4 with no program. */
function getWeeklyTarget(program: WorkoutProgram | null) {
  return program?.days?.length ? program.days.length : 4;
}

/* ── Mobile Today card ───────────────────────────────────────────────
   Compact hero framing only — session title, week, and a quick lifts /
   sets / time readout. The actual exercise list, swaps, and set logging
   live in <WorkoutScreen>, rendered directly below this card, so there is
   exactly one place on mobile that lets a member log a set. ───────── */
function MobileTodayCard({ program, currentWeek, selectedDayIndex }: {
  program: WorkoutProgram;
  currentWeek: number | null;
  selectedDayIndex: number;
}) {
  const day = program.days?.[selectedDayIndex];
  const liftsCount = day?.exercises?.length ?? 0;
  const totalSets = (day?.exercises ?? []).reduce((s, e) => s + (e.sets ?? 0), 0);
  const estMin = estimateSessionMinutes(day?.exercises ?? []);

  return (
    <section className="mcr-today">
      <div className="mcr-today__eyebrow">
        <Icons.Note size={13} />
        Your coach&apos;s plan
      </div>
      <h2 className="mcr-today__title">{day?.title ?? program.title}</h2>
      <span className="mcr-today__sub">Week {currentWeek ?? 1} · {liftsCount} lifts · {totalSets} sets · ~{estMin}m</span>
    </section>
  );
}

/* ── Main export ─────────────────────────────────────────────────── */
export function MemberCoachShell(props: MemberCoachShellProps) {
  const {
    firstName, gymName, gymLogoUrl, gymNotices,
    weeklyStreak, daysTrainedThisWeek,
    membershipStatus, membershipEndDate,
    coachNote, coachNoteFrom,
    program, currentWeek, exercises, liftLogs, dayLogs, activityLogs,
    macroLogs, mealLogs, macroLog, macroTarget,
    memberId, gymId, todayDate,
    member, profile,
  } = props;

  const weeklyTarget = getWeeklyTarget(program);

  // Mobile bottom-tab nav — unchanged, fully independent from desktop nav.
  const [tab, setTab] = useState("train");
  // Desktop sidebar nav — Overview/Workout/Logs/Progress/Macros.
  const [screen, setScreen] = useState("overview");

  // Seed the default day from the member's actual training state (in-progress
  // session, next scheduled day, rest day, ...) instead of always opening on
  // Day 1 regardless of where the week actually stands.
  const weekStartIso = useMemo(() => getWeekStart(), []);
  const todaysSession = useMemo(
    () => (program ? resolveTodaysSession(program, dayLogs, liftLogs, weekStartIso) : null),
    [program, dayLogs, liftLogs, weekStartIso]
  );
  const [selectedPreviewDay, setSelectedPreviewDay] = useState(() => todaysSession?.dayIndex ?? 0);

  useEffect(() => {
    document.body.classList.add("member-desktop-full");
    return () => document.body.classList.remove("member-desktop-full");
  }, []);

  return (
    <div className="m3d-root">
      {/* ── Desktop Sidebar ── */}
      <Sidebar screen={screen} setScreen={setScreen} firstName={firstName} gymName={gymName} gymLogoUrl={gymLogoUrl} />

      {/* ── Main Content ── */}
      <div className="m3d-main">
        {/* Desktop topbar (hidden on mobile) */}
        <DesktopTopBar screen={screen} />

        <div className="m3d-content">
          {/* ══ Desktop screens ══ */}
          <div className="mcr-desktop-only">
            {screen === "overview" && (
              <OverviewScreen
                firstName={firstName}
                gymName={gymName}
                program={program}
                currentWeek={currentWeek}
                exercises={exercises}
                liftLogs={liftLogs}
                dayLogs={dayLogs}
                weeklyStreak={weeklyStreak}
                daysTrainedThisWeek={daysTrainedThisWeek}
                weeklyTarget={weeklyTarget}
                coachNote={coachNote}
                coachNoteFrom={coachNoteFrom}
                gymNotices={gymNotices}
                goWorkout={() => setScreen("workout")}
                goLogs={() => setScreen("logs")}
              />
            )}

            {screen === "workout" && (
              program ? (
                <WorkoutScreen
                  memberId={memberId}
                  gymId={gymId}
                  program={program}
                  exercises={exercises}
                  liftLogs={liftLogs}
                  dayLogs={dayLogs}
                  selectedDayIndex={selectedPreviewDay}
                  onSelectDay={setSelectedPreviewDay}
                />
              ) : (
                <>
                  <div className="m3d-pagehead">
                    <div>
                      <span className="m3d-pagehead__eyebrow">
                        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
                      </span>
                      <h1 className="m3d-pagehead__title">Workout</h1>
                    </div>
                  </div>
                  <div className="mcr-no-plan">
                    <div className="mcr-no-plan__icon"><Icons.Dumbbell size={28} /></div>
                    <h2>No workout plan assigned</h2>
                    <p>Your trainer hasn&apos;t assigned a program yet. <Link href="/member/coach">Reach out to your coach →</Link></p>
                  </div>
                </>
              )
            )}

            {screen === "logs" && (
              <LogsScreen liftLogs={liftLogs} exercises={exercises} dayLogs={dayLogs} activityLogs={activityLogs} macroLogs={macroLogs} macroTarget={macroTarget} />
            )}

            {screen === "progress" && (
              <ProgressScreen exercises={exercises} liftLogs={liftLogs} dayLogs={dayLogs} activityLogs={activityLogs} macroLogs={macroLogs} macroTarget={macroTarget} memberId={memberId} program={program} />
            )}

            {screen === "macros" && (
              <MacrosScreen memberId={memberId} gymId={gymId} todayDate={todayDate} macroLog={macroLog} macroTarget={macroTarget} macroLogs={macroLogs} mealLogs={mealLogs} profile={profile} member={member} />
            )}
          </div>

          {/* ══ Mobile screens ══ */}
          <div className="mcr-mobile-only">
            {tab === "train" && (
              <>
                <MobileTopBar
                  firstName={firstName}
                  gymName={gymName}
                  gymLogoUrl={gymLogoUrl}
                />

                <div className="m3d-grid">
                  <div className="m3d-grid__left">
                    <CoachNoteBanner coachNote={coachNote} coachNoteFrom={coachNoteFrom} />

                    <StatsSection
                      weeklyStreak={weeklyStreak}
                      daysTrainedThisWeek={daysTrainedThisWeek}
                      weeklyTarget={weeklyTarget}
                      profile={profile}
                      liftLogs={liftLogs}
                    />

                    {program ? (
                      <>
                        {/* Hero framing only — the real logger (with its own day
                            picker, swaps, and set entry) renders right below so a
                            member never has to leave this tab to log a set. */}
                        <MobileTodayCard
                          program={program}
                          currentWeek={currentWeek}
                          selectedDayIndex={selectedPreviewDay}
                        />
                        <div className="mcr-train-logger">
                          <WorkoutScreen
                            memberId={memberId}
                            gymId={gymId}
                            program={program}
                            exercises={exercises}
                            liftLogs={liftLogs}
                            dayLogs={dayLogs}
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

                    <MembershipRow membershipStatus={membershipStatus} membershipEndDate={membershipEndDate} />
                  </div>
                </div>
              </>
            )}

            {tab === "progress" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <MemberProgressPanel exercises={exercises} initialLiftLogs={liftLogs} dayLogs={dayLogs} memberId={memberId} program={program} />
                <MemberHistory liftLogs={liftLogs} exercises={exercises} dayLogs={dayLogs} activityLogs={activityLogs} macroLogs={macroLogs} macroTarget={macroTarget} />
              </div>
            )}

            {tab === "body" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <ProfileMetricsWidget profile={profile} />
                <EditableMetrics member={{ ...member, ...profile }} />
                <MacroProgressPanel memberId={memberId} gymId={gymId} date={todayDate} target={macroTarget} initialActual={macroLog ?? undefined} macroHistory={macroLogs} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <MobileTabBar tab={tab} setTab={setTab} />
    </div>
  );
}
