/* eslint-disable @typescript-eslint/no-unused-vars */
import Link from "next/link";
import { Calendar, Dumbbell } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import {
  getPTLiftLogsForSession,
  getPTSessionsForMember
} from "@/lib/firebase/read-models";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import type { PTSession } from "@/types/domain";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<PTSession["status"], string> = {
  scheduled: "status-expiring",
  active: "status-active",
  completed: "status-neutral",
  cancelled: "status-inactive"
};

const STATUS_LABELS: Record<PTSession["status"], string> = {
  scheduled: "Upcoming",
  active: "In progress",
  completed: "Completed",
  cancelled: "Cancelled"
};

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Asia/Kolkata"
    }).format(new Date(iso));
  } catch { return iso; }
}

function formatPlanRange(session: PTSession) {
  if (session.planStartDate) {
    return session.planEndDate
      ? `${session.planStartDate} to ${session.planEndDate}`
      : session.planStartDate;
  }
  return formatDateTime(session.scheduledAt);
}

function formatPlanDuration(session: PTSession) {
  if (session.planDurationDays) {
    return `${session.planDurationDays} day${session.planDurationDays === 1 ? "" : "s"}`;
  }
  return `${session.durationMinutes} min`;
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(iso));
  } catch { return ""; }
}

export default async function MemberPTHistoryPage() {
  const currentUser = await requireRole(["member"]);
  const memberId = currentUser.memberId ?? currentUser.uid;
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const sessions = await getPTSessionsForMember(gymId, memberId);

  // Split into upcoming and past
  const upcoming = sessions.filter((s) => s.status === "scheduled" || s.status === "active");
  const past = sessions.filter((s) => s.status === "completed" || s.status === "cancelled");

  const totalCompleted = past.filter((s) => s.status === "completed").length;
  const totalScheduled = upcoming.length;

  return (
    <div className="m3d-subpage">
      <div className="m3d-subpage__head">
        <h1>Personal training</h1>
        <p>Your PT plans, upcoming work, and completed history.</p>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <span className="adm-inbox-tag adm-inbox-tag--warn">{totalScheduled} upcoming</span>
          <span className="adm-inbox-tag adm-inbox-tag--ok">{totalCompleted} completed</span>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="list-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
          <Calendar className="pt-empty-icon" />
          <h2 style={{ marginTop: 8 }}>No PT plans yet</h2>
          <p style={{ color: "var(--text-soft)", marginBottom: 16 }}>
            Your trainer will assign a personal-training plan for you.
          </p>
          <Link className="button button-secondary" href="/member">Back to dashboard</Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="list-panel" style={{ padding: 0 }}>
              <div className="panel-title" style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border)" }}>
                <h2>Current and upcoming PT plans</h2>
              </div>
              {upcoming.map((session) => (
                <PTSessionHistoryCard key={session.id} session={session} gymId={gymId} />
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section className="list-panel" style={{ padding: 0 }}>
              <div className="panel-title" style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border)" }}>
                <h2>Past PT plans</h2>
              </div>
              {past.map((session) => (
                <PTSessionHistoryCard key={session.id} session={session} gymId={gymId} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

async function PTSessionHistoryCard({ session, gymId }: { session: PTSession; gymId: string }) {
  // Only fetch lift logs for completed sessions (reduces reads for upcoming/cancelled)
  const liftLogs = session.status === "completed"
    ? await getPTLiftLogsForSession(gymId, session.id)
    : [];

  const totalSets = liftLogs.length;
  const totalVolume = liftLogs.reduce((sum, log) => {
    const firstRep = Number(String(log.reps ?? "0").split(",")[0]) || 0;
    return sum + log.weight * log.sets * firstRep;
  }, 0);

  function formatTime(iso: string) {
    try {
      return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(iso));
    } catch { return ""; }
  }

  return (
    <article className="pt-history-card">
      <div className="pt-history-header">
        <div className="pt-history-meta">
          <span className={`status-pill ${STATUS_PILL[session.status]}`}>
            {STATUS_LABELS[session.status]}
          </span>
          <span className="pt-history-date">{formatPlanRange(session)}</span>
          <span className="pt-history-duration">{formatPlanDuration(session)}</span>
        </div>
        <div className="pt-history-trainer">
          <span className="pt-trainer-badge">🏋️ {session.trainerName ?? "Your trainer"}</span>
        </div>
      </div>

      {session.notes && (
        <p className="pt-history-notes">{session.notes}</p>
      )}

      {session.cancelReason && (
        <p className="pt-history-notes pt-cancel-note">Cancelled: {session.cancelReason}</p>
      )}

      {session.status === "completed" && (
        <>
          <div className="pt-history-stats">
            {totalSets > 0 ? (
              <>
                <span className="status-pill status-neutral">{totalSets} set{totalSets !== 1 ? "s" : ""}</span>
                <span className="status-pill status-neutral">{Math.round(totalVolume / 1000 * 10) / 10}k volume</span>
              </>
            ) : (
              <span style={{ color: "var(--text-faint)", fontSize: "0.82rem" }}>No sets logged</span>
            )}
          </div>

          {liftLogs.length > 0 && (
            <details className="pt-history-lifts">
              <summary>View {liftLogs.length} set{liftLogs.length !== 1 ? "s" : ""}</summary>
              <div className="pt-logs-list">
                {liftLogs.map((log) => (
                  <div key={log.id} className="pt-log-row">
                    <span className="pt-log-exercise">{log.exerciseName ?? log.exerciseId}</span>
                    <span className="pt-log-stats">{log.weight}kg × {log.sets} × {log.reps}</span>
                    {log.notes && <span className="pt-log-notes">{log.notes}</span>}
                    <span className="pt-log-time">{formatTime(log.loggedAt)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </article>
  );
}
