"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useActionState, useEffect } from "react";
import { deleteGymStaffProfile, resetPassword, updateStaffProfile } from "@/lib/firebase/actions";
import { callArchiveStaffAccount, callResetStaffPassword } from "@/lib/firebase/functions";
import { initialFormActionState } from "@/types/action-state";

type StaffType = "owner" | "trainer" | "staff";

export function StaffAccessActions({
  fullName,
  gymId,
  userId,
  phone = "",
  staffType = "owner",
}: {
  fullName: string;
  gymId: string;
  userId: string;
  phone?: string;
  staffType?: StaffType;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Edit form state
  const [editName, setEditName] = useState(fullName);
  const [editPhone, setEditPhone] = useState(phone);
  const [editRole, setEditRole] = useState<StaffType>(staffType);

  const [updateState, updateAction, isUpdatePending] = useActionState(updateStaffProfile, initialFormActionState);

  useEffect(() => {
    if (updateState.status === "success") {
      setEditOpen(false);
      setMessage({ type: "success", text: updateState.message });
      router.refresh();
    } else if (updateState.status === "error") {
      setMessage({ type: "error", text: updateState.message });
    }
  }, [updateState, router]);

  function resetStaffPassword() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await callResetStaffPassword({ userId, password: "password" });
        setMessage({ type: "success", text: result.data.message });
      } catch {
        const fd = new FormData();
        fd.set("userId", userId);
        fd.set("newPassword", "password");
        const result = await resetPassword(initialFormActionState, fd);
        setMessage({ type: result.status === "success" ? "success" : "error", text: result.message });
      }
    });
  }

  function deleteStaff() {
    setConfirmDelete(false);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await callArchiveStaffAccount({ gymId, userId });
        setMessage({ type: "success", text: result.data.message });
        router.refresh();
      } catch {
        const fd = new FormData();
        fd.set("userId", userId);
        fd.set("gymId", gymId);
        const result = await deleteGymStaffProfile(initialFormActionState, fd);
        setMessage({ type: result.status === "success" ? "success" : "error", text: result.message });
        if (result.status === "success") router.refresh();
      }
    });
  }

  return (
    <div>
      {/* Action buttons row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          className="adm-btn adm-btn--ghost adm-btn--sm"
          disabled={isPending || isUpdatePending}
          onClick={() => { setEditOpen((o) => !o); setMessage(null); }}
          type="button"
        >
          {editOpen ? "Cancel" : "Edit"}
        </button>
        <button
          className="adm-btn adm-btn--ghost adm-btn--sm"
          disabled={isPending || isUpdatePending}
          onClick={resetStaffPassword}
          type="button"
        >
          {isPending ? "Working…" : "Reset password"}
        </button>
        <button
          className="adm-btn adm-btn--ghost adm-btn--sm"
          style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 30%, transparent)" }}
          disabled={isPending || isUpdatePending}
          onClick={() => setConfirmDelete(true)}
          type="button"
        >
          Delete
        </button>
      </div>

      {/* Inline edit form */}
      {editOpen && (
        <form
          action={updateAction}
          style={{
            marginTop: 10,
            padding: "14px 16px",
            background: "var(--bg-subtle)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px 12px",
          }}
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="gymId" value={gymId} />

          <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "span 2" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Full name</span>
            <input
              name="fullName"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              style={{
                padding: "7px 10px",
                fontSize: 13,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Phone / username</span>
            <input
              name="phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              required
              style={{
                padding: "7px 10px",
                fontSize: 13,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Role</span>
            <select
              name="staffType"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as StaffType)}
              style={{
                padding: "7px 10px",
                fontSize: 13,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                appearance: "none",
              }}
            >
              <option value="owner">Owner</option>
              <option value="trainer">Trainer</option>
              <option value="staff">Staff</option>
            </select>
          </label>

          <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              className="adm-btn adm-btn--sm"
              disabled={isUpdatePending}
            >
              {isUpdatePending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="dialog-backdrop" role="presentation">
          <div aria-modal="true" className="confirm-dialog" role="dialog">
            <h2>Delete gym staff?</h2>
            <p>Delete {fullName}? This removes their Firebase Auth login and staff profile.</p>
            <div className="quick-actions">
              <button className="button button-secondary" onClick={() => setConfirmDelete(false)} type="button">
                Cancel
              </button>
              <button className="button button-danger" onClick={deleteStaff} type="button">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status message */}
      {message && (
        <p
          style={{
            marginTop: 6,
            fontSize: 12,
            color: message.type === "success" ? "var(--brand)" : "var(--danger)",
            fontWeight: 600,
          }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
