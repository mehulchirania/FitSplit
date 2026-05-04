"use client";

import { useState } from "react";
import { Dumbbell, X } from "@/components/icons";
import { WeeklyProgramSchedule } from "@/components/weekly-program-schedule";
import type { Exercise, WorkoutProgram } from "@/types/domain";

const splitLabels: Record<string, string> = {
  ppl_x2: "PPL x 2",
  ppl_upper_lower: "PPL Upper Lower",
  bro_split: "Bro Split",
  combo_x2: "Chest+Tricep / Back+Bicep / Legs+Shoulder x2",
  custom: "Custom"
};

export function WorkoutProgramGallery({
  exercises,
  programs
}: {
  exercises: Exercise[];
  programs: WorkoutProgram[];
}) {
  const [selectedProgram, setSelectedProgram] = useState<WorkoutProgram | null>(null);

  return (
    <>
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
              <button
                className="button button-primary"
                onClick={() => setSelectedProgram(program)}
                type="button"
              >
                View program
              </button>
            </div>
          </article>
        ))}
      </section>

      {selectedProgram ? (
        <div className="dialog-backdrop" role="presentation">
          <div
            aria-modal="true"
            className="program-dialog"
            role="dialog"
          >
            <div className="panel-title">
              <h2>{selectedProgram.title}</h2>
              <button
                aria-label="Close program"
                className="icon-button neutral-icon-button"
                onClick={() => setSelectedProgram(null)}
                type="button"
              >
                <X />
              </button>
            </div>
            <p>{selectedProgram.description}</p>
            <WeeklyProgramSchedule exercises={exercises} program={selectedProgram} />
          </div>
        </div>
      ) : null}
    </>
  );
}
