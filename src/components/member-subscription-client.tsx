"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { requestUpgradeAction } from "@/lib/firebase/actions";
import type { ConsumerPlan } from "@/types/domain";

export function MemberSubscriptionUpgradeButton({
  currentPlan,
}: {
  currentPlan: ConsumerPlan;
}) {
  const [isPending, startTransition] = useTransition();
  const [requested, setRequested] = useState(false);

  if (currentPlan === "pro") {
    return (
      <div className="sub-plan-cta sub-plan-cta--done">
        <span className="sub-plan-cta__check" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        Pro requested
      </div>
    );
  }

  function handleUpgrade() {
    startTransition(async () => {
      const result = await requestUpgradeAction();
      if (result.status === "success") {
        toast.success(result.message);
        setRequested(true);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="sub-plan-cta-wrap">
      <button
        type="button"
        className="button button-primary sub-plan-cta"
        onClick={handleUpgrade}
        disabled={isPending || requested}
      >
        {isPending ? "Sending…" : requested ? "Request sent" : "Upgrade to Pro"}
      </button>
      {requested && !isPending && (
        <p className="sub-plan-cta__note">
          We&apos;ve noted your interest — no charge was made. We&apos;ll email you when Pro billing goes live.
        </p>
      )}
    </div>
  );
}
