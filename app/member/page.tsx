import { Bell, Dumbbell } from "@/components/icons";
import { MemberWorkoutConsole } from "@/components/member-workout-console";
import { NotificationList } from "@/components/notification-list";
import { EditableMetrics } from "@/components/editable-metrics";
import {
  getActiveWorkoutSessions,
  getExerciseCatalog,
  getLiftLogsForMember,
  getMemberDetail,
  getMemberNotifications,
  getProgramAssignmentForMember,
  getTitanWorkspace,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";

import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function MemberDashboard() {
  const cookieStore = await cookies();
  const currentMemberId = cookieStore.get("fitsplit-member-id")?.value || "member-aarav";
  const [
    { gym },
    { member },
    { assignment },
    { programs },
    { notifications: memberNotifications },
    { liftLogs },
    { exercises },
    { sessions }
  ] = await Promise.all([
    getTitanWorkspace(),
    getMemberDetail(currentMemberId),
    getProgramAssignmentForMember(currentMemberId),
    getWorkoutPrograms(),
    getMemberNotifications(currentMemberId),
    getLiftLogsForMember(currentMemberId),
    getExerciseCatalog(),
    getActiveWorkoutSessions()
  ]);

  if (!member) {
    return null;
  }

  const program = programs.find((item) => item.id === assignment?.programId) ?? programs[0];

  return (
    <main className="page">
      <section className="dashboard-header">
        <div className="header-copy">
          <p className="eyebrow">Welcome, {member.fullName.split(" ")[0]}</p>
          <h1>Let&apos;s get fit!</h1>
          <EditableMetrics member={member} />
        </div>

        <aside className="summary-panel">
          <div className="panel-title">
            <h2>
              <Dumbbell /> Assigned program
            </h2>
            <span className="status-pill status-active">Training active</span>
          </div>
          <div className="detail-window">
            <span>
              Program
              <strong>{program.title}</strong>
            </span>
            <span>
              Weekly days
              <strong>{program.daysPerWeek}</strong>
            </span>
            <span>
              Goal
              <strong>{program.goal}</strong>
            </span>
          </div>
        </aside>
      </section>

      <MemberWorkoutConsole
        exercises={exercises}
        initialActiveSessionCount={sessions.length}
        initialLiftLogs={liftLogs}
        memberId={member.id}
        program={program}
      />

      <section className="content-grid" style={{ marginTop: 16 }}>
        <aside className="list-panel">
          <div className="panel-title">
            <h2>
              <Bell /> Notifications
            </h2>
          </div>
          <NotificationList items={memberNotifications} />
        </aside>
      </section>
    </main>
  );
}
