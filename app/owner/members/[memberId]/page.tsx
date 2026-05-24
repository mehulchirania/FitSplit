import { notFound } from "next/navigation";
import { AiProgramBrief } from "@/components/ai-program-brief";
import { Breadcrumb } from "@/components/breadcrumb";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import Link from "next/link";
import { Calendar, Dumbbell, Mail, Phone, UserRound, X } from "@/components/icons";
import { MemberAccessActions } from "@/components/member-access-actions";
import { MemberContextEditor } from "@/components/member-context-editor";
import { MemberDeleteAction } from "@/components/member-delete-action";
import { ProgramAssignmentForm } from "@/components/program-assignment-form";
import { WeeklyProgramSchedule } from "@/components/weekly-program-schedule";
import { requireRole } from "@/lib/auth";
import {
  updateCoachNote
} from "@/lib/firebase/actions";
import {
  getExerciseCatalog,
  getLiftLogsForMember,
  getMemberDetail,
  getProfileMetrics,
  getProgramAssignmentForMember,
  getPTSessionsForMember,
  getTrainersForGym,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

function formatShortDate(value?: string) {
  if (!value) return "Not recorded";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default async function MemberDetailPage({
  params
}: {
  params: Promise<{ memberId: string }>;
}) {
  const currentUser = await requireRole(["admin", "owner"]);
  const { memberId } = await params;

  const [
    { member },
    { assignment },
    { programs },
    { exercises, catalog },
    { profile },
    { liftLogs },
    trainers,
    ptSessions
  ] = await Promise.all([
    getMemberDetail(memberId),
    getProgramAssignmentForMember(memberId),
    getWorkoutPrograms(currentUser.gymId),
    getExerciseCatalog(currentUser.gymId),
    getProfileMetrics(memberId),
    getLiftLogsForMember(memberId),
    getTrainersForGym(currentUser.gymId),
    getPTSessionsForMember(currentUser.gymId, memberId)
  ]);

  if (!member) notFound();

  const program = programs.find((p) => p.id === assignment?.programId);
  const bmi =
    profile.weightKg && profile.heightCm
      ? (profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
      : null;
  const trainingDays = program?.days.filter((day) => day.exercises.length > 0) ?? [];
  const totalExercises = trainingDays.reduce((count, day) => count + day.exercises.length, 0);
  const lastLiftLog = liftLogs[0];

  return (
    <main className="page">
      <section className="mpd-hero">
        <div className="mpd-hero-top">
          <Breadcrumb
            crumbs={[
              { label: "Dashboard", href: "/owner" },
              { label: "Members", href: "/owner/members" },
              { label: member.fullName }
            ]}
          />

          <div className="mpd-identity">
            <span className="mpd-avatar">{member.avatarInitials}</span>
            <div>
              <div className="mpd-name-row">
                <h1 className="mpd-name">{member.fullName}</h1>
                <span className={`status-pill ${member.isActive ? "status-active" : "status-inactive"}`}>
                  {member.isActive ? "Active" : "Suspended"}
                </span>
                {program ? (
                  <span className="status-pill status-neutral mpd-program-pill">
                    <Dumbbell /> {program.title}
                  </span>
                ) : (
                  <span className="status-pill status-expiring">Needs program</span>
                )}
              </div>
              <div className="mpd-meta">
                {member.goal ? (
                  <span className="mpd-meta-item">
                    <UserRound /> {member.goal}
                  </span>
                ) : null}
                <span className="mpd-meta-item mpd-joined">Joined {member.joinedAt}</span>
              </div>
            </div>
          </div>

          <dl className="mpd-contact-list" aria-label="Member contact and login details">
            <div>
              <dt>Username</dt>
              <dd className="mpd-username">{member.username ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                <Mail /> {member.email}
              </dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>
                <Phone /> {member.phone || "Not recorded"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mpd-metrics">
          <div className="mpd-metric">
            <strong>{program ? trainingDays.length : 0}</strong>
            <span>Training days</span>
          </div>
          <div className="mpd-metric">
            <strong>{program ? totalExercises : 0}</strong>
            <span>Exercises</span>
          </div>
          <div className="mpd-metric">
            <strong>{assignment ? formatShortDate(assignment.assignedAt) : "Not assigned"}</strong>
            <span>Assigned</span>
          </div>
          <div className="mpd-metric">
            <strong>{lastLiftLog ? formatShortDate(lastLiftLog.loggedAt) : "No logs"}</strong>
            <span>Last lift</span>
          </div>
          <div className="mpd-metric">
            <strong>{profile.assignedTrainer || "Unassigned"}</strong>
            <span>Trainer</span>
          </div>
          <div className="mpd-metric">
            <strong>{ptSessions.filter((s) => s.status === "scheduled" || s.status === "active").length}</strong>
            <span>PT upcoming</span>
          </div>
        </div>
      </section>

      <div className="mpd-workspace-layout">
        <section className="mpd-primary-stack">
          {program ? (
            <div className="list-panel mpd-main-schedule">
              <div className="panel-title">
                <div>
                  <p className="eyebrow">Current assignment</p>
                  <h2>
                    <Dumbbell /> Weekly schedule
                  </h2>
                </div>
                <span className="status-pill status-neutral">{program.title}</span>
              </div>
              <WeeklyProgramSchedule exercises={exercises} program={program} />
            </div>
          ) : (
            <div className="list-panel mpd-empty-schedule">
              <Dumbbell />
              <h2>No active program assigned</h2>
              <p>Assign a saved program or use the AI match panel to pick the best available plan.</p>
            </div>
          )}

          <MemberContextEditor bmi={bmi} member={member} profile={profile} trainers={trainers} />
        </section>

        <aside className="mpd-side-stack">
          <ConfirmActionForm
            action={updateCoachNote}
            className="form-panel"
            confirmMessage={`This will replace the visible coach note on ${member.fullName}'s dashboard.`}
            confirmTitle="Update coach note?"
            pendingLabel="Saving note..."
            requireConfirmation={false}
            submitLabel={profile.coachNote ? "Update coach note" : "Send coach note"}
          >
            <h2 style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <span>Coach note</span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-faint)", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
                shows on member dashboard
              </span>
            </h2>
            <input name="memberId" type="hidden" value={member.id} />
            <label>
              Message
              <textarea
                defaultValue={profile.coachNote ?? ""}
                maxLength={600}
                name="coachNote"
                placeholder={`e.g. ${member.fullName.split(" ")[0]}, drop to 70kg on squat next week. Form was breaking at 80kg.`}
                rows={3}
              />
            </label>
            {profile.coachNoteUpdatedAt && (
              <p style={{ fontSize: "0.78rem", color: "var(--text-soft)", margin: "4px 0 0" }}>
                Last updated{" "}
                {new Date(profile.coachNoteUpdatedAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
                {profile.coachNoteUpdatedByName ? ` by ${profile.coachNoteUpdatedByName}` : ""}
              </p>
            )}
            <p style={{ fontSize: "0.78rem", color: "var(--text-faint)", margin: "4px 0 0" }}>
              Leave the field empty and save to clear the note.
            </p>
          </ConfirmActionForm>

          <ProgramAssignmentForm
            catalog={catalog}
            currentProgramId={assignment?.programId}
            member={member}
            programs={programs}
          />

          <AiProgramBrief
            defaultGoal={member.goal}
            memberId={member.id}
            memberName={member.fullName}
          />

          <MemberAccessActions
            isActive={member.isActive}
            memberId={member.id}
            username={member.username}
          />

          {/* PT Plans mini-panel */}
          <section className="form-panel">
            <div className="panel-title" style={{ marginBottom: 12 }}>
              <div>
                <p className="eyebrow">Personal training</p>
                <h2><Calendar /> PT Plans</h2>
              </div>
              <Link className="button button-secondary" href={`/owner/training?memberId=${member.id}`} style={{ fontSize: "0.82rem", padding: "6px 12px" }}>
                Assign plan
              </Link>
            </div>
            {ptSessions.length === 0 ? (
              <p style={{ color: "var(--text-soft)", fontSize: "0.85rem" }}>No PT plans yet.</p>
            ) : (
              <ul className="pt-session-mini-list">
                {ptSessions.slice(0, 5).map((s) => (
                  <li key={s.id} className="pt-session-mini-row">
                    <div className="pt-mini-info">
                      <span className="pt-mini-trainer">{s.trainerName ?? "Trainer"}</span>
                      <span className="pt-mini-date">
                        {new Date(s.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className={`status-pill ${s.status === "active" ? "status-active" : s.status === "completed" ? "status-neutral" : s.status === "cancelled" ? "status-inactive" : "status-expiring"}`}>
                      {s.status}
                    </span>
                  </li>
                ))}
                {ptSessions.length > 5 && (
                  <li style={{ padding: "8px 0", textAlign: "center" }}>
                    <Link href={`/owner/training?memberId=${member.id}`} style={{ fontSize: "0.82rem", color: "var(--brand)" }}>
                      View all {ptSessions.length} sessions →
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </section>

          <details className="form-panel mpd-collapsible-panel mpd-danger-panel">
            <summary>
              <span>
                <X /> Danger zone
              </span>
            </summary>
            <MemberDeleteAction memberId={member.id} />
          </details>
        </aside>
      </div>
    </main>
  );
}
