"use client";

import Link from "next/link";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { toggleMemberAccess } from "@/lib/firebase/actions";
import type { Member } from "@/types/domain";

export function MemberRow({ member }: { member: Member }) {
  return (
    <div className="member-row">
      <span className="avatar">{member.avatarInitials}</span>

      <div className="member-row-info">
        <span className="member-name">{member.fullName}</span>
        <span className="member-meta member-row-meta">
          <span className="member-row-goal">{member.goal}</span>
          {member.phone && (
            <a
              className="member-row-phone"
              href={`tel:${member.phone}`}
              onClick={(e) => e.stopPropagation()}
            >
              {member.phone}
            </a>
          )}
          <span className="member-row-joined">Joined {member.joinedAt}</span>
        </span>
      </div>

      <span
        className={`status-pill ${member.isActive ? "status-active" : "status-inactive"}`}
        aria-label={member.isActive ? "Active member" : "Inactive member"}
      >
        {member.isActive ? "Active" : "Inactive"}
      </span>

      <ConfirmActionForm
        action={toggleMemberAccess}
        className="member-access-inline"
        confirmMessage={
          member.isActive
            ? "This will disable the member's login access."
            : "This will re-enable the member's login access."
        }
        confirmTitle={member.isActive ? "Suspend access?" : "Restore access?"}
        pendingLabel="Updating..."
        submitClassName={`access-toggle member-row-toggle ${member.isActive ? "is-on" : "is-off"}`}
        submitLabel={member.isActive ? "Suspend" : "Restore"}
      >
        <input name="memberId" type="hidden" value={member.id} />
        <input name="isActive" type="hidden" value={(!member.isActive).toString()} />
      </ConfirmActionForm>

      <Link className="button button-secondary" href={`/owner/members/${member.id}`}>
        View
      </Link>
    </div>
  );
}
