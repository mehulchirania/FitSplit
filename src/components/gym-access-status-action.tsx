"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setGymStatus } from "@/lib/firebase/actions";
import { callSetGymAccessStatus } from "@/lib/firebase/functions";
import { initialFormActionState } from "@/types/action-state";

export function GymAccessStatusAction({
  gymId,
  isEnabled
}: {
  gymId: string;
  isEnabled: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(isEnabled);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    const previous = enabled;
    const status = next ? "active" : "inactive";
    setEnabled(next);
    setMessage("");

    startTransition(async () => {
      try {
        const result = await callSetGymAccessStatus({ gymId, status });
        setMessage(result.data.message);
        router.refresh();
      } catch {
        const fd = new FormData();
        fd.set("gymId", gymId);
        fd.set("status", status);
        const result = await setGymStatus(initialFormActionState, fd);
        if (result.status === "error") setEnabled(previous);
        setMessage(result.message);
        if (result.status === "success") router.refresh();
      }
    });
  }

  return (
    <>
      <button
        aria-pressed={enabled}
        className={`access-toggle ${enabled ? "is-on" : "is-off"}`}
        disabled={isPending}
        onClick={toggle}
        type="button"
      >
        {isPending ? "Updating..." : enabled ? "Enabled" : "Disabled"}
      </button>
      {message ? <span className="sr-only" role="status">{message}</span> : null}
    </>
  );
}
