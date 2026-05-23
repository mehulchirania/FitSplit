"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelPTSession,
  completePTSession,
  startPTSession
} from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { PTSession } from "@/types/domain";

/** Inline action buttons for a PT session card. */
export function PTSessionActions({
  session,
  showLiveLink = false
}: {
  session: Pick<PTSession, "id" | "status">;
  showLiveLink?: boolean;
}) {
  const router = useRouter();
  const [startState, startAction, startPending] = useActionState(startPTSession, initialFormActionState);
  const [completeState, completeAction, completePending] = useActionState(completePTSession, initialFormActionState);
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelPTSession, initialFormActionState);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const anyPending = startPending || completePending || cancelPending;

  // Refresh after any successful action
  const prevStart = startState.status;
  const prevComplete = completeState.status;
  const prevCancel = cancelState.status;

  if (
    (prevStart === "success" || prevComplete === "success" || prevCancel === "success") &&
    !anyPending
  ) {
    router.refresh();
  }

  const errorMsg =
    (startState.status === "error" && startState.message) ||
    (completeState.status === "error" && completeState.message) ||
    (cancelState.status === "error" && cancelState.message);

  return (
    <div className="pt-session-actions">
      {session.status === "scheduled" && (
        <form action={startAction}>
          <input type="hidden" name="ptSessionId" value={session.id} />
          <button
            className="button button-primary pt-action-btn"
            disabled={anyPending}
            type="submit"
          >
            {startPending ? "Starting…" : "▶ Start"}
          </button>
        </form>
      )}

      {session.status === "active" && showLiveLink && (
        <a
          className="button button-primary pt-action-btn"
          href={`/owner/training/session/${session.id}`}
        >
          Open console →
        </a>
      )}

      {session.status === "active" && !showLiveLink && (
        <form action={completeAction}>
          <input type="hidden" name="ptSessionId" value={session.id} />
          <button
            className="button button-secondary pt-action-btn"
            disabled={anyPending}
            type="submit"
          >
            {completePending ? "Completing…" : "✓ Complete"}
          </button>
        </form>
      )}

      {(session.status === "scheduled" || session.status === "active") && !showCancel && (
        <button
          className="button button-danger-ghost pt-action-btn"
          disabled={anyPending}
          onClick={() => setShowCancel(true)}
          type="button"
        >
          Cancel
        </button>
      )}

      {showCancel && (
        <form action={cancelAction} className="pt-cancel-inline">
          <input type="hidden" name="ptSessionId" value={session.id} />
          <input
            className="pt-cancel-reason"
            maxLength={200}
            name="cancelReason"
            placeholder="Reason (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <button
            className="button button-danger pt-action-btn"
            disabled={anyPending}
            type="submit"
          >
            {cancelPending ? "Cancelling…" : "Confirm cancel"}
          </button>
          <button
            className="button button-secondary pt-action-btn"
            onClick={() => setShowCancel(false)}
            type="button"
          >
            Back
          </button>
        </form>
      )}

      {errorMsg && (
        <p className="form-message form-message-error" role="alert">{errorMsg}</p>
      )}
    </div>
  );
}
