import type { AdminSidebarData } from "@/components/admin-sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";

export function AdminWorkspaceShell({
  data,
  children,
}: {
  data: AdminSidebarData;
  children: React.ReactNode;
}) {
  return (
    <div className="odp2-workspace">
      <AdminSidebar data={data} />
      <div className="odp2-main">
        {children}
      </div>
    </div>
  );
}
