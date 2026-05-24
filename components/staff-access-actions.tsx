"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteGymStaffProfile, resetPassword } from "@/lib/firebase/actions";
import { callArchiveStaffAccount, callResetStaffPassword } from "@/lib/firebase/functions";
import { initialFormActionState } from "@/types/action-state";

export function StaffAccessActions({
  fullName,
  gymId,
  userId
}: {
  fullName: string;
  gymId: string;
  userId: string;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

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
    <div className="quick-actions" style={{ gap: 8 }}>
      <button className="button button-secondary" disabled={isPending} onClick={resetStaffPassword} type="button">
        {isPending ? "Working..." : "Reset Password"}
      </button>
      <button className="button button-secondary" disabled={isPending} onClick={() => setConfirmDelete(true)} type="button">
        Delete
      </button>

      {confirmDelete ? (
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
      ) : null}

      {message ? <span className="sr-only" role="status">{message.text}</span> : null}
    </div>
  );
}
