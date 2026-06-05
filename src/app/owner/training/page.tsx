import Link from "next/link";
import { Calendar } from "@/components/icons";
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

const STATUS_ORDER: PTSession["status"][] = ["scheduled", "active", "completed", "cancelled"];

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

/** Build a /owner/training href, dropping empty params. */
function trainingHref(params: Record<string, string | undefined>) {
  const entries = Object.entries(params).filter(
    ([, v]) => v != null && v !== ""
  ) as [string, string][];
  const qs = new URLSearchParams(entries).toString();
  return `/owner/training${qs ? `?${qs}` : ""}`;
}

export default async function OwnerTrainingPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; trainerId?: string; memberId?: string; gym?: string; view?: string; book?: string }>;
}) {
  const currentUser = await requireRole(["admin", "owner"]);
  const { status, trainerId, memberId, gym: gymParam, view, book } = await searchParams;
  const isBookingMode = book === "1" || book === "true";
  const isCalendar = view === "calendar";
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

  // Group the filtered plans by status so the right column shows clean
  // "Scheduled / Active / Completed / Cancelled" lists rather than a flat grid.
  const grouped = STATUS_ORDER
    .map((st) => ({ status: st, items: filtered.filter((s) => s.status === st) }))
    .filter((g) => g.items.length > 0);

  const filterTabs: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Scheduled", value: "scheduled" },
    { label: "Active", value: "active" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" }
  ];

  const preselectedMember = memberId ? members.find((m) => m.id === memberId) : null;
  const viewParam = isCalendar ? "calendar" : undefined;
  const trainerList = trainers.map((t) => ({ id: t.id, fullName: t.fullName }));

  return (
    <div className={`odp2-scroll ptx${isBookingMode ? " ptx--booking" : ""}`}>
      {/* ── Header ── */}
      <div className="adm-page-head" style={{ marginBottom: 4 }}>
        <div>
          <div className="adm-crumb">Dashboard / Training</div>
          <h1 className="adm-title">{isBookingMode ? "Assign a PT plan" : "Personal training"}</h1>
        </div>
        <div className="adm-head-actions">
          {isBookingMode ? (
            <Link className="adm-btn adm-btn--ghost" href={trainingHref({ trainerId, status })}>
              ← All plans
            </Link>
          ) : (
            <Link className="adm-btn" href="/owner/training?book=1">+ Assign PT plan</Link>
          )}
        </div>
      </div>

      <p className="ptx-sub">
        Create trainer-led PT plans with member, trainer, duration, and exercises in one flow.
        These plans stay separate from regular workout assignments.
      </p>

      {currentUser.role === "admin" && gyms.length > 0 && (
        <div className="ptx-gymswitch" aria-label="Select gym">
          {gyms.map((gym) => (
            <Link
              key={gym.id}
              className={`adm-chip${gym.id === gymId ? " adm-chip--on" : ""}`}
              href={`/owner/training?gym=${gym.id}`}
            >
              {gym.name}
            </Link>
          ))}
        </div>
      )}
      {currentUser.role === "admin" && selectedGym && (
        <p className="ptx-context">Managing PT plans for <strong>{selectedGym.name}</strong>.</p>
      )}

      {isBookingMode ? (
        /* ── Focused booking form ── */
        <div className="adm-card ptx-form-card">
          <div className="adm-card__head">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar /> Assign PT plan
            </h3>
            {preselectedMember && (
              <span className="adm-inbox-tag adm-inbox-tag--ok">For {preselectedMember.fullName}</span>
            )}
          </div>
          <div className="adm-card__body">
            <p className="ptx-form-note">
              Default duration is 30 days. Add exercises here for PT only — regular workout plans are not overwritten.
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
      ) : (
        /* ── Manage view: controls (left) + plan lists (right) ── */
        <div className="ptx-manage">
          {/* LEFT — actions & controls */}
          <aside className="ptx-rail">
            <div className="ptx-rail__kpis">
              <div className="adm-kpi">
                <small>Active monthly plans</small>
                <strong>{activePtPlanCount}</strong>
              </div>
              <div className="adm-kpi">
                <small>Plans with exercises</small>
                <strong>{plansWithExercises}</strong>
              </div>
              <div className="adm-kpi">
                <small>Available trainers</small>
                <strong>{trainers.length}</strong>
              </div>
            </div>

            <Link className="adm-btn ptx-rail__cta" href="/owner/training?book=1">+ Assign PT plan</Link>

            {trainers.length > 0 && (
              <div className="ptx-rail__section">
                <span className="ptx-rail__label">Trainer</span>
                <div className="ptx-chips">
                  <Link
                    className={`adm-chip${!trainerId ? " adm-chip--on" : ""}`}
                    href={trainingHref({ memberId, status, view: viewParam })}
                  >
                    All
                  </Link>
                  {trainers.map((t) => (
                    <Link
                      key={t.id}
                      className={`adm-chip${trainerId === t.id ? " adm-chip--on" : ""}`}
                      href={trainingHref({ trainerId: t.id, memberId, status, view: viewParam })}
                    >
                      {t.fullName}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="ptx-rail__section">
              <span className="ptx-rail__label">Status</span>
              <div className="ptx-chips">
                {filterTabs.map((tab) => {
                  const count = tab.value === "all" ? sessions.length : counts[tab.value];
                  return (
                    <Link
                      key={tab.value}
                      className={`adm-chip${activeFilter === tab.value ? " adm-chip--on" : ""}`}
                      href={trainingHref({
                        status: tab.value === "all" ? undefined : tab.value,
                        trainerId,
                        memberId,
                        view: viewParam
                      })}
                    >
                      {tab.label}
                      {count != null && <span className="ptx-count">{count}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="ptx-rail__section">
              <span className="ptx-rail__label">View</span>
              <div className="ptx-seg" role="tablist" aria-label="View mode">
                <Link
                  role="tab"
                  aria-selected={!isCalendar}
                  className={`ptx-seg__btn${!isCalendar ? " is-on" : ""}`}
                  href={trainingHref({ trainerId, memberId, status })}
                >
                  List
                </Link>
                <Link
                  role="tab"
                  aria-selected={isCalendar}
                  className={`ptx-seg__btn${isCalendar ? " is-on" : ""}`}
                  href={trainingHref({ view: "calendar", trainerId, memberId, status })}
                >
                  Calendar
                </Link>
              </div>
            </div>
          </aside>

          {/* RIGHT — plan lists / info */}
          <div className="ptx-lists">
            {preselectedMember && (
              <div className="ptx-banner">
                <span>Showing plans for <strong>{preselectedMember.fullName}</strong></span>
                <Link className="ptx-banner__clear" href={trainingHref({ trainerId, status })}>
                  Clear ×
                </Link>
              </div>
            )}

            {isCalendar && filtered.length > 0 ? (
              <div className="adm-card"><div className="adm-card__body"><PTCalendarDynamic sessions={filtered} /></div></div>
            ) : filtered.length === 0 ? (
              <div className="ptx-empty">
                <Calendar />
                <p>{activeFilter === "all" ? "No PT plans yet." : `No ${activeFilter} PT plans.`}</p>
                <Link className="adm-btn adm-btn--sm" href="/owner/training?book=1">+ Assign a PT plan</Link>
              </div>
            ) : (
              grouped.map((group) => (
                <section className="ptx-group" key={group.status}>
                  <div className="ptx-group__head">
                    <span className={`status-pill ${STATUS_PILL[group.status]}`}>
                      {STATUS_LABELS[group.status]}
                    </span>
                    <span className="ptx-group__count">{group.items.length}</span>
                  </div>

                  <div className="ptx-rows">
                    {group.items.map((session) => (
                      <div className="ptx-row" key={session.id}>
                        <div className="ptx-row__info">
                          <div className="ptx-row__top">
                            <span className="ptx-row__date">{formatPlanRange(session)}</span>
                            <span className="ptx-row__dur">· {formatPlanDuration(session)}</span>
                          </div>
                          <div className="ptx-row__people">
                            <Link className="ptx-row__name" href={`/owner/members/${session.memberId}`}>
                              {session.memberName ?? session.memberId}
                            </Link>
                            <span className="ptx-row__sep">with</span>
                            <Link
                              className="ptx-row__trainer"
                              href={trainingHref({ trainerId: session.trainerId, memberId })}
                            >
                              {session.trainerName ?? session.trainerId}
                            </Link>
                          </div>
                          {session.notes && <p className="ptx-row__notes">{session.notes}</p>}
                          {session.cancelReason && (
                            <p className="ptx-row__notes ptx-row__notes--cancel">
                              Cancelled: {session.cancelReason}
                            </p>
                          )}
                        </div>

                        {(session.status === "scheduled" || session.status === "active") && (
                          <div className="ptx-row__actions">
                            {session.status === "active" && (
                              <Link className="adm-btn adm-btn--sm" href={`/owner/training/session/${session.id}`}>
                                Console →
                              </Link>
                            )}
                            <PTSessionActions
                              session={session}
                              showLiveLink={session.status === "active"}
                              trainers={trainerList}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
