/**
 * Pure membership-expiry math for the Cloud Functions money path.
 *
 * Extracted from `index.ts` (`processMembershipExpiries`, `computeGymDashboard`)
 * so the boundary logic can be unit-tested without the Firestore Admin SDK.
 * This module must stay dependency-free: it is imported both by the Cloud
 * Functions bundle and by the root Vitest suite
 * (`src/lib/firebase/actions/membership-expiry-logic.test.ts`) via a relative
 * path, under two different tsconfigs.
 *
 * Membership expiry math lives HERE (plus `actions/billing.ts` writes on
 * activation) — read-models only read the persisted `membershipStatus` field.
 */

export type MembershipStatus = "active" | "expiring_soon" | "expired";

/** Add N whole months (and optional extra days) to a YYYY-MM-DD string, in UTC. */
export function addMonths(dateStr: string, months: number, days = 0): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Last day (inclusive) of the "expiring soon" warning window for a gym.
 * `expiryWarningDays` is the per-gym override (`gyms/{gymId}.expiryWarningDays`,
 * default 7).
 */
export function warningWindowEnd(todayStr: string, expiryWarningDays: number): string {
  return addMonths(todayStr, 0, expiryWarningDays);
}

/**
 * Classify a membership end date relative to today.
 *
 *   endDate < today                → "expired"   (strictly before — expiring today is NOT expired)
 *   today <= endDate <= today + N  → "expiring_soon"
 *   endDate > today + N            → "active"
 *   missing endDate                → null (nothing to classify; scheduler skips the doc)
 *
 * Mirrors the scheduler exactly: its Firestore query pre-filters
 * `membershipEndDate <= warningWindowEnd`, then marks `endDate < today` as
 * expired and the rest of the fetched docs as expiring_soon.
 */
export function computeMembershipStatus(
  endDate: string | null | undefined,
  todayStr: string,
  expiryWarningDays: number
): MembershipStatus | null {
  if (!endDate) return null;
  if (endDate < todayStr) return "expired";
  if (endDate <= warningWindowEnd(todayStr, expiryWarningDays)) return "expiring_soon";
  return "active";
}

export type ExpiryTransition = {
  newStatus: Extract<MembershipStatus, "expired" | "expiring_soon">;
  notificationType: "membership_expired" | "membership_expiring_soon";
};

/**
 * Decide what `processMembershipExpiries` should do for one member doc.
 * Returns null when no write/notification is needed: missing endDate, status
 * already up to date, or membership still active (the scheduler never writes
 * "active" — that transition happens on package activation in billing).
 */
export function planExpiryTransition(args: {
  endDate: string | null | undefined;
  currentStatus: string | null | undefined;
  todayStr: string;
  expiryWarningDays: number;
}): ExpiryTransition | null {
  const status = computeMembershipStatus(args.endDate, args.todayStr, args.expiryWarningDays);
  if (status === null || status === "active") return null;
  if (args.currentStatus === status) return null;
  return {
    newStatus: status,
    notificationType: status === "expired" ? "membership_expired" : "membership_expiring_soon",
  };
}

/** Whole days until expiry (ceil), used in the "expires in N days" notification copy. */
export function daysUntilExpiry(endDate: string, nowMs: number): number {
  const days = Math.ceil((new Date(`${endDate}T00:00:00Z`).getTime() - nowMs) / 86400000);
  return days === 0 ? 0 : days; // Math.ceil can produce -0 within the expiry day
}
