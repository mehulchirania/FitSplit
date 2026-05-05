"use client";

import { useMemo, useState } from "react";

const samplePlans = {
  fat_loss: {
    label: "Fat loss",
    split: ["Full Body Burn", "Upper + Core", "Lower + Conditioning", "Metabolic Circuit", "Active Recovery", "Full Body"],
    focus: "Balanced lifting with conditioning so members stay consistent without random workouts.",
    exercises: ["Goblet squat", "Incline dumbbell press", "Cable row"],
    rest: "45-60 sec"
  },
  muscle_gain: {
    label: "Muscle gain",
    split: ["Push", "Pull", "Legs", "Upper", "Lower", "Arms + Delts"],
    focus: "A hypertrophy-first week built around volume, recovery, and progressive overload.",
    exercises: ["Incline barbell press", "Lat pulldown", "Leg press"],
    rest: "75-90 sec"
  },
  strength: {
    label: "Strength",
    split: ["Heavy Upper", "Heavy Lower", "Push Strength", "Pull Strength", "Leg Strength", "Technique"],
    focus: "Compound lifts first, accessory work second, with rest periods built into the workout view.",
    exercises: ["Barbell bench press", "Back squat", "Romanian deadlift"],
    rest: "2-3 min"
  }
};

type Goal = keyof typeof samplePlans;
type Level = "Beginner" | "Intermediate" | "Advanced";

export function SamplePlanDemo() {
  const [goal, setGoal] = useState<Goal>("muscle_gain");
  const [days, setDays] = useState(5);
  const [level, setLevel] = useState<Level>("Intermediate");

  const preview = useMemo(() => {
    const plan = samplePlans[goal];
    const prescription =
      level === "Beginner" ? "3 x 10" : level === "Intermediate" ? "4 x 8-10" : "5 x 5-8";

    return {
      ...plan,
      prescription,
      days: plan.split.slice(0, days).map((title, index) => ({
        title,
        detail:
          index % 2 === 0
            ? "Bench press, rows, controlled accessories"
            : "Squats, hinges, core, tracked sets"
      }))
    };
  }, [days, goal, level]);

  return (
    <div className="landing-demo-card">
      <div className="landing-demo-form">
        <p className="eyebrow">Interactive demo</p>
        <h2>Build a member-ready split in seconds.</h2>
        <p>
          Pick a goal, schedule, and level. The preview updates like a trainer assigning a real plan.
        </p>

        <label>
          Training goal
          <select value={goal} onChange={(event) => setGoal(event.target.value as Goal)}>
            {Object.entries(samplePlans).map(([value, plan]) => (
              <option key={value} value={value}>
                {plan.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Days per week
          <div className="landing-day-selector">
            {[3, 4, 5, 6].map((dayCount) => (
              <button
                className={days === dayCount ? "is-selected" : ""}
                key={dayCount}
                onClick={() => setDays(dayCount)}
                type="button"
              >
                {dayCount}
              </button>
            ))}
          </div>
        </label>

        <label>
          Training level
          <div className="landing-level-selector">
            {(["Beginner", "Intermediate", "Advanced"] as const).map((option) => (
              <button
                className={level === option ? "is-selected" : ""}
                key={option}
                onClick={() => setLevel(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </label>

        <a className="button button-primary landing-demo-cta" href="#login">
          Create this plan in FitSplit
        </a>
      </div>

      <div className="landing-demo-preview" aria-live="polite">
        <div className="preview-toolbar">
          <span>{preview.label}</span>
          <strong>{days} days/week · {level}</strong>
        </div>
        <h3>{preview.focus}</h3>
        <div className="preview-exercise-cards">
          {preview.exercises.map((exercise) => (
            <div key={exercise}>
              <strong>{exercise}</strong>
              <span>{preview.prescription}</span>
              <small>Rest {preview.rest}</small>
            </div>
          ))}
        </div>
        <div className="preview-split-list">
          {preview.days.map((day, index) => (
            <div className="preview-split-row" key={`${day.title}-${index}`}>
              <span>Day {index + 1}</span>
              <strong>{day.title}</strong>
              <small>{day.detail}</small>
            </div>
          ))}
        </div>
        <div className="assigned-preview">
          <span>Assigned to</span>
          <strong>Arjun Rao · Member app preview ready</strong>
        </div>
      </div>
    </div>
  );
}
