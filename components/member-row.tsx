"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toggleMemberAccess } from "@/lib/firebase/actions";
import { callToggleMemberAccess } from "@/lib/firebase/functions";
import { initialFormActionState } from "@/types/action-state";
import type { Member } from "@/types/domain";

export function MemberRow({
  member,
  hasPlan = false
}: {
  member: Member;
  hasPlan?: boolean;
}) {
  const [isActive, setIsActive] = useState(member.isActive);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsActive(member.isActive);
  }, [member.isActive]);

  function updateAccess() {
    const next = !isActive;
    const previous = isActive;
    setFeedback("");
    setIsActive(next);

    startTransition(async () => {
      try {
        await callToggleMemberAccess({ memberId: member.id, isActive: next });
        setFeedback(next ? "Access restored." : "Access suspended.");
      } catch {
        const fd = new FormData();
        fd.set("memberId", member.id);
        fd.set("isActive", String(next));
        const result = await toggleMemberAccess(initialFormActionState, fd);
        if (result.status === "error") {
          setIsActive(previous);
        }
        setFeedback(result.message);
      }
    });
  }

  return (
    <div className="member-card-row">
      <span className="mcard-avatar" aria-hidden="true">{member.avatarInitials}</span>

      <div className="mcard-identity">
        <div className="mcard-name-row">
          <Link className="mcard-name mcard-name-link" href={`/owner/members/${member.id}`}>{member.fullName}</Link>
          <span className={`mcard-plan-badge ${hasPlan ? "badge-has-plan" : "badge-no-plan"}`}>
            {hasPlan ? "Plan set" : "No plan"}
          </span>
          {!isActive && (
            <span className="mcard-plan-badge" style={{ background: "color-mix(in srgb, var(--danger) 14%, transparent)", color: "var(--danger)" }}>
              Suspended
            </span>
          )}
        </div>
        <div className="mcard-meta">
          {member.username && <span className="mcard-username">{member.username.includes("@") ? member.username : `@${member.username}`}</span>}
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

      <div className="mcard-actions">
        <button
          aria-pressed={isActive}
          className={`mcard-toggle ${isActive ? "mcard-toggle-suspend" : "mcard-toggle-restore"}`}
          disabled={isPending}
          onClick={updateAccess}
          title={isActive ? "Suspend access" : "Restore access"}
          type="button"
        >
          {isPending ? "..." : isActive ? "Suspend" : "Restore"}
        </button>
        {feedback ? <span className="sr-only" role="status">{feedback}</span> : null}
      </div>
    </div>
  );
}
