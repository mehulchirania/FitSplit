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

      {/* ── Modern Member Table ── */}
      <div className="bml-table-container">
        <table className="bml-table">
          <thead>
            <tr>
              <th className="bml-th-check">
                <label className="bml-check-cell" aria-label="Select all">
                  <input checked={allSelected} onChange={toggleAll} type="checkbox" />
                </label>
              </th>
              <th className="bml-th-member">Member</th>
              <th className="bml-th-status">Access</th>
              <th className="bml-th-plan">Workout Plan</th>
              <th className="bml-th-joined">Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isSelected = selected.has(member.id);
              const hasPlan = assignedIds.has(member.id);
              return (
                <tr
                  className={`bml-tr ${isSelected ? "bml-tr--selected" : ""}`}
                  key={member.id}
                  onClick={(e) => {
                    // if they didn't click a link or checkbox, toggle selection
                    if (
                      (e.target as HTMLElement).tagName !== "A" &&
                      (e.target as HTMLElement).tagName !== "INPUT"
                    ) {
                      toggleOne(member.id);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <td className="bml-td-check" onClick={(e) => e.stopPropagation()}>
                    <label className="bml-check-cell" aria-label={`Select ${member.fullName}`}>
                      <input
                        checked={isSelected}
                        onChange={() => toggleOne(member.id)}
                        type="checkbox"
                      />
                    </label>
                  </td>
                  
                  <td className="bml-td-member">
                    <div className="bml-member-profile">
                      <span className="mcard-avatar" aria-hidden="true">{member.avatarInitials}</span>
                      <div className="bml-member-info">
                        <Link className="bml-member-name" href={`/owner/members/${member.id}`} onClick={(e) => e.stopPropagation()}>
                          {member.fullName}
                        </Link>
                        {member.username && (
                          <span className="bml-member-username">
                            {member.username.includes("@") ? member.username : `@${member.username}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="bml-td-status">
                    <span className={`status-pill ${member.isActive ? "status-active" : "status-inactive"}`} style={{ fontSize: "0.72rem" }}>
                      {member.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>

                  <td className="bml-td-plan">
                    <span className={`mcard-plan-badge ${hasPlan ? "badge-has-plan" : "badge-no-plan"}`}>
                      {hasPlan ? "Assigned" : "No plan"}
                    </span>
                  </td>

                  <td className="bml-td-joined">
                    <span className="bml-joined-date">{member.joinedAt}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {members.length === 0 && (
          <div className="bml-empty-state">
            <p>No members found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
