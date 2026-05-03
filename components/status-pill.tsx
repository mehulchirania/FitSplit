import type { MembershipStatus } from "@/types/domain";

const statusLabels: Record<MembershipStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring soon",
  expired: "Expired"
};

const statusClasses: Record<MembershipStatus, string> = {
  active: "status-active",
  expiring_soon: "status-expiring",
  expired: "status-expired"
};

export function StatusPill({ status }: { status: MembershipStatus }) {
  return (
    <span className={`status-pill ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
