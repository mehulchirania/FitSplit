import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { getGymDetail, getMemberWithProfile } from "@/lib/firebase/read-models";
import { MemberSubSidebar } from "@/components/member-sub-sidebar";

export default async function MemberPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireRole(["member"]);
  const memberId = currentUser.memberId ?? currentUser.uid;
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const [{ member }, { gym }] = await Promise.all([
    getMemberWithProfile(memberId),
    getGymDetail(gymId),
  ]);

  const firstName = member?.fullName?.trim().split(/\s+/)[0] ?? "Member";

  return (
    <div className="m3d-root">
      <MemberSubSidebar
        firstName={firstName}
        gymName={gym?.name ?? "Gym"}
        gymLogoUrl={gym?.logoUrl ?? null}
      />
      <div className="m3d-main">
        <div className="m3d-content m3d-subpage-content">
          {children}
        </div>
      </div>
    </div>
  );
}
