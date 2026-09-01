"use server";

import { requireAuth } from "@/lib/auth";
import { getBillingProvider } from "@/lib/billing/provider";
import type { FormActionState } from "@/types/action-state";
import { failure } from "./shared";

/**
 * Member requests an upgrade to the Pro plan. No payment gateway exists yet —
 * this only records intent via `getBillingProvider()` (see src/lib/billing/provider.ts).
 * The returned message must always be surfaced verbatim: it's the only honest
 * description of what actually happened (nothing was charged).
 */
export async function requestUpgradeAction(): Promise<FormActionState> {
  try {
    const user = await requireAuth();
    const result = await getBillingProvider().requestUpgrade(user.uid, "pro");
    return { status: "success", message: result.message };
  } catch (err) {
    return failure(err, "Couldn't record your upgrade request. Please try again.");
  }
}
