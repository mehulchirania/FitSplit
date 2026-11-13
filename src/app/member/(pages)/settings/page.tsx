import { requireAuth } from "@/lib/auth";
import { getUserProfile } from "@/lib/firebase/read-models";
import { MemberSettingsClient } from "@/components/member-settings-client";

export const dynamic = "force-dynamic";

export default async function MemberSettingsPage() {
  const currentUser = await requireAuth();
  const { user, profile } = await getUserProfile(currentUser.uid, currentUser.fullName);

  return <MemberSettingsClient member={user} profile={profile} />;
}
