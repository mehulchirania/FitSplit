import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { getMemberWithProfile, getCoachThreadForMember } from "@/lib/firebase/read-models";
import { MemberCoachView } from "@/components/member-coach-view";

export const dynamic = "force-dynamic";

export default async function MemberCoachPage() {
  const currentUser = await requireRole(["member"]);
  const memberId = currentUser.memberId ?? currentUser.uid;
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const [{ profile }, { messages }] = await Promise.all([
    getMemberWithProfile(memberId),
    getCoachThreadForMember(memberId, gymId)
  ]);

  return (
    <MemberCoachView
      coachNote={profile.coachNote ?? null}
      coachNoteFrom={profile.coachNoteUpdatedByName ?? null}
      coachNoteUpdatedAt={profile.coachNoteUpdatedAt ?? null}
      memberId={memberId}
      gymId={gymId}
      initialMessages={messages}
    />
  );
}
