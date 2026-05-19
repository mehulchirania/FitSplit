"use client";

import { useState } from "react";
import { Video, X } from "@/components/icons";
import type { Exercise, WorkoutExercise } from "@/types/domain";

function getPrescription(item: WorkoutExercise) {
  if (item.durationSeconds) {
    return `${item.sets ?? 1} x ${item.durationSeconds}s`;
  }
  return `${item.sets ?? "-"} x ${item.reps ?? "-"}`;
}

function getSecondaryMuscles(exercise: Exercise) {
  const text = `${exercise.name} ${exercise.instructions}`.toLowerCase();
  const secondaryByPrimary: Record<string, string[]> = {
    Back: ["Biceps", "Rear delts", "Core"],
    Biceps: ["Forearms"],
    Cardio: ["Legs", "Core"],
    Chest: ["Triceps", "Shoulders"],
    Core: ["Hip flexors", "Lower back"],
    Legs: ["Glutes", "Hamstrings", "Core"],
    Shoulders: ["Triceps", "Upper traps"],
    Triceps: ["Chest", "Shoulders"]
  };

  if (text.includes("incline") && exercise.muscleGroup === "Chest") {
    return ["Upper chest", "Front delts", "Triceps"];
  }
  if (text.includes("deadlift")) return ["Glutes", "Hamstrings", "Core"];
  if (text.includes("squat") || text.includes("lunge") || text.includes("leg press")) {
    return ["Glutes", "Hamstrings", "Core"];
  }
  if (text.includes("row") || text.includes("pulldown") || text.includes("pull-up")) {
    return ["Biceps", "Rear delts", "Core"];
  }
  if (text.includes("press") && exercise.muscleGroup === "Shoulders") {
    return ["Triceps", "Upper chest"];
  }
  return secondaryByPrimary[exercise.muscleGroup] ?? [];
}

function getYouTubeEmbedUrl(videoUrl: string): string | null {
  if (!videoUrl) return null;
  try {
    const url = new URL(videoUrl);
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
      const shortsId = url.pathname.match(/\/shorts\/([^/?]+)/)?.[1];
      if (shortsId) return `https://www.youtube.com/embed/${shortsId}?autoplay=1&rel=0`;
    }
    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1).split("?")[0];
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

export function ExerciseList({
  exercises,
  items
}: {
  exercises: Exercise[];
  items: WorkoutExercise[];
}) {
  const [videoExercise, setVideoExercise] = useState<Exercise | null>(null);

  const embedUrl = videoExercise ? getYouTubeEmbedUrl(videoExercise.videoUrl) : null;

  return (
    <>
      <div className="exercise-list">
        {items.map((item, index) => {
          const exercise = exercises.find((e) => e.id === item.exerciseId);
          if (!exercise) return null;

          const hasVideo = Boolean(exercise.videoUrl && exercise.videoUrl !== "");

          return (
            <article className="exercise-row" key={`${exercise.id}-${index}`}>
              <div
                className="exercise-thumb"
                style={exercise.thumbnailUrl ? { backgroundImage: `url(${exercise.thumbnailUrl})` } : undefined}
              />
              <div className="exercise-row-copy">
                <h3>{exercise.name}</h3>
                <span className="member-meta">
                  {[exercise.muscleGroup, exercise.equipment]
                    .filter((v) => v && v !== "none" && v !== "null")
                    .join(" / ")}
                </span>
                {exercise.instructions && (
                  <details className="exercise-instructions">
                    <summary>Instructions</summary>
                    <p>{exercise.instructions}</p>
                    <div className="muscle-targets" aria-label={`${exercise.name} muscle targets`}>
                      <span>Primary: {exercise.muscleGroup}</span>
                      <span>
                        Secondary: {getSecondaryMuscles(exercise).join(", ") || "Stabilizers"}
                      </span>
                    </div>
                  </details>
                )}
              </div>
              <div className="exercise-row-actions">
                <span className="exercise-prescription">{getPrescription(item)}</span>
                {hasVideo && (
                  <button
                    className="exercise-video-button"
                    onClick={() => setVideoExercise(exercise)}
                    type="button"
                  >
                    <Video /> Play video
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* YouTube video modal */}
      {videoExercise && (
        <div
          className="video-modal-backdrop"
          onClick={() => setVideoExercise(null)}
          role="presentation"
        >
          <div
            className="video-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="video-modal-header">
              <div>
                <p className="eyebrow">{videoExercise.muscleGroup}</p>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>{videoExercise.name}</h3>
              </div>
              <button
                aria-label="Close video"
                className="icon-button neutral-icon-button"
                onClick={() => setVideoExercise(null)}
                type="button"
              >
                <X />
              </button>
            </div>
            {embedUrl ? (
              <iframe
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="video-embed"
                src={embedUrl}
                title={`${videoExercise.name} form guide`}
              />
            ) : (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-soft)" }}>
                <p>This video source opens outside FitSplit.</p>
                <a href={videoExercise.videoUrl} rel="noopener noreferrer" style={{ color: "var(--brand)" }} target="_blank">
                  Open video source
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
