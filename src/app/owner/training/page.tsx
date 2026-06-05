import Link from "next/link";
import { Calendar } from "@/components/icons";
import { PTBookingForm } from "@/components/pt-booking-form";
import { PTSessionsTable } from "@/components/pt-sessions-table";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  getAllPTSessionsForGym,
  getExerciseCatalog,
  getGymWorkspaces,
  getMembers,
  getTrainersForGym
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function OwnerTrainingPage({
  searchParams
}: {
  searchParams: Promise<{ gym?: string; memberId?: string; book?: string }>;
}) {
  const currentUser = await requireRole(["admin", "owner"]);
  const { gym: gymParam, memberId, book } = await searchParams;
  const isBookingMode = book === "1" || book === "true";

  const { gyms } = currentUser.role === "admin" ? await getGymWorkspaces() : { gyms: [] };
  const gymId = currentUser.role === "admin"
    ? (gymParam ?? currentUser.gymId ?? gyms[0]?.id ?? PRIMARY_GYM_ID)
    : (currentUser.gymId ?? PRIMARY_GYM_ID);
  const selectedGym = gyms.find((g) => g.id === gymId);

  const [sessions, { members }, trainers, { exercises }] = await Promise.all([
    getAllPTSessionsForGym(gymId),
    getMembers(gymId),
    getTrainersForGym(gymId),
    getExerciseCatalog(gymId)
  ]);

  const activePtPlanCount = sessions.filter((s) => s.status === "scheduled" || s.status === "active").length;
  const plansWithExercises = sessions.filter((s) => s.plannedExercises?.length).length;

  const memberFiltered = memberId
    ? sessions.filter((s) => s.memberId === memberId)
    : sessions;

  const trainerList = trainers.map((t) => ({ id: t.id, fullName: t.fullName }));
  const preselectedMember = memberId ? members.find((m) => m.id === memberId) : null;

  return (
    <div className="odp2-scroll">
      {/* ── Header ── */}
      <div className="adm-page-head" style={{ marginBottom: 4 }}>
        <div>
          <div className="adm-crumb">Dashboard / Training</div>
          <h1 className="adm-title">{isBookingMode ? "Assign a PT plan" : "Personal training"}</h1>
        </div>
        <div className="adm-head-actions">
          {isBookingMode ? (
            <Link className="adm-btn adm-btn--ghost" href="/owner/training">← All plans</Link>
          ) : (
            <Link className="adm-btn" href="/owner/training?book=1">+ Assign PT plan</Link>
          )}
        </div>
      </div>

      {/* Admin gym switcher */}
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
        /* ── Booking form ── */
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
            />
          </div>
        </div>
      ) : (
        /* ── Table view ── */
        <PTSessionsTable
          sessions={memberFiltered}
          trainers={trainerList}
          gymId={gymId}
          activePtPlanCount={activePtPlanCount}
          plansWithExercises={plansWithExercises}
          memberFilter={memberId}
        />
      )}
    </div>
  );
}
