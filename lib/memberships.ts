import type { Membership, MembershipStatus } from "@/types/domain";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const today = new Date("2026-05-03T00:00:00+05:30");

export function getDaysRemaining(endDate: string) {
  const end = new Date(`${endDate}T00:00:00+05:30`);
  return Math.ceil((end.getTime() - today.getTime()) / MS_PER_DAY);
}

export function getMembershipStatus(
  membership: Membership,
  expiryWarningDays = 7
): MembershipStatus {
  const daysRemaining = getDaysRemaining(membership.endDate);

  if (daysRemaining < 0) {
    return "expired";
  }

  if (daysRemaining <= expiryWarningDays) {
    return "expiring_soon";
  }

  return "active";
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00+05:30`));
}
