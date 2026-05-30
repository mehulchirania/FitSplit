import Link from "next/link";
import { Calendar, Dumbbell, UsersRound } from "@/components/icons";
import { PTBookingForm } from "@/components/pt-booking-form";
import { PTCalendarDynamic } from "@/components/pt-calendar-dynamic";
import { PTSessionActions } from "@/components/pt-session-actions";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
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
      ? `${session.planStartDate} → ${session.planEndDate}`
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
  searchParams: Promise<{ status?: string; trainerId?: string; memberId?: string; gym?: string; view?: string; book?: string }>;
}) {
  const currentUser = await requireRole(["admin", "owner"]);
  const { status, trainerId, memberId, gym: gymParam, view, book } = await searchParams;
  const isBookingMode = book === "1" || book === "true";
  const { gyms } = currentUser.role === "admin" ? await getGymWorkspaces() : { gyms: [] };
  const gymId = currentUser.role === "admin"
    ? (gymParam ?? currentUser.gymId ?? gyms[0]?.id ?? PRIMARY_GYM_ID)
    : (currentUser.gymId ?? PRIMARY_GYM_ID);
  const selectedGym = gyms.find((gym) => gym.id === gymId);

  const [sessions, { members }, trainers, { exercises }] = await Promise.all([
    getAllPTSessionsForGym(gymId),
    getMembers(gymId),
    getTrainersForGym(gymId),
    getExerciseCatalog(gymId)
  ]);

  // Counts per status
  const counts = sessions.reduce<Record<string, number>>(
    (acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc; },
    {}
  );
  const activePtPlanCount = (counts.scheduled ?? 0) + (counts.active ?? 0);
  const plansWithExercises = sessions.filter((s) => s.plannedExercises?.length).length;

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

  // Pre-selected member info for context banner
  const preselectedMember = memberId ? members.find((m) => m.id === memberId) : null;
  const preselectedTrainer = trainerId ? trainers.find((t) => t.id === trainerId) : null;

  return (
    <div className={`odp2-scroll pt-page${isBookingMode ? " pt-page--booking" : ""}`}>

      {/* ── Page header ── */}
      <div className="adm-page-head" style={{ marginBottom: 0 }}>
        <div>
          <div className="adm-crumb">Dashboard / Training</div>
          <h1 className="adm-title">{isBookingMode ? "Assign a PT plan" : "Personal training"}</h1>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn adm-btn--ghost" href="/owner/training">View all plans</Link>
          <Link className="adm-btn" href="/owner/training?book=1">+ Assign PT plan</Link>
        </div>
      </div>

      <section className="pt-command-hero">
        <div className="pt-command-copy">
          <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 10px" }}>
            Create trainer-led PT plans with member, trainer, duration, and exercises in one flow.
            These plans stay separate from regular workout assignments.
          </p>
          {currentUser.role === "admin" && gyms.length > 0 && (
            <div className="pt-admin-gym-switcher" aria-label="Select gym">
              {gyms.map((gym) => (
                <Link
                  key={gym.id}
                  className={`adm-btn${gym.id === gymId ? "" : " adm-btn--ghost"}`}
                  href={`/owner/training?gym=${gym.id}`}
                >
                  {gym.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="pt-command-panel" aria-label="PT overview">
          <article className="pt-command-stat">
            <Calendar />
            <div>
              <strong>{activePtPlanCount}</strong>
              <span>Active monthly plans</span>
            </div>
          </article>
          <article className="pt-command-stat">
            <Dumbbell />
            <div>
              <strong>{plansWithExercises}</strong>
              <span>Plans with exercises</span>
            </div>
          </article>
          <article className="pt-command-stat">
            <UsersRound />
            <div>
              <strong>{trainers.length}</strong>
              <span>Available trainers</span>
            </div>
          </article>
        </aside>
      </section>

      {currentUser.role === "admin" && selectedGym && (
        <p className="pt-admin-context">Managing PT plans for {selectedGym.name}.</p>
      )}

      {/* ── 2-column workspace ── */}
      <div className={`pt-workspace-grid${isBookingMode ? " pt-workspace-grid--booking" : ""}`}>

        {/* Left: booking form (always visible) */}
        <section className="pt-book-col">
          <div className="adm-card pt-booking-card">
            <div className="adm-card__head pt-booking-card-title">
              <h3 style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Calendar />
                Assign PT plan
              </h3>
              {preselectedMember && (
                <span className="adm-inbox-tag adm-inbox-tag--ok">
                  For {preselectedMember.fullName}
                </span>
              )}
            </div>

            <div className="adm-card__body">
              <p style={{ fontSize: 13, color: "var(--text-soft)", margin: "0 0 14px", lineHeight: 1.6 }}>
                Default duration is 30 days. Add exercises here for PT only; regular workout plans are not overwritten.
              </p>
              <PTBookingForm
                gymId={gymId}
                exercises={exercises}
                members={members}
                trainers={trainers}
                preselectedMemberId={memberId}
                preselectedTrainerId={trainerId}
              />
            </div>
          </div>
        </section>

        {/* Right: sessions list */}
        <aside className="pt-sessions-col">

          {/* Trainer filter pills */}
          {trainers.length > 0 && (
            <div className="pt-filter-group">
              <span className="pt-filter-label">Trainer</span>
              <div className="pt-filter-pills">
                <Link
                  href={`/owner/training${memberId ? `?memberId=${memberId}` : ""}${status ? `${memberId ? "&" : "?"}status=${status}` : ""}`}
                  className={`pt-trainer-tab${!trainerId ? " is-selected" : ""}`}
                >
                  All
                </Link>
                {trainers.map((t) => (
                  <Link
                    key={t.id}
                    href={`/owner/training?trainerId=${t.id}${memberId ? `&memberId=${memberId}` : ""}${status ? `&status=${status}` : ""}`}
                    className={`pt-trainer-tab${trainerId === t.id ? " is-selected" : ""}`}
                  >
                    {t.fullName}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Member filter indicator (when coming from member page) */}
          {preselectedMember && (
            <div className="pt-member-filter-banner">
              <span>Showing sessions for <strong>{preselectedMember.fullName}</strong></span>
              <Link
                href={`/owner/training${trainerId ? `?trainerId=${trainerId}` : ""}`}
                className="pt-clear-filter"
              >
                Clear filter ×
              </Link>
            </div>
          )}

          {/* View toggle */}
          <div className="pt-view-toggle">
            <Link
              href={`/owner/training?${new URLSearchParams({ ...(trainerId ? { trainerId } : {}), ...(memberId ? { memberId } : {}), ...(status ? { status } : {}) })}`}
              className={`pt-view-tab${view !== "calendar" ? " is-selected" : ""}`}
            >
              List
            </Link>
            <Link
              href={`/owner/training?${new URLSearchParams({ view: "calendar", ...(trainerId ? { trainerId } : {}), ...(memberId ? { memberId } : {}), ...(status ? { status } : {}) })}`}
              className={`pt-view-tab${view === "calendar" ? " is-selected" : ""}`}
            >
              Calendar
            </Link>
          </div>

          {/* Status filter tabs */}
          <div className="members-filter-bar" style={{ margin: "0" }}>
            <div className="members-filter-tabs">
              {filterTabs.map((tab) => {
                const params = new URLSearchParams({
                  ...(tab.value !== "all" ? { status: tab.value } : {}),
                  ...(trainerId ? { trainerId } : {}),
                  ...(memberId ? { memberId } : {}),
                  ...(view === "calendar" ? { view } : {})
                }).toString();
                return (
                  <Link
                    key={tab.value}
                    href={`/owner/training${params ? `?${params}` : ""}`}
                    className={activeFilter === tab.value ? "is-selected" : ""}
                  >
                    {tab.label}
                    {tab.value === "all" ? (
                      <span className="ftab-count">{sessions.length}</span>
                    ) : counts[tab.value] != null ? (
                      <span className="ftab-count">{counts[tab.value]}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Sessions */}
          {view === "calendar" && filtered.length > 0 ? (
            <PTCalendarDynamic sessions={filtered} />
          ) : filtered.length === 0 ? (
            <div className="adm-card" style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ color: "var(--text-faint)", margin: "0 auto 12px", display: "flex", justifyContent: "center" }}>
                <Calendar />
              </div>
              <p style={{ color: "var(--text-soft)", margin: 0, fontSize: 13 }}>
                {activeFilter === "all" ? "No PT plans yet — assign one using the form." : `No ${activeFilter} PT plans.`}
              </p>
            </div>
          ) : (
            <section className="adm-card" style={{ padding: 0 }}>
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
                        style={{ fontSize: "0.8rem", padding: "5px 12px", whiteSpace: "nowrap" }}
                      >
                        Open console →
                      </Link>
                    )}
                  </div>

                  <div className="pt-card-body">
                    <div className="pt-card-people">
                      <div className="pt-card-person">
                        <span className="pt-card-person-label">Member</span>
                        <Link className="pt-card-person-name" href={`/owner/members/${session.memberId}`}>
                          {session.memberName ?? session.memberId}
                        </Link>
                      </div>
                      <div className="pt-card-person">
                        <span className="pt-card-person-label">Trainer</span>
                        <Link
                          className="pt-card-person-name"
                          href={`/owner/training?trainerId=${session.trainerId}${memberId ? `&memberId=${memberId}` : ""}`}
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
        </aside>
      </div>
    </div>
  );
}
