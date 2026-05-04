import { AddMemberForm } from "@/components/add-member-form";
import { MemberRow } from "@/components/member-row";
import { UsersRound } from "@/components/icons";
import { getMembersWithMemberships } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const { members, memberships, isPersisted } = await getMembersWithMemberships();
  const today = new Date().toISOString().slice(0, 10);

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
        <AddMemberForm defaultStartDate={today} />
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
