"use client";

import { useMemo, useState } from "react";

const samplePlans = {
  fat_loss: {
    label: "Fat loss",
    split: ["Upper Strength", "Lower Strength", "Conditioning", "Full Body"],
    focus: "Balanced lifting with conditioning so members stay consistent without random workouts."
  },
  muscle_gain: {
    label: "Muscle gain",
    split: ["Push", "Pull", "Legs", "Upper", "Lower"],
    focus: "A hypertrophy-first week built around volume, recovery, and progressive overload."
  },
  strength: {
    label: "Strength",
    split: ["Heavy Upper", "Heavy Lower", "Push", "Pull", "Legs"],
    focus: "Compound lifts first, accessory work second, with rest periods built into the workout view."
  }
};

type Goal = keyof typeof samplePlans;

export function SamplePlanDemo() {
  const [goal, setGoal] = useState<Goal>("muscle_gain");
  const [days, setDays] = useState(5);

  const preview = useMemo(() => {
    const plan = samplePlans[goal];
    return {
      ...plan,
      days: plan.split.slice(0, days).map((title, index) => ({
        title,
        detail:
          index % 2 === 0
            ? "Bench press, rows, controlled accessories"
            : "Squats, hinges, core, tracked sets"
      }))
    };
  }, [days, goal]);

  return (
    <div className="landing-demo-card">
      <div className="landing-demo-form">
        <p className="eyebrow">Interactive demo</p>
        <h2>Create a sample workout plan</h2>
        <p>
          Pick a goal and FitSplit shows how a trainer can turn it into a member-ready split.
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
            {[3, 4, 5].map((dayCount) => (
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
      </div>

      <div className="landing-demo-preview" aria-live="polite">
        <div className="preview-toolbar">
          <span>{preview.label}</span>
          <strong>{days} days/week</strong>
        </div>
        <h3>{preview.focus}</h3>
        <div className="preview-split-list">
          {preview.days.map((day, index) => (
            <div className="preview-split-row" key={`${day.title}-${index}`}>
              <span>Day {index + 1}</span>
              <strong>{day.title}</strong>
              <small>{day.detail}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
