"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { sendCoachMessage, markCoachThreadRead } from "@/lib/firebase/actions";
import type { CoachMessage } from "@/lib/firebase/read-models";

interface MemberCoachViewProps {
  coachNote: string | null;
  coachNoteFrom: string | null;
  coachNoteUpdatedAt: string | null;
  memberId: string;
  gymId: string;
  initialMessages: CoachMessage[];
}

type PendingMessage = {
  localId: string;
  body: string;
  createdAt: string;
  status: "pending" | "failed";
};

// Module-level (not a ref/state) so generating one never touches render —
// only ever called from event handlers via sendMessage().
let localMessageIdCounter = 0;
function nextLocalMessageId() {
  localMessageIdCounter += 1;
  return `local-${localMessageIdCounter}`;
}

function Avatar({ initials }: { initials: string }) {
  return <span className="mcv-avatar">{initials}</span>;
}

function initialsFor(name: string | null) {
  if (!name) return "PT";
  return name.split(" ").map((w) => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "PT";
}

function formatBubbleTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
}

/** "Today" / "Yesterday" / "12 Jan" (with year if not this year) — for day separators. */
function dayLabel(iso: string) {
  try {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(date, today)) return "Today";
    if (sameDay(date, yesterday)) return "Yesterday";
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined
    });
  } catch {
    return "";
  }
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function MemberCoachView({
  coachNote,
  coachNoteFrom,
  coachNoteUpdatedAt,
  memberId,
  initialMessages
}: MemberCoachViewProps) {
  const [replyText, setReplyText] = useState("");
  const [messages, setMessages] = useState<CoachMessage[]>(initialMessages);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const initials = initialsFor(coachNoteFrom);

  const noteTime = coachNoteUpdatedAt
    ? new Date(coachNoteUpdatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : null;

  const noteDate = coachNoteUpdatedAt
    ? new Date(coachNoteUpdatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  // Mark the thread read the moment the member opens this tab. Best-effort —
  // a failure here shouldn't block anything else on the page.
  useEffect(() => {
    markCoachThreadRead(memberId).catch(() => {});
  }, [memberId]);

  useEffect(() => {
    if (!hasScrolledRef.current) {
      threadEndRef.current?.scrollIntoView({ behavior: "auto" });
      hasScrolledRef.current = true;
      return;
    }
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pending.length]);

  async function sendMessage(text: string, retryLocalId?: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const localId = retryLocalId ?? nextLocalMessageId();
    const createdAt = new Date().toISOString();

    setPending((prev) => {
      const withoutStale = prev.filter((p) => p.localId !== localId);
      return [...withoutStale, { localId, body: trimmed, createdAt, status: "pending" }];
    });

    const result = await sendCoachMessage({ memberId, body: trimmed });

    if (result.status === "success") {
      setMessages((prev) => [...prev, result.coachMessage]);
      setPending((prev) => prev.filter((p) => p.localId !== localId));
    } else {
      setPending((prev) => prev.map((p) => (p.localId === localId ? { ...p, status: "failed" } : p)));
    }
  }

  function handleSend(msg?: string) {
    const text = msg ?? replyText.trim();
    if (!text) return;
    setReplyText("");
    void sendMessage(text);
  }

  function handleRetry(item: PendingMessage) {
    void sendMessage(item.body, item.localId);
  }

  function handleDismissFailed(localId: string) {
    setPending((prev) => prev.filter((p) => p.localId !== localId));
  }

  const quickReplies = ["Got it 👍", "On it!", "Quick question…", "Thanks! 🙏"];

  // Combine confirmed + in-flight messages into one ordered, day-grouped list.
  const groupedDays = useMemo(() => {
    type ThreadItem =
      | { kind: "sent"; key: string; createdAt: string; message: CoachMessage }
      | { kind: "pending" | "failed"; key: string; createdAt: string; pendingItem: PendingMessage };

    const items: ThreadItem[] = [
      ...messages.map((m) => ({ kind: "sent" as const, key: m.id, createdAt: m.createdAt, message: m })),
      ...pending.map((p) => ({
        kind: (p.status === "failed" ? "failed" : "pending") as "pending" | "failed",
        key: p.localId,
        createdAt: p.createdAt,
        pendingItem: p
      }))
    ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const groups: { key: string; label: string; items: ThreadItem[] }[] = [];
    for (const item of items) {
      const key = dayKey(item.createdAt);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.key === key) {
        lastGroup.items.push(item);
      } else {
        groups.push({ key, label: dayLabel(item.createdAt), items: [item] });
      }
    }
    return groups;
  }, [messages, pending]);

  const hasAnyMessages = messages.length > 0 || pending.length > 0;

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
        {/* Pinned coach's note — distinct from the conversation, never a chat bubble */}
        {coachNote && (
          <div className="mcv-pinned-note">
            <div className="mcv-pinned-note__head">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
                <path d="M16 12V4h1a1 1 0 0 0 0-2H7a1 1 0 0 0 0 2h1v8l-2 3v2h5.2v5l.8 1 .8-1v-5H18v-2z" />
              </svg>
              <span>Coach&apos;s note</span>
            </div>
            <p className="mcv-pinned-note__text">{coachNote}</p>
            {(noteDate || noteTime || coachNoteFrom) && (
              <span className="mcv-pinned-note__meta">
                {coachNoteFrom ? `${coachNoteFrom} · ` : ""}
                {noteDate ? `${noteDate}, ` : ""}
                {noteTime}
              </span>
            )}
          </div>
        )}

        {!hasAnyMessages ? (
          <div className="mcv-empty">
            <div className="mcv-empty__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p>No messages yet — send your coach a message to start the conversation.</p>
          </div>
        ) : (
          groupedDays.map((group) => (
            <div className="mcv-day-group" key={group.key}>
              <div className="mcv-day-separator">
                <span>{group.label}</span>
              </div>
              {group.items.map((item) => {
                if (item.kind === "sent") {
                  const m = item.message;
                  const isCoach = m.senderRole === "trainer";
                  return (
                    <div
                      className={`mcv-bubble ${isCoach ? "mcv-bubble--coach" : "mcv-bubble--member"}`}
                      key={item.key}
                    >
                      <p className="mcv-bubble__text">{m.body}</p>
                      <span className="mcv-bubble__time">
                        {isCoach && m.senderName ? `${m.senderName.split(" ")[0]} · ` : ""}
                        {formatBubbleTime(m.createdAt)}
                      </span>
                    </div>
                  );
                }

                const p = item.pendingItem;
                return (
                  <div
                    className={`mcv-bubble mcv-bubble--member${p.status === "pending" ? " mcv-bubble--pending" : " mcv-bubble--failed"}`}
                    key={item.key}
                  >
                    <p className="mcv-bubble__text">{p.body}</p>
                    <span className="mcv-bubble__time">
                      {p.status === "pending" ? (
                        "Sending…"
                      ) : (
                        <span className="mcv-bubble__failed-row">
                          Not delivered
                          <button type="button" className="mcv-retry-btn" onClick={() => handleRetry(p)}>
                            Retry
                          </button>
                          <button
                            type="button"
                            className="mcv-dismiss-btn"
                            onClick={() => handleDismissFailed(p.localId)}
                            aria-label="Discard message"
                          >
                            ×
                          </button>
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={threadEndRef} />
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
