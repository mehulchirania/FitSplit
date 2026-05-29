import { requireRole } from "@/lib/auth";
import { AdminWorkspaceShell } from "@/components/admin-workspace-shell";
import { getAdminNotifications } from "@/lib/firebase/read-models/notifications";
import type { AdminSidebarData } from "@/components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireRole(["admin"]);

  const { notifications } = await getAdminNotifications();
  const inboxCount = notifications.filter((n) => !n.readAt).length;

  const nameParts = currentUser.fullName.trim().split(/\s+/);
  const adminInitials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : (nameParts[0] ?? "A").slice(0, 2).toUpperCase();

  const sidebarData: AdminSidebarData = {
    adminName: nameParts[0] ?? currentUser.fullName,
    adminInitials,
    inboxCount,
  };

  return (
    <AdminWorkspaceShell data={sidebarData}>
      {children}
    </AdminWorkspaceShell>
  );
}
