import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { Calendar, Dumbbell, UsersRound } from "@/components/icons";
import { PTBookingForm } from "@/components/pt-booking-form";
import { PTCalendarDynamic } from "@/components/pt-calendar-dynamic";
import { PTSessionActions } from "@/components/pt-session-actions";
import { requireRole } from "@/lib/auth";
import {
  getAllPTSessionsForGym,
  getExerciseCatalog,
  getGymWorkspaces,
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

function formatPlanRange(session: PTSession) {
  if (session.planStartDate) {
    return session.planEndDate
      ? `${session.planStartDate} to ${session.planEndDate}`
      : session.planStartDate;
  }
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(session.scheduledAt));
  } catch {
    return session.scheduledAt;
  }
}

function formatPlanDuration(session: PTSession) {
  if (session.planDurationDays) {
    return `${session.planDurationDays} day${session.planDurationDays === 1 ? "" : "s"}`;
  }
  return `${session.durationMinutes} min`;
}

export default async function OwnerTrainingPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; trainerId?: string; memberId?: string; book?: string; gym?: string; view?: string }>;
}) {
  const currentUser = await requireRole(["admin", "owner"]);
  const { status, trainerId, memberId, book, gym: gymParam, view } = await searchParams;
  const { gyms } = currentUser.role === "admin" ? await getGymWorkspaces() : { gyms: [] };
  const gymId = currentUser.role === "admin"
    ? (gymParam ?? currentUser.gymId ?? gyms[0]?.id ?? "shg")
    : (currentUser.gymId ?? "shg");
  const selectedGym = gyms.find((gym) => gym.id === gymId);

  const [sessions, { members }, trainers, { exercises }] = await Promise.all([
    getAllPTSessionsForGym(gymId),
    getMembers(gymId),
    getTrainersForGym(gymId),
    getExerciseCatalog(gymId)
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
      <section className="dashboard-header compact-header pt-page-hero">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Dashboard", href: "/owner" }, { label: "Training" }]} />
          <h1>PT plans</h1>
          <p>Assign monthly personal-training plans without touching the member&apos;s normal workout assignment.</p>
          {currentUser.role === "admin" && gyms.length > 0 && (
            <div className="quick-actions" style={{ marginTop: 16 }}>
              {gyms.map((gym) => (
                <Link
                  className={`button ${gym.id === gymId ? "button-primary" : "button-secondary"}`}
                  href={`/owner/training?gym=${gym.id}`}
                  key={gym.id}
                >
                  {gym.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="pt-hero-stats">
          <article className="pt-stat-card">
            <Calendar />
            <strong>{(counts.scheduled ?? 0) + (counts.active ?? 0)}</strong>
            <span>Current PT plans</span>
          </article>
          <article className="pt-stat-card">
            <Dumbbell />
            <strong>{sessions.filter((session) => session.plannedExercises?.length).length}</strong>
            <span>Exercise plans</span>
          </article>
          <article className="pt-stat-card">
            <UsersRound />
            <strong>{trainers.length}</strong>
            <span>PT staff</span>
          </article>
        </aside>
      </section>

      {/* Booking form panel */}
      <section className="list-panel pt-booking-panel">
        <details open={book === "1"}>
          <summary className="pt-booking-summary">
            <Calendar /> Assign a PT plan
          </summary>
          <PTBookingForm
            gymId={gymId}
            exercises={exercises}
            members={members}
            trainers={trainers}
            preselectedMemberId={memberId}
            preselectedTrainerId={trainerId}
          />
        </details>
      </section>

      {currentUser.role === "admin" && selectedGym && (
        <p className="pt-admin-context">
          Managing PT plans for {selectedGym.name}.
        </p>
      )}

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

      {/* View toggle tabs */}
      <div className="pt-trainer-tabs" style={{ marginTop: 12, borderBottom: "none" }}>
        <Link
          href={`/owner/training?${new URLSearchParams({ ...(trainerId ? { trainerId } : {}), ...(memberId ? { memberId } : {}), ...(status ? { status } : {}) })}`}
          className={`pt-trainer-tab${view !== "calendar" ? " is-selected" : ""}`}
        >
          List View
        </Link>
        <Link
          href={`/owner/training?${new URLSearchParams({ view: "calendar", ...(trainerId ? { trainerId } : {}), ...(memberId ? { memberId } : {}), ...(status ? { status } : {}) })}`}
          className={`pt-trainer-tab${view === "calendar" ? " is-selected" : ""}`}
        >
          Calendar View
        </Link>
      </div>

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
          <h2 style={{ marginTop: 8 }}>No PT plans found</h2>
          <p style={{ color: "var(--text-soft)" }}>
            {activeFilter === "all" ? "No PT plans have been assigned yet." : `No ${activeFilter} PT plans.`}
          </p>
        </div>
      ) : view === "calendar" ? null : (
        <section className="list-panel" style={{ padding: 0 }}>
          {filtered.map((session) => (
            <article key={session.id} className="pt-session-card">
              <div className="pt-card-header">
                <div className="pt-card-identity">
                  <span className={`status-pill ${STATUS_PILL[session.status]}`}>
                    {STATUS_LABELS[session.status]}
                  </span>
                  <span className="pt-card-date">{formatPlanRange(session)}</span>
                  <span className="pt-card-duration">{formatPlanDuration(session)}</span>
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
                  <PTSessionActions
                    session={session}
                    showLiveLink={session.status === "active"}
                    trainers={trainers.map((t) => ({ id: t.id, fullName: t.fullName }))}
                  />
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {view === "calendar" && filtered.length > 0 && (
            <PTCalendarDynamic sessions={filtered} />
      )}
    </main>
  );
}
