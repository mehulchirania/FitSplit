import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  getGymDetail,
  getMembers,
  getPendingPaymentRequests,
  getActiveProgramAssignments,
} from "@/lib/firebase/read-models";
import { OdpWorkspaceShell } from "@/components/odp-workspace-shell";
import type { OdpSidebarData } from "@/components/odp-sidebar";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireRole(["admin", "owner"]);
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const [{ gym }, { members }, pendingPayments, { assignments }] = await Promise.all([
    getGymDetail(gymId),
    getMembers(gymId),
    getPendingPaymentRequests(gymId),
    getActiveProgramAssignments(gymId),
  ]);

  const assignedIds = new Set(assignments.map((a) => a.memberId));
  const noPlanCount = members.filter((m) => m.isActive && !assignedIds.has(m.id)).length;

  const nameParts = currentUser.fullName.trim().split(/\s+/);
  const ownerInitials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : (nameParts[0] ?? "?").slice(0, 2).toUpperCase();

  const sidebarData: OdpSidebarData = {
    gymName: gym?.name ?? "Gym",
    gymLogoUrl: gym?.logoUrl ?? null,
    ownerFirstName: nameParts[0] ?? currentUser.fullName,
    ownerInitials,
    role: currentUser.role ?? "owner",
    totalMembers: members.length,
    pendingPaymentsCount: pendingPayments.length,
    noPlanCount,
  };

  return (
    <OdpWorkspaceShell data={sidebarData}>
      {children}
    </OdpWorkspaceShell>
  );
}
