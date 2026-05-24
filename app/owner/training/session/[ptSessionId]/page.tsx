import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { TrainerLiveConsole } from "@/components/trainer-live-console";
import { requireRole } from "@/lib/auth";
import {
  getExerciseCatalog,
  getPTLiftLogsForSession,
  getPTSessionDetail
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<string, string> = {
  scheduled: "status-expiring",
  active: "status-active",
  completed: "status-neutral",
  cancelled: "status-inactive"
};

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
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb
            crumbs={[
              { label: "Dashboard", href: "/owner" },
              { label: "Training", href: "/owner/training" },
              { label: `Session — ${session.memberName ?? session.memberId}` }
            ]}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>
              {session.memberName ?? session.memberId}
            </h1>
            <span className={`status-pill ${STATUS_PILL[session.status] ?? "status-neutral"}`}>
              {session.status}
            </span>
          </div>
          <p style={{ color: "var(--text-soft)" }}>
            with {session.trainerName ?? session.trainerId}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Link className="button button-secondary" href="/owner/training">
            ← Back to schedule
          </Link>
        </div>
      </section>

      <TrainerLiveConsole
        session={session}
        initialLiftLogs={liftLogs}
        exercises={exercises}
      />
    </main>
  );
}
