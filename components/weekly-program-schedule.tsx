"use client";

import { useMemo, useState } from "react";
import { ExerciseList } from "@/components/exercise-list";
import type { Exercise, WorkoutProgram } from "@/types/domain";

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getDefaultDayIndex(dayCount: number) {
  const mondayFirstIndex = (new Date().getDay() + 6) % 7;
  return Math.min(Math.max(mondayFirstIndex, 0), Math.max(dayCount - 1, 0));
}

export function WeeklyProgramSchedule({
  exercises,
  program
}: {
  exercises: Exercise[];
  program: WorkoutProgram;
}) {
  const defaultDayIndex = useMemo(() => getDefaultDayIndex(program.days.length), [program.days.length]);
  const [selectedIndex, setSelectedIndex] = useState(defaultDayIndex);
  const selectedDay = program.days[selectedIndex] ?? program.days[0];

  if (!selectedDay) {
    return null;
  }

  return (
    <div className="weekly-schedule">
      <div className="day-tabs" aria-label="Weekly workout days">
        {program.days.map((day, index) => (
          <button
            className={selectedIndex === index ? "is-selected" : ""}
            key={day.id}
            onClick={() => setSelectedIndex(index)}
            type="button"
          >
            <span>{dayNames[index] ?? `Day ${day.dayNumber}`}</span>
            <strong>{day.title}</strong>
          </button>
        ))}
      </div>
      <article className="selected-workout-day">
        <p className="eyebrow">{dayNames[selectedIndex] ?? `Day ${selectedDay.dayNumber}`}</p>
        <h2>{selectedDay.title}</h2>
        <p>{selectedDay.focus}</p>
        <ExerciseList exercises={exercises} items={selectedDay.exercises} />
      </article>
    </div>
  );
}
