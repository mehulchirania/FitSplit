"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import type { PaymentRequest } from "@/types/domain";
import { StatusBadge } from "./status-badge";
import { approvePaymentRequestAction, rejectPaymentRequestAction } from "@/lib/firebase/actions";

interface PaymentRequestCardProps {
  req: PaymentRequest;
  gymId: string;
  showActions?: boolean;
}

export function PaymentRequestCard({ req, gymId, showActions = true }: PaymentRequestCardProps) {
  const [isPending, startTransition] = useTransition();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const canAct = req.status === "pending" && showActions;

  function handleApprove() {
    startTransition(async () => {
      const result = await approvePaymentRequestAction(gymId, req.id);
      if (result.status === "success") toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function handleReject() {
    if (!showRejectInput) { setShowRejectInput(true); return; }
    startTransition(async () => {
      const result = await rejectPaymentRequestAction(gymId, req.id, rejectReason || undefined);
      if (result.status === "success") {
        toast.success(result.message);
        setShowRejectInput(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  const requestedDate = req.requestedAt
    ? new Date(req.requestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";
  const resolvedDate = req.resolvedAt
    ? new Date(req.resolvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  return (
    <div className="payment-request-card">
      <div className="prc-header">
        <div className="prc-identity">
          <span className="prc-member">{req.memberName ?? req.memberId}</span>
          <StatusBadge status={req.status} />
        </div>
        <span className="prc-date">{requestedDate}</span>
      </div>

      <div className="prc-body">
        <div className="prc-package">{req.packageName ?? req.packageId}</div>
        <div className="prc-amount">
          {req.currency} {req.amount.toLocaleString()}
          <span className="prc-method">{req.method}</span>
        </div>
      </div>

      {req.notes && (
        <p className="prc-notes">{req.notes}</p>
      )}

      {req.resolvedByName && resolvedDate && (
        <p className="prc-resolved">
          {req.status === "approved" ? "Approved" : "Resolved"} by {req.resolvedByName} · {resolvedDate}
        </p>
      )}

      {canAct && (
        <div className="prc-actions">
          {showRejectInput ? (
            <div className="prc-reject-input-row">
              <input
                className="input input-sm"
                placeholder="Reason (optional)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={isPending}
              />
              <button
                className="button button-ghost button-sm"
                type="button"
                disabled={isPending}
                onClick={() => setShowRejectInput(false)}
              >
                Cancel
              </button>
              <button
                className="button button-danger button-sm"
                type="button"
                disabled={isPending}
                onClick={handleReject}
              >
                {isPending ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          ) : (
            <>
              <button
                className="button button-primary button-sm"
                type="button"
                disabled={isPending}
                onClick={handleApprove}
              >
                {isPending ? "Approving…" : "Approve"}
              </button>
              <button
                className="button button-ghost button-sm"
                type="button"
                disabled={isPending}
                onClick={handleReject}
              >
                Reject
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
