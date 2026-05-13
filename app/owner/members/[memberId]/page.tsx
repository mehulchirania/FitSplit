import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { Dumbbell, Calendar } from "@/components/icons";
import { ProgramAssignmentForm } from "@/components/program-assignment-form";
import { WeeklyProgramSchedule } from "@/components/weekly-program-schedule";
import { AttendanceCalendar } from "@/components/attendance-calendar";
import { requireRole } from "@/lib/auth";
import { updateMemberProfile, resetPassword, toggleMemberAccess } from "@/lib/firebase/actions";
import {
  getAttendanceRecords,
  getExerciseCatalog,
  getMemberDetail,
  getProgramAssignmentForMember,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function MemberDetailPage({
  params
}: {
  params: Promise<{ memberId: string }>;
}) {
  await requireRole(["admin", "owner"]);

  const { memberId } = await params;
  const [
    { member },
    { assignment },
    { programs },
    { exercises },
    { records: attendanceRecords }
  ] = await Promise.all([
    getMemberDetail(memberId),
    getProgramAssignmentForMember(memberId),
    getWorkoutPrograms(),
    getExerciseCatalog(),
    getAttendanceRecords(memberId)
  ]);

  if (!member) {
    notFound();
  }

  const program = programs.find((item) => item.id === assignment?.programId);

  return (
    <main className="page">
      <section className="dashboard-header">
        <div className="header-copy">
          <p className="eyebrow">Member record</p>
          <h1>{member.fullName}</h1>
          <p>
            {member.goal}. Use this workspace to update training profile
            details, review assigned weekly programming, and prepare future AI
            draft flows.
          </p>
          <div className="quick-actions">
            <Link className="button button-primary" href="/owner/members">
              Back to members
            </Link>
            <Link className="button button-secondary" href="/owner/programs">
              Assign program
            </Link>
          </div>
        </div>

        <aside className="summary-panel">
          <div className="panel-title">
            <h2>
              <Dumbbell /> Training assignment
            </h2>
            <span className="status-pill status-active">
              {program ? "Program assigned" : "Needs program"}
            </span>
          </div>
          <div className="detail-window">
            <span>
              Current program
              <strong>{program?.title ?? "Not assigned"}</strong>
            </span>
            <span>
              Weekly days
              <strong>{program?.days.length ?? 0}</strong>
            </span>
            <span>
              Assigned
              <strong>{assignment ? "Active" : "Pending"}</strong>
            </span>
            <span>
              Goal
              <strong>{member.goal}</strong>
            </span>
          </div>
        </aside>
      </section>

      <section className="content-grid">
        <ConfirmActionForm
          action={updateMemberProfile}
          className="form-panel"
          confirmMessage="This will update the member profile information visible to the owner and member."
          confirmTitle="Save member edits?"
          pendingLabel="Saving details..."
          submitLabel="Save member details"
        >
          <h2>Edit member</h2>
          <input name="memberId" type="hidden" value={member.id} />
          <div className="form-grid">
            <label>
              Full name
              <input name="fullName" defaultValue={member.fullName} required />
            </label>
            <label>
              Email
              <input name="email" type="email" defaultValue={member.email} required />
            </label>
            <label>
              Phone
              <input name="phone" defaultValue={member.phone} />
            </label>
            <label>
              Goal
              <input name="goal" defaultValue={member.goal} />
            </label>
          </div>
        </ConfirmActionForm>

        <ProgramAssignmentForm
          currentProgramId={assignment?.programId}
          member={member}
          programs={programs}
        />
      </section>

      <section className="content-grid" style={{ marginTop: 16 }}>
        <aside className="form-panel">
          <h2>AI program brief</h2>
          <label>
            Goals and constraints
            <textarea defaultValue={`${member.goal}. 3 days per week. No injuries reported.`} />
          </label>
          <button className="button button-secondary" type="button">
            Generate draft later
          </button>
        </aside>
        
        <ConfirmActionForm
          action={toggleMemberAccess}
          className="form-panel access-toggle-panel"
          confirmMessage={member.isActive ? "This will disable the member's login access." : "This will re-enable the member's login access."}
          confirmTitle={member.isActive ? "Suspend member access?" : "Restore member access?"}
          pendingLabel="Updating access..."
          submitClassName={`access-toggle ${member.isActive ? "is-on" : "is-off"}`}
          submitLabel={member.isActive ? "Active" : "Inactive"}
        >
          <h2>Access Control</h2>
          <p style={{ marginBottom: "16px", color: "var(--text-muted)" }}>
            {member.isActive 
              ? "Member login is currently enabled. Toggle to make this member inactive." 
              : "Member login is currently disabled. Toggle to make this member active."}
          </p>
          <input name="memberId" type="hidden" value={member.id} />
          <input name="isActive" type="hidden" value={(!member.isActive).toString()} />
        </ConfirmActionForm>

        <ConfirmActionForm
          action={resetPassword}
          className="form-panel"
          confirmMessage="This will reset the member's login PIN to a new value. Are you sure?"
          confirmTitle="Reset Member PIN"
          pendingLabel="Resetting..."
          submitLabel="Reset PIN"
        >
          <h2>Account PIN</h2>
          <p style={{ marginBottom: "16px", color: "var(--text-muted)" }}>
            If a member has forgotten their PIN, you can reset it here. The default reset PIN is '1234'.
          </p>
          <input name="userId" type="hidden" value={member.id} />
          <label>
            New 4-digit PIN
            <input inputMode="numeric" name="newPin" pattern="\d{4}" defaultValue="1234" maxLength={4} required />
          </label>
        </ConfirmActionForm>
      </section>

      <section className="content-grid" style={{ marginTop: 16 }}>
        <div className="list-panel">
          <div className="panel-title">
            <h2>
              <Calendar /> Attendance history
            </h2>
          </div>
          <AttendanceCalendar records={attendanceRecords} />
        </div>

        {program ? (
          <div className="list-panel">
            <div className="panel-title">
              <h2>
                <Dumbbell /> Assigned weekly schedule
              </h2>
              <span className="status-pill status-neutral">{program.title}</span>
            </div>
            <WeeklyProgramSchedule exercises={exercises} program={program} />
          </div>
        ) : null}
      </section>
    </main>
  );
}
