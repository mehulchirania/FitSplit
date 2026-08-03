import { notFound } from "next/navigation";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import Link from "next/link";
import { Dumbbell, Mail, Phone } from "@/components/icons";
import { MemberAccessActions } from "@/components/member-access-actions";
import { MemberContextEditor } from "@/components/member-context-editor";
import { MemberDeleteAction } from "@/components/member-delete-action";
import { ProgramAssignmentForm } from "@/components/program-assignment-form";
import { TrainerPtPanel } from "@/components/trainer-pt-panel";
import { WeeklyProgramSchedule } from "@/components/weekly-program-schedule";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { updateCoachNote } from "@/lib/firebase/actions";
import { CoachMessageThread } from "@/components/coach-message-thread";
import { ExerciseSwapNotes } from "@/components/exercise-swap-notes";
import {
  getCoachThreadForMember,
  getExerciseCatalog,
  getExerciseSwapsForMember,
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
      year: "numeric",
      timeZone: "Asia/Kolkata"
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

  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
  const [
    { member },
    { assignment },
    { programs },
    { exercises, catalog },
    { profile },
    { liftLogs },
    trainers,
    ptSessions,
    { messages: coachMessages },
    { swapsByDay }
  ] = await Promise.all([
    getMemberDetail(memberId),
    getProgramAssignmentForMember(memberId, gymId),
    getWorkoutPrograms(gymId),
    getExerciseCatalog(gymId),
    getProfileMetrics(memberId),
    getLiftLogsForMember(memberId, gymId),
    getTrainersForGym(gymId),
    getPTSessionsForMember(gymId, memberId),
    getCoachThreadForMember(memberId, gymId),
    getExerciseSwapsForMember(memberId, gymId)
  ]);

  if (!member) notFound();

  const program = programs.find((p) => p.id === assignment?.programId);
  const assignedProgramDeleted = !!assignment && !program;
  const bmi =
    profile.weightKg && profile.heightCm
      ? (profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
      : null;
  const trainingDays = program?.days.filter((day) => day.exercises.length > 0) ?? [];
  const lastLiftLog = liftLogs[0];
  const upcomingPT = ptSessions.filter(
    (s) => s.status === "scheduled" || s.status === "active"
  ).length;

  return (
    <div className="odp2-scroll">
      <div className="adm-page-head" style={{ marginBottom: 0, paddingBottom: 12 }}>
        <div>
          <div className="adm-crumb">
            Members / <Link href="/owner/members" className="adm-link">All members</Link> / {member.fullName}
          </div>
        </div>
        <div className="adm-head-actions">
          <Link href="/owner/members" className="adm-btn adm-btn--ghost">← All members</Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          HERO — avatar · name · status · contact strip · metrics bar
          ══════════════════════════════════════════════════════════════ */}
      <section className="mpd-hero">
        <div className="mpd-hero-body">

          {/* Identity row */}
          <div className="mpd-hero-identity">
            <span className="mpd-avatar">{member.avatarInitials}</span>
            <div className="mpd-hero-name-block">
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

              {/* Goal + join date */}
              {(member.goal || member.joinedAt) && (
                <p className="mpd-hero-subline">
                  {member.goal && <span>{member.goal}</span>}
                  {member.goal && member.joinedAt && <span className="mpd-hero-sep">·</span>}
                  {member.joinedAt && (
                    <span className="mpd-hero-dim">Joined {formatShortDate(member.joinedAt)}</span>
                  )}
                </p>
              )}

              {/* Contact chips */}
              <div className="mpd-hero-contacts">
                {member.email && (
                  <span className="mpd-contact-chip">
                    <Mail /> {member.email}
                  </span>
                )}
                {member.phone && (
                  <span className="mpd-contact-chip">
                    <Phone /> {member.phone}
                  </span>
                )}
                {member.username && (
                  <span className="mpd-contact-chip">
                    <span className="mpd-username-at">@</span>
                    <span className="mpd-username">{member.username}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Simplified Metrics strip */}
        <div className="mpd-metrics">
          <div className="mpd-metric">
            <strong>{program ? trainingDays.length : 0}</strong>
            <span>Days / week</span>
          </div>
          <div className="mpd-metric">
            <strong>{lastLiftLog ? formatShortDate(lastLiftLog.loggedAt) : "No logs"}</strong>
            <span>Last active</span>
          </div>
          <div className={`mpd-metric${profile.assignedTrainer ? "" : " mpd-metric--empty"}`}>
            <strong>{profile.assignedTrainer || "None"}</strong>
            <span>Trainer</span>
          </div>
          <div className={`mpd-metric${upcomingPT > 0 ? " mpd-metric--brand" : ""}`}>
            <strong>{upcomingPT}</strong>
            <span>PT Sessions</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          WORKSPACE — primary column + sidebar
          ══════════════════════════════════════════════════════════════ */}
      <div className="mpd-workspace-layout">

        {/* ── Primary column ── */}
        <section className="mpd-primary-stack">

          {/* Program schedule */}
          {program ? (
            <div className="list-panel mpd-main-schedule">
              <div className="panel-title">
                <div>
                  <p className="eyebrow">Current assignment</p>
                  <h2><Dumbbell /> Weekly schedule</h2>
                </div>
                <span className="status-pill status-neutral">{program.title}</span>
              </div>
              <WeeklyProgramSchedule exercises={exercises} program={program} />
            </div>
          ) : null}

          {program && <ExerciseSwapNotes swapsByDay={swapsByDay} program={program} exercises={exercises} />}

          {!program && (
            <div className="list-panel mpd-empty-schedule">
              <Dumbbell />
              <h2>Needs a Workout Plan</h2>
              <p>Use the <strong>Assign program</strong> panel on the right to pick a plan or build a custom one.</p>
            </div>
          )}

          {/* Member profile context */}
          <MemberContextEditor bmi={bmi} member={member} profile={profile} trainers={trainers} />

          {/* Coach note */}
          <ConfirmActionForm
            action={updateCoachNote}
            className="form-panel"
            confirmMessage={`This will replace the visible coach note on ${member.fullName}'s dashboard.`}
            confirmTitle="Update coach note?"
            pendingLabel="Saving note..."
            requireConfirmation={false}
            submitLabel={profile.coachNote ? "Update coach note" : "Send coach note"}
          >
            <h2 className="mpd-note-head">
              <span>Coach note</span>
              <span className="mpd-note-hint">shows on member dashboard</span>
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
              <p className="mpd-note-meta">
                Last updated{" "}
                {new Date(profile.coachNoteUpdatedAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Kolkata"
                })}
                {profile.coachNoteUpdatedByName ? ` by ${profile.coachNoteUpdatedByName}` : ""}
              </p>
            )}
            <p className="mpd-note-clear-hint">
              Leave the field empty and save to clear the note.
            </p>
          </ConfirmActionForm>

          {/* Two-way thread with this member. The coach note above is a single
              pinned broadcast; this is the actual conversation. */}
          <CoachMessageThread
            memberId={member.id}
            memberName={member.fullName}
            initialMessages={coachMessages}
          />

        </section>

        {/* ── Sidebar ── */}
        <aside className="mpd-side-stack">

          {/* Trainer + PT (most common action — lives at top) */}
          <TrainerPtPanel
            memberId={member.id}
            currentTrainer={profile.assignedTrainer}
            trainers={trainers}
            ptSessions={ptSessions}
          />

          {/* Assign / change program */}
          {assignedProgramDeleted && (
            <div className="form-message form-message-warning" role="alert">
              <strong>Program no longer exists.</strong> The program previously assigned to{" "}
              {member.fullName} (ID: <code>{assignment!.programId}</code>) has been deleted.
              Please assign a new program below.
            </div>
          )}

          <ProgramAssignmentForm
            catalog={catalog}
            currentProgramId={assignment?.programId}
            member={member}
            programs={programs}
          />

          {/* Account access */}
          <details className="form-panel mpd-collapsible-panel">
            <summary>
              <span>Account access</span>
              <span className="mpd-collapsible-chevron">▾</span>
            </summary>
            <div className="mpd-collapsible-body">
              <MemberAccessActions
                isActive={member.isActive}
                memberId={member.id}
                username={member.username}
              />
            </div>
          </details>

          {/* Danger zone */}
          <details className="form-panel mpd-collapsible-panel mpd-danger-panel">
            <summary>
              <span>Danger zone</span>
              <span className="mpd-collapsible-chevron">▾</span>
            </summary>
            <div className="mpd-collapsible-body">
              <MemberDeleteAction memberId={member.id} />
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}
