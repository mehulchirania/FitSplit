import { requireAuth } from "@/lib/auth";
import { MemberSidebar } from "@/components/member-sidebar";

export default async function MemberPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireAuth();
  const firstName = currentUser.fullName.trim().split(/\s+/)[0] || "Athlete";

  return (
    <div className="m3d-root">
      <MemberSidebar firstName={firstName} />
      <div className="m3d-main">
        <div className="m3d-content m3d-subpage-content">
          {children}
        </div>
      </div>
    </div>
  );
}
