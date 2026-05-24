"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelPTSession,
  completePTSession,
  reschedulePTSession,
  startPTSession
} from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { PTSession } from "@/types/domain";

type TrainerOption = { id: string; fullName: string };

function toDatetimeLocal(iso?: string) {
  if (!iso) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setMinutes(0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
  }
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

/** Inline action buttons for a PT plan card. */
export function PTSessionActions({
  session,
  showLiveLink = false,
  trainers = []
}: {
  session: Pick<PTSession, "id" | "status" | "scheduledAt" | "trainerId">;
  showLiveLink?: boolean;
  trainers?: TrainerOption[];
}) {
  const router = useRouter();
  const [startState, startAction, startPending] = useActionState(startPTSession, initialFormActionState);
  const [completeState, completeAction, completePending] = useActionState(completePTSession, initialFormActionState);
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelPTSession, initialFormActionState);
  const [rescheduleState, rescheduleAction, reschedulePending] = useActionState(reschedulePTSession, initialFormActionState);

  const [showCancel, setShowCancel] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [newScheduledAt, setNewScheduledAt] = useState(() => toDatetimeLocal(session.scheduledAt));
  const [newTrainerId, setNewTrainerId] = useState(session.trainerId ?? "");

  const anyPending = startPending || completePending || cancelPending || reschedulePending;

  const anySuccess =
    startState.status === "success" ||
    completeState.status === "success" ||
    cancelState.status === "success" ||
    rescheduleState.status === "success";

  if (anySuccess && !anyPending) {
    router.refresh();
  }

  const errorMsg =
    (startState.status === "error" && startState.message) ||
    (completeState.status === "error" && completeState.message) ||
    (cancelState.status === "error" && cancelState.message) ||
    (rescheduleState.status === "error" && rescheduleState.message);

  const canReschedule =
    session.status === "scheduled" || session.status === "active";

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

      {/* Reschedule */}
      {canReschedule && !showCancel && !showReschedule && (
        <button
          className="button button-secondary pt-action-btn"
          disabled={anyPending}
          onClick={() => setShowReschedule(true)}
          type="button"
        >
          Reschedule
        </button>
      )}

      {showReschedule && (
        <form action={rescheduleAction} className="pt-reschedule-inline">
          <input name="ptSessionId" type="hidden" value={session.id} />
          <label className="pt-reschedule-label">
            New date &amp; time
            <input
              className="pt-reschedule-input"
              name="scheduledAt"
              onChange={(e) => setNewScheduledAt(e.target.value)}
              required
              type="datetime-local"
              value={newScheduledAt}
            />
          </label>
          {trainers.length > 0 && (
            <label className="pt-reschedule-label">
              Trainer
              <select
                className="pt-reschedule-input"
                name="trainerId"
                onChange={(e) => setNewTrainerId(e.target.value)}
                value={newTrainerId}
              >
                <option value="">— keep current —</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </select>
              {/* Pass trainer name so action can store it without a lookup */}
              <input
                name="trainerName"
                type="hidden"
                value={trainers.find((t) => t.id === newTrainerId)?.fullName ?? ""}
              />
            </label>
          )}
          <div className="pt-reschedule-actions">
            <button className="button button-primary pt-action-btn" disabled={anyPending} type="submit">
              {reschedulePending ? "Saving..." : "Save reschedule"}
            </button>
            <button
              className="button button-secondary pt-action-btn"
              onClick={() => setShowReschedule(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
          {rescheduleState.status === "success" && (
            <p className="form-message form-message-success" role="status">
              {rescheduleState.message}
            </p>
          )}
        </form>
      )}

      {/* Cancel */}
      {canReschedule && !showCancel && !showReschedule && (
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
