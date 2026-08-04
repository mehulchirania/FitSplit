"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Exercise, WorkoutProgram } from "@/types/domain";

// ── Inline icons ──────────────────────────────────────────────────────────────
function IcClose({ w = 14 }: { w?: number }) {
  return <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
}
function IcPlay({ w = 13 }: { w?: number }) {
  return <svg width={w} height={w} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
}
function IcX() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPrescription(sets?: number, reps?: string, durationSeconds?: number) {
  if (durationSeconds) return `${sets ?? 1} × ${durationSeconds}s`;
  return `${sets ?? "—"} × ${reps ?? "—"}`;
}

function getYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.match(/\/shorts\/([^/?]+)/)?.[1];
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1).split("?")[0]}?autoplay=1&rel=0`;
  } catch { /* */ }
  return null;
}

function isPortrait(url: string) { try { return Boolean(new URL(url).pathname.match(/\/shorts\//)); } catch { return false; } }

const DAYNAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// ── Video modal (portalled to body) ───────────────────────────────────────────
function VideoModal({ title, group, url, onClose }: { title: string; group: string; url: string; onClose: () => void }) {
  const embed = getYouTubeEmbed(url);
  const portrait = isPortrait(url);
  return typeof document !== "undefined" ? createPortal(
    <div className="video-modal-backdrop" onClick={onClose} role="presentation">
      <div className={`video-modal${portrait ? " video-modal--portrait" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-header">
          <div>
            <p className="eyebrow">{group}</p>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>{title}</h3>
          </div>
          <button type="button" aria-label="Close video" className="icon-button neutral-icon-button" onClick={onClose}><IcX /></button>
        </div>
        {embed
          ? <iframe allow="autoplay; encrypted-media" allowFullScreen className={`video-embed${portrait ? " video-embed--portrait" : ""}`} src={embed} title={title} />
          : <div style={{ padding: 32, textAlign: "center", color: "var(--text-soft)" }}><a href={url} rel="noopener noreferrer" target="_blank" style={{ color: "var(--brand)" }}>Open video</a></div>
        }
      </div>
    </div>,
    document.body
  ) : null;
}

