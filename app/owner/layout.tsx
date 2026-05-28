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

  const sidebarData: OdpSidebarData = {
    gymName: gym?.name ?? "Gym",
    ownerFirstName: currentUser.fullName.split(" ")[0] ?? currentUser.fullName,
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
