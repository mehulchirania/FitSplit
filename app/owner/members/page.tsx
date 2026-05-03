import { MemberRow } from "@/components/member-row";
import { UsersRound } from "@/components/icons";
import { createMemberWithMembership } from "@/lib/firebase/actions";
import { getMembersWithMemberships } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const { members, memberships, isPersisted } = await getMembersWithMemberships();

  return (
    <main className="page">
      <section className="dashboard-header">
        <div className="header-copy">
          <p className="eyebrow">Members</p>
          <h1>Memberships at a glance.</h1>
          <p>
            Owners can scan member status, renew plans after offline payment,
            and open a member record for program assignment.
          </p>
          <span className={`status-pill ${isPersisted ? "status-active" : "status-neutral"}`}>
            {isPersisted ? "Reading from Firestore" : "Using mock seed data"}
          </span>
        </div>
        <form action={createMemberWithMembership} className="form-panel">
          <h2>Add member</h2>
          <div className="form-grid">
            <label>
              Full name
              <input name="fullName" placeholder="Member name" />
            </label>
            <label>
              Email
              <input name="email" placeholder="member@example.com" type="email" />
            </label>
            <label>
              Phone
              <input name="phone" placeholder="+91 ..." />
            </label>
            <label>
              Goal
              <input name="goal" placeholder="Build muscle, fat loss, strength" />
            </label>
            <label>
              Start date
              <input name="startDate" type="date" defaultValue="2026-05-04" />
            </label>
            <label>
              Duration
              <select name="durationMonths" defaultValue="3">
                <option value="1">1 month</option>
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </select>
            </label>
            <label>
              Payment reference
              <input name="paymentReference" placeholder="UPI, cash, receipt" />
            </label>
          </div>
          <button className="button button-primary" type="submit">
            Save member to Firebase
          </button>
        </form>
      </section>

      <section className="list-panel">
        <div className="panel-title">
          <h2>
            <UsersRound /> All members
          </h2>
        </div>
        {members.map((member) => {
          const membership = memberships.find((item) => item.memberId === member.id);
          if (!membership) {
            return null;
          }
          return <MemberRow member={member} membership={membership} key={member.id} />;
        })}
      </section>
    </main>
  );
}
