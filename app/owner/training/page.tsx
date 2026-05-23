import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { Calendar, Dumbbell, UsersRound } from "@/components/icons";
import { PTBookingForm } from "@/components/pt-booking-form";
import { PTSessionActions } from "@/components/pt-session-actions";
import { requireRole } from "@/lib/auth";
import {
  getAllPTSessionsForGym,
  getMembers,
  getTrainersForGym
} from "@/lib/firebase/read-models";
import type { PTSession } from "@/types/domain";

export const dynamic = "force-dynamic";

type StatusFilter = "all" | "scheduled" | "active" | "completed" | "cancelled";

const STATUS_LABELS: Record<PTSession["status"], string> = {
  scheduled: "Scheduled",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled"
};

const STATUS_PILL: Record<PTSession["status"], string> = {
  scheduled: "status-expiring",
  active: "status-active",
  completed: "status-neutral",
  cancelled: "status-inactive"
};

function formatDateTime(iso: string) {
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

export default async function OwnerTrainingPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; trainerId?: string; memberId?: string; book?: string }>;
}) {
  const currentUser = await requireRole(["admin", "owner"]);
  const gymId = currentUser.gymId;
  const { status, trainerId, memberId, book } = await searchParams;

  const [sessions, { members }, trainers] = await Promise.all([
    getAllPTSessionsForGym(gymId),
    getMembers(gymId),
    getTrainersForGym(gymId)
  ]);

  // Derive counts per status for the filter tabs
  const counts = sessions.reduce<Record<string, number>>(
    (acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc; },
    {}
  );

  const activeFilter = (status ?? "all") as StatusFilter;

  let filtered = sessions;
  if (activeFilter !== "all") filtered = filtered.filter((s) => s.status === activeFilter);
  if (trainerId) filtered = filtered.filter((s) => s.trainerId === trainerId);
  if (memberId) filtered = filtered.filter((s) => s.memberId === memberId);

  const filterTabs: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Scheduled", value: "scheduled" },
    { label: "Active", value: "active" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" }
  ];

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Dashboard", href: "/owner" }, { label: "Training" }]} />
          <h1>PT Schedule</h1>
          <p>Book, manage, and monitor all personal training sessions. Any trainer can cover any session.</p>
        </div>

        <aside className="ui-cards" style={{ alignContent: "start", height: "fit-content", gap: 14 }}>
          <article className="ui-card blue">
            <p className="tip" style={{ fontSize: "1.2em" }}><Calendar /> {counts.scheduled ?? 0}</p>
            <p className="second-text">Scheduled</p>
          </article>
          <article className="ui-card green">
            <p className="tip" style={{ fontSize: "1.2em" }}><Dumbbell /> {counts.active ?? 0}</p>
            <p className="second-text">Active now</p>
          </article>
          <article className="ui-card purple">
            <p className="tip" style={{ fontSize: "1.2em" }}><UsersRound /> {trainers.length}</p>
            <p className="second-text">Trainers</p>
          </article>
        </aside>
      </section>

      {/* Booking form panel */}
      <section className="list-panel pt-booking-panel">
        <details open={book === "1"}>
          <summary className="pt-booking-summary">
            <Calendar /> Book a new PT session
          </summary>
          <PTBookingForm
            members={members}
            trainers={trainers}
            preselectedMemberId={memberId}
            preselectedTrainerId={trainerId}
          />
        </details>
      </section>

      {/* Trainer quick-links */}
      {trainers.length > 0 && (
        <div className="pt-trainer-tabs">
          <Link
            href="/owner/training"
            className={`pt-trainer-tab${!trainerId ? " is-selected" : ""}`}
          >
            All trainers
          </Link>
          {trainers.map((t) => (
            <Link
              key={t.id}
              href={`/owner/training?trainerId=${t.id}`}
              className={`pt-trainer-tab${trainerId === t.id ? " is-selected" : ""}`}
            >
              {t.fullName}
            </Link>
          ))}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="members-filter-bar" style={{ marginTop: 0 }}>
        <div className="members-filter-tabs">
          {filterTabs.map((tab) => {
            const href = new URLSearchParams({
              ...(tab.value !== "all" ? { status: tab.value } : {}),
              ...(trainerId ? { trainerId } : {}),
              ...(memberId ? { memberId } : {})
            }).toString();
            return (
              <Link
                key={tab.value}
                href={`/owner/training${href ? `?${href}` : ""}`}
                className={`${activeFilter === tab.value ? "is-selected" : ""}`}
              >
                {tab.label}
                {tab.value !== "all" && counts[tab.value] != null ? (
                  <span className="ftab-count">{counts[tab.value]}</span>
                ) : tab.value === "all" ? (
                  <span className="ftab-count">{sessions.length}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sessions list */}
      {filtered.length === 0 ? (
        <div className="list-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
          <Calendar />
          <h2 style={{ marginTop: 8 }}>No sessions found</h2>
          <p style={{ color: "var(--text-soft)" }}>
            {activeFilter === "all" ? "No PT sessions have been booked yet." : `No ${activeFilter} sessions.`}
          </p>
        </div>
      ) : (
        <section className="list-panel" style={{ padding: 0 }}>
          {filtered.map((session) => (
            <article key={session.id} className="pt-session-card">
              <div className="pt-card-header">
                <div className="pt-card-identity">
                  <span className={`status-pill ${STATUS_PILL[session.status]}`}>
                    {STATUS_LABELS[session.status]}
                  </span>
                  <span className="pt-card-date">{formatDateTime(session.scheduledAt)}</span>
                  <span className="pt-card-duration">{session.durationMinutes} min</span>
                </div>
                {session.status === "active" && (
                  <Link
                    className="button button-primary"
                    href={`/owner/training/session/${session.id}`}
                    style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                  >
                    Open console →
                  </Link>
                )}
              </div>

              <div className="pt-card-body">
                <div className="pt-card-people">
                  <div className="pt-card-person">
                    <span className="pt-card-person-label">Member</span>
                    <Link
                      className="pt-card-person-name"
                      href={`/owner/members/${session.memberId}`}
                    >
                      {session.memberName ?? session.memberId}
                    </Link>
                  </div>
                  <div className="pt-card-person">
                    <span className="pt-card-person-label">Trainer</span>
                    <Link
                      className="pt-card-person-name"
                      href={`/owner/training?trainerId=${session.trainerId}`}
                    >
                      {session.trainerName ?? session.trainerId}
                    </Link>
                  </div>
                </div>

                {session.notes && (
                  <p className="pt-card-notes">{session.notes}</p>
                )}

                {session.cancelReason && (
                  <p className="pt-card-notes pt-cancel-note">Cancelled: {session.cancelReason}</p>
                )}
              </div>

              {(session.status === "scheduled" || session.status === "active") && (
                <div className="pt-card-footer">
                  <PTSessionActions session={session} showLiveLink={session.status === "active"} />
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
