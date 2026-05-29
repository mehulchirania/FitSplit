import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  getGymDetail,
  getWorkoutPrograms,
  getProgramAssignmentForMember,
} from "@/lib/firebase/read-models";
import { MemberProgramsClient } from "@/components/member-programs-client";

export const dynamic = "force-dynamic";

export default async function MemberProgramsPage() {
  const currentUser = await requireRole(["member"]);
  const memberId = currentUser.memberId ?? currentUser.uid;
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const [{ programs }, { gym }, { assignment }] = await Promise.all([
    getWorkoutPrograms(gymId),
    getGymDetail(gymId),
    getProgramAssignmentForMember(memberId, gymId),
  ]);

  const gymShort = (gym?.name ?? "Gym").split(" · ")[0];

  return (
    <main className="page" style={{ maxWidth: "900px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
        <Link
          href="/member"
          style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            color: "var(--text-soft)", textDecoration: "none",
            fontSize: "13px", fontWeight: 600,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Dashboard
        </Link>
      </div>

      <h1 style={{ margin: "0 0 4px", fontSize: "1.7rem", fontWeight: 800 }}>
        Workout Programs
      </h1>
      <p style={{ margin: "0 0 24px", color: "var(--text-soft)", fontSize: "0.9rem" }}>
        Browse all plans at {gym?.name ?? "your gym"}.
        {assignment ? " Your current plan is highlighted." : " No plan assigned yet."}
      </p>

      <MemberProgramsClient
        programs={programs}
        assignedProgramId={assignment?.programId ?? null}
        gymName={gymShort}
      />
    </main>
  );
}
