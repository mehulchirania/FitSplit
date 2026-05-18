import { ConfirmActionForm } from "@/components/confirm-action-form";
import { Dumbbell, Video } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { createCatalogExercise } from "@/lib/firebase/actions";
import { getExerciseCatalog } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function ExerciseCatalogPage() {
  const currentUser = await requireRole(["admin", "owner"]);

  const {
    exercises,
    catalog: exerciseCatalogByMuscle
  } = await getExerciseCatalog(currentUser.gymId);
  const muscleGroups = exerciseCatalogByMuscle.map((group) => group.muscleGroup);

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <p className="eyebrow">Owner-only catalog</p>
          <h1>Exercise catalog.</h1>
          <p>
            Sri Shakti Hanuman Gym owners build programs from this private catalog.
            Members only see exercises that are part of their assigned plan.
          </p>
        </div>
        <aside className="summary-panel">
          <p>
            Browse the owner-only catalog below. Add new custom exercises in the
            Custom Workouts section before using them in programs.
          </p>
        </aside>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <Dumbbell />
          <strong>{exercises.length}</strong>
          <span>Total exercises</span>
        </article>
        <article className="stat-card">
          <Video />
          <strong>{muscleGroups.length}</strong>
          <span>Muscle groups</span>
        </article>
      </section>

      <section className="list-panel" id="custom-workouts" style={{ marginBottom: 16 }}>
        <div className="panel-title">
          <h2>Custom Workouts</h2>
          <span className="status-pill status-neutral">Owner-created exercises</span>
        </div>
        <div className="notification-list">
          <ConfirmActionForm
            action={createCatalogExercise}
            className="form-panel"
            confirmMessage="This will add the custom exercise to the owner-only catalog."
            confirmTitle="Save custom exercise?"
            pendingLabel="Saving custom exercise..."
            submitLabel="Save custom exercise"
          >
            <h2>Add custom exercise</h2>
            <div className="form-grid">
              <label>
                Exercise name
                <input name="name" placeholder="Incline dumbbell press" required />
              </label>
              <label>
                Muscle group
                <select name="muscleGroup" defaultValue="Chest" required>
                  {muscleGroups.map((muscleGroup) => (
                    <option key={muscleGroup} value={muscleGroup}>
                      {muscleGroup}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Equipment
                <input name="equipment" placeholder="Dumbbells, cable, machine" />
              </label>
              <label>
                Video source
                <select name="videoSource" defaultValue="none">
                  <option value="none">None</option>
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="upload">Upload path</option>
                </select>
              </label>
            </div>
            <label>
              Video URL or upload path
              <input name="videoUrl" placeholder="YouTube, Vimeo, or upload path" />
            </label>
            <label>
              Coaching instructions
              <textarea name="instructions" placeholder="Setup, tempo, range of motion, cues" />
            </label>
          </ConfirmActionForm>
        </div>
      </section>

      <section className="catalog-grid">
        {exerciseCatalogByMuscle.map((group) => (
          <article className="list-panel" key={group.muscleGroup}>
            <div className="panel-title">
              <h2>{group.muscleGroup}</h2>
              <span className="status-pill status-neutral">
                {group.exercises.length} exercises
              </span>
            </div>
            <div className="catalog-list">
              {group.exercises.map((exercise) => (
                <div className="catalog-item" key={exercise.id}>
                  <strong>{exercise.name}</strong>
                  <span>{exercise.equipment}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
