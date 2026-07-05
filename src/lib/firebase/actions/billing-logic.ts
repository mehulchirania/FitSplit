/**
 * Pure decision/date logic for the billing money paths — payment request
 * approval/rejection and package activation. Extracted from `billing.ts` so
 * it can be unit-tested without mocking the Firestore Admin SDK (same
 * convention as `notification-auth.ts`).
 *
 * Production code in `billing.ts` calls these functions directly; this file
 * has no Firestore/Auth dependencies of its own.
 */

export type PaymentRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

/**
 * A payment request (or membership) can only be approved/rejected while it
 * is still `pending`. Guards against double-approve, double-reject, and
 * approve-after-reject races.
 */
export function canResolvePaymentRequest(status: PaymentRequestStatus | undefined | null): boolean {
  return status === "pending";
}

/**
 * Owner-scoped actions must operate on the owner's own gym. Mirrors the
 * `user.gymId !== gymId` guard inlined at the top of every action in
 * `billing.ts`.
 */
export function isAuthorizedForGym(userGymId: string | undefined | null, gymId: string): boolean {
  return userGymId === gymId;
}

export type MembershipActivation = {
  startDate: string;
  endDate: string;
  durationMonths: number;
};

/**
 * Computes the start/end date for a newly activated or renewed membership.
 *
 * Current behaviour (unchanged from the inlined logic in `billing.ts` /
 * `functions/src/index.ts`): activation always starts "now" and runs for
 * `durationMonths` from today — it does NOT stack on top of a still-active
 * membership's existing end date. Renewing early forfeits the remaining
 * days of the current period. This function documents that behaviour so
 * intentional changes are visible in a test diff rather than silently
 * altering money math.
 */
export function computeMembershipActivation(
  durationMonths: number,
  now: Date = new Date()
): MembershipActivation {
  const nowIso = now.toISOString();
  const startDate = nowIso.slice(0, 10);
  const endDate = addMonths(startDate, durationMonths);
  return { startDate, endDate, durationMonths };
}

/** Add N whole months (UTC) to a YYYY-MM-DD date string. */
export function addMonths(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}
