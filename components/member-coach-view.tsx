"use client";

import { useState } from "react";
import Link from "next/link";

interface MemberCoachViewProps {
  coachNote: string | null;
  coachNoteFrom: string | null;
  coachNoteUpdatedAt: string | null;
  memberId: string;
  gymId: string;
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span className="mcv-avatar">{initials}</span>
  );
}

export function MemberCoachView({
  coachNote,
  coachNoteFrom,
  coachNoteUpdatedAt,
}: MemberCoachViewProps) {
  const [replyText, setReplyText] = useState("");
  const [sent, setSent] = useState(false);

  const initials = coachNoteFrom
    ? coachNoteFrom.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "PT";

  const noteTime = coachNoteUpdatedAt
    ? new Date(coachNoteUpdatedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  const noteDate = coachNoteUpdatedAt
    ? new Date(coachNoteUpdatedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : null;

  function handleSend(msg?: string) {
    const text = msg ?? replyText.trim();
    if (!text) return;
    setReplyText("");
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  }

  const quickReplies = ["Got it 👍", "On it!", "Quick question…", "Thanks! 🙏"];

  return (
    <div className="mcv-root">
      {/* Header */}
      <div className="mcv-header">
        <Link href="/member" className="mcv-back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="mcv-header__info">
          <Avatar initials={initials} />
          <div>
            <strong className="mcv-header__name">{coachNoteFrom ?? "Your Coach"}</strong>
            <span className="mcv-header__sub">Head Coach · usually replies fast</span>
          </div>
        </div>
      </div>

      {/* Conversation body */}
      <div className="mcv-thread">
        {coachNote ? (
          <div className="mcv-bubble mcv-bubble--coach">
            <p className="mcv-bubble__text">{coachNote}</p>
            {noteTime && (
              <span className="mcv-bubble__time">
                {coachNoteFrom ? `${coachNoteFrom.split(" ")[0]} · ` : ""}
                {noteDate ? `${noteDate}, ` : ""}{noteTime}
              </span>
            )}
          </div>
        ) : (
          <div className="mcv-empty">
            <div className="mcv-empty__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p>No message yet — your trainer will leave a note here before your session.</p>
          </div>
        )}

        {sent && (
          <div className="mcv-bubble mcv-bubble--member">
            <p className="mcv-bubble__text">Message sent ✓</p>
            <span className="mcv-bubble__time">Just now</span>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="mcv-composer">
        <div className="mcv-quick-replies">
          {quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              className="mcv-quick-btn"
              onClick={() => handleSend(q)}
            >
              {q}
            </button>
          ))}
        </div>
        <div className="mcv-input-row">
          <input
            type="text"
            className="mcv-input"
            placeholder="Message your coach…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            className={`mcv-send${replyText.trim() ? " mcv-send--active" : ""}`}
            onClick={() => handleSend()}
            disabled={!replyText.trim()}
            aria-label="Send message"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
