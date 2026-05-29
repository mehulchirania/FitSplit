import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { getMemberWithProfile } from "@/lib/firebase/read-models";
import { MemberSettingsClient } from "@/components/member-settings-client";

export const dynamic = "force-dynamic";

export default async function MemberSettingsPage() {
  const currentUser = await requireRole(["member"]);
  const memberId = currentUser.memberId ?? currentUser.uid;
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const { member, profile } = await getMemberWithProfile(memberId);
  if (!member) return null;

  return (
    <MemberSettingsClient
      member={member}
      profile={profile}
      gymId={gymId}
      memberId={memberId}
    />
  );
}
