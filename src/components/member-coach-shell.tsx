"use client";

import { MemberProgressPanel } from "@/components/member-progress-panel";
import { MemberHistory } from "@/components/member-history";
import { EditableMetrics } from "@/components/editable-metrics";
import { MacroProgressPanel } from "@/components/macro-progress-panel";
import { ProfileMetricsWidget } from "@/components/profile-metrics-widget";
import { OverviewScreen } from "@/components/member-overview-screen";
import { WorkoutScreen } from "@/components/member-workout-screen";
import { LogsScreen } from "@/components/member-logs-screen";
import { ProgressScreen } from "@/components/member-progress-screen";
import { MacrosScreen } from "@/components/member-macros-screen";
import { MemberSidebar, MEMBER_SCREENS } from "@/components/member-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Exercise, LiftLog, DayLog, ActivityLog, MacroLog, MealLog, WorkoutProgram } from "@/types/domain";
import type { UserProfile } from "@/types/domain";
import React, { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { logoutUser } from "@/lib/auth";
import { getWeekStart, getTrainedDateKeys, resolveTodaysSession, estimateSessionMinutes } from "@/lib/workout-utils";

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
  weeklyStreak: number;
  daysTrainedThisWeek: number;
  program: WorkoutProgram | null;
  exercises: Exercise[];
  liftLogs: LiftLog[];
  dayLogs: DayLog[];
  activityLogs: ActivityLog[];
  macroLogs: MacroLog[];
  mealLogs: MealLog[];
  macroLog?: MacroLog | null;
  macroTarget?: UserProfile["macroNutritionTarget"];
  injuryNote?: string | null;
  memberId: string;
  todayDate: string;
  member: UserProfile;
  profile: UserProfile;
  currentWeek: number | null;
}

