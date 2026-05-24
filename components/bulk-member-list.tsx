"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { bulkAssignProgram, bulkToggleMemberAccess } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { Member, WorkoutProgram } from "@/types/domain";

type RowMember = Pick<
  Member,
  "id" | "fullName" | "avatarInitials" | "isActive" | "username" | "goal" | "phone" | "joinedAt"
>;

export function BulkMemberList({
  members,
  assignedIds,
  programs
}: {
  members: RowMember[];
  assignedIds: Set<string>;
  programs: Pick<WorkoutProgram, "id" | "title">[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"assign" | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState(programs[0]?.id ?? "");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const allSelected = members.length > 0 && selected.size === members.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(members.map((m) => m.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    setBulkAction(null);
    setFeedback(null);
  }

  function executeBulk(action: "assign" | "suspend" | "restore") {
    const memberIds = JSON.stringify(Array.from(selected));
    startTransition(async () => {
      const fd = new FormData();
      fd.set("memberIds", memberIds);
      let result;
      if (action === "assign") {
        const prog = programs.find((p) => p.id === selectedProgramId);
        fd.set("programId", selectedProgramId);
        fd.set("programTitle", prog?.title ?? "");
        result = await bulkAssignProgram(initialFormActionState, fd);
      } else {
        fd.set("isActive", action === "restore" ? "true" : "false");
        result = await bulkToggleMemberAccess(initialFormActionState, fd);
      }
      setFeedback({ type: result.status === "success" ? "success" : "error", msg: result.message });
      if (result.status === "success") {
        setSelected(new Set());
        setBulkAction(null);
      }
    });
  }

  return (
    <div className="bml-root">
      {/* ── Sticky action bar ── */}
      {selected.size > 0 && (
        <div className="bml-action-bar" role="toolbar" aria-label="Bulk actions">
          <span className="bml-count">{selected.size} selected</span>

          {bulkAction === null && (
            <div className="bml-actions">
              <button
                className="button button-primary bml-btn"
                disabled={isPending}
                onClick={() => setBulkAction("assign")}
                type="button"
              >
                Assign program
              </button>
              <button
                className="button button-secondary bml-btn"
                disabled={isPending}
                onClick={() => executeBulk("restore")}
                type="button"
              >
                Restore access
              </button>
              <button
                className="button button-danger-ghost bml-btn"
                disabled={isPending}
                onClick={() => executeBulk("suspend")}
                type="button"
              >
                Suspend
              </button>
              <button
                className="button button-secondary bml-btn"
                disabled={isPending}
                onClick={clearSelection}
                type="button"
              >
                Clear
              </button>
            </div>
          )}

          {bulkAction === "assign" && (
            <div className="bml-assign-row">
              <select
                className="bml-program-select"
                disabled={isPending}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                value={selectedProgramId}
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <button
                className="button button-primary bml-btn"
                disabled={isPending || !selectedProgramId}
                onClick={() => executeBulk("assign")}
                type="button"
              >
                {isPending ? "Assigning..." : `Assign to ${selected.size}`}
              </button>
              <button
                className="button button-secondary bml-btn"
                disabled={isPending}
                onClick={() => setBulkAction(null)}
                type="button"
              >
                Cancel
              </button>
            </div>
          )}

          {feedback && (
            <span
              className={`bml-feedback ${feedback.type === "success" ? "bml-feedback--success" : "bml-feedback--error"}`}
              role="status"
            >
              {feedback.msg}
            </span>
          )}
        </div>
      )}

      {/* ── Column header ── */}
      <div className="bml-header-row">
        <label className="bml-check-cell" aria-label="Select all">
          <input
            checked={allSelected}
            onChange={toggleAll}
            type="checkbox"
          />
        </label>
        <span className="bml-col-name">Member</span>
        <span className="bml-col-plan">Plan</span>
        <span className="bml-col-status">Status</span>
      </div>

      {/* ── Member rows ── */}
      {members.map((member) => {
        const isSelected = selected.has(member.id);
        const hasPlan = assignedIds.has(member.id);
        return (
          <div
            className={`member-card-row bml-row ${isSelected ? "bml-row--selected" : ""}`}
            key={member.id}
          >
            <label className="bml-check-cell" aria-label={`Select ${member.fullName}`}>
              <input
                checked={isSelected}
                onChange={() => toggleOne(member.id)}
                type="checkbox"
              />
            </label>

            <span className="mcard-avatar" aria-hidden="true">{member.avatarInitials}</span>

            <div className="mcard-identity">
              <div className="mcard-name-row">
                <Link className="mcard-name mcard-name-link" href={`/owner/members/${member.id}`}>
                  {member.fullName}
                </Link>
                {!member.isActive && (
                  <span className="mcard-plan-badge" style={{ background: "color-mix(in srgb, var(--danger) 14%, transparent)", color: "var(--danger)" }}>
                    Suspended
                  </span>
                )}
              </div>
              <div className="mcard-meta">
                {member.username && (
                  <span className="mcard-username">
                    {member.username.includes("@") ? member.username : `@${member.username}`}
                  </span>
                )}
                {member.goal && <span className="mcard-goal">{member.goal}</span>}
                <span className="mcard-joined">Joined {member.joinedAt}</span>
              </div>
            </div>

            <span className={`mcard-plan-badge ${hasPlan ? "badge-has-plan" : "badge-no-plan"}`}>
              {hasPlan ? "Plan set" : "No plan"}
            </span>

            <span className={`status-pill ${member.isActive ? "status-active" : "status-inactive"}`} style={{ fontSize: "0.72rem" }}>
              {member.isActive ? "Active" : "Suspended"}
            </span>
          </div>
        );
      })}

      {members.length === 0 && (
        <p style={{ color: "var(--text-soft)", fontSize: "0.88rem", padding: "24px 20px", textAlign: "center" }}>
          No members found.
        </p>
      )}
    </div>
  );
}
