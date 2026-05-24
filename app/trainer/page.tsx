import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { Calendar, UsersRound } from "@/components/icons";
import { PTSessionActions } from "@/components/pt-session-actions";
import { PTBookingForm } from "@/components/pt-booking-form";
import { requireRole } from "@/lib/auth";
import {
  getExerciseCatalog,
  getMembers,
  getPTSessionsForTrainer,
  getTrainersForGym
} from "@/lib/firebase/read-models";
import type { PTSession } from "@/types/domain";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<PTSession["status"], string> = {
  scheduled: "status-expiring",
  active: "status-active",
  completed: "status-neutral",
  cancelled: "status-inactive"
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDuration(session: PTSession) {
  if (session.planDurationDays) return `${session.planDurationDays}d plan`;
  return `${session.durationMinutes} min`;
}

export default async function TrainerDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const currentUser = await requireRole(["owner"]);
  const { book } = await searchParams;
  const gymId = currentUser.gymId;
  const trainerId = currentUser.uid;

  const [mySessions, { members }, trainers, { exercises }] = await Promise.all([
    getPTSessionsForTrainer(gymId, trainerId),
    getMembers(gymId),
    getTrainersForGym(gymId),
    getExerciseCatalog(gymId)
  ]);

  const upcoming = mySessions.filter(
    (s) => s.status === "scheduled" || s.status === "active"
  );
  const past = mySessions.filter(
    (s) => s.status === "completed" || s.status === "cancelled"
  );

  const trainerOptions = trainers.map((t) => ({
    id: t.id,
    fullName: t.fullName
  }));

  return (
    <main className="page">
      {/* ── Header ── */}
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Trainer" }, { label: "My Schedule" }]} />
          <p className="eyebrow">Trainer view</p>
          <h1>My PT schedule</h1>
          <p>Your upcoming and active PT plans. Active plans can be opened in the console.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          <Link
            className={`button ${book === "1" ? "button-secondary" : "button-primary"}`}
            href={book === "1" ? "/trainer" : "/trainer?book=1"}
          >
            {book === "1" ? "← Back to schedule" : "+ Assign PT plan"}
          </Link>
          <Link className="button button-secondary" href="/owner/training">
            Full training hub
          </Link>
        </div>
      </section>

      {/* ── Booking form (toggled) ── */}
      {book === "1" && (
        <section className="list-panel" style={{ margin: "0 auto", maxWidth: "var(--page-max-width, 1220px)", marginTop: 24 }}>
          <div className="panel-title">
            <h2><Calendar /> Assign PT plan</h2>
          </div>
          <div style={{ padding: "16px 20px 20px" }}>
            <PTBookingForm
              gymId={gymId}
              members={members.map((m) => ({ id: m.id, fullName: m.fullName, username: m.username, staffType: m.staffType }))}
              trainers={trainers.map((t) => ({ id: t.id, fullName: t.fullName, username: t.username, staffType: t.staffType }))}
              exercises={exercises}
              preselectedTrainerId={trainerId}
            />
          </div>
        </section>
      )}

      {/* ── Upcoming / Active ── */}
      <div className="trainer-schedule-grid">
        <section className="list-panel">
          <div className="panel-title">
            <h2><Calendar /> Upcoming &amp; active</h2>
            <span className="status-pill status-neutral">{upcoming.length}</span>
          </div>

          {upcoming.length === 0 ? (
            <p style={{ color: "var(--text-soft)", fontSize: "0.88rem", padding: "24px 20px", textAlign: "center" }}>
              No upcoming PT plans. Assign one using the button above.
            </p>
          ) : (
            <div className="trainer-session-list">
              {upcoming.map((session) => (
                <article className="trainer-session-card" key={session.id}>
                  <div className="trainer-session-header">
                    <div>
                      <strong className="trainer-session-member">{session.memberName ?? "Member"}</strong>
                      <span className="trainer-session-date">{formatDate(session.scheduledAt)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="trainer-session-duration">{formatDuration(session)}</span>
                      <span className={`status-pill ${STATUS_PILL[session.status]}`}>{session.status}</span>
                    </div>
                  </div>
                  {session.notes && (
                    <p className="trainer-session-notes">{session.notes}</p>
                  )}
                  <div className="trainer-session-actions">
                    <PTSessionActions
                      session={session}
                      showLiveLink={session.status === "active"}
                      trainers={trainerOptions}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ── Past sessions ── */}
        <section className="list-panel">
          <div className="panel-title">
            <h2><UsersRound /> Past plans</h2>
            <span className="status-pill status-neutral">{past.length}</span>
          </div>

          {past.length === 0 ? (
            <p style={{ color: "var(--text-soft)", fontSize: "0.88rem", padding: "24px 20px", textAlign: "center" }}>
              No completed or cancelled PT plans yet.
            </p>
          ) : (
            <div className="trainer-session-list">
              {past.slice(0, 10).map((session) => (
                <article className="trainer-session-card trainer-session-card--past" key={session.id}>
                  <div className="trainer-session-header">
                    <div>
                      <strong className="trainer-session-member">{session.memberName ?? "Member"}</strong>
                      <span className="trainer-session-date">{formatDate(session.scheduledAt)}</span>
                    </div>
                    <span className={`status-pill ${STATUS_PILL[session.status]}`}>{session.status}</span>
                  </div>
                  {session.cancelReason && (
                    <p className="trainer-session-notes" style={{ color: "var(--danger, #e05252)" }}>
                      Cancelled: {session.cancelReason}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
