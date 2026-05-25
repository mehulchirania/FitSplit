"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getExerciseName } from "@/lib/workout-utils";
import type { ProgramDay, Exercise, LiftLog, ProgramAssignment } from "@/types/domain";

export function FocusedDayView({
  day,
  exercises,
  liftLogs,
  assignment,
  programTitle
}: {
  day: ProgramDay;
  exercises: Exercise[];
  liftLogs: LiftLog[];
  assignment: ProgramAssignment | null;
  programTitle: string;
}) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  if (day.exercises.length === 0) {
    return (
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <p className="empty-lift-state">No exercises scheduled for this day.</p>
        <Link href="/member" className="button button-primary" style={{ marginTop: "20px" }}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  // Finished state
  if (activeIndex >= day.exercises.length) {
    return (
      <div className="focus-exercise-card" style={{ minHeight: "40vh" }}>
        <h2 style={{ fontSize: "2rem", margin: 0, fontWeight: 800 }}>Workout complete!</h2>
        <p style={{ color: "var(--text-soft)", fontSize: "1rem", maxWidth: "300px" }}>
          Great job finishing Day {day.dayNumber} of {programTitle}.
        </p>
        <Link href="/member" className="button button-primary" style={{ marginTop: "24px", minWidth: "200px", justifyContent: "center" }}>
          Finish
        </Link>
      </div>
    );
  }

  const ex = day.exercises[activeIndex];
  const name = getExerciseName(ex.exerciseId, exercises);

  // Compute last log and PR for current exercise
  let lastLog: LiftLog | undefined = undefined;
  let pr = 0;
  for (const log of liftLogs) {
    if (log.exerciseId === ex.exerciseId) {
      if ((log.weight ?? 0) > pr) pr = log.weight ?? 0;
      if (!lastLog || new Date(log.loggedAt) > new Date(lastLog.loggedAt)) {
        lastLog = log;
      }
    }
  }

  const isPR = lastLog && pr === lastLog.weight;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="focus-exercise-card">
        <span className="focus-ex-number">
          Exercise {activeIndex + 1} of {day.exercises.length}
        </span>
        
        <h2 style={{ margin: "16px 0 0", fontSize: "1.8rem", fontWeight: 800 }}>
          {name}
        </h2>
        
        <div className="focus-ex-target">
          {ex.sets ? `${ex.sets}` : "—"}
          <span style={{ fontSize: "1.4rem", color: "var(--text-faint)", margin: "0 8px" }}>×</span>
          {ex.reps ? `${ex.reps}` : "—"}
        </div>
        
        {ex.notes && (
          <p style={{ margin: "12px 0 0", color: "var(--text-soft)", fontSize: "1rem" }}>
            {ex.notes}
          </p>
        )}

        <div className="focus-ex-last" style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid var(--border)", width: "100%", maxWidth: "240px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-faint)", fontWeight: 700 }}>
            Last time
          </p>
          {lastLog ? (
            <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--text)" }}>
              {lastLog.weight}kg × {lastLog.sets} × {lastLog.reps}
              {isPR && <span className="pr-chip" style={{ marginLeft: 8 }}>PR</span>}
            </p>
          ) : (
            <p style={{ margin: 0, color: "var(--text-soft)" }}>No prior logs</p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        {activeIndex > 0 && (
          <button 
            type="button" 
            className="button button-secondary"
            onClick={() => setActiveIndex(activeIndex - 1)}
          >
            Previous
          </button>
        )}
        <button 
          type="button" 
          className="button button-primary"
          style={{ minWidth: "160px", justifyContent: "center" }}
          onClick={() => setActiveIndex(activeIndex + 1)}
        >
          {activeIndex === day.exercises.length - 1 ? "Finish workout" : "Mark done"}
        </button>
      </div>
      
      <div style={{ display: "flex", justifyContent: "center", marginTop: "12px", gap: "6px" }}>
        {day.exercises.map((_, i) => (
          <div 
            key={i} 
            style={{
              height: "4px",
              flex: 1,
              maxWidth: "32px",
              borderRadius: "2px",
              background: i <= activeIndex ? "var(--brand)" : "var(--bg-subtle)"
            }}
          />
        ))}
      </div>
    </div>
  );
}