/* ── Avatar helper ───────────────────────────────────────────────── */
function Avatar({ initials, size = "md", className = "" }: { initials: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  return <span className={`mcr-avatar mcr-avatar--${size} ${className}`}>{initials}</span>;
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
function MobileTopBar({ firstName }: {
  firstName: string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isPending, startTransition] = useTransition();

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
      <Link href="/member/programs" className="mcr-tabbar__item">
        <Icons.Calendar size={22} />
        <span>Plans</span>
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


/* ── Stats section (mobile coach tab) ───────────────────────────── */
function StatsSection({ weeklyStreak, daysTrainedThisWeek, weeklyTarget, profile, liftLogs }: {
  weeklyStreak: number;
  daysTrainedThisWeek: number;
  weeklyTarget: number;
  profile: UserProfile;
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
        Today&apos;s plan
      </div>
      <h2 className="mcr-today__title">{day?.title ?? program.title}</h2>
      <span className="mcr-today__sub">Week {currentWeek ?? 1} · {liftsCount} lifts · {totalSets} sets · ~{estMin}m</span>
    </section>
  );
}

/* ── Mobile week strip ────────────────────────────────────────────────
   Signature element for the Train (Overview) tab: a 7-box ledger strip
   where a trained day gets a highlighter tick, the way a real logbook
   gets marked up as the week happens. Reuses liftLogs/dayLogs already
   passed to the shell — no new data fetch. ─────────────────────────── */
const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function MobileWeekStrip({ liftLogs, dayLogs }: { liftLogs: LiftLog[]; dayLogs: DayLog[] }) {
  const trainedDates = useMemo(() => getTrainedDateKeys(liftLogs, dayLogs), [liftLogs, dayLogs]);
  const today = useMemo(() => {
    const weekStartIso = getWeekStart();
    return { weekStartIso };
  }, []);

  const days = useMemo(() => {
    const start = new Date(today.weekStartIso + "T00:00:00");
    const now = new Date();
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return {
        label: WEEKDAY_LABELS[i],
        trained: trainedDates.has(key),
        isToday: key === nowKey,
      };
    });
  }, [today, trainedDates]);

  return (
    <div className="mcr-weekstrip" aria-label="This week's training days">
      {days.map((d, i) => (
        <div key={i} className={`mcr-weekstrip__day${d.isToday ? " mcr-weekstrip__day--today" : ""}${d.trained ? " mcr-weekstrip__day--done" : ""}`}>
          <span className="mcr-weekstrip__mark">{d.trained ? <Icons.Check size={12} sw={3} /> : null}</span>
          <span className="mcr-weekstrip__label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Mobile Progress ribbon ───────────────────────────────────────────
   Signature element for the Progress tab: the newest personal record,
   underlined like fresh highlighter ink on the page, at the top of the
   tab so the one thing worth bragging about is the first thing seen. */
function MobileLatestPRRibbon({ liftLogs, exercises }: { liftLogs: LiftLog[]; exercises: Exercise[] }) {
  function findLatestPR(): { name: string; weight: number; reps: string } | null {
    const maxByExercise = new Map<string, number>();
    for (const log of liftLogs) {
      if (!log.exerciseId || typeof log.weight !== "number") continue;
      const current = maxByExercise.get(log.exerciseId) ?? 0;
      if (log.weight > current) maxByExercise.set(log.exerciseId, log.weight);
    }
    const sorted = [...liftLogs]
      .filter((l) => l.loggedAt)
      .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
    for (const log of sorted) {
      if (typeof log.weight === "number" && log.weight > 0 && log.weight === maxByExercise.get(log.exerciseId)) {
        const ex = exercises.find((e) => e.id === log.exerciseId);
        return { name: ex?.name ?? "Lift", weight: log.weight, reps: log.reps };
      }
    }
    return null;
  }

  const latest = findLatestPR();

  if (!latest) return null;

  return (
    <div className="mcr-pr-ribbon">
      <span className="mcr-pr-ribbon__eyebrow">Latest PR</span>
      <span className="mcr-pr-ribbon__value">
        {latest.name} <mark>{latest.weight} kg × {latest.reps}</mark>
      </span>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────────── */
export function MemberCoachShell(props: MemberCoachShellProps) {
  const {
    firstName,
    weeklyStreak, daysTrainedThisWeek,
    program,
    currentWeek, exercises, liftLogs, dayLogs, activityLogs,
    macroLogs, mealLogs, macroLog, macroTarget,
    memberId, todayDate,
    member, profile,
  } = props;

  const weeklyTarget = getWeeklyTarget(program);

  // Mobile bottom-tab nav — unchanged, fully independent from desktop nav.
  const [tab, setTab] = useState("train");
  // Desktop screen, driven by ?screen= so the shared MemberSidebar can switch it.
  const current = useSearchParams().get("screen");
  const screen = MEMBER_SCREENS.find((x) => x === current) ?? "overview";
  const setScreen = (next: string) =>
    window.history.pushState(null, "", next === "overview" ? "/member" : `/member?screen=${next}`);

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
      <MemberSidebar firstName={firstName} />

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
                program={program}
                currentWeek={currentWeek}
                exercises={exercises}
                liftLogs={liftLogs}
                dayLogs={dayLogs}
                weeklyStreak={weeklyStreak}
                daysTrainedThisWeek={daysTrainedThisWeek}
                weeklyTarget={weeklyTarget}
                goWorkout={() => setScreen("workout")}
                goLogs={() => setScreen("logs")}
              />
            )}

            {screen === "workout" && (
              program ? (
                <WorkoutScreen
                  memberId={memberId}
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
                    <h2>No workout split active</h2>
                    <p>Choose a training split from the program library to begin logging your lifts. <Link href="/member/programs" style={{ color: "#C8F135", fontWeight: 700 }}>Browse splits →</Link></p>
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
              <MacrosScreen memberId={memberId} todayDate={todayDate} macroLog={macroLog} macroTarget={macroTarget} macroLogs={macroLogs} mealLogs={mealLogs} profile={profile} member={member} />
            )}
          </div>

          {/* ══ Mobile screens ══ */}
          <div className="mcr-mobile-only">
            {tab === "train" && (
              <>
                <MobileTopBar firstName={firstName} />

                <div className="m3d-grid">
                  <div className="m3d-grid__left">
                    <StatsSection
                      weeklyStreak={weeklyStreak}
                      daysTrainedThisWeek={daysTrainedThisWeek}
                      weeklyTarget={weeklyTarget}
                      profile={profile}
                      liftLogs={liftLogs}
                    />

                    <MobileWeekStrip liftLogs={liftLogs} dayLogs={dayLogs} />

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
                        <h2>No workout plan yet</h2>
                        <p>Pick a plan to see today&apos;s session. <Link href="/member/programs">Browse plans →</Link></p>
                      </div>
                    )}

                  </div>
                </div>
              </>
            )}

            {tab === "progress" && (
              <div className="mcr-progress-tab">
                <div className="mcr-progress-tab__head">
                  <h1 className="mcr-progress-tab__title">Progress</h1>
                  <MobileLatestPRRibbon liftLogs={liftLogs} exercises={exercises} />
                </div>
                <MemberProgressPanel exercises={exercises} initialLiftLogs={liftLogs} dayLogs={dayLogs} memberId={memberId} program={program} />
                <MemberHistory liftLogs={liftLogs} exercises={exercises} dayLogs={dayLogs} activityLogs={activityLogs} macroLogs={macroLogs} macroTarget={macroTarget} />
              </div>
            )}

            {tab === "body" && (
              <div className="mcr-body-tab">
                <ProfileMetricsWidget profile={profile} />
                <EditableMetrics member={member} />
                <MacroProgressPanel memberId={memberId} date={todayDate} target={macroTarget} initialActual={macroLog ?? undefined} macroHistory={macroLogs} />
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