// ── Main component ────────────────────────────────────────────────────────────
export function ProgramViewModal({
  program,
  exercises,
  assignedCount,
  onClose,
  readOnly = false,
}: {
  program: WorkoutProgram;
  exercises: Exercise[];
  assignedCount?: number;
  onClose: () => void;
  readOnly?: boolean;
}) {
  const activeDays = program.days.filter((d) => d.exercises.length > 0);
  const totalEx    = program.days.reduce((t, d) => t + d.exercises.length, 0);
  const exById     = new Map(exercises.map((e) => [e.id, e]));

  const defaultIdx = (() => {
    const todayMon = (new Date().getDay() + 6) % 7;
    return Math.min(todayMon, Math.max(activeDays.length - 1, 0));
  })();

  const [dayIdx,   setDayIdx]   = useState(defaultIdx);
  const [video,    setVideo]    = useState<{ title: string; group: string; url: string } | null>(null);

  const day = activeDays[dayIdx] ?? activeDays[0];

  // Meta chips
  const meta = [
    { label: "Best for",   value: program.bestFor?.join(" / ") ?? program.goal ?? "—" },
    { label: "Frequency",  value: program.selectionHints?.frequency ?? `${program.daysPerWeek} days/week` },
    { label: "Variety",    value: program.weeklyVariations?.length ? `${program.weeklyVariations.length}-week rotation` : "Fixed schedule" },
    ...(program.difficulty ? [{ label: "Level", value: program.difficulty }] : []),
  ];

  return (
    <>
      <div className="ep-modal" role="dialog" aria-modal="true">
        {/* Header */}
        <header className="ep-head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className="ep-head__title" style={{ fontSize: 18 }}>
              {program.title}
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-soft)" }}>
              {activeDays.length} training day{activeDays.length !== 1 ? "s" : ""} · {totalEx} exercise{totalEx !== 1 ? "s" : ""}
              {!readOnly && assignedCount !== undefined ? ` · ${assignedCount} assigned` : ""}
            </p>
          </div>
          <button className="ep-close" type="button" onClick={onClose}>
            <IcClose /> Close
          </button>
        </header>

        {/* Program description */}
        {program.description && (
          <div style={{ padding: "8px 22px", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.45 }}>{program.description}</p>
          </div>
        )}

        {/* Meta chips row */}
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap",
          padding: "8px 22px", borderBottom: "1px solid var(--border)",
          background: "var(--bg-subtle)", flexShrink: 0,
        }}>
          {meta.map(({ label, value }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-faint)" }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Day tabs */}
        <nav className="ep-days">
          <span className="ep-days__label">Days</span>
          {activeDays.map((d, idx) => (
            <button
              key={d.id}
              type="button"
              className={"ep-tab" + (idx === dayIdx ? " ep-tab--on" : "")}
              onClick={() => setDayIdx(idx)}
            >
              <span>{d.title || DAYNAMES[idx] || `Day ${idx + 1}`}</span>
              <span className="ep-tab__count">{d.exercises.length}</span>
            </button>
          ))}
        </nav>

        {/* Exercise list */}
        <div className="ep-body" style={{ gridTemplateColumns: "1fr" }}>
          <section className="ep-pane">
            {/* Pane header */}
            <div className="ep-pane__head">
              <h3 className="ep-pane__title">{day?.title ?? "Rest day"}</h3>
              <span className="ep-pane__sub">{DAYNAMES[dayIdx] ?? ""}</span>
            </div>

            <div className="ep-scroll">
              {!day || day.exercises.length === 0 ? (
                <div className="ep-empty">
                  <div className="ep-empty__icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.4 14.4 9.6 9.6M18.7 16.6l1.4 1.4a2 2 0 0 0 2.8-2.8l-1.4-1.4M5.3 7.4 3.9 6a2 2 0 0 1 2.8-2.8l1.4 1.4M21 3l-3 3M3 21l3-3M16.6 18.7l1.4-1.4a2 2 0 0 0 0-2.8L9.5 6a2 2 0 0 0-2.8 0L5.3 7.4a2 2 0 0 0 0 2.8l8.5 8.5a2 2 0 0 0 2.8 0Z"/></svg>
                  </div>
                  <p className="ep-empty__title">No exercises for this day</p>
                  <p className="ep-empty__sub">This day has no exercises yet.</p>
                </div>
              ) : (() => {
                // Separate known (catalog) exercises from unlisted ones
                const knownItems   = day.exercises.filter((item) => exById.has(item.exerciseId));
                const unknownCount = day.exercises.length - knownItems.length;
                return (
                  <>
                  {/* Column header */}
                  <div className="ep-ex-head">
                    <span className="ep-ex-head__name">Exercise</span>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-faint)", textAlign: "right", flexShrink: 0 }}>Prescription</span>
                    <span className="ep-ex-head__sp" />
                  </div>
                  <div className="ep-ex-list">
                    {knownItems.map((item, i) => {
                      const ex = exById.get(item.exerciseId)!;
                      const hasTutorial = Boolean(ex.videoUrl) && ex.showTutorial !== false;
                      const hasDemo     = Boolean(ex.gymVideoUrl);
                      return (
                        <div key={`${ex.id}-${i}`} className="ep-ex">
                          {/* Muscle group tag */}
                          <span style={{
                            flexShrink: 0, fontSize: 9.5, fontWeight: 800,
                            letterSpacing: ".04em", textTransform: "uppercase",
                            padding: "2px 7px", borderRadius: 5,
                            background: "var(--bg-muted)", color: "var(--text-soft)",
                          }}>{ex.muscleGroup}</span>
                          <span className="ep-ex__name">{ex.name}</span>
                          <div className="ep-ex__controls">
                            {/* Prescription */}
                            <span style={{
                              fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                              color: "var(--text)",
                              background: "var(--bg-muted)",
                              border: "1px solid var(--border)",
                              borderRadius: 7, padding: "4px 10px", whiteSpace: "nowrap",
                            }}>
                              {getPrescription(item.sets, item.reps, item.durationSeconds)}
                            </span>
                            {/* Video buttons */}
                            {hasTutorial && (
                              <button type="button" className="ep-iconbtn"
                                style={{ width: "auto", padding: "0 8px", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--brand)" }}
                                title="Tutorial video"
                                onClick={() => setVideo({ title: ex.name, group: ex.muscleGroup, url: ex.videoUrl! })}>
                                <IcPlay /> Tutorial
                              </button>
                            )}
                            {hasDemo && (
                              <button type="button" className="ep-iconbtn"
                                style={{ width: "auto", padding: "0 8px", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--text-soft)" }}
                                title="Gym demo video"
                                onClick={() => setVideo({ title: ex.name, group: ex.muscleGroup, url: ex.gymVideoUrl! })}>
                                <IcPlay /> Demo
                              </button>
                            )}
                            {ex.instructions && (
                              <details style={{ position: "relative" }}>
                                <summary style={{
                                  listStyle: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                                  color: "var(--text-faint)", padding: "4px 8px",
                                  borderRadius: 7, border: "1px solid var(--border)",
                                  userSelect: "none",
                                }}>
                                  Notes
                                </summary>
                                <div style={{
                                  position: "absolute", right: 0, bottom: "calc(100% + 6px)", zIndex: 10,
                                  width: 280, background: "var(--bg-elevated)",
                                  border: "1px solid var(--border-strong)",
                                  borderRadius: 10, padding: 12, boxShadow: "var(--shadow)",
                                  fontSize: 12, lineHeight: 1.5, color: "var(--text-soft)",
                                }}>
                                  {ex.instructions}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Tally of exercises not in this catalog */}
                  {unknownCount > 0 && (
                    <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>
                      + {unknownCount} gym-specific exercise{unknownCount !== 1 ? "s" : ""} not shown (added by trainer, outside this catalog)
                    </p>
                  )}
                  {knownItems.length === 0 && unknownCount > 0 && (
                    <div className="ep-empty" style={{ marginTop: 8 }}>
                      <p className="ep-empty__title">Gym-specific exercises</p>
                      <p className="ep-empty__sub">All {unknownCount} exercise{unknownCount !== 1 ? "s" : ""} on this day were added by the trainer and aren&apos;t in the global catalog.</p>
                    </div>
                  )}
                  </>
                );
              })()}
            </div>
          </section>
        </div>

        {/* Footer — summary only; Close is in the header */}
        <footer className="ep-foot">
          <div className="ep-foot__summary">
            <span className="ep-foot__stat"><b>{totalEx}</b> {totalEx === 1 ? "exercise" : "exercises"}</span>
            <span className="ep-foot__dot" />
            <span className="ep-foot__stat"><b>{activeDays.length}</b> {activeDays.length === 1 ? "day" : "days"}</span>
            {!readOnly && assignedCount !== undefined && (
              <><span className="ep-foot__dot" /><span className="ep-foot__stat"><b>{assignedCount}</b> assigned</span></>
            )}
          </div>
        </footer>
      </div>

      {/* Video portal */}
      {video && <VideoModal title={video.title} group={video.group} url={video.url} onClose={() => setVideo(null)} />}
    </>
  );
}
