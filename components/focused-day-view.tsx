/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getExerciseName } from "@/lib/workout-utils";
import type { WorkoutDay, Exercise, LiftLog, ProgramAssignment } from "@/types/domain";

export function FocusedDayView({
  day,
  exercises,
  liftLogs,
  assignment,
  programTitle
}: {
  day: WorkoutDay;
  exercises: Exercise[];
  liftLogs: LiftLog[];
  assignment: ProgramAssignment | null;
  programTitle: string;
}) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);

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
  const dictEx = exercises.find((e) => e.id === ex.exerciseId);
  const videoUrl = dictEx?.gymVideoUrl || dictEx?.videoUrl;

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

  const handleNext = () => {
    setDirection(1);
    setActiveIndex(activeIndex + 1);
  };

  const handlePrev = () => {
    setDirection(-1);
    setActiveIndex(activeIndex - 1);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", overflow: "hidden" }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeIndex}
          className="focus-exercise-card"
          initial={{ opacity: 0, x: direction * 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -50 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
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

          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                marginTop: "14px", padding: "7px 14px",
                borderRadius: "99px", border: "1px solid var(--border)",
                background: "var(--bg-subtle)", color: "var(--text-soft)",
                fontSize: "0.82rem", fontWeight: 600, textDecoration: "none",
                transition: "background 120ms, color 120ms"
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="14" height="10" rx="2"/><path d="M16 11l5-4v10l-5-4"/>
              </svg>
              Watch tutorial
            </a>
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
        </motion.div>
      </AnimatePresence>

      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        {activeIndex > 0 && (
          <button 
            type="button" 
            className="button button-secondary"
            onClick={handlePrev}
          >
            Previous
          </button>
        )}
        <button 
          type="button" 
          className="button button-primary"
          style={{ minWidth: "160px", justifyContent: "center" }}
          onClick={handleNext}
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
              background: i <= activeIndex ? "var(--brand)" : "var(--bg-subtle)",
              transition: "background 0.3s ease"
            }}
          />
        ))}
      </div>
    </div>
  );
}
