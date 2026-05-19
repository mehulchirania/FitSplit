import { AddMemberForm } from "@/components/add-member-form";
import { Breadcrumb } from "@/components/breadcrumb";
import { MemberRow } from "@/components/member-row";
import { Activity, Bell, Dumbbell, UsersRound } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { getActiveProgramAssignments, getMembers } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

type SortKey = "name" | "newest" | "oldest" | "active" | "inactive";
type FilterKey = "all" | "plan" | "no-plan";

const sortOptions: { label: string; value: SortKey }[] = [
  { label: "Name A–Z",      value: "name"     },
  { label: "Newest",        value: "newest"   },
  { label: "Oldest",        value: "oldest"   },
  { label: "Active first",  value: "active"   },
  { label: "Inactive first",value: "inactive" },
];

function sortMembers(
  members: Awaited<ReturnType<typeof getMembers>>["members"],
  sort: SortKey
) {
  return [...members].sort((a, b) => {
    switch (sort) {
      case "newest":   return b.joinedAt.localeCompare(a.joinedAt);
      case "oldest":   return a.joinedAt.localeCompare(b.joinedAt);
      case "active":   return Number(b.isActive) - Number(a.isActive) || a.fullName.localeCompare(b.fullName);
      case "inactive": return Number(a.isActive) - Number(b.isActive) || a.fullName.localeCompare(b.fullName);
      default:         return a.fullName.localeCompare(b.fullName);
    }
  });
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; filter?: string }>;
}) {
  const currentUser = await requireRole(["admin", "owner"]);

  const [{ members }, { assignments }] = await Promise.all([
    getMembers(currentUser.gymId),
    getActiveProgramAssignments(currentUser.gymId),
  ]);

  const { sort: rawSort = "name", filter: rawFilter = "all" } = await searchParams;
  const sort   = (sortOptions.some((o) => o.value === rawSort)   ? rawSort   : "name")    as SortKey;
  const filter = (["all", "plan", "no-plan"].includes(rawFilter) ? rawFilter : "all") as FilterKey;

  const assignedIds = new Set(assignments.map((a) => a.memberId));

  const totalCount    = members.length;
  const activeCount   = members.filter((m) => m.isActive).length;
  const withPlanCount = members.filter((m) => assignedIds.has(m.id)).length;
  const noPlanCount   = totalCount - withPlanCount;

  const filtered =
    filter === "plan"    ? members.filter((m) =>  assignedIds.has(m.id)) :
    filter === "no-plan" ? members.filter((m) => !assignedIds.has(m.id)) :
    members;

  const sorted = sortMembers(filtered, sort);

  function href(f: FilterKey, s: SortKey) {
    return `/owner/members?filter=${f}&sort=${s}`;
  }

  return (
    <main className="page">
      {/* ── Header ── */}
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Dashboard", href: "/owner" }, { label: "Members" }]} />
          <h1>Member profiles.</h1>
          <p>
            Create profiles, assign workout programs, and manage gym access — all from one place.
          </p>
          {/* Quick-glance stats */}
          <div className="ui-cards" style={{ marginTop: 16, gap: 10 }}>
            <article className="ui-card blue">
              <p className="tip"><UsersRound /> {totalCount}</p>
              <p className="second-text">Total</p>
            </article>
            <article className="ui-card green">
              <p className="tip"><Activity /> {activeCount}</p>
              <p className="second-text">Active</p>
            </article>
            <article className="ui-card purple">
              <p className="tip"><Dumbbell /> {withPlanCount}</p>
              <p className="second-text">Has plan</p>
            </article>
            <article className="ui-card red">
              <p className="tip"><Bell /> {noPlanCount}</p>
              <p className="second-text">No plan</p>
            </article>
          </div>
        </div>
        <AddMemberForm />
      </section>

      {/* ── Filter + Sort bar ── */}
      <div className="members-filter-bar">
        {/* Filter tabs */}
        <nav className="members-filter-tabs" aria-label="Filter members">
          <a
            className={filter === "all" ? "is-selected" : ""}
            href={href("all", sort)}
          >
            All
            <span className="ftab-count">{totalCount}</span>
          </a>
          <a
            className={filter === "plan" ? "is-selected" : ""}
            href={href("plan", sort)}
          >
            Has plan
            <span className="ftab-count">{withPlanCount}</span>
          </a>
          <a
            className={filter === "no-plan" ? "is-selected" : ""}
            href={href("no-plan", sort)}
          >
            Needs plan
            <span className={`ftab-count ${noPlanCount > 0 ? "ftab-alert" : ""}`}>
              {noPlanCount}
            </span>
          </a>
        </nav>

        {/* Sort tabs */}
        <div className="sort-tabs" aria-label="Sort members">
          {sortOptions.map((opt) => (
            <a
              className={sort === opt.value ? "is-selected" : ""}
              href={href(filter, opt.value)}
              key={opt.value}
            >
              {opt.label}
            </a>
          ))}
        </div>
      </div>

      {/* ── Member list ── */}
      <section className="list-panel" style={{ padding: 0 }}>
        <div className="panel-title" style={{ padding: "14px 20px 12px" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UsersRound />
            {filter === "all"     ? "All members"      :
             filter === "plan"    ? "Members with plan" :
                                    "Members needing a plan"}
            <span className="status-pill status-neutral" style={{ fontSize: "0.72rem" }}>
              {sorted.length}
            </span>
          </h2>
        </div>

        {sorted.length === 0 ? (
          <p style={{ color: "var(--text-soft)", fontSize: "0.88rem", padding: "24px 20px", textAlign: "center" }}>
            {filter === "no-plan"
              ? "All members have a program assigned."
              : "No members found."}
          </p>
        ) : (
          sorted.map((member) => (
            <MemberRow
              hasPlan={assignedIds.has(member.id)}
              key={member.id}
              member={member}
            />
          ))
        )}
      </section>
    </main>
  );
}
