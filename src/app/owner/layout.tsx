import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  getGymDetail,
  getMembers,
  getPendingPaymentRequests,
  getActiveProgramAssignments,
} from "@/lib/firebase/read-models";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { OdpWorkspaceShell } from "@/components/odp-workspace-shell";
import type { OdpSidebarData } from "@/components/odp-sidebar";

async function getPendingJoinRequestsCount(gymId: string): Promise<number> {
  if (!hasFirebaseAdminConfig()) return 0;
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection("gyms")
      .doc(gymId)
      .collection("joinRequests")
      .where("status", "==", "pending")
      .count()
      .get();
    return snapshot.data().count;
  } catch {
    return 0;
  }
}

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireRole(["admin", "owner"]);
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
  const isTrainer =
    currentUser.role === "owner" && !!currentUser.staffType && currentUser.staffType !== "owner";

  const [{ gym }, { members }, pendingPayments, { assignments }, pendingJoinRequestsCount] = await Promise.all([
    getGymDetail(gymId),
    getMembers(gymId),
    isTrainer ? Promise.resolve([]) : getPendingPaymentRequests(gymId),
    getActiveProgramAssignments(gymId),
    isTrainer ? Promise.resolve(0) : getPendingJoinRequestsCount(gymId),
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
    staffType: currentUser.staffType ?? null,
    totalMembers: members.length,
    pendingPaymentsCount: isTrainer ? 0 : pendingPayments.length,
    noPlanCount,
    pendingJoinRequestsCount,
  };

  return (
    <OdpWorkspaceShell data={sidebarData}>
      {children}
    </OdpWorkspaceShell>
  );
}
