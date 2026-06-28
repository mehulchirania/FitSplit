"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useActionState } from "react";
import { deleteGymStaffProfile, resetPassword, updateStaffProfile } from "@/lib/firebase/actions";
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

  async function updateStaff(prevState: typeof initialFormActionState, formData: FormData) {
    const result = await updateStaffProfile(prevState, formData);
    if (result.status === "success") {
      setEditOpen(false);
      setMessage({ type: "success", text: result.message });
      router.refresh();
    } else if (result.status === "error") {
      setMessage({ type: "error", text: result.message });
    }
    return result;
  }

  const [, updateAction, isUpdatePending] = useActionState(updateStaff, initialFormActionState);

  function resetStaffPassword() {
    setMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("newPassword", "password");
      const result = await resetPassword(initialFormActionState, fd);
      setMessage({ type: result.status === "success" ? "success" : "error", text: result.message });
    });
  }

  function deleteStaff() {
    setConfirmDelete(false);
    setMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("gymId", gymId);
      const result = await deleteGymStaffProfile(initialFormActionState, fd);
      setMessage({ type: result.status === "success" ? "success" : "error", text: result.message });
      if (result.status === "success") router.refresh();
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
          <div
            aria-modal="true"
            className="adm-card"
            role="dialog"
            style={{ maxWidth: 400, width: "90vw", position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 9999 }}
          >
            <div className="adm-card__head">
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Delete {fullName}?</h3>
            </div>
            <div className="adm-card__body">
              <p style={{ fontSize: 13, color: "var(--text-soft)", marginBottom: 16, lineHeight: 1.5 }}>
                This removes their Firebase Auth login and staff profile. This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setConfirmDelete(false)} type="button">
                  Cancel
                </button>
                <button
                  className="adm-btn adm-btn--sm"
                  onClick={deleteStaff}
                  style={{ background: "var(--danger)", color: "#fff" }}
                  type="button"
                >
                  Delete
                </button>
              </div>
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
