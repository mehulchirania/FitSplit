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

/** Inline action buttons for a PT plan card. */
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

  if (
    (startState.status === "success" || completeState.status === "success" || cancelState.status === "success") &&
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
          <input name="ptSessionId" type="hidden" value={session.id} />
          <button className="button button-primary pt-action-btn" disabled={anyPending} type="submit">
            {startPending ? "Activating..." : "Activate plan"}
          </button>
        </form>
      )}

      {session.status === "active" && showLiveLink && (
        <a className="button button-primary pt-action-btn" href={`/owner/training/session/${session.id}`}>
          Open PT console
        </a>
      )}

      {session.status === "active" && !showLiveLink && (
        <form action={completeAction}>
          <input name="ptSessionId" type="hidden" value={session.id} />
          <button className="button button-secondary pt-action-btn" disabled={anyPending} type="submit">
            {completePending ? "Completing..." : "Complete plan"}
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
          Cancel plan
        </button>
      )}

      {showCancel && (
        <form action={cancelAction} className="pt-cancel-inline">
          <input name="ptSessionId" type="hidden" value={session.id} />
          <input
            className="pt-cancel-reason"
            maxLength={200}
            name="cancelReason"
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Reason (optional)"
            value={cancelReason}
          />
          <button className="button button-danger pt-action-btn" disabled={anyPending} type="submit">
            {cancelPending ? "Cancelling..." : "Confirm cancel"}
          </button>
          <button className="button button-secondary pt-action-btn" onClick={() => setShowCancel(false)} type="button">
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
