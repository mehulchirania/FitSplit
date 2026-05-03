import { CustomPlanBuilder } from "@/components/custom-plan-builder";
import { Dumbbell } from "@/components/icons";
import { ExerciseList } from "@/components/exercise-list";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { exerciseCatalogByMuscle, programs } from "@/lib/mock-data";

const splitLabels: Record<string, string> = {
  ppl_x2: "PPL x 2",
  ppl_upper_lower: "PPL Upper Lower",
  bro_split: "Bro Split",
  combo_x2: "Chest+Tricep / Back+Bicep / Legs+Shoulder x2",
  custom: "Custom"
};

export default function ProgramsPage() {
  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <p className="eyebrow">Workout splits</p>
          <h1>Training plans from the catalog.</h1>
          <p>
            Titan V2 Fitness now has the requested split templates, each built
            from the owner-only exercise catalog.
          </p>
        </div>
        <aside className="builder-stack">
          <WorkspaceSwitcher />
          <CustomPlanBuilder catalog={exerciseCatalogByMuscle} />
        </aside>
      </section>

      <section className="program-grid">
        {programs.map((program) => (
          <article className="program-card" key={program.id}>
            <div
              className="program-media"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1534258936925-c58bed479fcb?auto=format&fit=crop&w=1000&q=80)"
              }}
            />
            <div className="program-card-body">
              <p className="eyebrow">{splitLabels[program.splitType]}</p>
              <h2>
                <Dumbbell className="program-title-icon" /> {program.title}
              </h2>
              <p>{program.description}</p>
              <div className="toolbar">
                <span className="status-pill status-neutral">
                  {program.daysPerWeek} days/week
                </span>
                <span className="status-pill status-active">
                  {program.days.length} sessions
                </span>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="list-panel" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <h2>{programs[0].title} preview</h2>
          <span className="status-pill status-neutral">
            {programs[0].days[0].title}
          </span>
        </div>
        <div className="notification-list">
          <ExerciseList items={programs[0].days[0].exercises} />
        </div>
      </section>
    </main>
  );
}
