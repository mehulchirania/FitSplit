"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { logoutUser } from "@/lib/auth";
import type { Member, ProfileMetrics } from "@/types/domain";

interface MemberSettingsClientProps {
  member: Member;
  profile: ProfileMetrics;
  gymId: string;
  memberId: string;
}

function SegControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="mset-seg">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          className={`mset-seg__btn${value === o.v ? " mset-seg__btn--on" : ""}`}
          onClick={() => onChange(o.v)}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`mset-toggle${on ? " mset-toggle--on" : ""}`}
      onClick={() => onChange(!on)}
    />
  );
}

function SettingRow({
  label,
  sub,
  children,
  last,
}: {
  label: string;
  sub?: string;
  children?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`mset-row${last ? " mset-row--last" : ""}`}>
      <div className="mset-row__text">
        <span className="mset-row__label">{label}</span>
        {sub && <span className="mset-row__sub">{sub}</span>}
      </div>
      {children && <div className="mset-row__ctrl">{children}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mset-section">
      <span className="mset-section__title">{title}</span>
      <div className="mset-card">{children}</div>
    </div>
  );
}

export function MemberSettingsClient({
  member,
  profile,
}: MemberSettingsClientProps) {
  // --- Unit preferences (persisted to localStorage) ---
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");

  // --- Notification toggles (UI-only; real push prefs can be wired later) ---
  const [workoutReminders, setWorkoutReminders] = useState(true);
  const [coachMessages, setCoachMessages] = useState(true);

  const [isPending, startTransition] = useTransition();

  // Hydrate from localStorage on mount
  useEffect(() => {
    const wu = localStorage.getItem("fitsplit-weight-unit") as "kg" | "lbs" | null;
    const hu = localStorage.getItem("fitsplit-height-unit") as "cm" | "ft" | null;
    const wr = localStorage.getItem("fitsplit-notif-workout");
    const cm = localStorage.getItem("fitsplit-notif-coach");
    if (wu) setWeightUnit(wu);
    if (hu) setHeightUnit(hu);
    if (wr !== null) setWorkoutReminders(wr === "1");
    if (cm !== null) setCoachMessages(cm === "1");
  }, []);

  function saveWeightUnit(v: "kg" | "lbs") {
    setWeightUnit(v);
    localStorage.setItem("fitsplit-weight-unit", v);
  }
  function saveHeightUnit(v: "cm" | "ft") {
    setHeightUnit(v);
    localStorage.setItem("fitsplit-height-unit", v);
  }
  function saveWorkoutReminders(v: boolean) {
    setWorkoutReminders(v);
    localStorage.setItem("fitsplit-notif-workout", v ? "1" : "0");
  }
  function saveCoachMessages(v: boolean) {
    setCoachMessages(v);
    localStorage.setItem("fitsplit-notif-coach", v ? "1" : "0");
  }

  // Display values
  const weightDisplay = (() => {
    if (!profile.weightKg) return "Not set";
    if (weightUnit === "kg") return `${profile.weightKg} kg`;
    return `${Math.round(profile.weightKg * 2.2046)} lbs`;
  })();
  const heightDisplay = (() => {
    if (!profile.heightCm) return "Not set";
    if (heightUnit === "cm") return `${profile.heightCm} cm`;
    const totalIn = Math.round(profile.heightCm / 2.54);
    return `${Math.floor(totalIn / 12)}′${totalIn % 12}″`;
  })();

  // Membership info — sourced from member (Member has these fields; ProfileMetrics does not)
  const daysLeft = member.membershipEndDate
    ? Math.ceil((new Date(member.membershipEndDate).getTime() - Date.now()) / 86400000)
    : null;

  const membershipLabel =
    member.membershipStatus === "active"
      ? "Active"
      : member.membershipStatus === "expiring_soon"
        ? "Expiring soon"
        : member.membershipStatus === "expired"
          ? "Expired"
          : "No membership";

  const membershipSub = member.currentPackageName
    ? `${member.currentPackageName}${daysLeft !== null ? ` · ${daysLeft > 0 ? `${daysLeft}d left` : "Expired"}` : ""}`
    : "No active package";

  return (
    <div className="mset-root">
      <div className="mset-header">
        <Link href="/member" className="mset-back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="mset-title">Settings</h1>
      </div>

      <div className="mset-body">
        {/* Units */}
        <Section title="UNITS & MEASUREMENT">
          <SettingRow
            label="Body weight"
            sub={`Currently showing as ${weightDisplay}`}
          >
            <SegControl
              value={weightUnit}
              onChange={(v) => saveWeightUnit(v as "kg" | "lbs")}
              options={[{ v: "kg", l: "kg" }, { v: "lbs", l: "lbs" }]}
            />
          </SettingRow>
          <SettingRow
            label="Height"
            sub={`Currently showing as ${heightDisplay}`}
            last
          >
            <SegControl
              value={heightUnit}
              onChange={(v) => saveHeightUnit(v as "cm" | "ft")}
              options={[{ v: "cm", l: "cm" }, { v: "ft", l: "ft / in" }]}
            />
          </SettingRow>
        </Section>

        {/* Membership */}
        <Section title="MEMBERSHIP">
          <div className="mset-row">
            <div className="mset-row__text">
              <span className="mset-row__label">{member.currentPackageName ?? "No plan"}</span>
              <span className="mset-row__sub">{membershipSub}</span>
            </div>
            <span className={`mset-status-pill mset-status-pill--${member.membershipStatus ?? "none"}`}>
              {membershipLabel}
            </span>
          </div>
          <Link href="/member/membership" className="mset-row mset-row--link">
            <div className="mset-row__text">
              <span className="mset-row__label">Manage plan</span>
              <span className="mset-row__sub">Upgrade, renew, or view payment history</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </Link>
          <Link href="/member/pt-history" className="mset-row mset-row--link mset-row--last">
            <div className="mset-row__text">
              <span className="mset-row__label">PT history</span>
              <span className="mset-row__sub">Your personal training sessions</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </Link>
        </Section>

        {/* Notifications */}
        <Section title="NOTIFICATIONS">
          <SettingRow
            label="Workout reminders"
            sub="Daily nudge to log your session"
          >
            <Toggle on={workoutReminders} onChange={saveWorkoutReminders} />
          </SettingRow>
          <SettingRow
            label="Coach messages"
            sub="Push when your trainer leaves a note"
            last
          >
            <Toggle on={coachMessages} onChange={saveCoachMessages} />
          </SettingRow>
        </Section>

        {/* Account */}
        <Section title="ACCOUNT">
          <SettingRow label="Full name" sub={member.fullName} />
          <SettingRow
            label="Username"
            sub={member.username ? `@${member.username}` : "Not set"}
          />
          <SettingRow label="Phone" sub={member.phone || "Not set"} last />
        </Section>

        {/* Logout */}
        <button
          type="button"
          className="mset-logout"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              localStorage.removeItem("fitsplit-remember-me");
              await logoutUser();
            })
          }
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {isPending ? "Logging out…" : "Log out"}
        </button>
      </div>
    </div>
  );
}
