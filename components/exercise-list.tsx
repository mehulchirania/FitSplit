"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ExerciseThumbnailPreview } from "@/components/exercise-thumbnail-preview";
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

function isPortraitVideo(videoUrl: string | null): boolean {
  if (!videoUrl) return false;
  try {
    const url = new URL(videoUrl);
    return Boolean(url.pathname.match(/\/shorts\//));
  } catch {
    return false;
  }
}

type VideoType = "tutorial" | "demo";

export function ExerciseList({
  exercises,
  items
}: {
  exercises: Exercise[];
  items: WorkoutExercise[];
}) {
  const [activeVideo, setActiveVideo] = useState<{ exercise: Exercise; type: VideoType } | null>(null);

  const activeUrl = activeVideo
    ? getYouTubeEmbedUrl(
        activeVideo.type === "demo" ? activeVideo.exercise.gymVideoUrl : activeVideo.exercise.videoUrl
      )
    : null;

  const activeRawUrl = activeVideo
    ? (activeVideo.type === "demo" ? activeVideo.exercise.gymVideoUrl : activeVideo.exercise.videoUrl)
    : null;

  return (
    <>
      <div className="exercise-list">
        {items.map((item, index) => {
          const exercise = exercises.find((e) => e.id === item.exerciseId);
          if (!exercise) return null;

          const hasTutorial = Boolean(exercise.videoUrl);
          const hasDemo = Boolean(exercise.gymVideoUrl);

          return (
            <article className="exercise-row" key={`${exercise.id}-${index}`}>
              <ExerciseThumbnailPreview
                alt={exercise.name}
                className="exercise-thumb"
                thumbnailUrl={exercise.thumbnailUrl}
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
                {hasTutorial && (
                  <button
                    className="exercise-video-button"
                    onClick={() => setActiveVideo({ exercise, type: "tutorial" })}
                    title="DeltaBolic tutorial"
                    type="button"
                  >
                    <Video /> DeltaBolic
                  </button>
                )}
                {hasDemo && (
                  <button
                    className="exercise-video-button exercise-video-button--demo"
                    onClick={() => setActiveVideo({ exercise, type: "demo" })}
                    title="SHG Gym demo"
                    type="button"
                  >
                    <Video /> SHG Gym
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* YouTube video modal — rendered into document.body via portal so position:fixed is never clipped by a parent transform */}
      {activeVideo && typeof document !== "undefined" && createPortal(
        <div
          className="video-modal-backdrop"
          onClick={() => setActiveVideo(null)}
          role="presentation"
        >
          <div
            className={`video-modal${isPortraitVideo(activeRawUrl) ? " video-modal--portrait" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="video-modal-header">
              <div>
                <p className="eyebrow">
                  {activeVideo.exercise.muscleGroup}
                  {" · "}
                  {activeVideo.type === "demo" ? "SHG Gym Demo" : "DeltaBolic Tutorial"}
                </p>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>{activeVideo.exercise.name}</h3>
              </div>
              <button
                aria-label="Close video"
                className="icon-button neutral-icon-button"
                onClick={() => setActiveVideo(null)}
                type="button"
              >
                <X />
              </button>
            </div>
            {activeUrl ? (
              <iframe
                allow="autoplay; encrypted-media"
                allowFullScreen
                className={`video-embed${isPortraitVideo(activeRawUrl) ? " video-embed--portrait" : ""}`}
                src={activeUrl}
                title={`${activeVideo.exercise.name} ${activeVideo.type === "demo" ? "gym demo" : "form tutorial"}`}
              />
            ) : (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-soft)" }}>
                <p>This video opens outside FitSplit.</p>
                <a href={activeRawUrl ?? ""} rel="noopener noreferrer" style={{ color: "var(--brand)" }} target="_blank">
                  Open video
                </a>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
