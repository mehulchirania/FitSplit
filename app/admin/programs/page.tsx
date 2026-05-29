import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  getActiveProgramAssignments,
  getExerciseCatalog,
  getGymWorkspaces,
  getMembers,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";
import { WorkoutProgramGallery } from "@/components/workout-program-gallery";
import { CustomPlanBuilder } from "@/components/custom-plan-builder";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";

export const dynamic = "force-dynamic";

export default async function AdminProgramsPage() {
  await requireRole(["admin"]);

  const [{ gyms }, { programs }, { assignments }, { catalog, exercises }, { members }] = await Promise.all([
    getGymWorkspaces(),
    getWorkoutPrograms(PRIMARY_GYM_ID),
    getActiveProgramAssignments(PRIMARY_GYM_ID),
    getExerciseCatalog(PRIMARY_GYM_ID),
    getMembers(PRIMARY_GYM_ID),
  ]);

  const mostUsed = programs.length > 0
    ? programs.reduce((best, p) =>
        (assignments.filter(a => a.programId === p.id).length > assignments.filter(a => a.programId === best.id).length) ? p : best
      , programs[0])
    : null;

  const gymUsingPreset = gyms.filter(g => g.status === "active").length;

  return (
    <div className="odp2-scroll">
      {/* Header */}
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Admin / Programs</div>
          <h1 className="adm-title">Preset program catalog</h1>
        </div>
        <div className="adm-head-actions">
          <Link href="/admin/inbox" className="adm-btn adm-btn--ghost">Inbox</Link>
          <a href="#create-program" className="adm-btn">+ New preset</a>
        </div>
      </div>

      <p className="adm-page-desc">
        Master library of presets available to all gyms. Edit or expand a program in-place below.
      </p>

      {/* KPI row */}
      <div className="adm-kpis" style={{ marginBottom: 20 }}>
        <div className="adm-kpi adm-kpi--brand">
          <small>PRESETS</small>
          <strong>{programs.length}</strong>
        </div>
        <div className="adm-kpi">
          <small>GYMS USING</small>
          <strong>{gymUsingPreset}/{gyms.length}</strong>
        </div>
        <div className="adm-kpi adm-kpi--accent">
          <small>MOST POPULAR</small>
          <strong>{mostUsed?.title ?? "—"}</strong>
        </div>
        <div className="adm-kpi">
          <small>EXERCISES</small>
          <strong>{exercises.length}</strong>
        </div>
      </div>

      {/* Inline program gallery — allows viewing and editing programs */}
      <WorkoutProgramGallery
        assignments={assignments}
        catalog={catalog}
        exercises={exercises}
        members={members}
        programs={programs}
      />

      {/* Create new program */}
      <details className="adm-details-panel" id="create-program" style={{ marginTop: 16 }}>
        <summary className="adm-details-panel__summary">Create a new preset program</summary>
        <div className="adm-details-panel__body">
          <CustomPlanBuilder catalog={catalog} />
        </div>
      </details>
    </div>
  );
}
