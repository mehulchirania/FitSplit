import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { CalendarDays, Dumbbell } from "@/components/icons";
import { ExerciseList } from "@/components/exercise-list";
import { StatusPill } from "@/components/status-pill";
import { renewMemberMembership, updateMemberProfile } from "@/lib/firebase/actions";
import {
  getExerciseCatalog,
  getMemberDetail,
  getProgramAssignmentForMember,
  getTitanWorkspace,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";
import { formatDate, getDaysRemaining, getMembershipStatus } from "@/lib/memberships";

export const dynamic = "force-dynamic";

function getNextDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return date.toISOString().slice(0, 10);
}

export default async function MemberDetailPage({
  params
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const [
    { member, membership, isPersisted },
    { gym },
    { assignment },
    { programs },
    { exercises }
  ] = await Promise.all([
    getMemberDetail(memberId),
    getTitanWorkspace(),
    getProgramAssignmentForMember(memberId),
    getWorkoutPrograms(),
    getExerciseCatalog()
  ]);

  if (!member || !membership) {
    notFound();
  }

  const status = getMembershipStatus(membership, gym.expiryWarningDays);
  const program = programs.find((item) => item.id === assignment?.programId);
  const nextStartDate = getNextDate(membership.endDate);

  return (
    <main className="page">
      <section className="dashboard-header">
        <div className="header-copy">
          <p className="eyebrow">Member record</p>
          <h1>{member.fullName}</h1>
          <p>
            {member.goal}. Use this workspace to renew membership windows,
            review assigned training, and prepare the future AI draft flow.
          </p>
          <div className="quick-actions">
            <Link className="button button-primary" href="/owner/members">
              Back to members
            </Link>
            <Link className="button button-secondary" href="/owner/programs">
              Assign program
            </Link>
            <span className={`status-pill ${isPersisted ? "status-active" : "status-neutral"}`}>
              {isPersisted ? "Reading from Firestore" : "Using mock seed data"}
            </span>
          </div>
        </div>

        <aside className="summary-panel">
          <div className="panel-title">
            <h2>
              <CalendarDays /> Membership
            </h2>
            <StatusPill status={status} />
          </div>
          <div className="membership-window">
            <span>
              Starts
              <strong>{formatDate(membership.startDate)}</strong>
            </span>
            <span>
              Ends
              <strong>{formatDate(membership.endDate)}</strong>
            </span>
            <span>
              Days remaining
              <strong>{getDaysRemaining(membership.endDate)}</strong>
            </span>
            <span>
              Payment ref
              <strong>{membership.paymentReference}</strong>
            </span>
          </div>
        </aside>
      </section>

      <section className="content-grid">
        <ConfirmActionForm
          action={updateMemberProfile}
          className="form-panel"
          confirmMessage="This will update the member profile information visible to the owner and member."
          confirmTitle="Save member edits?"
          pendingLabel="Saving details..."
          submitLabel="Save member details"
        >
          <h2>Edit member</h2>
          <input name="memberId" type="hidden" value={member.id} />
          <div className="form-grid">
            <label>
              Full name
              <input name="fullName" defaultValue={member.fullName} required />
            </label>
            <label>
              Email
              <input name="email" type="email" defaultValue={member.email} required />
            </label>
            <label>
              Phone
              <input name="phone" defaultValue={member.phone} />
            </label>
            <label>
              Goal
              <input name="goal" defaultValue={member.goal} />
            </label>
          </div>
        </ConfirmActionForm>

        <ConfirmActionForm
          action={renewMemberMembership}
          className="form-panel"
          confirmMessage="This will create a new renewal record and notify the member."
          confirmTitle="Confirm membership renewal?"
          pendingLabel="Saving renewal..."
          submitLabel="Save renewal"
        >
          <h2>Renew membership</h2>
          <input name="memberId" type="hidden" value={member.id} />
          <div className="form-grid">
            <label>
              New start date
              <input name="startDate" type="date" defaultValue={nextStartDate} required />
            </label>
            <label>
              Duration
              <select name="durationMonths" defaultValue="3" required>
                <option value="1">1 month</option>
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </select>
            </label>
          </div>
          <label>
            Offline payment reference
            <input name="paymentReference" placeholder="UPI, cash note, receipt number" />
          </label>
        </ConfirmActionForm>
      </section>

      <section className="content-grid" style={{ marginTop: 16 }}>
        <aside className="form-panel">
          <h2>AI program brief</h2>
          <label>
            Goals and constraints
            <textarea defaultValue={`${member.goal}. 3 days per week. No injuries reported.`} />
          </label>
          <button className="button button-secondary" type="button">
            Generate draft later
          </button>
        </aside>
      </section>

      {program ? (
        <section className="list-panel" style={{ marginTop: 16 }}>
          <div className="panel-title">
            <h2>
              <Dumbbell /> Assigned program
            </h2>
            <span className="status-pill status-neutral">{program.title}</span>
          </div>
          <div className="notification-list">
            <ExerciseList exercises={exercises} items={program.days[0].exercises} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
