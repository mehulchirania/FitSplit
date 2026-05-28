"use client";

import { MemberWorkoutConsole } from "@/components/member-workout-console";
import { MemberProgressPanel } from "@/components/member-progress-panel";
import { MemberHistory } from "@/components/member-history";
import { WorkoutCalendar } from "@/components/workout-calendar";
import { ActivityLogForm } from "@/components/activity-log-form";
import { EditableMetrics } from "@/components/editable-metrics";
import { MacroProgressPanel } from "@/components/macro-progress-panel";
import { ProfileMetricsWidget } from "@/components/profile-metrics-widget";
import { GymNoticeBoard } from "@/components/gym-notice-board";
import type { Exercise, LiftLog, DayLog, ActivityLog, MacroLog, WorkoutProgram, ProgramAssignment, GymNotice } from "@/types/domain";
import type { MemberProfile, Member } from "@/types/domain";
import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { logoutUser } from "@/lib/auth";

/* ── Inline SVG icon helpers ──────────────────────── */
const Icon = ({ d, size = 20, fill, stroke = 1.7, ...rest }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || "none"} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

const Icons = {
  Lightning: (p: any) => <Icon {...p} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" stroke="none" />,
  Home:      (p: any) => <Icon {...p} d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-3v-7H10v7H7a2 2 0 01-2-2v-9z" />,
  Dumbbell:  (p: any) => <Icon {...p} d={<><path d="M6.5 6.5l11 11" /><path d="M3 9l3-3 3 3-3 3z" /><path d="M15 15l3-3 3 3-3 3z" /><path d="M2 12.5l1.5-1.5" /><path d="M22 11.5l-1.5 1.5" /></>} />,
  Chart:     (p: any) => <Icon {...p} d={<><path d="M3 21V3" /><path d="M21 21H3" /><path d="M7 17v-5" /><path d="M12 17v-9" /><path d="M17 17v-12" /></>} />,
  User:      (p: any) => <Icon {...p} d={<><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>} />,
  Flame:     (p: any) => <Icon {...p} d={<><path d="M12 3s4 3 4 9a4 4 0 11-8 0c0-1.5.5-3 1.5-4.2C10 6 8.5 4.5 12 3z" /><path d="M12 13a1.5 1.5 0 010 3" /></>} />,
  Play:      (p: any) => <Icon {...p} fill="currentColor" stroke="none" d="M8 5l12 7-12 7z" />,
  Check:     (p: any) => <Icon {...p} d="M4 12l5 5L20 6" />,
  CheckCircle:(p: any) => <Icon {...p} d={<><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-5" /></>} />,
  Plus:      (p: any) => <Icon {...p} d="M12 5v14M5 12h14" />,
  ChevR:     (p: any) => <Icon {...p} d="M9 6l6 6-6 6" />,
  Calendar:  (p: any) => <Icon {...p} d={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>} />,
  Mail:      (p: any) => <Icon {...p} d={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 7 9-7" /></>} />,
  Bell:      (p: any) => <Icon {...p} d={<><path d="M6 9a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" /><path d="M10 21a2 2 0 004 0" /></>} />,
  Heart:     (p: any) => <Icon {...p} d="M12 21s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z" />,
  Trophy:    (p: any) => <Icon {...p} d={<><path d="M8 4h8v6a4 4 0 01-8 0V4z" /><path d="M6 5H4a2 2 0 002 4" /><path d="M18 5h2a2 2 0 01-2 4" /><path d="M10 14v3l-1 3h6l-1-3v-3" /></>} />,
  Settings:  (p: any) => <Icon {...p} d={<><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 00-2-1.2L14 3h-4l-.5 2.5a7 7 0 00-2 1.2L5.1 5.8l-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.9c.6.5 1.3.9 2 1.2L10 21h4l.5-2.5c.7-.3 1.4-.7 2-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" /></>} />,
  Note:      (p: any) => <Icon {...p} d={<><path d="M5 4h11l3 3v13a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" /><path d="M8 9h7M8 13h7M8 17h4" /></>} />,
  Search:    (p: any) => <Icon {...p} d={<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>} />,
  Send:      (p: any) => <Icon {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  Video:     (p: any) => <Icon {...p} d={<><rect x="2" y="7" width="14" height="10" rx="2" /><path d="M16 11l5-4v10l-5-4" /></>} />,
  LogOut:    (p: any) => <Icon {...p} d={<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>} />,
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
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      window.localStorage.removeItem("fitsplit-remember-me");
      await logoutUser();
    });
  };

  const items = [
    { v: "coach",    label: "Coach",    icon: <Icons.Mail size={18} /> },
    { v: "train",    label: "Train",    icon: <Icons.Dumbbell size={18} /> },
    { v: "progress", label: "Progress", icon: <Icons.Chart size={18} /> },
    { v: "calendar", label: "Calendar", icon: <Icons.Calendar size={18} /> },
    { v: "body",     label: "Body",     icon: <Icons.Heart size={18} /> },
  ];

  const gymShort = gymName.split(" · ")[0];

  return (
    <aside className="m3d-side">
      {/* Brand + gym */}
      <div className="m3d-side__logo">
        <div className="m3d-side__logo-mark">
          {gymLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gymLogoUrl} alt={gymShort} width={28} height={28} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/icon-512.png" alt="FitSplit" width={28} height={28} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
          )}
        </div>
        <div className="m3d-side__logo-text">
          <span>FitSplit</span>
          <span className="m3d-side__gym-sub">{gymShort}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="m3d-side__nav">
        {items.map((it) => (
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
      </nav>

      {/* Footer: profile + logout */}
      <div className="m3d-side__bottom">
        <button
          className="m3d-side__item m3d-side__item--profile"
          type="button"
          onClick={handleLogout}
          disabled={isPending}
        >
          <Avatar initials={firstName.charAt(0)} size="sm" />
          <div className="m3d-side__profile-text">
            <span>{firstName}</span>
            <span className="m3d-side__profile-sub">{isPending ? "Logging out…" : "Log out"}</span>
          </div>
        </button>
      </div>
    </aside>
  );
}

/* ── Desktop TopBar ──────────────────────────────────────────────── */
function DesktopTopBar({ onToast, firstName }: { onToast: (t: string) => void; firstName: string }) {
  return (
    <header className="m3d-top">
      <div className="m3d-top__crumbs">
        <span className="m3d-top__crumb">Dashboard</span>
        <span className="m3d-top__crumb-sep">/</span>
        <span className="m3d-top__crumb m3d-top__crumb--current">Today</span>
      </div>
      <div className="m3d-top__right">
        <div className="m3d-top__search">
          <Icons.Search size={14} />
          <input placeholder="Search exercises, lifts…" readOnly />
          <kbd>⌘K</kbd>
        </div>
        <button className="m3d-top__icon" onClick={() => onToast("No new notifications")} type="button" aria-label="Notifications">
          <Icons.Bell size={18} />
          <span className="m3d-top__icon-dot" />
        </button>
        <div className="m3d-top__profile">
          <Avatar initials={firstName.charAt(0)} size="sm" />
          <div className="m3d-top__profile-text">
            <strong>{firstName}</strong>
            <small>Member</small>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ── Mobile TopBar ───────────────────────────────────────────────── */
function MobileTopBar({ firstName, gymName, gymLogoUrl, onNotif }: {
  firstName: string;
  gymName: string;
  gymLogoUrl?: string | null;
  onNotif: () => void;
}) {
  const gymShort = gymName.split(" · ")[0];
  return (
    <div className="mcr-topbar">
      <div className="mcr-topbar__left">
        <span className="mcr-topbar__gym">{gymShort}</span>
        <div className="mcr-topbar__hi">Hi, {firstName} 👋</div>
      </div>
      <div className="mcr-topbar__right">
        <button className="mcr-topbar__icon" onClick={onNotif} aria-label="Notifications" type="button">
          <Icons.Bell size={18} />
          <span className="mcr-topbar__dot" />
        </button>
        <Avatar initials={firstName.charAt(0)} size="md" />
      </div>
    </div>
  );
}

/* ── Mobile Bottom Tab Bar ───────────────────────────────────────── */
function MobileTabBar({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const tabs = [
    { v: "coach",    label: "Coach",    icon: <Icons.Mail size={22} /> },
    { v: "train",    label: "Train",    icon: <Icons.Dumbbell size={22} /> },
    { v: "progress", label: "Progress", icon: <Icons.Chart size={22} /> },
    { v: "body",     label: "Body",     icon: <Icons.Heart size={22} /> },
  ];
  return (
    <nav className="mcr-tabbar">
      {tabs.map((t) => (
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

/* ── Coach hero section ──────────────────────────────────────────── */
function CoachHero({ coachNote, coachNoteFrom, coachNoteUpdatedAt, onToast }: {
  coachNote?: string | null;
  coachNoteFrom?: string | null;
  coachNoteUpdatedAt?: string | null;
  onToast: (msg: string) => void;
}) {
  const [replyText, setReplyText] = useState("");

  const initials = coachNoteFrom
    ? coachNoteFrom.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "PT";

  const noteDate = coachNoteUpdatedAt
    ? new Date(coachNoteUpdatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : null;

  function send(msg?: string) {
    const text = msg ?? replyText;
    if (!text.trim()) return;
    setReplyText("");
    onToast(`Sent to ${coachNoteFrom ?? "your trainer"}: "${text}"`);
  }

  return (
    <section className="m3d-coach">
      <div className="m3d-coach__bg">
        <div className="m3d-coach__bg-a" />
        <div className="m3d-coach__bg-b" />
      </div>
      <div className="m3d-coach__inner">
        <div className="m3d-coach__head">
          <Avatar initials={initials} size="xl" className="m3d-coach__avatar" />
          <div className="m3d-coach__info">
            <span className="m3d-coach__label">Your Coach</span>
            <strong>{coachNoteFrom ?? "Your Trainer"}</strong>
            <span className="m3d-coach__online">
              <span className="m3d-coach__online-dot" /> Online · usually replies in 30 min
            </span>
          </div>
          <button className="m3d-coach__full-thread" type="button">
            <Icons.Mail size={13} /> Full thread
          </button>
        </div>

        <div className="m3d-coach__bubble">
          <p>{coachNote ?? "No note yet — your trainer will leave you a message here before your session."}</p>
          <span className="m3d-coach__time">{noteDate ? `Today, ${noteDate}` : "Just now"}</span>
        </div>

        <div className="m3d-coach__reply">
          <input
            type="text"
            placeholder="Reply to Coach…"
            className="m3d-coach__input"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          />
          <div className="m3d-coach__quick">
            {["Got it 👍", "On it!", "Quick question…"].map((q) => (
              <button key={q} className="m3d-coach__quick-btn" onClick={() => send(q)} type="button">{q}</button>
            ))}
          </div>
          <button
            className={`m3d-coach__send${replyText ? " m3d-coach__send--on" : ""}`}
            onClick={() => send()}
            disabled={!replyText}
            aria-label="Send"
            type="button"
          >
            <Icons.Send size={15} />
          </button>
        </div>
      </div>
    </section>
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
function TodaySessionList({ program, currentWeek, exercises, onStart }: {
  program: WorkoutProgram;
  currentWeek: number | null;
  exercises: Exercise[];
  onStart: () => void;
}) {
  const day = program.days?.[0];
  const totalSets = (program.days ?? []).reduce(
    (acc, d) => acc + (d.exercises ?? []).reduce((s, e) => s + (e.sets ?? 0), 0), 0
  );
  const liftsCount = day?.exercises?.length ?? 0;
  const estMin = liftsCount * 8;

  return (
    <section className="m3d-today">
      <div className="m3d-today__head">
        <div>
          <div className="m3d-today__eyebrow">
            <Icons.Note size={13} />
            Your coach&apos;s plan for today
          </div>
          <h2 className="m3d-today__title">{day?.title ?? program.title}</h2>
          <span className="m3d-today__sub">
            Week {currentWeek ?? 1} · {liftsCount} lifts · {totalSets} sets · est. {estMin} min
          </span>
        </div>
        <div className="m3d-today__cta">
          <button className="m3d-today__start-btn" onClick={onStart} type="button">
            <Icons.Play size={16} /> Start workout
          </button>
        </div>
      </div>

      <div className="m3d-today__exercises">
        {(day?.exercises ?? []).map((ex, idx) => {
          const dictEx = exercises.find((e) => e.id === ex.exerciseId);
          const videoUrl = dictEx?.gymVideoUrl || dictEx?.videoUrl;
          return (
            <div key={ex.exerciseId + idx} className="m3d-ex">
              <div className="m3d-ex__num">{idx + 1}</div>
              <div className="m3d-ex__body">
                <span className="m3d-ex__name">{dictEx?.name ?? "Unknown"}</span>
                <div className="m3d-ex__group">{dictEx?.muscleGroup ?? "—"}</div>
              </div>
              <div className="m3d-ex__sets">
                <small>SETS × REPS</small>
                <strong>{ex.sets} × {ex.reps}</strong>
              </div>
              <div className="m3d-ex__last">
                <small>LAST</small>
                <strong>—<span>kg</span></strong>
              </div>
              <div className="m3d-ex__target">
                <small>COACH&apos;S TARGET</small>
                <strong>—<span>kg</span></strong>
              </div>
              {videoUrl ? (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="m3d-ex__open m3d-ex__video"
                  aria-label={`Watch ${dictEx?.name ?? "exercise"} tutorial`}
                  title="Watch tutorial"
                >
                  <Icons.Video size={14} />
                </a>
              ) : (
                <button className="m3d-ex__open" aria-label="Open details" type="button">
                  <Icons.ChevR size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Mobile Today card ───────────────────────────────────────────── */
function MobileTodayCard({ program, currentWeek, exercises, onStart }: {
  program: WorkoutProgram;
  currentWeek: number | null;
  exercises: Exercise[];
  onStart: () => void;
}) {
  const day = program.days?.[0];
  const liftsCount = day?.exercises?.length ?? 0;
  const totalSets = (day?.exercises ?? []).reduce((s, e) => s + (e.sets ?? 0), 0);
  const estMin = liftsCount * 8;

  return (
    <section className="mcr-today">
      <div className="mcr-today__eyebrow">
        <Icons.Note size={13} />
        Your coach&apos;s plan for today
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
          const dictEx = exercises.find((e) => e.id === ex.exerciseId);
          const videoUrl = dictEx?.gymVideoUrl || dictEx?.videoUrl;
          return (
            <div key={ex.exerciseId + idx} className="mcr-ex">
              <div className="mcr-ex__num">{idx + 1}</div>
              <div className="mcr-ex__body">
                <div className="mcr-ex__name">{dictEx?.name ?? "Unknown"}</div>
                <div className="mcr-ex__meta">
                  <span>{ex.sets} × {ex.reps}</span>
                  {videoUrl && (
                    <>
                      <span className="mcr-ex__sep">·</span>
                      <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="mcr-ex__video-link" aria-label="Watch tutorial">
                        <Icons.Video size={11} /> tutorial
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="mcr-today__start" onClick={onStart} type="button">
        <Icons.Play size={16} /> Start workout
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
          <span className="m3d-card__eyebrow">UPCOMING PT</span>
          <strong className="m3d-card__title">Bench technique</strong>
        </div>
      </div>
      <div className="m3d-pt-row">
        <div><span>When</span><strong>Tomorrow,<br/>6:30 AM</strong></div>
        <div><span>Duration</span><strong>45<br/>MIN</strong></div>
        <div><span>With</span><strong>Priya Nair</strong></div>
      </div>
      <div className="m3d-pt-actions">
        <button className="m3d-btn-ghost" type="button">Reschedule</button>
        <button className="m3d-btn-subtle" type="button">View details</button>
      </div>
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
function BodyMacrosCard({ member, profile, macroLog }: { member: Member; profile: MemberProfile; macroLog?: MacroLog | null }) {
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
    coachNote, coachNoteFrom, coachNoteUpdatedAt,
    program, currentWeek, exercises, liftLogs, dayLogs, activityLogs,
    macroLogs, macroLog, macroTarget, injuryNote,
    memberId, gymId, todayDate,
    member, profile, initialActiveSessionCount,
  } = props;

  const [tab, setTab] = useState("coach");
  const [toast, setToast] = useState<string | null>(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);

  function handleToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    document.body.classList.add("member-desktop-full");
    return () => document.body.classList.remove("member-desktop-full");
  }, []);

  return (
    <div className="m3d-root">
      {/* ── Desktop Sidebar ── */}
      <Sidebar tab={tab} setTab={setTab} firstName={firstName} gymName={gymName} gymLogoUrl={gymLogoUrl} />

      {/* ── Main Content ── */}
      <div className="m3d-main">
        {/* Desktop topbar (hidden on mobile) */}
        <DesktopTopBar onToast={handleToast} firstName={firstName} />

        <div className="m3d-content">

          {/* ── Coach tab ── */}
          {tab === "coach" && (
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
                  <CoachHero
                    coachNote={coachNote}
                    coachNoteFrom={coachNoteFrom}
                    coachNoteUpdatedAt={coachNoteUpdatedAt}
                    onToast={handleToast}
                  />

                  {/* Mobile-only stats strip */}
                  <StatsSection
                    weeklyStreak={weeklyStreak}
                    daysTrainedThisWeek={daysTrainedThisWeek}
                    weeklyTarget={4}
                    profile={profile}
                    liftLogs={liftLogs}
                  />

                  {program ? (
                    isWorkoutActive ? (
                      <div className="mcr-workout-wrapper">
                        <MemberWorkoutConsole
                          exercises={exercises}
                          gymId={gymId}
                          initialActiveSessionCount={initialActiveSessionCount}
                          initialDayLogs={dayLogs}
                          initialInjuryNote={injuryNote ?? undefined}
                          initialLiftLogs={liftLogs}
                          memberId={memberId}
                          program={program}
                        />
                      </div>
                    ) : (
                      <>
                        {/* Desktop view: table layout */}
                        <div className="mcr-desktop-only">
                          <TodaySessionList
                            program={program}
                            currentWeek={currentWeek}
                            exercises={exercises}
                            onStart={() => setIsWorkoutActive(true)}
                          />
                        </div>
                        {/* Mobile view: card layout */}
                        <div className="mcr-mobile-only">
                          <MobileTodayCard
                            program={program}
                            currentWeek={currentWeek}
                            exercises={exercises}
                            onStart={() => setIsWorkoutActive(true)}
                          />
                        </div>
                      </>
                    )
                  ) : (
                    <div className="mcr-no-plan">
                      <div className="mcr-no-plan__icon"><Icons.Dumbbell size={28} /></div>
                      <h2>No workout plan assigned</h2>
                      <p>Your trainer hasn&apos;t assigned a program yet. Reach out to your coach above.</p>
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
                  <PTCard />
                  <BodyMacrosCard member={member} profile={profile} macroLog={macroLog} />
                  <PRsCard liftLogs={liftLogs} exercises={exercises} />
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

          {/* ── Train tab ── */}
          {tab === "train" && (
            <div className="m3d-grid">
              <div className="m3d-grid__left">
                {program ? (
                  <div className="mcr-workout-wrapper">
                    <MemberWorkoutConsole
                      exercises={exercises}
                      gymId={gymId}
                      initialActiveSessionCount={initialActiveSessionCount}
                      initialDayLogs={dayLogs}
                      initialInjuryNote={injuryNote ?? undefined}
                      initialLiftLogs={liftLogs}
                      memberId={memberId}
                      program={program}
                    />
                  </div>
                ) : (
                  <div className="mcr-no-plan">
                    <div className="mcr-no-plan__icon"><Icons.Dumbbell size={28} /></div>
                    <h2>No workout plan assigned</h2>
                    <p>Your trainer hasn&apos;t assigned a program yet.</p>
                  </div>
                )}
              </div>
            </div>
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
