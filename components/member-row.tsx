"use client";

import Link from "next/link";
import { useActionState } from "react";
import { toggleMemberAccess } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { Member } from "@/types/domain";

export function MemberRow({
  member,
  hasPlan = false
}: {
  member: Member;
  hasPlan?: boolean;
}) {
  const [, action, isPending] = useActionState(toggleMemberAccess, initialFormActionState);

  return (
    <div className="member-card-row">
      {/* Avatar */}
      <span className="mcard-avatar" aria-hidden="true">{member.avatarInitials}</span>

      {/* Identity */}
      <div className="mcard-identity">
        <div className="mcard-name-row">
          <Link className="mcard-name mcard-name-link" href={`/owner/members/${member.id}`}>{member.fullName}</Link>
          <span className={`mcard-plan-badge ${hasPlan ? "badge-has-plan" : "badge-no-plan"}`}>
            {hasPlan ? "Plan set" : "No plan"}
          </span>
          {!member.isActive && (
            <span className="mcard-plan-badge" style={{ background: "color-mix(in srgb, var(--danger) 14%, transparent)", color: "var(--danger)" }}>
              Suspended
            </span>
          )}
        </div>
        <div className="mcard-meta">
          {member.username && <span className="mcard-username">@{member.username}</span>}
          {member.goal && <span className="mcard-goal">{member.goal}</span>}
          {member.phone && (
            <a
              className="mcard-phone"
              href={`tel:${member.phone}`}
              onClick={(e) => e.stopPropagation()}
            >
              {member.phone}
            </a>
          )}
          <span className="mcard-joined">Joined {member.joinedAt}</span>
        </div>
      </div>

      {/* Actions — no confirm modal, direct submit for speed */}
      <div className="mcard-actions">
        <form action={action} style={{ display: "contents" }}>
          <input name="memberId" type="hidden" value={member.id} />
          <input name="isActive" type="hidden" value={(!member.isActive).toString()} />
          <button
            className={`mcard-toggle ${member.isActive ? "mcard-toggle-suspend" : "mcard-toggle-restore"}`}
            disabled={isPending}
            title={member.isActive ? "Suspend access" : "Restore access"}
            type="submit"
          >
            {isPending ? "…" : member.isActive ? "Suspend" : "Restore"}
          </button>
        </form>
      </div>
    </div>
  );
}
