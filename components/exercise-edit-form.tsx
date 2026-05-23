"use client";

import { useRef, useState } from "react";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { CloseDetailsButton } from "@/components/close-details-button";
import type { Exercise } from "@/types/domain";
import type { FormActionState } from "@/types/action-state";

type FormAction = (prev: FormActionState, formData: FormData) => Promise<FormActionState>;

// ── constants ─────────────────────────────────────────────────────────────────

export const ALL_MUSCLE_GROUPS = [
  "Back", "Biceps", "Cardio", "Chest", "Core",
  "Forearms", "Legs", "Shoulders", "Triceps",
] as const;

export const EQUIPMENT_OPTIONS = [
  "Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight",
  "Smith Machine", "Resistance Band", "Trap Bar", "EZ Bar",
  "Kettlebell", "Pull-up Bar", "Ab Bench", "Plate", "Box",
] as const;

/** Channel labels shown in the video-source selector and on buttons */
export const VIDEO_CHANNELS = [
  { value: "deltabolic",  label: "DeltaBolic" },
  { value: "tylerpath",   label: "TylerPath" },
  { value: "shg",         label: "SHG Gym Demo" },
  { value: "custom",      label: "Other / Custom" },
] as const;

// ── helpers ───────────────────────────────────────────────────────────────────

