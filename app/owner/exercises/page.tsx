import { Dumbbell, Video } from "@/components/icons";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { muscleGroups } from "@/lib/mock-data";
import { createCatalogExercise } from "@/lib/firebase/actions";
import { getExerciseCatalog } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function ExerciseCatalogPage() {
  const {
    exercises,
    catalog: exerciseCatalogByMuscle,
    isPersisted
  } = await getExerciseCatalog();

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <p className="eyebrow">Owner-only catalog</p>
          <h1>Exercise catalog.</h1>
          <p>
            Titan V2 Fitness owners build programs from this private catalog.
            Members only see exercises that are part of their assigned plan.
          </p>
          <span className={`status-pill ${isPersisted ? "status-active" : "status-neutral"}`}>
            {isPersisted ? "Reading from Firestore" : "Using JSON catalog"}
          </span>
        </div>
        <form action={createCatalogExercise} className="form-panel">
          <WorkspaceSwitcher />
          <h2>Add catalog exercise</h2>
          <div className="form-grid">
            <label>
              Exercise name
              <input name="name" placeholder="Incline dumbbell press" />
            </label>
            <label>
              Muscle group
              <select name="muscleGroup" defaultValue="Chest">
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
                <option value="upload">Firebase Storage path</option>
              </select>
            </label>
          </div>
          <label>
            Video URL or upload path
            <input name="videoUrl" placeholder="YouTube, Vimeo, or Firebase Storage path" />
          </label>
          <label>
            Coaching instructions
            <textarea name="instructions" placeholder="Setup, tempo, range of motion, cues" />
          </label>
          <button className="button button-primary" type="submit">
            Save exercise to Firebase
          </button>
        </form>
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
