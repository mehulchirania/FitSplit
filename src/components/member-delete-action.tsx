"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteMemberProfile } from "@/lib/firebase/actions";
import { callArchiveMemberAccount } from "@/lib/firebase/functions";
import { initialFormActionState } from "@/types/action-state";

export function MemberDeleteAction({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function archiveMember() {
    setMessage(null);
    setIsConfirming(false);
    startTransition(async () => {
      try {
        const result = await callArchiveMemberAccount({ memberId });
        setMessage({ type: "success", text: result.data.message });
        router.push("/owner/members");
      } catch {
        const fd = new FormData();
        fd.set("memberId", memberId);
        const result = await deleteMemberProfile(initialFormActionState, fd);
        setMessage({ type: result.status === "success" ? "success" : "error", text: result.message });
        if (result.status === "success") {
          router.push("/owner/members");
        }
      }
    });
  }

  return (
    <div className="mpd-account-section">
      <button className="button button-danger" disabled={isPending} onClick={() => setIsConfirming(true)} type="button">
        {isPending ? "Deleting..." : "Delete member"}
      </button>
      <p className="mpd-section-hint">
        Archives this profile, assignments, lift logs, notifications, and sessions before removing access.
      </p>

      {isConfirming ? (
        <div className="dialog-backdrop" role="presentation">
          <div aria-modal="true" className="confirm-dialog" role="dialog">
            <h2>Delete member?</h2>
            <p>This archives and removes the member and all their data. This cannot be undone from the app UI.</p>
            <div className="quick-actions">
              <button className="button button-secondary" onClick={() => setIsConfirming(false)} type="button">
                Cancel
              </button>
              <button className="button button-danger" onClick={archiveMember} type="button">
                Delete member
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className={`form-message form-message-${message.type}`} role={message.type === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
