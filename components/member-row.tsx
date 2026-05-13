import Link from "next/link";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { toggleMemberAccess } from "@/lib/firebase/actions";
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
      <ConfirmActionForm
        action={toggleMemberAccess}
        className="member-access-inline"
        confirmMessage={
          member.isActive
            ? "This will disable the member's login access."
            : "This will re-enable the member's login access."
        }
        confirmTitle={member.isActive ? "Make member inactive?" : "Make member active?"}
        pendingLabel="Updating..."
        submitClassName={`access-toggle member-row-toggle ${member.isActive ? "is-on" : "is-off"}`}
        submitLabel={member.isActive ? "Active" : "Inactive"}
      >
        <input name="memberId" type="hidden" value={member.id} />
        <input name="isActive" type="hidden" value={(!member.isActive).toString()} />
      </ConfirmActionForm>
      <Link className="button button-secondary" href={`/owner/members/${member.id}`}>
        Edit
      </Link>
    </div>
  );
}
