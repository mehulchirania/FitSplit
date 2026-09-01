"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { requestToJoinGym } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { FormActionState } from "@/types/action-state";

export function JoinGymForm({ gymId, fullName }: { gymId: string; fullName: string }) {
  const [status, setStatus] = useState<FormActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await requestToJoinGym(initialFormActionState, formData);
      setStatus(result);
    });
  }

  const alreadySent = status?.status === "success";

  return (
    <form className="disc-join-form" onSubmit={submit}>
      <input name="gymId" type="hidden" value={gymId} />
      <label>
        Your name
        <input disabled name="displayName" value={fullName} readOnly />
      </label>
      <label>
        Message to the gym (optional)
        <textarea
          disabled={alreadySent}
          maxLength={300}
          name="message"
          placeholder="Tell them a bit about your goals or preferred timing."
          rows={3}
        />
      </label>
      {status && (
        <p className={`form-message form-message-${status.status}`} role={status.status === "error" ? "alert" : "status"}>
          {status.message}
        </p>
      )}
      <button className="button button-primary" disabled={isPending || alreadySent} type="submit">
        {alreadySent ? "Request sent" : isPending ? "Sending request..." : "Request to join"}
      </button>
    </form>
  );
}
