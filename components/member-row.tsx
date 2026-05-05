import Link from "next/link";
import type { Member } from "@/types/domain";

export function MemberRow({
  member
}: {
  member: Member;
}) {
  return (
    <div className="member-row">
      <span className="avatar">{member.avatarInitials}</span>
      <div>
        <span className="member-name">{member.fullName}</span>
        <span className="member-meta">
          {member.goal}
        </span>
      </div>
      <span className={`status-pill ${member.isActive ? "status-active" : "status-expired"}`}>
        {member.isActive ? "Active profile" : "Suspended"}
      </span>
      <Link className="button button-secondary" href={`/owner/members/${member.id}`}>
        Edit
      </Link>
    </div>
  );
}
