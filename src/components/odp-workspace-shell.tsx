import type { OdpSidebarData } from "@/components/odp-sidebar";
import { OdpSidebar } from "@/components/odp-sidebar";

export function OdpWorkspaceShell({
  data,
  children,
}: {
  data: OdpSidebarData;
  children: React.ReactNode;
}) {
  return (
    <div className="odp2-workspace">
      <OdpSidebar data={data} />

      <div className="odp2-main">
        {/*
          Children render here directly inside odp2-main.
          - Dashboard (/owner): renders odp2-tabbar + odp2-scroll itself
          - Sub-pages: wrapped in odp2-scroll by the page itself
        */}
        {children}
      </div>
    </div>
  );
}
