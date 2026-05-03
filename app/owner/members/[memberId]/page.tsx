import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Dumbbell } from "@/components/icons";
import { ExerciseList } from "@/components/exercise-list";
import { StatusPill } from "@/components/status-pill";
import { formatDate, getDaysRemaining, getMembershipStatus } from "@/lib/memberships";
import {
  assignments,
  gym,
  members,
  memberships,
  programs
} from "@/lib/mock-data";

export function generateStaticParams() {
  return members.map((member) => ({
    memberId: member.id
  }));
}

export default async function MemberDetailPage({
  params
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const member = members.find((item) => item.id === memberId);

  if (!member) {
    notFound();
  }

  const membership = memberships.find((item) => item.memberId === member.id)!;
  const status = getMembershipStatus(membership, gym.expiryWarningDays);
  const assignment = assignments.find(
    (item) => item.memberId === member.id && item.status === "active"
  );
  const program = programs.find((item) => item.id === assignment?.programId);

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
        <form className="form-panel">
          <h2>Renew membership</h2>
          <div className="form-grid">
            <label>
              New start date
              <input type="date" defaultValue="2026-05-10" />
            </label>
            <label>
              Duration
              <select defaultValue="3">
                <option value="1">1 month</option>
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </select>
            </label>
          </div>
          <label>
            Offline payment reference
            <input placeholder="UPI, cash note, receipt number" />
          </label>
          <button className="button button-primary" type="button">
            Save renewal draft
          </button>
        </form>

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
            <ExerciseList items={program.days[0].exercises} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
