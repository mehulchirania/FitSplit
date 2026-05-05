import { AddMemberForm } from "@/components/add-member-form";
import { MemberRow } from "@/components/member-row";
import { UsersRound } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { getMembers } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  await requireRole(["admin", "owner"]);

  const { members } = await getMembers();

  return (
    <main className="page">
      <section className="dashboard-header">
        <div className="header-copy">
          <p className="eyebrow">Members</p>
          <h1>Member training profiles.</h1>
          <p>
            Owners can create member profiles, edit goals, and open each record
            to review assigned workout programming.
          </p>
        </div>
        <AddMemberForm />
      </section>

      <section className="list-panel">
        <div className="panel-title">
          <h2>
            <UsersRound /> All members
          </h2>
        </div>
        {members.map((member) => (
          <MemberRow member={member} key={member.id} />
        ))}
      </section>
    </main>
  );
}
