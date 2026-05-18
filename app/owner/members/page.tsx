import { AddMemberForm } from "@/components/add-member-form";
import { MemberRow } from "@/components/member-row";
import { UsersRound } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { getMembers } from "@/lib/firebase/read-models";


export const dynamic = "force-dynamic";

const sortOptions = [
  { label: "Name A-Z", value: "name" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Active first", value: "active" },
  { label: "Inactive first", value: "inactive" }
] as const;

function sortMembers(members: Awaited<ReturnType<typeof getMembers>>["members"], sort: string) {
  return [...members].sort((left, right) => {
    if (sort === "newest") {
      return right.joinedAt.localeCompare(left.joinedAt);
    }

    if (sort === "oldest") {
      return left.joinedAt.localeCompare(right.joinedAt);
    }

    if (sort === "active") {
      return Number(right.isActive) - Number(left.isActive) || left.fullName.localeCompare(right.fullName);
    }

    if (sort === "inactive") {
      return Number(left.isActive) - Number(right.isActive) || left.fullName.localeCompare(right.fullName);
    }

    return left.fullName.localeCompare(right.fullName);
  });
}

export default async function MembersPage({
  searchParams
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const currentUser = await requireRole(["admin", "owner"]);

  const { members } = await getMembers(currentUser.gymId);
  const { sort = "name" } = await searchParams;
  const sortedMembers = sortMembers(members, sort);

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
            <span className="status-pill status-neutral" style={{ marginLeft: 8, fontSize: "0.72rem" }}>
              {sortedMembers.length}
            </span>
          </h2>
          <div className="sort-tabs" aria-label="Sort members">
            {sortOptions.map((option) => (
              <a
                className={sort === option.value ? "is-selected" : ""}
                href={`/owner/members?sort=${option.value}`}
                key={option.value}
              >
                {option.label}
              </a>
            ))}
          </div>
        </div>
        {sortedMembers.map((member) => (
          <MemberRow member={member} key={member.id} />
        ))}
      </section>
    </main>
  );
}
