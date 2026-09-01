"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveJoinRequest, rejectJoinRequest } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";

export type JoinRequestRow = {
  id: string;
  requesterName: string;
  requesterPhone?: string;
  message?: string;
  requestedAt: string;
};

export function JoinRequestsQueue({ gymId, requests }: { gymId: string; requests: JoinRequestRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorByRequest, setErrorByRequest] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function resolve(requestId: string, action: (state: typeof initialFormActionState, fd: FormData) => Promise<typeof initialFormActionState>) {
    setPendingId(requestId);
    setErrorByRequest((prev) => ({ ...prev, [requestId]: "" }));
    const formData = new FormData();
    formData.set("gymId", gymId);
    formData.set("requestId", requestId);

    startTransition(async () => {
      const result = await action(initialFormActionState, formData);
      if (result.status === "error") {
        setErrorByRequest((prev) => ({ ...prev, [requestId]: result.message }));
      } else {
        router.refresh();
      }
      setPendingId(null);
    });
  }

  if (requests.length === 0) {
    return <p className="disc-join-note">No pending join requests right now.</p>;
  }

  return (
    <ul className="join-requests-list">
      {requests.map((request) => (
        <li className="join-requests-row" key={request.id}>
          <div className="join-requests-row-main">
            <p className="join-requests-name">{request.requesterName}</p>
            {request.requesterPhone ? <p className="member-meta">{request.requesterPhone}</p> : null}
            {request.message ? <p className="join-requests-message">&ldquo;{request.message}&rdquo;</p> : null}
          </div>
          <div className="join-requests-row-actions">
            <button
              className="button button-primary"
              disabled={isPending && pendingId === request.id}
              onClick={() => resolve(request.id, approveJoinRequest)}
              type="button"
            >
              Approve
            </button>
            <button
              className="button"
              disabled={isPending && pendingId === request.id}
              onClick={() => resolve(request.id, rejectJoinRequest)}
              type="button"
            >
              Decline
            </button>
          </div>
          {errorByRequest[request.id] ? (
            <p className="form-message form-message-error" role="alert">
              {errorByRequest[request.id]}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
