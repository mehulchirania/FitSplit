import { requireAuth } from "@/lib/auth";
import { getUserProfile } from "@/lib/firebase/read-models";
import { ProfileScreen } from "@/components/app/profile-screen";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const currentUser = await requireAuth();
  const { user, profile } = await getUserProfile(currentUser.uid, currentUser.fullName);

  return (
    <main className="fs-page">
      <header className="fs-head">
        <h1 className="fs-title">Profile</h1>
      </header>
      <ProfileScreen member={user} profile={profile} />
    </main>
  );
}
