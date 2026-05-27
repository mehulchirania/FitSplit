import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { Calendar, UsersRound } from "@/components/icons";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { PTSessionActions } from "@/components/pt-session-actions";
import { PTBookingForm } from "@/components/pt-booking-form";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  getExerciseCatalog,
  getGymDetail,
  getMembersForTrainer,
  getPTSessionsForTrainer,
  getTrainersForGym,
} from "@/lib/firebase/read-models";
import type { PTSession, TrainerMemberVisibility } from "@/types/domain";

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
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    }).format(new Date(iso));
  } catch { return iso; }
}

function formatDuration(session: PTSession) {
  if (session.planDurationDays) return `${session.planDurationDays}d plan`;
  return `${session.durationMinutes} min`;
}

export default async function TrainerDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ book?: string; memberId?: string }>;
}) {
  const currentUser = await requireRole(["owner", "trainer"]);
  const { book, memberId: preselectedMemberId } = await searchParams;
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
  const trainerId = currentUser.uid;

  // Resolve trainer visibility setting from gym doc
  const [{ gym }, mySessions, allTrainers, { exercises }] = await Promise.all([
    getGymDetail(gymId),
    getPTSessionsForTrainer(gymId, trainerId),
    getTrainersForGym(gymId),
    getExerciseCatalog(gymId),
  ]);

  const visibility: TrainerMemberVisibility =
    gym?.trainerMemberVisibility ?? "assigned_only";

  const visibleMembers = await getMembersForTrainer(gymId, trainerId, visibility);

  const upcoming = mySessions.filter(
    (s) => s.status === "scheduled" || s.status === "active"
  );
  const past = mySessions.filter(
    (s) => s.status === "completed" || s.status === "cancelled"
  );

  const trainerOptions = allTrainers.map((t) => ({ id: t.id, fullName: t.fullName }));

  return (
    <main className="page">
      {/* ── Header ── */}
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Trainer" }, { label: "My Schedule" }]} />
          <p className="eyebrow">Trainer view</p>
          <h1>My PT schedule</h1>
          <p>Your upcoming and active PT plans. Active plans can be opened in the live console.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          <Link
            className={`button ${book === "1" ? "button-secondary" : "button-primary"}`}
            href={book === "1" ? "/trainer" : "/trainer?book=1"}
          >
            {book === "1" ? "← Back to schedule" : "+ Assign PT plan"}
          </Link>
          <Link className="button button-secondary" href="/trainer/members">
            My members
          </Link>
        </div>
      </section>

      {/* ── Booking form (toggled) ── */}
      {book === "1" && (
        <section className="list-panel" style={{ marginBottom: 24 }}>
          <div className="panel-title">
            <h2><Calendar /> Assign PT plan</h2>
            <span className="status-pill status-neutral" style={{ fontSize: "0.72rem" }}>
              {visibleMembers.length} visible member{visibleMembers.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ padding: "16px 20px 20px" }}>
            <PTBookingForm
              gymId={gymId}
              members={visibleMembers.map((m) => ({ id: m.id, fullName: m.fullName, username: m.username, staffType: m.staffType }))}
              trainers={allTrainers.map((t) => ({ id: t.id, fullName: t.fullName, username: t.username, staffType: t.staffType }))}
              exercises={exercises}
              preselectedTrainerId={trainerId}
              preselectedMemberId={preselectedMemberId}
            />
          </div>
        </section>
      )}

      {/* ── Session grid ── */}
      <div className="trainer-schedule-grid">
        {/* Upcoming / Active */}
        <section className="list-panel">
          <div className="panel-title">
            <h2><Calendar /> Upcoming &amp; active</h2>
            <span className="status-pill status-neutral">{upcoming.length}</span>
          </div>

          {upcoming.length === 0 ? (
            <div style={{ padding: "24px 20px" }}>
              <EmptyState
                icon={<Calendar />}
                heading="No upcoming plans"
                body="Assign a PT plan to one of your members to get started."
                action={{ label: "Assign PT plan", href: "/trainer?book=1" }}
              />
            </div>
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
                      <StatusBadge status={session.status} />
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

        {/* Past plans */}
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
              {past.slice(0, 15).map((session) => (
                <article className="trainer-session-card trainer-session-card--past" key={session.id}>
                  <div className="trainer-session-header">
                    <div>
                      <strong className="trainer-session-member">{session.memberName ?? "Member"}</strong>
                      <span className="trainer-session-date">{formatDate(session.scheduledAt)}</span>
                    </div>
                    <StatusBadge status={session.status} />
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
