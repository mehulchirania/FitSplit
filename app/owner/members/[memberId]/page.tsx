import { notFound } from "next/navigation";
import { AiProgramBrief } from "@/components/ai-program-brief";
import { Breadcrumb } from "@/components/breadcrumb";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { Activity, Dumbbell, Mail, Phone, UserRound, X } from "@/components/icons";
import { MemberContextEditor } from "@/components/member-context-editor";
import { ProgramAssignmentForm } from "@/components/program-assignment-form";
import { WeeklyProgramSchedule } from "@/components/weekly-program-schedule";
import { requireRole } from "@/lib/auth";
import {
  deleteMemberProfile,
  resetPassword,
  toggleMemberAccess
} from "@/lib/firebase/actions";
import {
  getExerciseCatalog,
  getLiftLogsForMember,
  getMemberDetail,
  getProfileMetrics,
  getProgramAssignmentForMember,
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
    { exercises },
    { profile },
    { liftLogs }
  ] = await Promise.all([
    getMemberDetail(memberId),
    getProgramAssignmentForMember(memberId),
    getWorkoutPrograms(currentUser.gymId),
    getExerciseCatalog(currentUser.gymId),
    getProfileMetrics(memberId),
    getLiftLogsForMember(memberId)
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

          <MemberContextEditor bmi={bmi} member={member} profile={profile} />
        </section>

        <aside className="mpd-side-stack">
          <ProgramAssignmentForm
            currentProgramId={assignment?.programId}
            member={member}
            programs={programs}
          />

          <AiProgramBrief
            defaultGoal={member.goal}
            memberId={member.id}
            memberName={member.fullName}
          />

          <section className="form-panel mpd-account-panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">Member login</p>
                <h2>
                  <Activity /> Account access
                </h2>
                <p className="mpd-login-username">
                  Username: <strong>{member.username ?? "Not set"}</strong>
                </p>
              </div>
              <span className={`status-pill ${member.isActive ? "status-active" : "status-inactive"}`}>
                {member.isActive ? "Enabled" : "Suspended"}
              </span>
            </div>
            <ConfirmActionForm
              action={toggleMemberAccess}
              className="mpd-account-section"
              confirmMessage={
                member.isActive
                  ? "This will disable the member's login access immediately."
                  : "This will restore the member's login access."
              }
              confirmTitle={member.isActive ? "Suspend member?" : "Restore member?"}
              pendingLabel="Updating..."
              submitClassName={`access-toggle ${member.isActive ? "is-on" : "is-off"}`}
              submitLabel={member.isActive ? "Access enabled" : "Access suspended"}
            >
              <input name="memberId" type="hidden" value={member.id} />
              <input name="isActive" type="hidden" value={(!member.isActive).toString()} />
              <p className="mpd-section-hint">
                {member.isActive
                  ? "Toggle only when this member should no longer access their workout app."
                  : "Restore when this member should regain app access."}
              </p>
            </ConfirmActionForm>

            <ConfirmActionForm
              action={resetPassword}
              className="mpd-account-section"
              confirmMessage="This will reset the member's login PIN."
              confirmTitle="Reset PIN?"
              pendingLabel="Resetting..."
              submitLabel="Reset PIN"
            >
              <input name="userId" type="hidden" value={member.id} />
              <p className="mpd-section-label">Reset login PIN</p>
              <label>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  name="newPin"
                  pattern="\d{4}"
                  placeholder="Enter new 4-digit PIN"
                  required
                />
              </label>
            </ConfirmActionForm>
          </section>

          <details className="form-panel mpd-collapsible-panel mpd-danger-panel">
            <summary>
              <span>
                <X /> Danger zone
              </span>
            </summary>
            <ConfirmActionForm
              action={deleteMemberProfile}
              className="mpd-account-section"
              confirmMessage="This permanently deletes the member and all their data. This cannot be undone."
              confirmTitle="Delete member?"
              pendingLabel="Deleting..."
              submitClassName="button button-danger"
              submitLabel="Delete member"
              successRedirect="/owner/members"
            >
              <input name="memberId" type="hidden" value={member.id} />
              <p className="mpd-section-hint">
                Permanently removes this profile, assignments, lift logs, notifications, and sessions.
              </p>
            </ConfirmActionForm>
          </details>
        </aside>
      </div>
    </main>
  );
}

