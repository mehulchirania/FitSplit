"use client";

import { useState, useMemo, useActionState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@/components/icons";
import { ExerciseEditForm } from "@/components/exercise-edit-form";
import { TutorialToggleButton } from "@/components/tutorial-toggle";
import { ExerciseThumbnailPreview } from "@/components/exercise-thumbnail-preview";
import {
  setExerciseTutorialVisibility,
  setGymExerciseVideo,
  updateCatalogExercise,
} from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { FormActionState } from "@/types/action-state";
import type { Exercise } from "@/types/domain";
import { useRouter } from "next/navigation";

type FormAction = (prev: FormActionState, formData: FormData) => Promise<FormActionState>;

// ── Inline gym-video editor ────────────────────────────────────────────────────

function GymVideoCell({ exercise }: { exercise: Exercise }) {
  const [state, formAction, isPending] = useActionState(
    setGymExerciseVideo,
    initialFormActionState
  );
  const router = useRouter();
  const [url, setUrl] = useState(exercise.gymVideoUrl ?? "");
  const [open, setOpen] = useState(false);
  const saved = exercise.gymVideoUrl ?? "";

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
      setOpen(false);
    }
  }, [state.status, router]);

  useEffect(() => {
    setUrl(exercise.gymVideoUrl ?? "");
  }, [exercise.gymVideoUrl]);

  if (!open) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {saved ? (
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--brand)",
              fontWeight: 600,
            }}
            title={saved}
          >
            ✓ Video set
          </span>
        ) : (
          <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>—</span>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="button button-secondary"
          style={{ padding: "3px 10px", fontSize: "0.75rem", minHeight: "28px" }}
        >
          {saved ? "Change" : "Add"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <input type="hidden" name="exerciseId" value={exercise.id} />
      <input
        type="url"
        name="gymVideoUrl"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://youtu.be/..."
        autoFocus
        style={{
          padding: "4px 8px",
          fontSize: "0.78rem",
          height: "30px",
          width: "170px",
          background: "var(--bg-subtle)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          color: "var(--text)",
        }}
      />
      <button
        type="submit"
        disabled={isPending}
        className="button button-primary"
        style={{ padding: "3px 10px", fontSize: "0.75rem", minHeight: "28px" }}
      >
        {isPending ? "…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => { setUrl(saved); setOpen(false); }}
        className="button button-secondary"
        style={{ padding: "3px 8px", fontSize: "0.75rem", minHeight: "28px" }}
      >
        ✕
      </button>
    </form>
  );
}

function ExerciseRow({
  exercise,
  isLast,
  isCustom = false,
}: {
  exercise: Exercise;
  isLast: boolean;
  isCustom?: boolean;
}) {
  return (
    <tr
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--border)",
      }}
    >
      {/* Exercise: Thumbnail & Info */}
      <td style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", flexShrink: 0 }}>
            <ExerciseThumbnailPreview
              alt={exercise.name}
              thumbnailUrl={exercise.thumbnailUrl}
              className="catalog-exercise-thumb"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
            <strong
              style={{
                fontSize: "0.85rem",
                color: "var(--text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={exercise.name}
            >
              {exercise.name}
            </strong>
            {exercise.equipment && (
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-soft)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={exercise.equipment}
              >
                {exercise.equipment}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Muscle Group */}
      <td style={{ padding: "12px 14px" }}>
        <span className="status-pill status-neutral" style={{ fontSize: "0.72rem" }}>
          {exercise.muscleGroup}
        </span>
      </td>

      {/* Source */}
      <td style={{ padding: "12px 14px" }}>
        {isCustom ? (
          <span
            className="status-pill"
            style={{
              fontSize: "0.7rem",
              background: "var(--bg-muted)",
              color: "var(--text-soft)",
            }}
          >
            Custom
          </span>
        ) : (
          <span
            className="status-pill"
            style={{
              fontSize: "0.7rem",
              background: "var(--brand-soft)",
              color: "var(--brand-strong)",
            }}
          >
            FitSplit
          </span>
        )}
      </td>

      {/* Tutorial Toggle */}
      <td style={{ padding: "12px 14px" }}>
        <TutorialToggleButton
          action={setExerciseTutorialVisibility}
          exerciseId={exercise.id}
          showTutorial={exercise.showTutorial !== false}
        />
      </td>

      {/* Gym Video Cell */}
      <td style={{ padding: "12px 14px" }}>
        <GymVideoCell exercise={exercise} />
      </td>

      {/* Actions (Edit) */}
      <td style={{ padding: "12px 14px" }}>
        {isCustom && (
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button
                className="button button-secondary"
                style={{ padding: "4px 10px", fontSize: "0.75rem", minHeight: "28px" }}
              >
                Edit
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="profile-modal-backdrop" />
              <Dialog.Content className="profile-modal">
                <div className="profile-modal-header" style={{ marginBottom: "16px" }}>
                  <Dialog.Title className="profile-modal-title">
                    Edit Custom Exercise
                  </Dialog.Title>
                  <Dialog.Close className="icon-button neutral-icon-button" aria-label="Close">
                    <X />
                  </Dialog.Close>
                </div>
                <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "8px" }}>
                  <ExerciseEditForm action={updateCatalogExercise} exercise={exercise} isOwner />
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </td>
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  exercises: Exercise[];
  createAction: FormAction;
}

export function ExerciseCatalogView({ exercises, createAction }: Props) {
  const [activeMuscleGroup, setActiveMuscleGroup] = useState("All");
  const [activeSource, setActiveSource] = useState("All");
  const [activeVideo, setActiveVideo] = useState("All");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [fitSplitCollapsed, setFitSplitCollapsed] = useState(false);

  const muscleGroups = useMemo(() => {
    const groups = new Set(exercises.map((e) => e.muscleGroup));
    return ["All", ...Array.from(groups).sort()];
  }, [exercises]);

  const applyFilters = (list: Exercise[]) =>
    list.filter((ex) => {
      if (activeMuscleGroup !== "All" && ex.muscleGroup !== activeMuscleGroup) return false;
      if (activeVideo === "Has Gym Video" && !ex.gymVideoUrl) return false;
      if (activeVideo === "No Gym Video" && ex.gymVideoUrl) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!ex.name.toLowerCase().includes(q) && !(ex.equipment ?? "").toLowerCase().includes(q))
          return false;
      }
      return true;
    });

  const allPredefined = useMemo(() => exercises.filter((e) => e.source !== "custom"), [exercises]);
  const allCustom     = useMemo(() => exercises.filter((e) => e.source === "custom"),  [exercises]);

  const filteredPredefined = useMemo(
    () => (activeSource === "Custom" ? [] : applyFilters(allPredefined)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allPredefined, activeMuscleGroup, activeVideo, activeSource, search]
  );
  const filteredCustom = useMemo(
    () => (activeSource === "FitSplit" ? [] : applyFilters(allCustom)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allCustom, activeMuscleGroup, activeVideo, activeSource, search]
  );

  const filteredExercises = useMemo(
    () => [...filteredPredefined, ...filteredCustom],
    [filteredPredefined, filteredCustom]
  );

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "0 28px 0 10px",
    height: "34px",
    fontSize: "0.82rem",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text)",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
  };

  return (
    <div style={{ marginTop: "24px" }}>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "12px 16px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "12px 12px 0 0",
          borderBottom: "none",
          display: "grid",
          gap: "10px",
        }}
      >
        {/* Row 1: count + search + add button */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "10px", alignItems: "center" }}>
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "var(--brand)",
              background: "color-mix(in srgb, var(--brand) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--brand) 25%, transparent)",
              borderRadius: "20px",
              padding: "2px 10px",
              whiteSpace: "nowrap",
            }}
          >
            {filteredExercises.length} / {exercises.length}
          </span>

          <input
            type="text"
            placeholder="Search name or equipment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "0 10px",
              height: "34px",
              fontSize: "0.82rem",
              background: "var(--bg-subtle)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text)",
              width: "100%",
            }}
          />

          <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
            <Dialog.Trigger asChild>
              <button
                className="button button-primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "0 14px",
                  height: "34px",
                  fontSize: "0.82rem",
                  whiteSpace: "nowrap",
                }}
                type="button"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Custom Exercise
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="profile-modal-backdrop" />
              <Dialog.Content className="profile-modal">
                <div className="profile-modal-header" style={{ marginBottom: "16px" }}>
                  <Dialog.Title className="profile-modal-title">Add Custom Exercise</Dialog.Title>
                  <Dialog.Close className="icon-button neutral-icon-button" aria-label="Close">
                    <X />
                  </Dialog.Close>
                </div>
                <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "8px" }}>
                  <ExerciseEditForm action={createAction} isCreate isOwner />
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        {/* Row 2: filter selects — each in its own fixed-width grid cell */}
        <div style={{ display: "grid", gridTemplateColumns: "160px 140px 160px", gap: "8px" }}>
          <div>
            <select value={activeMuscleGroup} onChange={(e) => setActiveMuscleGroup(e.target.value)} style={selectStyle}>
              {muscleGroups.map((mg) => (
                <option key={mg} value={mg}>{mg === "All" ? "All Muscles" : mg}</option>
              ))}
            </select>
          </div>
          <div>
            <select value={activeSource} onChange={(e) => setActiveSource(e.target.value)} style={selectStyle}>
              <option value="All">All Sources</option>
              <option value="FitSplit">FitSplit Only</option>
              <option value="Custom">Custom Only</option>
            </select>
          </div>
          <div>
            <select value={activeVideo} onChange={(e) => setActiveVideo(e.target.value)} style={selectStyle}>
              <option value="All">All Video Status</option>
              <option value="Has Gym Video">Has Gym Video</option>
              <option value="No Gym Video">No Gym Video</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "0 0 12px 12px",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
            minWidth: "780px",
          }}
        >
          <colgroup>
            <col style={{ width: "28%" }} />   {/* Exercise */}
            <col style={{ width: "13%" }} />   {/* Muscle Group */}
            <col style={{ width: "10%" }} />   {/* Source */}
            <col style={{ width: "13%" }} />   {/* Tutorial */}
            <col style={{ width: "28%" }} />   {/* Gym Video */}
            <col style={{ width: "8%" }} />    {/* Actions */}
          </colgroup>
          <thead>
            <tr
              style={{
                background: "var(--bg-elevated)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {["Exercise", "Muscle Group", "Source", "Tutorial", "Gym Video", ""].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "9px 14px",
                    fontSize: "0.71rem",
                    fontWeight: 700,
                    color: "var(--text-faint)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    textAlign: "left",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          {/* ── FitSplit Catalog section ───────────────────────────── */}
          {activeSource !== "Custom" && (
            <tbody>
              {/* Section header row */}
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: "0",
                    background: "color-mix(in srgb, var(--brand) 6%, var(--bg-elevated))",
                    borderBottom: "1px solid var(--border)",
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--brand)",
                      }}
                    >
                      FitSplit Catalog
                    </span>
                    <span
                      style={{
                        fontSize: "0.71rem",
                        color: "var(--text-faint)",
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: "10px",
                        padding: "1px 8px",
                      }}
                    >
                      {filteredPredefined.length} exercises
                    </span>
                    <span
                      style={{
                        fontSize: "0.71rem",
                        color: "var(--text-faint)",
                        marginLeft: "4px",
                      }}
                    >
                      · Gym video only — FitSplit manages all other fields
                    </span>
                    <button
                      type="button"
                      onClick={() => setFitSplitCollapsed((v) => !v)}
                      style={{
                        marginLeft: "auto",
                        background: "transparent",
                        border: "none",
                        color: "var(--text-faint)",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {fitSplitCollapsed ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                          Show
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                          Hide
                        </>
                      )}
                    </button>
                  </div>
                </td>
              </tr>

              {/* FitSplit rows */}
              {!fitSplitCollapsed && filteredPredefined.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div style={{ padding: "20px 14px", fontSize: "0.82rem", color: "var(--text-faint)" }}>
                      No FitSplit exercises match the current filters.
                    </div>
                  </td>
                </tr>
              )}
              {!fitSplitCollapsed &&
                filteredPredefined.map((exercise, i) => (
                  <ExerciseRow
                    key={exercise.id}
                    exercise={exercise}
                    isLast={i === filteredPredefined.length - 1}
                  />
                ))}
            </tbody>
          )}

          {/* ── Custom Exercises section ───────────────────────────────── */}
          {activeSource !== "FitSplit" && (
            <tbody>
              {/* Section header row */}
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: "0",
                    background: "rgba(255,255,255,0.03)",
                    borderTop: activeSource === "Custom" ? "none" : "2px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--text-soft)",
                      }}
                    >
                      Custom Exercises
                    </span>
                    <span
                      style={{
                        fontSize: "0.71rem",
                        color: "var(--text-faint)",
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: "10px",
                        padding: "1px 8px",
                      }}
                    >
                      {filteredCustom.length} exercises
                    </span>
                    <span style={{ fontSize: "0.71rem", color: "var(--text-faint)", marginLeft: "4px" }}>
                      · Full control
                    </span>
                    <div style={{ marginLeft: "auto" }}>
                      <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
                        <Dialog.Trigger asChild>
                          <button
                            className="button button-primary"
                            style={{ padding: "2px 12px", fontSize: "0.75rem", minHeight: "28px", display: "flex", alignItems: "center", gap: "4px" }}
                            type="button"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Add Exercise
                          </button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                          <Dialog.Overlay className="profile-modal-backdrop" />
                          <Dialog.Content className="profile-modal">
                            <div className="profile-modal-header" style={{ marginBottom: "16px" }}>
                              <Dialog.Title className="profile-modal-title">Add Custom Exercise</Dialog.Title>
                              <Dialog.Close className="icon-button neutral-icon-button" aria-label="Close"><X /></Dialog.Close>
                            </div>
                            <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "8px" }}>
                              <ExerciseEditForm action={createAction} isCreate isOwner />
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                    </div>
                  </div>
                </td>
              </tr>

              {/* Custom rows */}
              {filteredCustom.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div style={{ padding: "20px 14px", fontSize: "0.82rem", color: "var(--text-faint)" }}>
                      No custom exercises yet.{" "}
                      <button
                        type="button"
                        onClick={() => setAddOpen(true)}
                        style={{ background: "none", border: "none", color: "var(--brand)", cursor: "pointer", fontSize: "inherit", textDecoration: "underline", padding: 0 }}
                      >
                        Add the first one.
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {filteredCustom.map((exercise, i) => (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  isLast={i === filteredCustom.length - 1}
                  isCustom
                />
              ))}
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
}
