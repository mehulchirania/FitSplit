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

function getMuscleTargetDescription(exercise: Exercise) {
  if (exercise.muscleTargetDescription) return exercise.muscleTargetDescription;
  
  const text = `${exercise.name} ${exercise.instructions}`.toLowerCase();
  const group = exercise.muscleGroup;

  if (group === "Chest") {
    if (text.includes("incline")) return "Upper chest focus with front delts and triceps assisting.";
    if (text.includes("decline") || text.includes("dip")) return "Lower chest focus with triceps assisting.";
    if (text.includes("fly")) return "Mid-chest adduction focus with controlled stretch and squeeze.";
    return "Full chest press focus with mid chest, front delts, and triceps.";
  }
  if (group === "Back") {
    if (text.includes("pulldown") || text.includes("pull-up")) return "Lat-width focus with biceps and lower traps assisting.";
    if (text.includes("row")) return "Mid-back focus: lats, rhomboids, traps, and rear delts.";
    if (text.includes("deadlift")) return "Posterior-chain focus: spinal erectors, glutes, hamstrings, and traps.";
    return "Back focus across lats, traps, rhomboids, and rear delts.";
  }
  if (group === "Shoulders") {
    if (text.includes("lateral") || text.includes("side")) return "Side delt focus for shoulder width.";
    if (text.includes("rear") || text.includes("face pull")) return "Rear delt and upper-back stability focus.";
    if (text.includes("press")) return "Front delt and full-shoulder press focus with triceps assisting.";
    return "Shoulder focus across front, side, and rear delts.";
  }
  if (group === "Triceps") {
    if (text.includes("overhead")) return "Long head triceps focus with a deep stretched position.";
    if (text.includes("pushdown") || text.includes("pressdown")) return "Lateral and medial head triceps focus.";
    return "Full triceps focus: long head, lateral head, and medial head.";
  }
  if (group === "Biceps") {
    if (text.includes("hammer")) return "Brachialis and brachioradialis focus with biceps assisting.";
    if (text.includes("incline")) return "Long head biceps focus from a stretched shoulder position.";
    if (text.includes("preacher") || text.includes("concentration")) return "Short head biceps focus with strict elbow position.";
    return "Biceps focus across long head, short head, and brachialis.";
  }
  if (group === "Legs") {
    if (text.includes("curl")) return "Hamstring focus with knee-flexion control.";
    if (text.includes("extension")) return "Quad isolation focus, especially rectus femoris and vastus group.";
    if (text.includes("calf")) return "Calf focus across gastrocnemius and soleus.";
    if (text.includes("hip") || text.includes("thrust")) return "Glute focus with hamstrings assisting.";
    return "Lower-body focus across quads, hamstrings, glutes, calves, and adductors.";
  }
  if (group === "Core") {
    return "Core focus across abs, obliques, deep trunk stabilizers, and hip flexors.";
  }
  if (group === "Cardio") {
    return "Conditioning focus for heart rate, stamina, and lower-body endurance.";
  }
  return `${group} focus with supporting stabilizer muscles.`;
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

function getVideoCredit(type: VideoType) {
  return type === "demo" ? "Gym demo video" : "YouTube tutorial";
}

export function ExerciseList({
  exercises,
  items
}: {
  exercises: Exercise[];
  items: WorkoutExercise[];
}) {
  const [activeVideo, setActiveVideo] = useState<{ exercise: Exercise; type: VideoType } | null>(null);
  const knownItems = items
    .map((item, index) => ({ item, index, exercise: exercises.find((e) => e.id === item.exerciseId) }))
    .filter((entry): entry is { item: WorkoutExercise; index: number; exercise: Exercise } => Boolean(entry.exercise));

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
        {knownItems.length === 0 ? (
          <p className="form-message">No catalog exercises are available for this day yet.</p>
        ) : knownItems.map(({ item, index, exercise }) => {
          // Only show tutorial when the gym owner hasn't hidden it
          const hasTutorial = Boolean(exercise.videoUrl) && exercise.showTutorial !== false;
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
                <div className="muscle-target-pill" aria-label={`${exercise.name} target detail`}>
                  <span className="muscle-target-pill-icon" aria-hidden="true">Target</span>
                  <span className="muscle-target-pill-text">{getMuscleTargetDescription(exercise)}</span>
                </div>
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
                    title={getVideoCredit("tutorial")}
                    type="button"
                  >
                    <Video /> Tutorial
                  </button>
                )}
                {hasDemo && (
                  <button
                    className="exercise-video-button exercise-video-button--demo"
                    onClick={() => setActiveVideo({ exercise, type: "demo" })}
                    title="Gym demo video"
                    type="button"
                  >
                    <Video /> Gym video
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
                  {getVideoCredit(activeVideo.type)}
                </p>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>{activeVideo.exercise.name}</h3>
                <p className="member-meta" style={{ margin: "4px 0 0" }}>
                  Credit: {getVideoCredit(activeVideo.type)}
                </p>
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
