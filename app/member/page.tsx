import { Bell, Dumbbell, Calendar } from "@/components/icons";
import { MemberWorkoutConsole } from "@/components/member-workout-console";
import { NotificationList } from "@/components/notification-list";
import { EditableMetrics } from "@/components/editable-metrics";
import { AttendanceCalendar } from "@/components/attendance-calendar";
import {
  getActiveWorkoutSessions,
  getAttendanceRecords,
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
    { sessions },
    { records: attendanceRecords }
  ] = await Promise.all([
    getTitanWorkspace(),
    getMemberDetail(currentMemberId),
    getProgramAssignmentForMember(currentMemberId),
    getWorkoutPrograms(),
    getMemberNotifications(currentMemberId),
    getLiftLogsForMember(currentMemberId),
    getExerciseCatalog(),
    getActiveWorkoutSessions(),
    getAttendanceRecords(currentMemberId)
  ]);

  if (!member) {
    return null;
  }

  const program = programs.find((item) => item.id === assignment?.programId) ?? programs[0];
  const attendanceCount = attendanceRecords.filter(r => {
    const d = new Date(r.checkInAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <main className="page">
      <section className="dashboard-header">
        <div className="header-copy">
          <p className="eyebrow">Welcome, {member.fullName.split(" ")[0]}</p>
          <h1>Let&apos;s get fit!</h1>
          <EditableMetrics member={member} />
        </div>

        <aside className="ui-cards" style={{ alignContent: "start", height: "fit-content", gap: 15 }}>
          <article className="ui-card blue">
            <p className="tip" style={{ fontSize: "1.2em" }}><Dumbbell /> {program.title}</p>
            <p className="second-text">Assigned Program</p>
          </article>
          <article className="ui-card green">
            <p className="tip" style={{ fontSize: "1.2em" }}><Calendar /> {attendanceCount} days</p>
            <p className="second-text">Monthly Attendance</p>
          </article>
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

        <aside className="list-panel">
          <div className="panel-title">
            <h2>
              <Calendar /> Attendance
            </h2>
          </div>
          <AttendanceCalendar records={attendanceRecords} />
        </aside>
      </section>
    </main>
  );
}

