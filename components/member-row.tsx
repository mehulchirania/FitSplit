import Link from "next/link";
import { formatDate, getMembershipStatus } from "@/lib/memberships";
import type { Member, Membership } from "@/types/domain";
import { StatusPill } from "./status-pill";

export function MemberRow({
  member,
  membership,
  warningDays = 7
}: {
  member: Member;
  membership: Membership;
  warningDays?: number;
}) {
  const status = getMembershipStatus(membership, warningDays);

  return (
    <div className="member-row">
      <span className="avatar">{member.avatarInitials}</span>
      <div>
        <span className="member-name">{member.fullName}</span>
        <span className="member-meta">
          {member.goal} - Ends {formatDate(membership.endDate)}
        </span>
      </div>
      <StatusPill status={status} />
      <Link className="button button-secondary" href={`/owner/members/${member.id}`}>
        Edit
      </Link>
    </div>
  );
}
