import Link from "next/link";
import { formatDate, getMembershipStatus } from "@/lib/memberships";
import { gym } from "@/lib/mock-data";
import type { Member, Membership } from "@/types/domain";
import { StatusPill } from "./status-pill";

export function MemberRow({
  member,
  membership
}: {
  member: Member;
  membership: Membership;
}) {
  const status = getMembershipStatus(membership, gym.expiryWarningDays);

  return (
    <div className="member-row">
      <span className="avatar">{member.avatarInitials}</span>
      <div>
        <span className="member-name">{member.fullName}</span>
        <span className="member-meta">
          {member.goal} · Ends {formatDate(membership.endDate)}
        </span>
      </div>
      <StatusPill status={status} />
      <Link className="button button-secondary" href={`/owner/members/${member.id}`}>
        View
      </Link>
    </div>
  );
}
