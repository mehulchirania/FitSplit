"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { logActivity } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { ActivityLog } from "@/types/domain";

const CARDIO_OPTIONS = ["Run", "Cycle", "Row", "Walk", "Swim", "Jump Rope", "Stair Climber", "Elliptical", "HIIT", "Other"];
const STRETCH_OPTIONS = ["Full Body Stretch", "Hip Flexors", "Hamstrings", "Chest & Shoulders", "Quads", "Calves", "Lower Back", "Neck & Upper Back", "IT Band", "Other"];

export function ActivityLogForm({
  memberId,
  gymId,
  sessionId,
  onLogged,
  recentLogs = []
}: {
  memberId: string;
  gymId: string;
  sessionId?: string;
  onLogged?: (log: ActivityLog) => void;
  recentLogs?: ActivityLog[];
}) {
  const [activityType, setActivityType] = useState<"stretch" | "cardio">("cardio");
  const [customName, setCustomName] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const options = activityType === "cardio" ? CARDIO_OPTIONS : STRETCH_OPTIONS;
  const activeName = customName.trim() || selectedName;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeName) return;

    const fd = new FormData();
    fd.set("memberId", memberId);
    fd.set("type", activityType);
    fd.set("name", activeName);
    if (duration) fd.set("duration", duration);
    if (distance) fd.set("distance", distance);
    if (notes) fd.set("notes", notes);
    if (sessionId) fd.set("sessionId", sessionId);

    startTransition(async () => {
      const result = await logActivity(initialFormActionState, fd);
      if (result.status === "success") {
        const newLog: ActivityLog = {
          id: `optimistic-${Date.now()}`,
          memberId,
          gymId,
          type: activityType,
          name: activeName,
          duration: duration ? Number(duration) : undefined,
          distance: distance ? Number(distance) : undefined,
          notes: notes || undefined,
          loggedAt: new Date().toISOString(),
          sessionId: sessionId || undefined
        };
        onLogged?.(newLog);
        setCustomName("");
        setSelectedName("");
        setDuration("");
        setDistance("");
        setNotes("");
        toast.success(activityType === "cardio" ? "Cardio logged. Keep the momentum." : "Mobility work logged.");
      } else {
        toast.error(result.message || "Could not log activity.");
      }
    });
  }

  const recentToShow = recentLogs.slice(0, 5);

  return (
    <div className="activity-log-form">
      <h3>Log Activity</h3>

      <div className="activity-type-toggle">
        <button
          className={`activity-type-btn${activityType === "cardio" ? " is-selected" : ""}`}
          onClick={() => { setActivityType("cardio"); setSelectedName(""); setCustomName(""); }}
          type="button"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Cardio
        </button>
        <button
          className={`activity-type-btn${activityType === "stretch" ? " is-selected" : ""}`}
          onClick={() => { setActivityType("stretch"); setSelectedName(""); setCustomName(""); }}
          type="button"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          Stretch
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid" style={{ gap: 10 }}>
          <label>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {activityType === "cardio" ? "Cardio type" : "Stretch / mobility"}
            </span>
            <select
              value={selectedName}
              onChange={(e) => { setSelectedName(e.target.value); setCustomName(""); }}
              style={{ marginTop: 4 }}
            >
              <option value="">Select...</option>
              {options.map((opt) => (
                <option key={opt} value={opt !== "Other" ? opt : ""}>{opt}</option>
              ))}
            </select>
          </label>

          {(selectedName === "" || selectedName === "Other") && (
            <label>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Custom name
              </span>
              <input
                placeholder={activityType === "cardio" ? "e.g. Beach run" : "e.g. Hip flexor stretch"}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={{ marginTop: 4 }}
              />
            </label>
          )}

          <label>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Duration (min)
            </span>
            <input
              inputMode="numeric"
              min={1}
              max={600}
              placeholder="e.g. 30"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </label>

          {activityType === "cardio" && (
            <label>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Distance (km) — optional
              </span>
              <input
                inputMode="decimal"
                min={0}
                placeholder="e.g. 5.0"
                step="0.1"
                type="number"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                style={{ marginTop: 4 }}
              />
            </label>
          )}
        </div>

        <button
          className="button button-primary"
          disabled={isPending || !activeName}
          style={{ marginTop: 12, width: "100%" }}
          type="submit"
        >
          {isPending ? "Logging..." : `Log ${activityType === "cardio" ? "Cardio" : "Stretch"}`}
        </button>
      </form>

      {recentToShow.length > 0 && (
        <div className="activity-log-recent">
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Recent
          </p>
          {recentToShow.map((log) => (
            <div className="activity-log-entry" key={log.id}>
              <span className="activity-log-entry-icon">
                {log.type === "cardio" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                )}
              </span>
              <span className="activity-log-entry-name">{log.name}</span>
              <span className="activity-log-entry-meta">
                {log.duration ? `${log.duration} min` : ""}
                {log.distance ? ` · ${log.distance} km` : ""}
                {!log.duration && !log.distance ? new Date(log.loggedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {recentToShow.length === 0 && (
        <div className="activity-log-empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <p>No activity logged yet. Log your first cardio or stretch session above.</p>
        </div>
      )}
    </div>
  );
}
