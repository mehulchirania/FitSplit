"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setRehabCondition } from "@/lib/firebase/actions/rehab";

/** "Add to my workouts": opts the user in to a condition. Optimistic, rolled back on failure. */
export function RehabToggle({ conditionId, initial }: { conditionId: string; initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [, startTransition] = useTransition();

  function flip() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const res = await setRehabCondition(conditionId, next);
      if (!res.ok) {
        setOn(!next);
        toast.error(res.message);
        return;
      }
      toast.success(next ? "Added. Rehab will show after workouts and on Today." : "Removed from your workouts");
      router.refresh();
    });
  }

  return (
    <button type="button" role="switch" aria-checked={on} className="fs-row fs-row--tap" onClick={flip}>
      <span className="fs-row__main">
        <span className="fs-row__title">Add to my workouts</span>
        <span className="fs-row__sub">Offer this routine after training and on Today</span>
      </span>
      <span className="fs-switch" data-on={on} aria-hidden="true">
        <span />
      </span>
    </button>
  );
}