function splitEquipment(raw: string): string[] {
  return raw
    .split(/[,/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type VideoEntry = { channel: string; url: string };

/** Infer likely channel from a YouTube video ID by comparing to known channel IDs baked in at build */
function guessChannel(url: string): string {
  if (!url) return "deltabolic";
  // SHG Gym Demo = gym videos
  if (url.includes("gymVideoUrl")) return "shg"; // can't tell from URL alone
  return "deltabolic";
}

function buildInitialVideos(exercise: Exercise): VideoEntry[] {
  const entries: VideoEntry[] = [];
  if (exercise.videoUrl) {
    entries.push({ channel: "deltabolic", url: exercise.videoUrl });
  }
  if (exercise.gymVideoUrl) {
    entries.push({ channel: "shg", url: exercise.gymVideoUrl });
  }
  return entries;
}

// ── component ─────────────────────────────────────────────────────────────────

export function ExerciseEditForm({
  action,
  exercise,
  isCreate = false,
}: {
  action: FormAction;
  exercise?: Exercise;
  isCreate?: boolean;
}) {
  // ── equipment multi-select ────────────────────────────────────────────────
  const initialEquipment = splitEquipment(exercise?.equipment ?? "");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(initialEquipment);

  function toggleEquipment(item: string) {
    setSelectedEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  }

  // ── video URL entries ─────────────────────────────────────────────────────
  const [videos, setVideos] = useState<VideoEntry[]>(
    exercise ? buildInitialVideos(exercise) : []
  );

  function addVideo() {
    setVideos((prev) => [...prev, { channel: "deltabolic", url: "" }]);
  }

  function removeVideo(index: number) {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  }

  function updateVideo(index: number, field: keyof VideoEntry, value: string) {
    setVideos((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }

  // ── derived hidden field values ──────────────────────────────────────────
  // Map channel keys to the existing Firestore fields so the server action
  // continues to work unchanged.
  const deltabolicEntry = videos.find((v) => v.channel === "deltabolic" || v.channel === "tylerpath");
  const shgEntry = videos.find((v) => v.channel === "shg");

  const equipmentValue = selectedEquipment.join(", ");

  return (
    <ConfirmActionForm
      action={action}
      confirmMessage={isCreate ? "Add this exercise to the catalog?" : `Save changes to "${exercise?.name}"?`}
      confirmTitle={isCreate ? "Save exercise?" : "Update exercise?"}
      pendingLabel="Saving..."
      submitLabel={isCreate ? "Add exercise" : "Save changes"}
    >
      {/* Hidden field for the exercise ID */}
      {exercise?.id && <input name="exerciseId" type="hidden" value={exercise.id} />}

      {/* Derived video URL hidden fields — read by the server action */}
      <input name="videoUrl"       type="hidden" value={deltabolicEntry?.url ?? ""} />
      <input name="videoSource"    type="hidden" value={deltabolicEntry?.url ? "youtube" : "none"} />
      <input name="gymVideoUrl"    type="hidden" value={shgEntry?.url ?? ""} />
      <input name="gymVideoSource" type="hidden" value={shgEntry?.url ? "youtube" : "none"} />

      {/* ── Section: Basic info ──────────────────────────────────────── */}
      <div className="exercise-form-section">
        <h4 className="exercise-form-section-title">Basic info</h4>
        <div className="form-grid">
          <label>
            Exercise name
            <input
              defaultValue={exercise?.name}
              name="name"
              placeholder="e.g. Incline Dumbbell Press"
              required
            />
          </label>
          <label>
            Muscle group
            <select defaultValue={exercise?.muscleGroup ?? "Chest"} name="muscleGroup" required>
              {ALL_MUSCLE_GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Equipment multi-select */}
        <div className="exercise-form-equipment">
          <span className="exercise-form-label">Equipment</span>
          <div className="equipment-chip-grid">
            {EQUIPMENT_OPTIONS.map((item) => (
              <button
                className={`equipment-chip${selectedEquipment.includes(item) ? " is-selected" : ""}`}
                key={item}
                onClick={() => toggleEquipment(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          {/* Custom equipment input for items not in the preset list */}
          <input
            className="equipment-custom-input"
            onChange={(e) => {
              const customs = splitEquipment(e.target.value).filter(
                (v) => !EQUIPMENT_OPTIONS.includes(v as typeof EQUIPMENT_OPTIONS[number])
              );
              setSelectedEquipment((prev) => [
                ...prev.filter((p) => EQUIPMENT_OPTIONS.includes(p as typeof EQUIPMENT_OPTIONS[number])),
                ...customs,
              ]);
            }}
            placeholder="Other equipment (comma-separated)"
            type="text"
          />
          {/* The hidden serialised value sent with the form */}
          <input name="equipment" type="hidden" value={equipmentValue} />
          {selectedEquipment.length > 0 && (
            <p className="equipment-selected-preview">
              Selected: <strong>{selectedEquipment.join(", ")}</strong>
            </p>
          )}
        </div>

        <label style={{ marginTop: 8 }}>
          Thumbnail URL
          <input
            defaultValue={exercise?.thumbnailUrl}
            name="thumbnailUrl"
            placeholder="https://..."
            type="url"
          />
        </label>
      </div>

      {/* ── Section: Videos ──────────────────────────────────────────── */}
      <div className="exercise-form-section">
        <h4 className="exercise-form-section-title">Videos</h4>
        <p className="exercise-form-section-hint">
          Add up to two videos — one tutorial (DeltaBolic/TylerPath) and one gym demo (SHG Gym).
          The first DeltaBolic or TylerPath entry maps to the tutorial button; the SHG entry maps to the gym demo button.
        </p>

        <div className="video-entries">
          {videos.map((entry, i) => (
            <div className="video-entry-card" key={i}>
              <div className="video-entry-header">
                <select
                  className="video-channel-select"
                  onChange={(e) => updateVideo(i, "channel", e.target.value)}
                  value={entry.channel}
                >
                  {VIDEO_CHANNELS.map((ch) => (
                    <option key={ch.value} value={ch.value}>{ch.label}</option>
                  ))}
                </select>
                <button
                  className="video-entry-remove"
                  onClick={() => removeVideo(i)}
                  title="Remove this video"
                  type="button"
                >
                  ✕
                </button>
              </div>
              <input
                className="video-entry-url"
                onChange={(e) => updateVideo(i, "url", e.target.value)}
                placeholder="https://www.youtube.com/shorts/..."
                type="url"
                value={entry.url}
              />
            </div>
          ))}
        </div>

        {videos.length < 4 && (
          <button className="video-add-btn" onClick={addVideo} type="button">
            + Add video
          </button>
        )}
      </div>

      {/* ── Section: Instructions ────────────────────────────────────── */}
      <div className="exercise-form-section">
        <h4 className="exercise-form-section-title">Instructions</h4>
        <textarea
          defaultValue={exercise?.instructions}
          name="instructions"
          placeholder="Setup, cues, range of motion, tempo"
          rows={3}
          style={{ width: "100%" }}
        />
      </div>

      {/* ── Actions ─────────────────────────────────────────────────── */}
      {!isCreate && (
        <div className="exercise-form-actions">
          <CloseDetailsButton label="Cancel" />
        </div>
      )}
    </ConfirmActionForm>
  );
}
