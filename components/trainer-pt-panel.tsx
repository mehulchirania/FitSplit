"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { assignTrainerToMember } from "@/lib/firebase/actions/members";
import { Calendar, UserRound } from "@/components/icons";
import type { PTSession } from "@/types/domain";

export function TrainerPtPanel({
  memberId,
  currentTrainer,
  trainers,
  ptSessions,
}: {
  memberId: string;
  currentTrainer?: string;
  trainers: Array<{ id: string; fullName: string }>;
  ptSessions: PTSession[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(currentTrainer ?? "");
  const [liveTrainer, setLiveTrainer] = useState(currentTrainer ?? "");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const fd = new FormData();
    fd.set("memberId", memberId);
    fd.set("assignedTrainer", selectedTrainer);
    setFeedback(null);
    startTransition(async () => {
      const result = await assignTrainerToMember(fd);
      setFeedback({ type: result.status as "success" | "error", text: result.message });
      if (result.status === "success") {
        setLiveTrainer(selectedTrainer);
        setIsEditing(false);
      }
    });
  }

  const upcoming = ptSessions.filter(
    (s) => s.status === "scheduled" || s.status === "active"
  );
  const trainerInitial = liveTrainer ? liveTrainer[0].toUpperCase() : "?";

  return (
    <section className="form-panel tpp-panel">
      {/* ── Header ── */}
      <div className="panel-title" style={{ marginBottom: 14 }}>
        <div>
          <p className="eyebrow">Personal training</p>
          <h2>
            <UserRound />
            Trainer &amp; PT
          </h2>
        </div>
        <Link
          className="button button-primary"
          href={`/owner/training?memberId=${memberId}`}
          style={{ fontSize: "0.8rem", padding: "6px 14px", whiteSpace: "nowrap" }}
        >
          <Calendar /> Assign PT
        </Link>
      </div>

      {/* ── Current trainer ── */}
      <div className="tpp-trainer-row">
        <div className="tpp-trainer-avatar">{trainerInitial}</div>
        <div className="tpp-trainer-info">
          <span>Assigned trainer</span>
          <strong>{liveTrainer || "Unassigned"}</strong>
        </div>
        <button
          className="button button-secondary"
          onClick={() => {
            setIsEditing((v) => !v);
            setSelectedTrainer(liveTrainer);
            setFeedback(null);
          }}
          type="button"
          style={{ fontSize: "0.78rem", padding: "5px 11px" }}
        >
          {isEditing ? "Cancel" : "Change"}
        </button>
      </div>

      {/* ── Change trainer form ── */}
      {isEditing && (
        <div className="tpp-edit-row">
          {trainers.length > 0 ? (
            <select
              value={selectedTrainer}
              onChange={(e) => setSelectedTrainer(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text)",
                fontSize: "0.88rem",
              }}
            >
              <option value="">— Unassigned —</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.fullName}>
                  {t.fullName}
                </option>
              ))}
            </select>
          ) : (
            <input
              placeholder="No trainers added yet — type a name"
              value={selectedTrainer}
              onChange={(e) => setSelectedTrainer(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text)",
                fontSize: "0.88rem",
              }}
            />
          )}
          <button
            className="button button-primary"
            disabled={isPending}
            onClick={handleSave}
            type="button"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {feedback && (
        <p
          className={`form-message form-message-${feedback.type}`}
          role="status"
          style={{ margin: "8px 0 0" }}
        >
          {feedback.text}
        </p>
      )}

      {/* ── PT sessions ── */}
      <div className="tpp-pt-section">
        {ptSessions.length === 0 ? (
          <div className="tpp-pt-empty">
            <Calendar />
            <p>No PT sessions yet.</p>
            <Link
              className="button button-secondary"
              href={`/owner/training?memberId=${memberId}`}
              style={{ fontSize: "0.82rem" }}
            >
              Book first PT session
            </Link>
            <p className="tpp-notify-note">
              Member gets a push notification when a PT session is assigned.
            </p>
          </div>
        ) : (
          <>
            <div className="tpp-pt-header">
              <span className="eyebrow">PT sessions</span>
              {upcoming.length > 0 && (
                <span className="status-pill status-expiring">
                  {upcoming.length} upcoming
                </span>
              )}
            </div>
            <ul className="pt-session-mini-list">
              {ptSessions.slice(0, 5).map((s) => (
                <li key={s.id} className="pt-session-mini-row">
                  <div className="pt-mini-info">
                    <span className="pt-mini-trainer">{s.trainerName ?? "Trainer"}</span>
                    <span className="pt-mini-date">
                      {new Date(s.scheduledAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <span
                    className={`status-pill ${
                      s.status === "active"
                        ? "status-active"
                        : s.status === "completed"
                        ? "status-neutral"
                        : s.status === "cancelled"
                        ? "status-inactive"
                        : "status-expiring"
                    }`}
                  >
                    {s.status}
                  </span>
                </li>
              ))}
              {ptSessions.length > 5 && (
                <li style={{ padding: "8px 0", textAlign: "center" }}>
                  <Link
                    href={`/owner/training?memberId=${memberId}`}
                    style={{ fontSize: "0.82rem", color: "var(--brand)" }}
                  >
                    View all {ptSessions.length} sessions →
                  </Link>
                </li>
              )}
            </ul>
            <p className="tpp-notify-note">
              Member is notified automatically when a PT session is assigned.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
