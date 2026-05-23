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

  const [session, liftLogs, { exercises }] = await Promise.all([
    getPTSessionDetail(ptSessionId),
    getPTLiftLogsForSession(currentUser.gymId, ptSessionId),
    getExerciseCatalog(currentUser.gymId)
  ]);

  if (!session) notFound();

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
