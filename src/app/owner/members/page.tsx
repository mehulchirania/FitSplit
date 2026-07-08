import { MembersHybridView } from "@/components/members-hybrid-view";
import type { Bucket, HybridMember } from "@/components/members-hybrid-view";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  getActiveProgramAssignments,
  getMembers,
  getWorkoutPrograms,
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

function daysToExpiry(endDate?: string): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const BUCKETS: readonly Bucket[] = ["all", "active", "no-plan", "expiring"];

export default async function MembersPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const currentUser = await requireRole(["admin", "owner"]);
  const { tab } = await searchParams;
  const initialBucket = BUCKETS.find((b) => b === tab) ?? "all";
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const [{ members }, { assignments }, { programs }] = await Promise.all([
    getMembers(gymId),
    getActiveProgramAssignments(gymId),
    getWorkoutPrograms(gymId),
  ]);

  const assignedIds = new Set(assignments.map((a) => a.memberId));

  // Build a lookup: memberId → program title
  const programById = new Map(programs.map((p) => [p.id, p.title]));
  const assignmentByMemberId = new Map(
    assignments.map((a) => [a.memberId, a.programId])
  );

  const hybridMembers: HybridMember[] = members.map((m) => {
    const programId = assignmentByMemberId.get(m.id);
    return {
      id: m.id,
      fullName: m.fullName,
      avatarInitials: m.avatarInitials,
      isActive: m.isActive,
      username: m.username,
      goal: m.goal,
      joinedAt: m.joinedAt,
      membershipStatus: m.membershipStatus,
      membershipEndDate: m.membershipEndDate,
      currentPackageName: m.currentPackageName,
      assignedTrainer: undefined, // not denormalised in getMembers; shown only on member detail
      hasPlan: assignedIds.has(m.id),
      programTitle: programId ? programById.get(programId) : undefined,
      daysToExpiry: daysToExpiry(m.membershipEndDate),
    };
  });

  const hybridPrograms = programs.map((p) => ({ id: p.id, title: p.title }));

  return (
    <MembersHybridView
      initialMembers={hybridMembers}
      programs={hybridPrograms}
      initialBucket={initialBucket}
    />
  );
}

