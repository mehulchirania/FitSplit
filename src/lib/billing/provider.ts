import type { ConsumerPlan } from "@/types/domain";

/**
 * Server-side billing abstraction for consumer subscriptions.
 *
 * ── Why this exists with no payment gateway wired up ────────────────────────
 * There is no Razorpay/Stripe account today (see docs/06_B2C_IMPLEMENTATION_PLAN.md
 * §4 — payment gateways explicitly out of scope for the original v1). Rather than
 * build the subscription UI against a concrete gateway SDK and rip it out later,
 * every call site depends on this interface. Swapping in a real gateway later is
 * an implementation of `BillingProvider`, not a UI or data-model change.
 *
 * `getBillingProvider()` is the only factory call sites should use — it decides
 * which implementation to hand back (today, always the stub).
 */
export type UpgradeIntentResult = {
  /** Always "stubbed" until a real gateway is wired in. */
  status: "stubbed";
  message: string;
};

export interface BillingProvider {
  /**
   * Record that an account wants to move to a paid plan. Does NOT charge
   * anything — the stub implementation only writes a `SubscriptionEvent`.
   */
  requestUpgrade(uid: string, plan: ConsumerPlan): Promise<UpgradeIntentResult>;
}

/**
 * No-op billing provider. Records intent as a `SubscriptionEvent` so the
 * upgrade flow, invoice-history UI, and data model are all real and testable
 * before any money can move. Never charges, never calls an external API.
 */
class StubBillingProvider implements BillingProvider {
  async requestUpgrade(uid: string, plan: ConsumerPlan): Promise<UpgradeIntentResult> {
    const { requireFirebase } = await import("@/lib/firebase/actions/shared");
    const { collectionPaths } = await import("@/lib/firebase/collections");
    const { randomUUID } = await import("crypto");

    const db = requireFirebase();
    const id = randomUUID();
    await db
      .collection(collectionPaths.authProfiles)
      .doc(uid)
      .collection("subscriptionEvents")
      .doc(id)
      .set({
        id,
        uid,
        type: "upgrade_stubbed",
        plan,
        createdAt: new Date().toISOString(),
        notes: "No payment gateway configured — this is a recorded intent, not a charge."
      });

    return {
      status: "stubbed",
      message: "Billing isn't live yet — we've noted your interest in Pro and will email you when it's ready."
    };
  }
}

let cachedProvider: BillingProvider | null = null;

export function getBillingProvider(): BillingProvider {
  if (!cachedProvider) {
    cachedProvider = new StubBillingProvider();
  }
  return cachedProvider;
}
