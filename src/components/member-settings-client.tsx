"use client";

import { useState, useTransition, useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/auth";
import { updateProfileMetrics, updateMemberAvatar, changeMemberPin, exportMyData, requestAccountDeletion } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import { AvatarUploader } from "@/components/avatar-uploader";
import type { Member, ProfileMetrics } from "@/types/domain";

interface MemberSettingsClientProps {
  member: Member;
  profile: ProfileMetrics;
  gymId: string;
  memberId: string;
}

/* ── Reusable primitives ─────────────────────────────────────────────────── */

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

function SegControl({ value, onChange, options }: {
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

function Row({ label, sub, children, last }: {
  label: string; sub?: string; children?: React.ReactNode; last?: boolean;
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

function storedSetting<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  return allowed.includes(value as T) ? value as T : fallback;
}

function storedToggle(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  return value === null ? fallback : value === "1";
}

/* ── Profile tab ─────────────────────────────────────────────────────────── */

function ProfileTab({ member, profile, memberId }: {
  member: Member;
  profile: ProfileMetrics;
  memberId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saveErr, setSaveErr] = useState("");

  // Local form state
  const [fullName, setFullName] = useState(member.fullName);
  const [phone, setPhone] = useState(member.phone ?? "");
  const [age, setAge] = useState(profile.age?.toString() ?? "");
  const [weightKg, setWeightKg] = useState(profile.weightKg?.toString() ?? "");
  const [heightCm, setHeightCm] = useState(profile.heightCm?.toString() ?? "");
  const [primarySlot, setPrimarySlot] = useState<"A"|"B"|"C"|"D">(profile.primarySlot ?? "A");
  const [fitnessGoals, setFitnessGoals] = useState(profile.fitnessGoals ?? "");

  function resetForm() {
    setFullName(member.fullName);
    setPhone(member.phone ?? "");
    setAge(profile.age?.toString() ?? "");
    setWeightKg(profile.weightKg?.toString() ?? "");
    setHeightCm(profile.heightCm?.toString() ?? "");
    setPrimarySlot(profile.primarySlot ?? "A");
    setFitnessGoals(profile.fitnessGoals ?? "");
    setSaveErr("");
    setEditing(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveErr("");
    const fd = new FormData();
    fd.set("memberId", memberId);
    fd.set("fullName", fullName.trim() || member.fullName);
    fd.set("email", member.email ?? "");
    fd.set("phone", phone.trim());
    if (age) fd.set("age", age);
    if (weightKg) fd.set("weightKg", weightKg);
    if (heightCm) fd.set("heightCm", heightCm);
    fd.set("primarySlot", primarySlot);
    fd.set("fitnessGoals", fitnessGoals.trim());
    startTransition(async () => {
      const result = await updateProfileMetrics(initialFormActionState, fd);
      if (result.status === "success") {
        setEditing(false);
        router.refresh();
      } else {
        setSaveErr(result.message);
      }
    });
  }

  const bmiValue = weightKg && heightCm
    ? Number(weightKg) / Math.pow(Number(heightCm) / 100, 2)
    : null;
  const bmi = bmiValue ? bmiValue.toFixed(1) : "—";

  return (
    <div className="mset-body">
      {/* Avatar + name header */}
      <div className="mset-profile-hero">
        <AvatarUploader
          action={updateMemberAvatar}
          currentUrl={member.avatarUrl}
          name={member.fullName}
          dataUrlField="avatarDataUrl"
          fields={{ memberId }}
        />
        <div>
          <strong className="mset-profile-name">{member.fullName}</strong>
          <span className="mset-profile-meta">@{member.username || memberId} · Member</span>
        </div>
        {!editing && (
          <button
            type="button"
            className="mset-edit-btn"
            onClick={() => setEditing(true)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="mset-edit-form">
          <Section title="PERSONAL INFO">
            <div className="mset-field-grid">
              <label className="mset-field">
                <span>Full name</span>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
              </label>
              <label className="mset-field">
                <span>Phone</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" />
              </label>
              <label className="mset-field">
                <span>Age</span>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 28" min="10" max="100" inputMode="numeric" />
              </label>
            </div>
          </Section>

          <Section title="BODY METRICS">
            <div className="mset-field-grid">
              <label className="mset-field">
                <span>Weight (kg)</span>
                <input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="e.g. 72" step="0.1" inputMode="decimal" />
              </label>
              <label className="mset-field">
                <span>Height (cm)</span>
                <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="e.g. 175" inputMode="numeric" />
              </label>
              <label className="mset-field">
                <span>BMI (auto)</span>
                <input type="text" value={bmi} readOnly style={{ opacity: 0.6, cursor: "not-allowed" }} />
              </label>
            </div>
          </Section>

          <Section title="TRAINING">
            <div className="mset-field-grid mset-field-grid--full">
              <label className="mset-field">
                <span>Preferred gym slot</span>
                <select value={primarySlot} onChange={(e) => setPrimarySlot(e.target.value as "A"|"B"|"C"|"D")}>
                  <option value="A">Slot A — Morning (6 AM – 9 AM)</option>
                  <option value="B">Slot B — Midday (10 AM – 1 PM)</option>
                  <option value="C">Slot C — Afternoon (2 PM – 5 PM)</option>
                  <option value="D">Slot D — Evening (6 PM – 9 PM)</option>
                </select>
              </label>
              <label className="mset-field mset-field--full">
                <span>Fitness goals</span>
                <input
                  type="text"
                  value={fitnessGoals}
                  onChange={(e) => setFitnessGoals(e.target.value)}
                  placeholder="e.g. Build muscle, lose fat, improve endurance…"
                />
              </label>
            </div>
          </Section>

          {saveErr && <p className="mset-save-err">{saveErr}</p>}

          <div className="mset-edit-actions">
            <button type="submit" className="mset-save-btn" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </button>
            <button type="button" className="mset-cancel-btn" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Read-only stats */}
          <Section title="BODY METRICS">
            <div className="mset-stats-grid">
              {[
                { l: "Weight", v: profile.weightKg ? `${profile.weightKg} kg` : "Not set" },
                { l: "Height", v: profile.heightCm ? `${profile.heightCm} cm` : "Not set" },
                { l: "Age", v: profile.age ? String(profile.age) : "Not set" },
                { l: "BMI", v: bmi },
              ].map(({ l, v }) => (
                <div key={l} className="mset-stat-tile">
                  <span>{l}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          </Section>

          <Section title="TRAINING PREFERENCES">
            <Row label="Preferred slot" sub={["Morning (6–9 AM)", "Midday (10 AM–1 PM)", "Afternoon (2–5 PM)", "Evening (6–9 PM)"][["A","B","C","D"].indexOf(profile.primarySlot ?? "A")] ?? "Morning"} />
            <Row
              label="Fitness goals"
              sub={profile.fitnessGoals || "Tell your coach what you are working toward"}
              last
            >
              {!profile.fitnessGoals && (
                <button type="button" className="mset-action-btn" onClick={() => setEditing(true)}>
                  Set goals
                </button>
              )}
            </Row>
          </Section>

          <Section title="ACCOUNT">
            <Row label="Full name" sub={member.fullName} />
            <Row label="Phone / Username" sub={member.phone || "Not set"} />
            <Row label="Gym member since" sub={member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—"} last />
          </Section>
        </>
      )}
    </div>
  );
}

/* ── Settings tab ────────────────────────────────────────────────────────── */

function SettingsTab({ member, gymId }: { member: Member; gymId: string }) {
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">(() => storedSetting("fitsplit-weight-unit", "kg", ["kg", "lbs"]));
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">(() => storedSetting("fitsplit-height-unit", "cm", ["cm", "ft"]));
  const [workoutReminders, setWorkoutReminders] = useState(() => storedToggle("fitsplit-notif-workout", true));
  const [coachMessages, setCoachMessages] = useState(() => storedToggle("fitsplit-notif-coach", true));

  // PIN change
  const [showPin, setShowPin] = useState(false);
  const [pinState, pinAction] = useActionState(changeMemberPin, initialFormActionState);

  // Privacy / DSAR
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [delState, delAction] = useActionState(
    requestAccountDeletion.bind(null, gymId),
    initialFormActionState
  );

  async function handleExport() {
    setExportMsg("");
    setExporting(true);
    try {
      const res = await exportMyData(gymId);
      if (res.status === "success") {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setExportMsg("Your data download has started.");
      } else {
        setExportMsg(res.message);
      }
    } catch {
      setExportMsg("Couldn't export right now. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const [isPending, startTransition] = useTransition();
  const [nowMs] = useState(() => Date.now());

  const daysLeft = member.membershipEndDate
    ? Math.ceil((new Date(member.membershipEndDate).getTime() - nowMs) / 86400000)
    : null;
  const membershipLabel =
    member.membershipStatus === "active" ? "Active"
    : member.membershipStatus === "expiring_soon" ? "Expiring soon"
    : member.membershipStatus === "expired" ? "Expired"
    : "No membership";

  return (
    <div className="mset-body">
      {/* Membership */}
      <Section title="MEMBERSHIP">
        <div className="mset-row">
          <div className="mset-row__text">
            <span className="mset-row__label">{member.currentPackageName ?? "No plan"}</span>
            <span className="mset-row__sub">
              {member.currentPackageName ?? "No active package"}
              {daysLeft !== null ? ` · ${daysLeft > 0 ? `${daysLeft}d left` : "Expired"}` : ""}
            </span>
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </Link>
        <Link href="/member/pt-history" className="mset-row mset-row--link mset-row--last">
          <div className="mset-row__text">
            <span className="mset-row__label">PT history</span>
            <span className="mset-row__sub">Your personal training sessions</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </Link>
      </Section>

      {/* Units */}
      <Section title="UNITS &amp; DISPLAY">
        <Row label="Body weight" sub={`Showing as ${weightUnit}`}>
          <SegControl value={weightUnit} onChange={(v) => { setWeightUnit(v as "kg"|"lbs"); localStorage.setItem("fitsplit-weight-unit", v); }} options={[{v:"kg",l:"kg"},{v:"lbs",l:"lbs"}]} />
        </Row>
        <Row label="Height" sub={`Showing as ${heightUnit}`} last>
          <SegControl value={heightUnit} onChange={(v) => { setHeightUnit(v as "cm"|"ft"); localStorage.setItem("fitsplit-height-unit", v); }} options={[{v:"cm",l:"cm"},{v:"ft",l:"ft"}]} />
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="NOTIFICATIONS">
        <Row label="Workout reminders" sub="Daily nudge to log your session">
          <Toggle on={workoutReminders} onChange={(v) => { setWorkoutReminders(v); localStorage.setItem("fitsplit-notif-workout", v?"1":"0"); }} />
        </Row>
        <Row label="Coach messages" sub="Push when your trainer leaves a note" last>
          <Toggle on={coachMessages} onChange={(v) => { setCoachMessages(v); localStorage.setItem("fitsplit-notif-coach", v?"1":"0"); }} />
        </Row>
      </Section>

      {/* PIN change */}
      <Section title="ACCOUNT SECURITY">
        {!showPin ? (
          <div className="mset-row mset-row--last">
            <div className="mset-row__text">
              <span className="mset-row__label">4-digit PIN</span>
              <span className="mset-row__sub">Change your login PIN</span>
            </div>
            <button type="button" className="mset-action-btn" onClick={() => setShowPin(true)}>Change</button>
          </div>
        ) : (
          <form action={pinAction} className="mset-pin-form">
            <label className="mset-field">
              <span>Current PIN</span>
              <input type="password" name="currentPin" inputMode="numeric" maxLength={4} pattern="\d{4}" required placeholder="••••" autoFocus />
            </label>
            <label className="mset-field">
              <span>New PIN</span>
              <input type="password" name="newPin" inputMode="numeric" maxLength={4} pattern="\d{4}" required placeholder="••••" />
            </label>
            <label className="mset-field">
              <span>Confirm new PIN</span>
              <input type="password" name="confirmPin" inputMode="numeric" maxLength={4} pattern="\d{4}" required placeholder="••••" />
            </label>
            {pinState.status === "error" && <p className="mset-save-err">{pinState.message}</p>}
            {pinState.status === "success" && <p className="mset-save-ok">{pinState.message}</p>}
            <div className="mset-edit-actions">
              <button type="submit" className="mset-save-btn">Update PIN</button>
              <button type="button" className="mset-cancel-btn" onClick={() => setShowPin(false)}>Cancel</button>
            </div>
          </form>
        )}
      </Section>

      {/* Privacy & your data (GDPR/CCPA) */}
      <Section title="PRIVACY &amp; YOUR DATA">
        <Link href="/privacy" className="mset-row mset-row--link">
          <div className="mset-row__text">
            <span className="mset-row__label">Privacy Policy</span>
            <span className="mset-row__sub">How we use and protect your data</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </Link>
        <Link href="/terms" className="mset-row mset-row--link">
          <div className="mset-row__text">
            <span className="mset-row__label">Terms of Service</span>
            <span className="mset-row__sub">The rules for using FitSplit</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </Link>
        <div className="mset-row">
          <div className="mset-row__text">
            <span className="mset-row__label">Download my data</span>
            <span className="mset-row__sub">{exportMsg || "Export a copy of your FitSplit data (JSON)"}</span>
          </div>
          <button type="button" className="mset-action-btn" onClick={handleExport} disabled={exporting}>
            {exporting ? "Preparing…" : "Download"}
          </button>
        </div>
        {!showDelete ? (
          <div className="mset-row mset-row--last">
            <div className="mset-row__text">
              <span className="mset-row__label">Request account deletion</span>
              <span className="mset-row__sub">Ask your gym to erase your account and data</span>
            </div>
            <button type="button" className="mset-action-btn" onClick={() => setShowDelete(true)}>Request</button>
          </div>
        ) : (
          <form action={delAction} className="mset-pin-form">
            <label className="mset-field">
              <span>Reason (optional)</span>
              <input type="text" name="reason" maxLength={500} placeholder="Tell your gym why (optional)" />
            </label>
            {delState.status === "error" && <p className="mset-save-err">{delState.message}</p>}
            {delState.status === "success" && <p className="mset-save-ok">{delState.message}</p>}
            <div className="mset-edit-actions">
              <button type="submit" className="mset-save-btn">Submit request</button>
              <button type="button" className="mset-cancel-btn" onClick={() => setShowDelete(false)}>Cancel</button>
            </div>
          </form>
        )}
      </Section>

      {/* Logout */}
      <button
        type="button"
        className="mset-logout"
        disabled={isPending}
        onClick={() => startTransition(async () => {
          localStorage.removeItem("fitsplit-remember-me");
          await logoutUser();
        })}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        {isPending ? "Logging out…" : "Log out"}
      </button>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */

export function MemberSettingsClient({ member, profile, gymId, memberId }: MemberSettingsClientProps) {
  const [tab, setTab] = useState<"profile" | "settings">("profile");

  return (
    <div className="mset-root">
      <div className="mset-tabs">
        <button
          type="button"
          className={`mset-tab${tab === "profile" ? " mset-tab--on" : ""}`}
          onClick={() => setTab("profile")}
        >
          Profile &amp; Metrics
        </button>
        <button
          type="button"
          className={`mset-tab${tab === "settings" ? " mset-tab--on" : ""}`}
          onClick={() => setTab("settings")}
        >
          Settings
        </button>
      </div>

      {tab === "profile" ? (
        <ProfileTab member={member} profile={profile} memberId={memberId} />
      ) : (
        <SettingsTab member={member} gymId={gymId} />
      )}
    </div>
  );
}
