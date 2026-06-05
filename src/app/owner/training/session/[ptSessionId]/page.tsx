import { notFound } from "next/navigation";
import Link from "next/link";
import { TrainerLiveConsole } from "@/components/trainer-live-console";
import { requireRole } from "@/lib/auth";
import {
  getExerciseCatalog,
  getPTLiftLogsForSession,
  getPTSessionDetail
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";


export default async function PTSessionConsolePage({
  params
}: {
  params: Promise<{ ptSessionId: string }>;
}) {
  const currentUser = await requireRole(["admin", "owner"]);
  const { ptSessionId } = await params;

  const session = await getPTSessionDetail(ptSessionId);
  if (!session) notFound();
  if (currentUser.role !== "admin" && currentUser.gymId !== session.gymId) notFound();

  const [liftLogs, { exercises }] = await Promise.all([
    getPTLiftLogsForSession(session.gymId, ptSessionId),
    getExerciseCatalog(session.gymId)
  ]);

  return (
    <div className="odp2-scroll">
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Training / Session</div>
          <h1 className="adm-title" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {session.memberName ?? session.memberId}
            <span className={`adm-inbox-tag${session.status === "active" ? " adm-inbox-tag--ok" : session.status === "scheduled" ? " adm-inbox-tag--warn" : " adm-inbox-tag--accent"}`}>
              {session.status.toUpperCase()}
            </span>
          </h1>
          <p style={{ color: "var(--text-soft)", fontSize: 13, marginTop: 2 }}>
            with {session.trainerName ?? session.trainerId}
          </p>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn adm-btn--ghost" href="/owner/training">← Back to schedule</Link>
        </div>
      </div>

      <TrainerLiveConsole
        session={session}
        initialLiftLogs={liftLogs}
        exercises={exercises}
      />
    </div>
  );
}
