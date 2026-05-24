"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteGymWithMembers, deleteGymWorkspace } from "@/lib/firebase/actions";
import { callArchiveGymWorkspace } from "@/lib/firebase/functions";
import { initialFormActionState } from "@/types/action-state";

export function GymArchiveAction({
  destructive = false,
  gymId,
  gymName,
  label = "Remove"
}: {
  destructive?: boolean;
  gymId: string;
  gymName: string;
  label?: string;
}) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function archiveGym() {
    setIsConfirming(false);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await callArchiveGymWorkspace({ gymId });
        setMessage({ type: "success", text: result.data.message });
        router.push("/admin/gyms");
      } catch {
        const fd = new FormData();
        fd.set("gymId", gymId);
        const result = destructive
          ? await deleteGymWithMembers(initialFormActionState, fd)
          : await deleteGymWorkspace(initialFormActionState, fd);
        setMessage({ type: result.status === "success" ? "success" : "error", text: result.message });
        if (result.status === "success") router.push("/admin/gyms");
      }
    });
  }

  return (
    <>
      <button
        className={destructive ? "button button-danger" : "button button-secondary"}
        disabled={isPending}
        onClick={() => setIsConfirming(true)}
        type="button"
      >
        {isPending ? "Removing..." : label}
      </button>

      {isConfirming ? (
        <div className="dialog-backdrop" role="presentation">
          <div aria-modal="true" className="confirm-dialog" role="dialog">
            <h2>{destructive ? "Delete gym and all members?" : "Remove gym?"}</h2>
            <p>
              {destructive
                ? `Delete "${gymName}" and all associated members and staff? This archives records before removal.`
                : `Remove "${gymName}"? This is intended for gyms with no assigned staff or members.`}
            </p>
            <div className="quick-actions">
              <button className="button button-secondary" onClick={() => setIsConfirming(false)} type="button">
                Cancel
              </button>
              <button className={destructive ? "button button-danger" : "button button-primary"} onClick={archiveGym} type="button">
                {destructive ? "Yes, delete everything" : "Remove gym"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {message ? <span className="sr-only" role="status">{message.text}</span> : null}
    </>
  );
}
